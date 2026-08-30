// LLM API integration
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function analyzeIssue(issueTitle: string, issueBody: string) {
  const prompt = `Analyze this GitHub issue and provide actionable insights:\nTitle: ${issueTitle}\nBody: ${issueBody}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      temperature: 0.3,
      maxOutputTokens: 2048,
    }
  });

  return {
    analysis: response.text(),
    tokenUsage: response.usageMetadata?.totalTokenCount,
    model: 'gemini-2.5-flash'
  };
}
