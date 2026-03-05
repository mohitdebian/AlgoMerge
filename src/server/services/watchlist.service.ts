import { getOctokit } from './github.service.js';
import { calculateMergeProbability } from './scoring.service.js';
import { serverCache } from '../utils/cache.js';

// In a real app, this would be more sophisticated
const calculateRepoInsights = (issues: any[]) => {
  if (issues.length === 0) {
    return {
      activityLevel: 'Low',
      mergeFriendliness: 0,
      contributorCompetition: 'Low',
    };
  }

  const avgMergeProbability = issues.reduce((acc, issue) => acc + calculateMergeProbability(issue), 0) / issues.length;
  const recentIssues = issues.filter(i => new Date(i.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

  return {
    activityLevel: recentIssues.length > 10 ? 'High' : 'Medium',
    mergeFriendliness: Math.round(avgMergeProbability),
    contributorCompetition: issues.reduce((acc, i) => acc + i.comments, 0) > 50 ? 'High' : 'Medium',
  };
};

export const getRepoInsights = async (accessToken: string, repo: string) => {
  // Check cache first
  const cacheKey = `insights_${repo}`;
  const cached = serverCache.get(cacheKey);
  if (cached) return cached;

  const [owner, name] = repo.split('/');
  const octokit = getOctokit(accessToken);
  const { data: issues } = await octokit.issues.listForRepo({ owner, repo: name, state: 'open' });

  const insights = calculateRepoInsights(issues);
  serverCache.set(cacheKey, insights);
  return insights;
};

/**
 * Batch fetch insights for multiple repos with concurrency limiting.
 * Returns a map of repo -> insights (or null if failed).
 */
export const getBatchRepoInsights = async (
  accessToken: string,
  repos: string[]
): Promise<Record<string, any>> => {
  const results: Record<string, any> = {};
  const MAX_CONCURRENT = 3;

  // Process in batches of MAX_CONCURRENT
  for (let i = 0; i < repos.length; i += MAX_CONCURRENT) {
    const batch = repos.slice(i, i + MAX_CONCURRENT);
    const settled = await Promise.allSettled(
      batch.map(repo => getRepoInsights(accessToken, repo))
    );
    settled.forEach((result, idx) => {
      const repo = batch[idx];
      results[repo] = result.status === 'fulfilled' ? result.value : null;
    });
  }

  return results;
};