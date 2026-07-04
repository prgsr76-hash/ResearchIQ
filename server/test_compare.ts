import mongoose from 'mongoose';
import { config } from './src/config/env.js';
import { Paper } from './src/models/Paper.js';
import { comparePapers } from './src/services/compare.service.js';
import { analyzeGaps } from './src/services/gap.service.js';
import { generateReview } from './src/services/review.service.js';

async function main() {
  await mongoose.connect(config.MONGODB_URI);
  console.log('Connected to MongoDB');

  const papers = await Paper.find().limit(2);
  if (papers.length < 2) {
    console.log('Not enough papers');
    return;
  }

  const paperIds = papers.map(p => p._id.toString());
  console.log('Testing Compare with papers:', paperIds);

  try {
    const compareResult = await comparePapers(paperIds);
    console.log('Compare Result:', JSON.stringify(compareResult, null, 2));
  } catch (err) {
    console.error('Compare Error:', err);
  }

  console.log('\nTesting Gap Analysis...');
  try {
    const gapResult = await analyzeGaps(papers[0].userId.toString());
    console.log('Gap Result:', JSON.stringify(gapResult, null, 2));
  } catch (err) {
    console.error('Gap Error:', err);
  }
  
  console.log('\nTesting Review...');
  try {
    const reviewResult = await generateReview('Testing', paperIds);
    console.log('Review Result:', JSON.stringify(reviewResult, null, 2));
  } catch (err) {
    console.error('Review Error:', err);
  }

  await mongoose.disconnect();
}

main().catch(console.error);
