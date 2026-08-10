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
            model: 'gemini-flash-latest',
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
    } catch (error) {
        console.error('Gemini API Error:', error);
        throw new Error('Failed to generate AI analysis.');
    }
};
