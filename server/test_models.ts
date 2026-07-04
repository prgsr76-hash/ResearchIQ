import { config } from './src/config/env.js';

const modelsToTest = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-flash-latest'
];

async function testModels() {
  for (const model of modelsToTest) {
    console.log(`Testing ${model}...`);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] })
      });
      const data = await res.json();
      if (!res.ok) {
        console.log(`❌ ${model} failed with ${res.status}: ${JSON.stringify(data.error)}`);
      } else {
        console.log(`✅ ${model} succeeded`);
      }
    } catch (e: any) {
      console.log(`❌ ${model} fetch failed: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 1000));
  }
}

testModels().catch(console.error);
