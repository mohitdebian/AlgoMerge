// Prompt engineering
export const SYSTEM_PROMPT = `You are an expert open-source contributor assistant.
Analyze GitHub issues and provide structured, actionable implementation plans.
Always consider edge cases, testing strategies, and backward compatibility.`;

// Few-shot prompt engineering pattern
export function buildFewShotPrompt(issueTitle: string, issueBody: string): string {
  return `${SYSTEM_PROMPT}

### Example 1:
Issue: "Add dark mode toggle"
Analysis: This is a UI feature. Add a ThemeContext, toggle button, and CSS variables for colors. Estimated: 4 hours.

### Example 2:
Issue: "Fix login redirect loop"
Analysis: This is a bug. Check OAuth callback URL and token validation logic. Estimated: 2 hours.

### Now analyze this issue:
Title: ${issueTitle}
Body: ${issueBody}

Provide: summary, difficulty (easy/medium/hard), estimated hours, and step-by-step approach.`;
}

// Chain-of-thought prompting
export function buildCoTPrompt(code: string): string {
  return `Review this code step by step:
1. First, identify what the code does
2. Then, check for bugs or edge cases
3. Finally, suggest improvements

Code:
${code}`;
}
