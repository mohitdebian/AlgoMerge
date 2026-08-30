// Structured outputs
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const AnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING, description: 'Brief summary of the issue' },
    difficulty: { type: Type.STRING, enum: ['easy', 'medium', 'hard'] },
    estimatedHours: { type: Type.NUMBER },
    suggestedApproach: { type: Type.ARRAY, items: { type: Type.STRING } },
    mergeProbability: { type: Type.NUMBER, description: '0-100 percentage' }
  },
  required: ['summary', 'difficulty', 'estimatedHours']
};

export async function getStructuredAnalysis(issueText: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Analyze this GitHub issue: ${issueText}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: AnalysisSchema
    }
  });
  return JSON.parse(response.text());
}
