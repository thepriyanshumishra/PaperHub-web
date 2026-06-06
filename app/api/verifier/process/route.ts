import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/verifyAuth';
import { ROLES, hasPermission } from '@/lib/permissions';
import { DocumentBatch, UploadedDocument, IPageData } from '@/models/uploadedDocument';
import Question from '@/models/question';
import Subject from '@/models/subject';
import { getSimilarityScore } from '@/lib/similarity';
import { groq, isAiEnabled } from '@/lib/groq';
import { safeErrorResponse } from '@/lib/promptSafety';
import fs from 'fs/promises';
import path from 'path';

// Optional sharp for cropping
let sharp: any = null;
try {
  sharp = require('sharp');
} catch (e) {
  console.warn('[Process API] sharp is not installed. Cropped images will copy the full page.');
}

// Optional pdf-img-convert for PDF page conversion
let pdf2img: any = null;
try {
  const req = eval('require');
  pdf2img = req('pdf-img-convert');
} catch (e) {
  console.warn('[Process API] pdf-img-convert is not installed. PDF page conversion will be mocked.');
}

export const dynamic = 'force-dynamic';

// ─── Phase L.1A Feature Flag ──────────────────────────────────────────────────
// The OCR processing pipeline is temporarily disabled for the beta launch.
// It will be re-enabled in Phase L.2 after Cloudflare R2 + QStash integration.
// Set FEATURE_OCR_PIPELINE=true in .env to re-enable.
const FEATURE_OCR_PIPELINE = process.env.FEATURE_OCR_PIPELINE === 'true';
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Feature gate: OCR processing is coming soon
  if (!FEATURE_OCR_PIPELINE) {
    return NextResponse.json(
      {
        error: 'Document Intelligence Pipeline — Coming Soon',
        message: 'The automated OCR extraction pipeline is temporarily disabled during the beta launch. It will be available in a future update.',
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

    const { batchId } = await req.json();
    if (!batchId) {
      return NextResponse.json({ error: 'Missing batchId' }, { status: 400 });
    }

    await dbConnect();

    const batch = await DocumentBatch.findById(batchId);
    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Set batch status to processing
    await DocumentBatch.findByIdAndUpdate(batchId, { status: 'processing', errorMessage: '' });

    const documents = await UploadedDocument.find({ batchId, status: { $ne: 'completed' } });

    // Run processing sequentially to prevent resource starvation or freezing
    for (const doc of documents) {
      try {
        await UploadedDocument.findByIdAndUpdate(doc._id, { status: 'processing', errorMessage: '' });

        const batchDir = path.join(process.cwd(), 'public', 'uploads', 'batches', String(batchId));
        const docDir = path.join(batchDir, String(doc._id));
        const filePath = path.join(docDir, doc.fileName);

        const pagesData: IPageData[] = [];

        if (doc.mimeType === 'application/pdf') {
          // Convert PDF pages to PNG buffers
          if (pdf2img) {
            const pageBuffers = await pdf2img.convert(filePath, { width: 1200 });
            for (let i = 0; i < pageBuffers.length; i++) {
              const pageNum = i + 1;
              const pageImageName = `page_${pageNum}.png`;
              const pageImagePath = path.join(docDir, pageImageName);
              await fs.writeFile(pageImagePath, pageBuffers[i]);

              pagesData.push({
                pageNumber: pageNum,
                imagePath: `/uploads/batches/${batchId}/${doc._id}/${pageImageName}`,
              });
            }
          } else {
            // Mock PDF page conversion
            pagesData.push({
              pageNumber: 1,
              imagePath: `/uploads/batches/${batchId}/${doc._id}/${doc.fileName}`, // Fallback to PDF path or mock
            });
          }
        } else {
          // Image is single-page
          pagesData.push({
            pageNumber: 1,
            imagePath: `/uploads/batches/${batchId}/${doc._id}/${doc.fileName}`,
          });
        }

        // Process each page through vision and save candidates
        for (const page of pagesData) {
          const pageImgPathOnDisk = path.join(process.cwd(), 'public', page.imagePath);

          let extractedData: any;
          if (isAiEnabled() && groq) {
            // Read page image as base64
            const imgBuffer = await fs.readFile(pageImgPathOnDisk);
            const base64Img = imgBuffer.toString('base64');

            const groqPrompt = `You are a specialized academic document vision parser.
Parse this university exam sheet page image and extract all questions. 
Preserve all mathematical formulas in LaTeX format, preserving symbols, fractions, matrices, indices, tables, and graphs as markdown.
For each question, extract:
- questionNumber: e.g. "1", "2", "3a"
- questionText: full text of the question (must preserve LaTeX formatting, math, chemical equations)
- marks: expected marks (number, or 0 if not specified)
- section: section name (like A, B, C) if visible
- unitHint: estimated curriculum unit (1 to 5) based on topics
- topicHint: subject topic keywords
- difficultyHint: 'easy', 'medium', or 'hard'
- cropCoordinates: approximate bounding box coordinates of the question block relative to the page height and width (values as percentages, between 0 and 100): { "yMin": number, "yMax": number, "xMin": number, "xMax": number }

Return ONLY a JSON object with this schema:
{
  "confidence": 0-100 score,
  "questions": [
    {
      "questionNumber": "string",
      "questionText": "string",
      "marks": number,
      "section": "string",
      "unitHint": number,
      "topicHint": "string",
      "difficultyHint": "easy" | "medium" | "hard",
      "cropCoordinates": { "yMin": number, "yMax": number, "xMin": number, "xMax": number }
    }
  ]
}`;

            const chatCompletion = await groq.chat.completions.create({
              model: 'llama-3.2-11b-vision-preview',
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: groqPrompt },
                    {
                      type: 'image_url',
                      image_url: { url: `data:image/png;base64,${base64Img}` },
                    },
                  ],
                },
              ],
              response_format: { type: 'json_object' },
            });

            const contentText = chatCompletion.choices[0]?.message?.content || '{}';
            extractedData = JSON.parse(contentText);
          } else {
            // Fallback mock vision extraction for testing
            extractedData = {
              confidence: 95,
              questions: [
                {
                  questionNumber: '1',
                  questionText: 'Verify Cayley-Hamilton Theorem for the matrix $A = \\begin{pmatrix} 2 & -1 \\\\ 1 & 3 \\end{pmatrix}$ and hence find its inverse.',
                  marks: 10,
                  section: 'A',
                  unitHint: 1,
                  topicHint: 'Cayley-Hamilton Theorem',
                  difficultyHint: 'medium',
                  cropCoordinates: { yMin: 10, yMax: 45, xMin: 5, xMax: 95 },
                },
                {
                  questionNumber: '2',
                  questionText: 'Solve the differential equation $(D^2 + 5D + 6)y = e^{2x}$.',
                  marks: 5,
                  section: 'A',
                  unitHint: 2,
                  topicHint: 'Second Order linear differential equation',
                  difficultyHint: 'easy',
                  cropCoordinates: { yMin: 50, yMax: 85, xMin: 5, xMax: 95 },
                },
              ],
            };
          }

          page.extractedContent = JSON.stringify(extractedData.questions);
          page.confidence = extractedData.confidence || 80;

          // For each question extracted, create a cropped image and check for duplicates
          const subjectHint = doc.subjectId;
          const paperYear = doc.year || new Date().getFullYear();
          const paperExamType = doc.examType || 'Major';

          // Fetch verified questions for duplicate check
          const existingVerifiedQuestions = subjectHint
            ? await Question.find({ subjectId: subjectHint })
            : [];

          let qIdx = 0;
          for (const q of extractedData.questions || []) {
            qIdx++;
            const candidateId = new mongoose.Types.ObjectId();
            const cropImageName = `crop_${page.pageNumber}_${qIdx}.png`;
            const cropImagePath = path.join(docDir, cropImageName);

            // Attempt to crop page image
            let croppedUrl = page.imagePath; // Default to full page
            if (sharp && q.cropCoordinates) {
              try {
                const imgBuffer = await fs.readFile(pageImgPathOnDisk);
                const metadata = await sharp(imgBuffer).metadata();
                const width = metadata.width || 1200;
                const height = metadata.height || 1600;

                const yMin = q.cropCoordinates.yMin ?? 0;
                const yMax = q.cropCoordinates.yMax ?? 100;
                const xMin = q.cropCoordinates.xMin ?? 0;
                const xMax = q.cropCoordinates.xMax ?? 100;

                const cropLeft = Math.round((xMin / 100) * width);
                const cropTop = Math.round((yMin / 100) * height);
                const cropWidth = Math.max(10, Math.round(((xMax - xMin) / 100) * width));
                const cropHeight = Math.max(10, Math.round(((yMax - yMin) / 100) * height));

                const cropBuffer = await sharp(imgBuffer)
                  .extract({
                    left: Math.max(0, Math.min(width - cropWidth, cropLeft)),
                    top: Math.max(0, Math.min(height - cropHeight, cropTop)),
                    width: Math.min(width, cropWidth),
                    height: Math.min(height, cropHeight),
                  })
                  .toBuffer();
                await fs.writeFile(cropImagePath, cropBuffer);
                croppedUrl = `/uploads/batches/${batchId}/${doc._id}/${cropImageName}`;
              } catch (cropErr) {
                console.error('[Process API] sharp crop failed:', cropErr);
              }
            } else if (!sharp && page.imagePath) {
              // Copy full page as a fallback crop
              try {
                await fs.copyFile(pageImgPathOnDisk, cropImagePath);
                croppedUrl = `/uploads/batches/${batchId}/${doc._id}/${cropImageName}`;
              } catch (copyErr) {
                console.error('[Process API] copy fallback crop failed:', copyErr);
              }
            }

            // Run duplicate detection
            let maxDuplicateScore = 0;
            const similarIds: string[] = [];

            for (const verifiedQ of existingVerifiedQuestions) {
              const sim = getSimilarityScore(q.questionText, verifiedQ.questionText);
              if (sim > maxDuplicateScore) {
                maxDuplicateScore = sim;
              }
              if (sim >= 0.3) {
                similarIds.push(verifiedQ.questionId);
              }
            }

            // Calculate content quality score
            // duplicatePenalty deducts up to 40 points, corrections/flags are 0 initially
            const duplicatePenalty = maxDuplicateScore * 40;
            const ocrConf = page.confidence || 80;
            const qualityScore = Math.max(0, Math.min(100, Math.round(ocrConf - duplicatePenalty)));

            // Save question candidate to DB with pending state
            await Question.create({
              questionId: `Q-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
              subjectId: subjectHint || new mongoose.Types.ObjectId(), // Placeholder if hint is omitted
              unit: q.unitHint || 1,
              topic: q.topicHint || 'General Ingestion',
              questionText: q.questionText,
              difficulty: ['easy', 'medium', 'hard'].includes(q.difficultyHint) ? q.difficultyHint : 'medium',
              repetitionFrequency: 1,
              marks: q.marks || 5,
              sourcePapers: [{ year: paperYear, examType: paperExamType }],
              humanVerified: false,
              verificationStatus: 'pending',
              ocrConfidence: ocrConf,
              sourceDocumentId: doc._id,
              sourcePageNumber: page.pageNumber,
              sourcePageImage: page.imagePath,
              croppedQuestionImage: croppedUrl,
              aiSuggestions: {
                subjectId: subjectHint,
                unit: q.unitHint || 1,
                topic: q.topicHint || 'General Ingestion',
                difficulty: q.difficultyHint || 'medium',
                confidence: page.confidence || 80,
              },
              duplicateScore: maxDuplicateScore,
              similarQuestionIds: similarIds,
              extractionQualityScore: qualityScore,
            });
          }
        }

        // Save page structures
        doc.pages = pagesData;
        doc.status = 'completed';
        await doc.save();

        // Increment processed files count in batch
        await DocumentBatch.findByIdAndUpdate(batchId, {
          $inc: { processedFiles: 1 },
        });

      } catch (err: any) {
        console.error(`Error processing document ${doc._id}:`, err);
        await UploadedDocument.findByIdAndUpdate(doc._id, {
          status: 'failed',
          errorMessage: err.message || 'Error parsing document',
        });
      }
    }

    // Refresh batch status
    const finalBatch = await DocumentBatch.findById(batchId);
    if (finalBatch) {
      const failedCount = await UploadedDocument.countDocuments({ batchId, status: 'failed' });
      const completedCount = await UploadedDocument.countDocuments({ batchId, status: 'completed' });
      
      let finalStatus: 'pending' | 'processing' | 'completed' | 'failed' = 'completed';
      if (failedCount > 0 && completedCount === 0) {
        finalStatus = 'failed';
      } else if (failedCount > 0) {
        finalStatus = 'completed'; // Partially completed
      }

      await DocumentBatch.findByIdAndUpdate(batchId, {
        status: finalStatus,
        errorMessage: failedCount > 0 ? `${failedCount} files failed to process.` : undefined,
      });
    }

    return NextResponse.json({ message: 'Batch processing completed' });

  } catch (error) {
    console.error('API Error in POST /api/verifier/process:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
