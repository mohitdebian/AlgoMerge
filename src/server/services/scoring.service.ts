// --- PR Radar Scoring Engine v1.0 ---
// This is a deterministic scoring engine based on publicly available issue data.
// It avoids complex AI to ensure transparency and speed.

/**
 * Calculates the probability of a PR being merged for a given issue.
 * Weights are adjustable to fine-tune the scoring algorithm.
 */
export const calculateMergeProbability = (issue: any): number => {
  const weights = {
    recency: 0.4,       // How recently the issue was updated
    comments: 0.2,      // Engagement level
    authorAssociation: 0.2, // Higher score if a maintainer opened it
    labelBoost: 0.2,    // Boost for 'good first issue', 'help wanted'
  };

  // Recency Score (0-1): Newer issues get a higher score.
  const daysSinceUpdate = (Date.now() - new Date(issue.updated_at).getTime()) / (1000 * 3600 * 24);
  const recencyScore = Math.max(0, 1 - daysSinceUpdate / 90); // Score diminishes over 90 days

  // Comment Score (0-1): Capped at 20 comments to avoid penalizing popular issues.
  const commentScore = Math.min(issue.comments / 20, 1);

  // Author Association Score (0 or 1): Is the author a member or owner?
  const authorAssociationScore = ['MEMBER', 'OWNER'].includes(issue.author_association) ? 1 : 0;

  // Label Boost (0 or 1): Does it have contributor-friendly labels?
  const hasGoodLabels = issue.labels.some(label => 
    ['good first issue', 'help wanted', 'documentation'].includes(label.name.toLowerCase())
  );
  const labelBoostScore = hasGoodLabels ? 1 : 0;

  // Final weighted score
  const finalScore = 
    recencyScore * weights.recency +
    commentScore * weights.comments +
    authorAssociationScore * weights.authorAssociation +
    labelBoostScore * weights.labelBoost;

  return Math.round(finalScore * 100);
};

/**
 * Estimates the competition level for an issue.
 */
export const calculateCompetition = (issue: any): 'Low' | 'Medium' | 'High' => {
  // Based on comments, a proxy for interested contributors.
  if (issue.comments <= 1) return 'Low';
  if (issue.comments <= 5) return 'Medium';
  return 'High';
};

/**
 * Placeholder for maintainer activity. 
 * A real implementation would analyze the repo's recent comment/merge history.
 */
export const calculateMaintainerActivity = (issue: any): 'High' | 'Medium' | 'Low' => {
  return 'High'; // Placeholder for MVP
};

/**
 * Estimates the complexity of an issue.
 */
export const estimateComplexity = (issue: any): 'Low' | 'Medium' | 'High' => {
  const body = issue.body || '';
  const hasTaskList = /-\s\[[ xX]\]/.test(body);
  const bodyLength = body.length;

  if (hasTaskList && bodyLength > 1500) return 'High';
  if (bodyLength > 1000 || hasTaskList) return 'Medium';
  if (bodyLength < 250) return 'Low';

  return 'Medium';
};