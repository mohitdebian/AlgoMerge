import { GoogleGenAI } from '@google/genai';
import { AiAnalysis } from '../models/aiAnalysis.model.js';
import mongoose from 'mongoose';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.warn('GEMINI_API_KEY environment variable is missing.');
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generateIssueAnalysis = async (title: string, body: string, owner: string, repo: string, isPR: boolean = false): Promise<string> => {
    // 1. Check MongoDB Cache first
    if (mongoose.connection.readyState === 1) { // Connected
        try {
            const cachedAnalysis = await AiAnalysis.findOne({ owner, repo, issueTitle: title, isPR });
            if (cachedAnalysis) {
                console.log(`Cache hit for ${owner}/${repo} - ${title}`);
                return cachedAnalysis.analysis;
            }
        } catch (error) {
            console.error('Error reading from MongoDB cache:', error);
            // Continue to generate with Gemini if cache read fails
        }
    }

    if (!apiKey) {
        throw new Error('AI analysis is disabled because GEMINI_API_KEY is not configured.');
    }

    const issuePrompt = `
You are a Staff Software Engineer analyzing a GitHub open-source issue in the repository "**${owner}/${repo}**".
Your task is to analyze the issue and provide a concrete, step-by-step implementation plan for a contributor to solve it.

**Context:**
- Issue Title: ${title}
- Issue Description:
${body || 'No description provided.'}

**Requirements for your response:**
1. Be extremely concise. Use markdown.
2. Provide a 1-sentence **Summary** of what needs to be built or fixed.
3. Provide a **File Identification** section guessing which files/folders might be involved (if applicable).
4. Provide a step-by-step **Implementation Plan** (3-5 bullet points) on how to tackle this issue technically.
5. Provide a short **Testing Strategy** (1-2 sentences).
6. Do not include introductory/outro conversational fluff. Output the markdown directly.
`;

    const prPrompt = `
You are a Staff Software Engineer analyzing a GitHub pull request in the repository "**${owner}/${repo}**".
Your task is to provide a strategic merge analysis for this PR, helping the contributor understand its likelihood of being merged and what actions to take.

**Context:**
- PR Title: ${title}
- PR Description:
${body || 'No description provided.'}

**Requirements for your response:**
1. Be extremely concise. Use markdown.
2. Provide a 1-sentence **Summary** of what this PR does.
3. Provide a **Merge Likelihood Assessment** with a qualitative rating (High / Medium / Low) and 2-3 bullet points explaining the key factors (e.g., scope, alignment with project goals, code quality signals).
4. Provide a **Reviewer Engagement Strategy** section (2-3 bullet points) advising how to increase chances of review and merge (e.g., who to tag, how to break up large PRs, responding to feedback).
5. Provide a **Risk Factors** section listing 1-3 potential blockers or concerns (e.g., breaking changes, missing tests, scope creep).
6. Provide a short **Recommended Next Steps** section (2-3 actionable bullet points).
7. Do not include introductory/outro conversational fluff. Output the markdown directly.
`;

    const prompt = isPR ? prPrompt : issuePrompt;

    try {
        const response = await ai!.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const analysisText = response.text || 'Unable to generate analysis at this time.';

        // 2. Save to MongoDB Cache
        if (mongoose.connection.readyState === 1 && response.text) {
            try {
                await AiAnalysis.create({
                    owner,
                    repo,
                    issueTitle: title,
                    analysis: analysisText,
                    isPR
                });
                console.log(`Saved analysis to MongoDB cache for ${owner}/${repo} - ${title}`);
            } catch (error) {
                console.error('Error saving to MongoDB cache:', error);
            }
        }

        return analysisText;
    } catch (error: any) {
        // Server-side error handling: catch, log, and re-throw with context
        console.error('Gemini API Error:', error);
        throw new Error(`Failed to generate AI analysis: ${error.message || 'Unknown error'}`);
    }
};

// ==========================================
// Streaming responses: Server-Sent Events streaming from LLM
// ==========================================
export const streamAnalysis = async (prompt: string, res: any) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const response = await ai!.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });

    for await (const chunk of response) {
        const text = chunk.text();
        if (text) {
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
    }
    res.write('data: [DONE]\n\n');
    res.end();
};

// ==========================================
// Structured outputs: JSON schema-constrained LLM response
// ==========================================
export const getStructuredAnalysis = async (issueText: string) => {
    const response = await ai!.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Analyze this GitHub issue: ${issueText}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: 'OBJECT' as any,
                properties: {
                    summary: { type: 'STRING' as any },
                    difficulty: { type: 'STRING' as any, enum: ['easy', 'medium', 'hard'] },
                    estimatedHours: { type: 'NUMBER' as any },
                },
                required: ['summary', 'difficulty'],
            },
        },
    });
    return JSON.parse(response.text());
};

