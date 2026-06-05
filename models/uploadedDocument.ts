import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDocumentBatch extends Document {
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalFiles: number;
  processedFiles: number;
  uploadedBy: string; // Firebase UID
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPageData {
  pageNumber: number;
  imagePath: string; // public URL/path, e.g. /uploads/batches/batchId/docId/page_1.png
  extractedContent?: string;
  confidence?: number;
}

export interface IUploadedDocument extends Document {
  batchId?: mongoose.Types.ObjectId;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileHash: string; // SHA-256 hash for duplicate upload check
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  subjectId?: mongoose.Types.ObjectId; // Hint
  year?: number; // Hint
  examType?: string; // Hint
  pages: IPageData[];
  createdAt: Date;
  updatedAt: Date;
}

const PageDataSchema = new Schema<IPageData>({
  pageNumber: { type: Number, required: true },
  imagePath: { type: String, required: true },
  extractedContent: { type: String },
  confidence: { type: Number },
});

const DocumentBatchSchema = new Schema<IDocumentBatch>(
  {
    name: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    totalFiles: { type: Number, default: 0 },
    processedFiles: { type: Number, default: 0 },
    uploadedBy: { type: String, required: true },
    errorMessage: { type: String },
  },
  { timestamps: true }
);

const UploadedDocumentSchema = new Schema<IUploadedDocument>(
  {
    batchId: { type: Schema.Types.ObjectId, ref: 'DocumentBatch' },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    fileHash: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    errorMessage: { type: String },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' },
    year: { type: Number },
    examType: { type: String },
    pages: [PageDataSchema],
  },
  { timestamps: true }
);

// Indexes
UploadedDocumentSchema.index({ fileHash: 1 });
UploadedDocumentSchema.index({ batchId: 1 });

export const DocumentBatch: Model<IDocumentBatch> =
  mongoose.models.DocumentBatch || mongoose.model<IDocumentBatch>('DocumentBatch', DocumentBatchSchema);

export const UploadedDocument: Model<IUploadedDocument> =
  mongoose.models.UploadedDocument || mongoose.model<IUploadedDocument>('UploadedDocument', UploadedDocumentSchema);
