// LLM eval sets
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

interface EvalCase {
  input: string;
  expectedOutput: string;
  category: string;
}

const evalSet: EvalCase[] = [
  { input: 'Fix null pointer in auth middleware', expectedOutput: 'bug', category: 'classification' },
  { input: 'Add dark mode support', expectedOutput: 'feature', category: 'classification' },
  { input: 'Upgrade React to v19', expectedOutput: 'chore', category: 'classification' },
];

export async function runEvaluation() {
  let correct = 0;

  for (const testCase of evalSet) {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Classify this GitHub issue as "bug", "feature", or "chore": ${testCase.input}. Reply with one word only.`,
    });

    const prediction = response.text().trim().toLowerCase();
    const passed = prediction === testCase.expectedOutput;
    if (passed) correct++;

    console.log(`Input: ${testCase.input} | Expected: ${testCase.expectedOutput} | Got: ${prediction} | ${passed ? 'PASS' : 'FAIL'}`);
  }

  const accuracy = (correct / evalSet.length) * 100;
  console.log(`Accuracy: ${accuracy}% (${correct}/${evalSet.length})`);
  return { accuracy, total: evalSet.length, correct };
}