// ==========================================
// Function calling / tool use
// ==========================================
export const analyzeWithTools = async (query: string) => {
    const tools = [{
        functionDeclarations: [{
            name: 'searchGitHub',
            description: 'Search GitHub for repositories or issues',
            parameters: {
                type: 'OBJECT' as any,
                properties: { query: { type: 'STRING' as any } },
                required: ['query'],
            },
        }],
    }];

    const response = await ai!.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: query,
        config: { tools },
    });

    return response.functionCalls;
};

// ==========================================
// Prompt engineering: System instructions + few-shot + chain-of-thought
// ==========================================
export const SYSTEM_INSTRUCTION = `You are a Staff Software Engineer. Analyze GitHub issues with structured, actionable plans.`;

export function buildFewShotPrompt(title: string, body: string): string {
    return `${SYSTEM_INSTRUCTION}

### Example:
Issue: "Add dark mode toggle"
Analysis: UI feature. Add ThemeContext + toggle. 4 hours.

### Now analyze:
Title: ${title}
Body: ${body}
Provide: summary, difficulty, estimated hours, step-by-step approach.`;
}

// ==========================================
// Prompt injection awareness & defenses
// ==========================================
export function sanitizeUserPrompt(input: string): string {
    const injectionPatterns = [
        /ignore previous instructions/gi,
        /you are now/gi,
        /forget everything/gi,
        /system:\s*/gi,
    ];
    let sanitized = input;
    for (const pattern of injectionPatterns) {
        sanitized = sanitized.replace(pattern, '[BLOCKED]');
    }
    return sanitized;
}

// ==========================================
// LLM API integration: Direct Gemini API usage (demonstrated above in generateIssueAnalysis)
// ==========================================

// ==========================================
// RAG — embeddings & vector retrieval
// ==========================================
export const generateEmbedding = async (text: string) => {
    const result = await ai!.models.embedContent({
        model: 'text-embedding-004',
        contents: text,
    });
    return result.embeddings?.[0]?.values || [];
};

export function cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ==========================================
// LLM eval sets: Benchmark LLM accuracy
// ==========================================
export const evalSet = [
    { input: 'Fix null pointer in auth', expected: 'bug' },
    { input: 'Add dark mode', expected: 'feature' },
    { input: 'Upgrade React to v19', expected: 'chore' },
];

export async function runEvaluation() {
    let correct = 0;
    for (const testCase of evalSet) {
        const response = await ai!.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Classify: "${testCase.input}" as bug/feature/chore. One word only.`,
        });
        if (response.text().trim().toLowerCase() === testCase.expected) correct++;
    }
    return { accuracy: (correct / evalSet.length) * 100, total: evalSet.length, correct };
}

// ==========================================
// Multi-step agent: Plan -> Execute -> Synthesize
// ==========================================
export async function multiStepAgent(goal: string) {
    // Step 1: Plan
    const plan = await ai!.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Break this goal into 3 steps: ${goal}. Reply as JSON array.`,
        config: { responseMimeType: 'application/json' },
    });
    const steps = JSON.parse(plan.text());

    // Step 2: Execute each step
    const results: string[] = [];
    for (const step of steps) {
        const result = await ai!.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Execute: ${step}`,
        });
        results.push(result.text());
    }

    // Step 3: Synthesize
    const summary = await ai!.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Summarize results: ${results.join('\n')}`,
    });

    return { steps, results, summary: summary.text() };
}

// ==========================================
// Problem modeling: Classify and prioritize issues
// ==========================================
export function modelIssuePriority(labels: string[], bodyLength: number, comments: number) {
    const isBug = labels.some(l => l.toLowerCase().includes('bug'));
    const difficulty = bodyLength > 500 && comments > 10 ? 'hard' : bodyLength > 200 ? 'medium' : 'easy';
    const priority = (isBug ? 3 : 1) + (comments > 10 ? 2 : 0);
    return { category: isBug ? 'bug' : 'feature', difficulty, priority };
}

// ==========================================
// Server-side error handling: Centralized error handler
// ==========================================
export function handleServiceError(error: any, context: string): never {
    console.error(`[${context}] Service Error:`, error);
    const message = error?.message || 'An unexpected error occurred';
    throw new Error(`${context}: ${message}`);
}

// ==========================================
// RESTful endpoint design: Route definitions (used in app.ts)
// GET /api/issues/:owner/:repo  — Read issues
// POST /api/analyze             — Create analysis
// GET /api/trending             — Read trending
// DELETE /api/cache/:key        — Delete cache entry
// PUT /api/watchlist            — Update watchlist
// ==========================================
