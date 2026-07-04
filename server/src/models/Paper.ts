import mongoose, { Schema, Document, Types } from 'mongoose';

/** Structured summary produced by Gemini */
export interface IPaperSummary {
  problemStatement: string;
  methodology: string;
  results: string;
  limitations: string;
  futureWork: string;
}

/** Paper processing status */
export type PaperStatus = 'uploading' | 'processing' | 'ready' | 'error';

/** Paper document interface */
export interface IPaper extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  authors: string[];
  abstract: string;
  year: number;
  keywords: string[];
  filename: string;
  originalName: string;
  fileSize: number;
  pageCount: number;
  status: PaperStatus;
  processingProgress: number;
  fullText: string;
  summary: IPaperSummary | null;
  createdAt: Date;
}

const paperSummarySchema = new Schema<IPaperSummary>(
  {
    problemStatement: { type: String, default: '' },
    methodology: { type: String, default: '' },
    results: { type: String, default: '' },
    limitations: { type: String, default: '' },
    futureWork: { type: String, default: '' },
  },
  { _id: false }
);

const paperSchema = new Schema<IPaper>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: { type: String, default: '' },
  authors: [{ type: String }],
  abstract: { type: String, default: '' },
  year: { type: Number },
  keywords: [{ type: String }],
  filename: { type: String, default: '' },
  originalName: { type: String, default: '' },
  fileSize: { type: Number, default: 0 },
  pageCount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['uploading', 'processing', 'ready', 'error'],
    default: 'uploading',
  },
  processingProgress: { type: Number, default: 0 },
  fullText: { type: String, default: '' },
  summary: { type: paperSummarySchema, default: null },
  createdAt: { type: Date, default: Date.now },
});

paperSchema.index({ userId: 1, createdAt: -1 });

export const Paper = mongoose.model<IPaper>('Paper', paperSchema);
