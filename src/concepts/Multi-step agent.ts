// Multi-step agent
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const tools = [
  { name: 'searchGitHub', fn: async (query: string) => `Found 5 issues matching "${query}"` },
  { name: 'analyzeCode', fn: async (file: string) => `Analysis of ${file}: No critical bugs found` },
  { name: 'createPR', fn: async (title: string) => `PR created: ${title}` },
];

export async function multiStepAgent(userGoal: string) {
  const steps: string[] = [];
  let context = userGoal;

  // Step 1: Plan
  const plan = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Break this goal into 3 steps: ${userGoal}. Reply as JSON array of strings.`,
    config: { responseMimeType: 'application/json' }
  });
  const plannedSteps = JSON.parse(plan.text());
  steps.push(`Plan: ${JSON.stringify(plannedSteps)}`);

  // Step 2: Execute each step
  for (const step of plannedSteps) {
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Execute this step: ${step}\nContext: ${context}`,
    });
    const output = result.text();
    steps.push(`Step: ${step} -> Result: ${output}`);
    context += `\n${output}`;
  }

  // Step 3: Synthesize final answer
  const finalResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Summarize the results:\n${steps.join('\n')}`,
  });

  return { steps, finalAnswer: finalResponse.text() };
}
