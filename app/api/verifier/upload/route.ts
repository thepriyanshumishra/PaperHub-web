import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/verifyAuth';
import { ROLES, hasPermission } from '@/lib/permissions';
import { DocumentBatch, UploadedDocument } from '@/models/uploadedDocument';
import { safeErrorResponse } from '@/lib/promptSafety';
import { validateUpload } from '@/lib/uploadValidator';
import { logSystemEvent } from '@/lib/auditLogger';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import JSZip from 'jszip';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

// ─── Phase L.1A Feature Flag ──────────────────────────────────────────────────
// The Document Intelligence Pipeline (PDF/ZIP upload, OCR extraction) is
// temporarily disabled for the beta launch. It will be re-enabled in Phase L.2
// after migration to Cloudflare R2 + async job queue is complete.
// Set FEATURE_OCR_PIPELINE=true in .env to re-enable.
const FEATURE_OCR_PIPELINE = process.env.FEATURE_OCR_PIPELINE === 'true';
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Feature gate: Document Intelligence Pipeline is coming soon
  if (!FEATURE_OCR_PIPELINE) {
    return NextResponse.json(
      {
        error: 'Document Intelligence Pipeline — Coming Soon',
        message: 'The automated PDF/ZIP ingestion pipeline is temporarily disabled during the beta launch. It will be available in a future update.',
        featureFlag: 'FEATURE_OCR_PIPELINE',
      },
      { status: 503 }
    );
  }


  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: User profile mismatch' }, { status: 401 });
    }

    if (!hasPermission(user.role, ROLES.VERIFIER)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const subjectId = formData.get('subjectId') as string | null;
    const yearStr = formData.get('year') as string | null;
    const examType = formData.get('examType') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const year = yearStr ? parseInt(yearStr, 10) : undefined;

    // Strict validation of uploaded file properties
    const allowedMimeTypes = ['application/pdf', 'application/zip', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 });
    }

    // Limit file size (50MB for general PDFs/ZIPs, 10MB for individual images)
    const isImage = file.type.startsWith('image/');
    const maxLimit = isImage ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxLimit) {
      return NextResponse.json(
        { error: `File size exceeds limit (${isImage ? '10MB' : '50MB'} max).` },
        { status: 400 }
      );
    }

    await dbConnect();

    // Read file buffer and calculate SHA256 hash for duplicate upload detection
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Check file signatures
    const validation = validateUpload(buffer, file.name, file.type, 'any');
    if (!validation.isValid) {
      await logSystemEvent({
        action: 'upload_failure',
        userId: user._id,
        category: 'upload',
        details: `Failed upload signature check: ${validation.error}`,
        metadata: { filename: file.name, size: file.size, mime: file.type }
      });
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

    const duplicateDoc = await UploadedDocument.findOne({ fileHash });
    if (duplicateDoc) {
      return NextResponse.json(
        { error: `Duplicate upload: File '${file.name}' has already been processed under Document ID ${duplicateDoc._id}.` },
        { status: 409 }
      );
    }

    // Create a new batch representation
    const batch = await DocumentBatch.create({
      name: file.name,
      status: 'pending',
      totalFiles: 0,
      processedFiles: 0,
      uploadedBy: user._id,
    });

    const uploadBaseDir = path.join(process.cwd(), 'public', 'uploads', 'batches', String(batch._id));
    await fs.mkdir(uploadBaseDir, { recursive: true });

    const registeredDocs: any[] = [];

    if (file.type === 'application/zip') {
      // Unpack ZIP file contents
      let zip: JSZip;
      try {
        zip = await JSZip.loadAsync(buffer);
      } catch (err) {
        await DocumentBatch.findByIdAndUpdate(batch._id, { status: 'failed', errorMessage: 'Invalid zip structure' });
        return NextResponse.json({ error: 'Failed to parse ZIP file' }, { status: 400 });
      }

      const zipFiles = Object.entries(zip.files).filter(
        ([name, entry]) => !entry.dir && !name.includes('__MACOSX') && !name.endsWith('.DS_Store')
      );

      for (const [filename, entry] of zipFiles) {
        const fileData = await entry.async('nodebuffer');
        const fileExt = path.extname(filename).toLowerCase();
        let mime = '';

        if (fileExt === '.pdf') mime = 'application/pdf';
        else if (fileExt === '.png') mime = 'image/png';
        else if (fileExt === '.jpg' || fileExt === '.jpeg') mime = 'image/jpeg';
        else continue; // Skip unsupported files inside ZIP

        // Run signature checks on ZIP entry
        const entryVal = validateUpload(fileData, filename, mime, 'any');
        if (!entryVal.isValid) {
          await logSystemEvent({
            action: 'upload_failure',
            userId: user._id,
            category: 'upload',
            details: `ZIP entry '${filename}' failed signature check: ${entryVal.error}`,
            metadata: { filename, size: fileData.length, mime }
          });
          continue;
        }

        const subHash = crypto.createHash('sha256').update(fileData).digest('hex');

        // Skip exact duplicate files inside ZIP to avoid duplicates
        const subDuplicate = await UploadedDocument.findOne({ fileHash: subHash });
        if (subDuplicate) continue;

        const docId = new mongoose.Types.ObjectId();
        const docSubDir = path.join(uploadBaseDir, String(docId));
        await fs.mkdir(docSubDir, { recursive: true });

        const savePath = path.join(docSubDir, filename);
        await fs.writeFile(savePath, fileData);

        const newDoc = await UploadedDocument.create({
          _id: docId,
          batchId: batch._id,
          fileName: filename,
          mimeType: mime,
          fileSize: fileData.length,
          fileHash: subHash,
          status: 'pending',
          subjectId: subjectId || undefined,
          year: year || undefined,
          examType: examType || undefined,
          pages: [],
        });

        registeredDocs.push(newDoc);
      }

      if (registeredDocs.length === 0) {
        await DocumentBatch.findByIdAndUpdate(batch._id, { status: 'failed', errorMessage: 'No valid files inside ZIP' });
        return NextResponse.json({ error: 'ZIP file contains no supported documents (.pdf, .png, .jpeg).' }, { status: 400 });
      }

      await DocumentBatch.findByIdAndUpdate(batch._id, {
        totalFiles: registeredDocs.length,
        status: 'pending',
      });

    } else {
      // Single PDF or Image upload
      const docId = new mongoose.Types.ObjectId();
      const docSubDir = path.join(uploadBaseDir, String(docId));
      await fs.mkdir(docSubDir, { recursive: true });

      const savePath = path.join(docSubDir, file.name);
      await fs.writeFile(savePath, buffer);

      const newDoc = await UploadedDocument.create({
        _id: docId,
        batchId: batch._id,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        fileHash,
        status: 'pending',
        subjectId: subjectId || undefined,
        year: year || undefined,
        examType: examType || undefined,
        pages: [],
      });

      registeredDocs.push(newDoc);
      await DocumentBatch.findByIdAndUpdate(batch._id, {
        totalFiles: 1,
        status: 'pending',
      });
    }

    return NextResponse.json({
      message: 'Upload completed and registered successfully',
      batch,
      documents: registeredDocs,
    });

  } catch (error) {
    console.error('API Error in POST /api/verifier/upload:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
