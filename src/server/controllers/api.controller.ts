import { Request, Response } from 'express';
import { getOctokit, checkRateLimit, handleRateLimitError } from '../services/github.service';
import * as scoring from '../services/scoring.service';
import { serverCache, longCache } from '../utils/cache';

export const getIssues = async (req: Request, res: Response) => {
  const { owner, repo: name } = req.params;
  const { labels } = req.query;

  // @ts-ignore
  if (!req.session.accessToken) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const cacheKey = `issues_${owner}_${name}_${labels || ''}`;
  const cached = serverCache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {
    checkRateLimit();
    // @ts-ignore
    const octokit = getOctokit(req.session.accessToken);

    // Build a GitHub Search query that excludes issues with linked PRs
    let q = `repo:${owner}/${name} is:issue is:open -linked:pr`;
    if (labels && typeof labels === 'string' && labels.length > 0) {
      // Add each label as a qualifier
      labels.split(',').forEach(label => {
        q += ` label:"${label.trim()}"`;
      });
    }

    const { data } = await octokit.search.issuesAndPullRequests({
      q,
      sort: 'updated',
      order: 'desc',
      per_page: 30,
    });

    const scoredIssues = data.items.map(issue => ({
      ...issue,
      mergeProbability: scoring.calculateMergeProbability(issue),
      competition: scoring.calculateCompetition(issue),
      maintainerActivity: scoring.calculateMaintainerActivity(issue),
      complexity: scoring.estimateComplexity(issue),
    }));

    serverCache.set(cacheKey, scoredIssues);
    res.json(scoredIssues);
  } catch (error: any) {
    if (handleRateLimitError(error, res)) return;
    console.error(`Failed to fetch issues for ${owner}/${name}:`, error);
    res.status(500).json({ message: 'Failed to fetch issues' });
  }
};

import { generateIssueAnalysis } from '../services/ai.service';

export const analyzeIssue = async (req: Request, res: Response) => {
  // @ts-ignore
  if (!req.session.accessToken) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const { title, body, owner, repo, isPR } = req.body;
  if (!title || !owner || !repo) {
    return res.status(400).json({ message: 'Missing required issue text parameters' });
  }

  try {
    const analysis = await generateIssueAnalysis(title, body || '', owner, repo, !!isPR);
    res.json({ analysis });
  } catch (error: any) {
    console.error('Failed to analyze issue:', error);
    res.status(500).json({ message: error.message || 'Failed to generate AI analysis' });
  }
};

export const getTrending = async (_req: Request, res: Response) => {
  // Check long-lived cache first (trending data changes slowly)
  const cachedTrending = longCache.get('trending');
  if (cachedTrending) {
    return res.json(cachedTrending);
  }

  try {
    // Scrape the actual GitHub trending page — no auth required
    const response = await fetch('https://github.com/trending?spoken_language_code=en');
    if (!response.ok) throw new Error(`GitHub trending returned ${response.status}`);

    const html = await response.text();

    // Parse repo info from the HTML using regex
    const repos: any[] = [];
    // Each trending repo is in an <article> with class "Box-row"
    const articleRegex = /<article[^>]*class="Box-row"[^>]*>([\s\S]*?)<\/article>/g;
    let match;

    while ((match = articleRegex.exec(html)) !== null && repos.length < 12) {
      const article = match[1];

      // Extract repo full name (owner/name) from the h2 > a href
      const h2Match = article.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
      if (!h2Match) continue;

      const repoMatch = h2Match[1].match(/href="\/([^"]+)"/);
      if (!repoMatch) continue;
      const repoName = repoMatch[1];

      // Extract description
      const descMatch = article.match(/<p class="col-9[^"]*">([\s\S]*?)<\/p>/);
      const desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : 'No description provided.';

      // Extract language
      const langMatch = article.match(/<span itemprop="programmingLanguage">([\s\S]*?)<\/span>/);
      const language = langMatch ? langMatch[1].trim() : null;

      // Extract total stars
      const starsMatch = article.match(/href="\/[^/]+\/[^/]+\/stargazers"[^>]*>.*?<svg[^>]*>.*?<\/svg>\s*([\d,]+)\s*<\/a>/s);
      const stars = starsMatch ? parseInt(starsMatch[1].replace(/,/g, '')) : 0;

      // Extract "stars today/this week"
      const todayMatch = article.match(/([\d,]+)\s*stars\s*(today|this week|this month)/);
      const starsToday = todayMatch ? parseInt(todayMatch[1].replace(/,/g, '')) : 0;
      const starsPeriod = todayMatch ? todayMatch[2] : 'today';

      repos.push({
        repo: repoName,
        desc,
        language: language || 'Unknown',
        stars,
        starsToday,
        starsPeriod,
        url: `https://github.com/${repoName}`,
      });
    }

    longCache.set('trending', repos);
    res.json(repos);
  } catch (error) {
    // Return stale cache if scraping fails
    const stale = longCache.getStale('trending');
    if (stale) return res.json(stale);
    console.error('Failed to fetch trending repos:', error);
    res.status(500).json({ message: 'Failed to fetch trending repos' });
  }
};

export const getRepoInfo = async (req: Request, res: Response) => {
  const { owner, repo } = req.params;

  // @ts-ignore
  if (!req.session.accessToken) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const cacheKey = `repo_${owner}_${repo}`;
  const cached = serverCache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    checkRateLimit();
    // @ts-ignore
    const octokit = getOctokit(req.session.accessToken);
    const { data } = await octokit.repos.get({ owner, repo });

    const result = {
      repo: data.full_name,
      desc: data.description,
      stars: data.stargazers_count,
      language: data.language,
      url: data.html_url
    };
    serverCache.set(cacheKey, result);
    res.json(result);
  } catch (error: any) {
    if (handleRateLimitError(error, res)) return;
    console.error(`Failed to fetch repo info for ${owner}/${repo}:`, error);
    res.status(500).json({ message: 'Failed to fetch repository information' });
  }
};