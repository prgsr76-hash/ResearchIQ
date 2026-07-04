import mongoose, { Schema, Document, Types } from 'mongoose';

/** Source reference attached to a chat message */
export interface IChatSource {
  paperId: Types.ObjectId;
  paperTitle: string;
  chunkText: string;
  score: number;
}

/** Individual message within a chat session */
export interface IChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources: IChatSource[];
  timestamp: Date;
}

/** Chat session document interface */
export interface IChat extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  sessionId: string;
  title: string;
  messages: IChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const chatSourceSchema = new Schema<IChatSource>(
  {
    paperId: { type: Schema.Types.ObjectId, ref: 'Paper' },
    paperTitle: { type: String, default: '' },
    chunkText: { type: String, default: '' },
    score: { type: Number, default: 0 },
  },
  { _id: false }
);

const chatMessageSchema = new Schema<IChatMessage>(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: { type: String, required: true },
    sources: [chatSourceSchema],
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const chatSchema = new Schema<IChat>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: { type: String, default: 'New Chat' },
    messages: [chatMessageSchema],
  },
  { timestamps: true }
);

export const Chat = mongoose.model<IChat>('Chat', chatSchema);
