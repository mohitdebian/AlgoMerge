// Problem modeling
interface Issue {
  id: number;
  title: string;
  labels: string[];
  body: string;
  createdAt: Date;
  comments: number;
}

interface AnalysisResult {
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedHours: number;
  category: 'bug' | 'feature' | 'chore';
  priority: number;
}

// Model the problem: classify and prioritize GitHub issues
export function modelIssuePriority(issue: Issue): AnalysisResult {
  const hasBugLabel = issue.labels.some(l => l.toLowerCase().includes('bug'));
  const isLongBody = issue.body.length > 500;
  const isHighActivity = issue.comments > 10;

  const category = hasBugLabel ? 'bug' : issue.labels.includes('enhancement') ? 'feature' : 'chore';
  const difficulty = isLongBody && isHighActivity ? 'hard' : isLongBody ? 'medium' : 'easy';
  const estimatedHours = difficulty === 'hard' ? 8 : difficulty === 'medium' ? 4 : 2;
  const priority = (hasBugLabel ? 3 : 1) + (isHighActivity ? 2 : 0);

  return { difficulty, estimatedHours, category, priority };
}
