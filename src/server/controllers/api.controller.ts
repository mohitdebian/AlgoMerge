import { Request, Response } from 'express';
import { getOctokit, checkRateLimit, handleRateLimitError } from '../services/github.service.js';
import * as scoring from '../services/scoring.service.js';
import { serverCache, longCache } from '../utils/cache.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const getWeekStartUtc = (timestamp: number) => {
  const day = new Date(timestamp).getUTCDay();
  const mondayOffset = (day + 6) % 7;
  return timestamp - (mondayOffset * DAY_MS);
};

const publicGitHubHeaders = () => {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'pr-radar-public-scorecard',
  };
  if (process.env.GITHUB_PUBLIC_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_PUBLIC_TOKEN}`;
  }
  return headers;
};

const fetchGitHubJson = async (url: string) => {
  const response = await fetch(url, { headers: publicGitHubHeaders() });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${response.status} for ${url}: ${body.slice(0, 120)}`);
  }
  return response.json();
};

const buildPublicProfilePayload = async (username: string) => {
  const encoded = encodeURIComponent(username);
  const [userRes, prsRes, mergedRes, eventsRes] = await Promise.all([
    fetchGitHubJson(`https://api.github.com/users/${encoded}`),
    fetchGitHubJson(`https://api.github.com/search/issues?q=${encodeURIComponent(`is:pr author:${username}`)}&per_page=1`),
    fetchGitHubJson(`https://api.github.com/search/issues?q=${encodeURIComponent(`is:pr is:merged author:${username}`)}&per_page=1`),
    fetchGitHubJson(`https://api.github.com/users/${encoded}/events/public?per_page=100`),
  ]);

  const totalPRs = prsRes.total_count || 0;
  const mergedPRs = mergedRes.total_count || 0;
  const mergeRate = totalPRs > 0 ? Math.round((mergedPRs / totalPRs) * 100) : 0;

  const activeByDay = new Map<string, number>();
  const weekStats = new Map<number, { activeDays: Set<string>; eventCount: number }>();
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const currentWeekStartUtc = getWeekStartUtc(todayUtc);

  (eventsRes as any[]).forEach((event) => {
    const createdAt = event?.created_at;
    if (!createdAt) return;
    const eventMs = new Date(createdAt).getTime();
    const dayKey = new Date(eventMs).toISOString().slice(0, 10);
    activeByDay.set(dayKey, (activeByDay.get(dayKey) || 0) + 1);

    const dayMs = Date.UTC(
      new Date(eventMs).getUTCFullYear(),
      new Date(eventMs).getUTCMonth(),
      new Date(eventMs).getUTCDate()
    );
    const weekStart = getWeekStartUtc(dayMs);
    if (!weekStats.has(weekStart)) {
      weekStats.set(weekStart, { activeDays: new Set<string>(), eventCount: 0 });
    }
    weekStats.get(weekStart)!.activeDays.add(dayKey);
    weekStats.get(weekStart)!.eventCount++;
  });

  let currentStreak = 0;
  for (let i = 0; i < 366; i++) {
    const dayMs = todayUtc - (i * DAY_MS);
    const dayKey = new Date(dayMs).toISOString().slice(0, 10);
    if ((activeByDay.get(dayKey) || 0) > 0) {
      currentStreak++;
    } else {
      if (i === 0) continue;
      break;
    }
  }

  const sortedActivityDays = Array.from(activeByDay.keys()).sort();
  let maxStreak = 0;
  let run = 0;
  let prevDay: number | null = null;
  sortedActivityDays.forEach((day) => {
    const dayMs = Date.UTC(
      Number(day.slice(0, 4)),
      Number(day.slice(5, 7)) - 1,
      Number(day.slice(8, 10))
    );
    if (prevDay !== null && dayMs - prevDay === DAY_MS) {
      run++;
    } else {
      run = 1;
    }
    maxStreak = Math.max(maxStreak, run);
    prevDay = dayMs;
  });

  const weeklyWins = Array.from({ length: 6 }).map((_, index) => {
    const weekStart = currentWeekStartUtc - ((5 - index) * 7 * DAY_MS);
    const week = weekStats.get(weekStart);
    const activeDays = week?.activeDays.size || 0;
    const eventCount = week?.eventCount || 0;
    const momentum = Math.min(100, Math.round((activeDays / 7) * 70 + Math.min(30, eventCount)));
    const weekLabel = new Date(weekStart + (6 * DAY_MS)).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return {
      weekLabel,
      activeDays,
      events: eventCount,
      momentum,
    };
  });

  const badges = [
    { id: 'first-merge', label: 'First Merge', unlocked: mergedPRs >= 1 },
    { id: 'ten-merges', label: 'Double Digits', unlocked: mergedPRs >= 10 },
    { id: 'quality', label: 'Quality Ace', unlocked: mergeRate >= 70 && totalPRs >= 5 },
    { id: 'streak-7', label: 'Streak Warrior', unlocked: Math.max(currentStreak, maxStreak) >= 7 },
  ];

  return {
    username,
    profile: {
      login: userRes.login,
      name: userRes.name,
      avatarUrl: userRes.avatar_url,
      bio: userRes.bio,
      followers: userRes.followers,
      publicRepos: userRes.public_repos,
      htmlUrl: userRes.html_url,
    },
    totals: {
      totalPRs,
      mergedPRs,
      mergeRate,
      currentStreak,
      maxStreak,
    },
    weeklyWins,
    badges,
    generatedAt: new Date().toISOString(),
  };
};

