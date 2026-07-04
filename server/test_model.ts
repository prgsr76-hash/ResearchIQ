import { GoogleGenAI } from '@google/genai';
import { config } from './src/config/env.js';

const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });

async function testModel(modelName: string) {
  console.log(`\nTesting ${modelName}...`);
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: "Hello",
    });
    console.log(`[SUCCESS] ${modelName}:`, response.text);
    return true;
  } catch (error: any) {
    console.log(`[FAILED] ${modelName}:`, error.message || error);
    if (error.status) console.log(`  Status:`, error.status);
    return false;
  }
}

async function run() {
  await testModel('gemini-2.0-flash');
  await testModel('gemini-3.5-flash');
  await testModel('gemini-flash-latest');
}
run();
