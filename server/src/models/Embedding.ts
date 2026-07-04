import mongoose, { Schema, Document, Types } from 'mongoose';

/** Embedding chunk metadata */
export interface IEmbeddingMetadata {
  pageNumber: number;
  section: string;
}

/** Embedding document interface */
export interface IEmbedding extends Document {
  _id: Types.ObjectId;
  paperId: Types.ObjectId;
  userId: Types.ObjectId;
  chunkIndex: number;
  text: string;
  embedding: number[];
  metadata: IEmbeddingMetadata;
}

const embeddingSchema = new Schema<IEmbedding>({
  paperId: {
    type: Schema.Types.ObjectId,
    ref: 'Paper',
    required: true,
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  chunkIndex: { type: Number, required: true },
  text: { type: String, required: true },
  embedding: {
    type: [Number],
    required: true,
    validate: {
      validator: (v: number[]) => v.length === 768,
      message: 'Embedding must have exactly 768 dimensions',
    },
  },
  metadata: {
    pageNumber: { type: Number, default: 0 },
    section: { type: String, default: '' },
  },
});

embeddingSchema.index({ paperId: 1, chunkIndex: 1 });

export const Embedding = mongoose.model<IEmbedding>('Embedding', embeddingSchema);
