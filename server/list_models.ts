import { GoogleGenAI } from '@google/genai';
import { config } from './src/config/env.js';

const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });

async function listModels() {
  const response = await ai.models.list();
  for await (const model of response) {
    console.log(model.name);
  }
}

listModels().catch(console.error);
