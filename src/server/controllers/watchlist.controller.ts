import { Request, Response } from 'express';
import * as UserModel from '../models/user.model.js';
import { getRepoInsights, getBatchRepoInsights } from '../services/watchlist.service.js';
import { handleRateLimitError, checkRateLimit } from '../services/github.service.js';

export const getWatchlist = (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  const watchlist = UserModel.getWatchlist(req.user.userId.toString());
  res.json(watchlist);
};

export const addToWatchlist = (req: Request, res: Response) => {
  const { repo } = req.body;
  if (!req.user || !repo) {
    return res.status(400).json({ message: 'Missing user or repo' });
  }

  const updatedUser = UserModel.addToWatchlist(req.user.userId.toString(), repo);
  res.json(updatedUser.watchlist);
};

export const removeFromWatchlist = (req: Request, res: Response) => {
  const { repo } = req.body;
  if (!req.user || !repo) {
    return res.status(400).json({ message: 'Missing user or repo' });
  }

  const updatedUser = UserModel.removeFromWatchlist(req.user.userId.toString(), repo);
  res.json(updatedUser?.watchlist || []);
};

export const fetchRepoInsights = async (req: Request, res: Response) => {
  const { owner, repo } = req.params;
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    checkRateLimit();
    const insights = await getRepoInsights(req.user.accessToken, `${owner}/${repo}`);
    res.json(insights);
  } catch (error: any) {
    if (handleRateLimitError(error, res)) return;
    console.error(`Failed to fetch insights for ${repo}:`, error);
    res.status(500).json({ message: 'Failed to fetch insights' });
  }
};

/**
 * Batch fetch insights for all repos in the request body.
 * POST /api/watchlist/insights/batch { repos: ["owner/repo", ...] }
 */
export const fetchBatchRepoInsights = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const { repos } = req.body;
  if (!Array.isArray(repos) || repos.length === 0) {
    return res.status(400).json({ message: 'Missing repos array' });
  }

  // Cap to prevent abuse
  const reposToFetch = repos.slice(0, 20);

  try {
    checkRateLimit();
    const insights = await getBatchRepoInsights(req.user.accessToken, reposToFetch);
    res.json(insights);
  } catch (error: any) {
    if (handleRateLimitError(error, res)) return;
    console.error('Failed to fetch batch insights:', error);
    res.status(500).json({ message: 'Failed to fetch batch insights' });
  }
};