export const getIssues = async (req: Request, res: Response) => {
  const { owner, repo: name } = req.params;
  const { labels } = req.query;

  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const cacheKey = `issues_${owner}_${name}_${labels || ''}`;
  const cached = serverCache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {
    checkRateLimit();
    const octokit = getOctokit(req.user!.accessToken);

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

import { generateIssueAnalysis } from '../services/ai.service.js';

export const analyzeIssue = async (req: Request, res: Response) => {
  if (!req.user) {
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

  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const cacheKey = `repo_${owner}_${repo}`;
  const cached = serverCache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    checkRateLimit();
    const octokit = getOctokit(req.user.accessToken);
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

export const getPublicScorecard = async (req: Request, res: Response) => {
  const username = (req.params.username || '').trim();
  if (!username) {
    return res.status(400).json({ message: 'Username is required' });
  }

  const cacheKey = `public_scorecard_${username.toLowerCase()}`;
  const cached = longCache.get(cacheKey, 10 * 60 * 1000);
  if (cached) return res.json(cached);

  try {
    const payload = await buildPublicProfilePayload(username);
    longCache.set(cacheKey, payload);
    res.json(payload);
  } catch (error: any) {
    console.error(`Failed to fetch public scorecard for ${username}:`, error);
    if (error.message?.includes('404')) {
      return res.status(404).json({ message: 'GitHub user not found' });
    }
    return res.status(500).json({ message: 'Failed to fetch public scorecard' });
  }
};

export const getPublicScorecardImage = async (req: Request, res: Response) => {
  const username = (req.params.username || '').trim();
  if (!username) {
    return res.status(400).send('Username is required');
  }

  const cacheKey = `public_scorecard_${username.toLowerCase()}`;
  try {
    const data = longCache.get(cacheKey, 10 * 60 * 1000) || await buildPublicProfilePayload(username);
    longCache.set(cacheKey, data);

    const momentum = data.weeklyWins[data.weeklyWins.length - 1]?.momentum || 0;
    const winsText = data.weeklyWins
      .slice(-3)
      .map((w: any) => `${w.weekLabel}: ${w.momentum}`)
      .join('  |  ');

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="PR Radar scorecard for ${data.profile.login}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1220" />
      <stop offset="100%" stop-color="#18263e" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" />
  <circle cx="990" cy="120" r="190" fill="#4ade8030" />
  <circle cx="180" cy="540" r="230" fill="#8ab4ff1e" />
  <text x="70" y="90" fill="#9fb3d1" font-size="28" font-family="Verdana, sans-serif">PR Radar Public Dev Scorecard</text>
  <text x="70" y="165" fill="#ffffff" font-size="58" font-family="Verdana, sans-serif" font-weight="700">@${data.profile.login}</text>
  <text x="70" y="215" fill="#b9c7de" font-size="28" font-family="Verdana, sans-serif">Momentum ${momentum}  |  Streak ${data.totals.currentStreak}d  |  Merge Rate ${data.totals.mergeRate}%</text>
  <text x="70" y="290" fill="#d9e4f6" font-size="34" font-family="Verdana, sans-serif">Weekly Wins</text>
  <text x="70" y="340" fill="#c7d4e9" font-size="24" font-family="Verdana, sans-serif">${winsText || 'No weekly wins yet'}</text>
  <text x="70" y="420" fill="#9fb3d1" font-size="24" font-family="Verdana, sans-serif">Badges: ${data.badges.filter((b: any) => b.unlocked).map((b: any) => b.label).join(', ') || 'None yet'}</text>
  <rect x="70" y="480" width="340" height="76" rx="16" fill="#ffffff14" stroke="#ffffff2c" />
  <text x="95" y="528" fill="#ffffff" font-size="34" font-family="Verdana, sans-serif" font-weight="700">pr-radar.app/u/${data.profile.login}</text>
</svg>`;

    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.send(svg);
  } catch (error) {
    console.error(`Failed to render public scorecard image for ${username}:`, error);
    res.status(500).send('Failed to generate scorecard image');
  }
};