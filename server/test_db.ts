import mongoose from 'mongoose';
import { config } from './src/config/env.js';
import { Paper } from './src/models/Paper.js';

async function main() {
  await mongoose.connect(config.MONGODB_URI);
  console.log('Connected to MongoDB');

  const papers = await Paper.find().sort({ createdAt: -1 }).limit(10);
  
  for (const paper of papers) {
    console.log(`Paper ID: ${paper._id}`);
    console.log(`Title: ${paper.title}`);
    console.log(`Status: ${paper.status}`);
    console.log(`Progress: ${paper.processingProgress}`);
    console.log(`FullText length: ${paper.fullText ? paper.fullText.length : 0}`);
    console.log('---');
  }

  await mongoose.disconnect();
}

main().catch(console.error);
