// Function calling / tool use
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const getWeatherTool = {
  name: 'getWeather',
  description: 'Get current weather for a given location',
  parameters: {
    type: Type.OBJECT,
    properties: {
      location: { type: Type.STRING, description: 'City name' },
      unit: { type: Type.STRING, enum: ['celsius', 'fahrenheit'] }
    },
    required: ['location']
  }
};

export async function agentWithTools(userQuery: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: userQuery,
    config: { tools: [{ functionDeclarations: [getWeatherTool] }] }
  });

  const functionCall = response.functionCalls?.[0];
  if (functionCall) {
    console.log('Tool called:', functionCall.name, functionCall.args);
  }
  return response;
}
