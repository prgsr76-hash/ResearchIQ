import mongoose from 'mongoose';
import { config } from './env.js';

/**
 * Establishes connection to MongoDB using Mongoose.
 * Logs success/failure and exits the process on fatal connection errors.
 */
export async function connectDB(): Promise<void> {
  try {
    const conn = await mongoose.connect(config.MONGODB_URI);
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('[MongoDB] Connection failed:', error);
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    console.error('[MongoDB] Runtime error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] Disconnected');
  });
}
