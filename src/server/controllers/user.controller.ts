import { Request, Response } from 'express';
import { getOctokit, getUserProfile, checkRateLimit, handleRateLimitError } from '../services/github.service';
import { calculateMergeProbability } from '../services/scoring.service';
import { serverCache } from '../utils/cache';

/**
 * Ensures req.session has both accessToken and user.
 * If the user object is missing (e.g. after server restart clears in-memory sessions),
 * re-fetches the user profile from GitHub using the existing access token.
 * Returns the username or null if not authenticated.
 */
const getAuthenticatedUser = async (req: Request): Promise<{ username: string; accessToken: string } | null> => {
  // @ts-ignore
  const accessToken = req.session.accessToken;
  if (!accessToken) return null;

  // @ts-ignore
  if (!req.session.user || !req.session.user.login) {
    try {
      const userProfile = await getUserProfile(accessToken);
      // @ts-ignore
      req.session.user = userProfile;
    } catch (e) {
      console.error('Failed to rehydrate user profile:', e);
      return null;
    }
  }

  // @ts-ignore
  return { username: req.session.user.login, accessToken };
};

export const getMyPRs = async (req: Request, res: Response) => {
  const auth = await getAuthenticatedUser(req);
  if (!auth) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const cacheKey = `prs_${auth.username}`;
    const cached = serverCache.get(cacheKey);
    if (cached) return res.json(cached);

    checkRateLimit();
    const octokit = getOctokit(auth.accessToken);
    const { data } = await octokit.search.issuesAndPullRequests({
      q: `is:pr author:${auth.username}`,
      sort: 'updated',
      order: 'desc',
      per_page: 100
    });

    const prs = data.items.map(pr => ({
      ...pr,
      mergeProbability: calculateMergeProbability(pr),
    }));

    serverCache.set(cacheKey, prs);
    res.json(prs);
  } catch (error: any) {
    if (handleRateLimitError(error, res)) return;
    console.error('Failed to fetch user PRs:', error);
    res.status(500).json({ message: 'Failed to fetch user PRs' });
  }
};

export const getMyIssues = async (req: Request, res: Response) => {
  const auth = await getAuthenticatedUser(req);
  if (!auth) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const cacheKey = `issues_${auth.username}`;
    const cached = serverCache.get(cacheKey);
    if (cached) return res.json(cached);

    checkRateLimit();
    const octokit = getOctokit(auth.accessToken);
    const username = auth.username;

    // Optimized: fetch all issues in one call, derive open/closed from items
    // when total_count <= 100 (all items returned). Otherwise fall back to separate count queries.
    const dataRes = await octokit.search.issuesAndPullRequests({
      q: `is:issue author:${username}`,
      per_page: 100,
    });

    let openIssues: number;
    let closedIssues: number;

    if (dataRes.data.total_count <= 100) {
      // Derive counts from returned items — saves 2 API calls
      openIssues = dataRes.data.items.filter((i: any) => i.state === 'open').length;
      closedIssues = dataRes.data.items.filter((i: any) => i.state === 'closed').length;
    } else {
      // Fall back to count queries for accuracy when total > 100
      const [openRes, closedRes] = await Promise.all([
        octokit.search.issuesAndPullRequests({ q: `is:issue is:open author:${username}`, per_page: 1 }),
        octokit.search.issuesAndPullRequests({ q: `is:issue is:closed author:${username}`, per_page: 1 }),
      ]);
      openIssues = openRes.data.total_count;
      closedIssues = closedRes.data.total_count;
    }

    const result = {
      items: dataRes.data.items,
      stats: {
        totalIssues: dataRes.data.total_count,
        openIssues,
        closedIssues,
      }
    };

    serverCache.set(cacheKey, result);
    res.json(result);
  } catch (error: any) {
    if (handleRateLimitError(error, res)) return;
    console.error('Failed to fetch user issues:', error);
    res.status(500).json({ message: 'Failed to fetch user issues' });
  }
};

export const getDashboardStats = async (req: Request, res: Response) => {
  const auth = await getAuthenticatedUser(req);
  if (!auth) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const cacheKey = `stats_${auth.username}`;
    const cached = serverCache.get(cacheKey);
    if (cached) return res.json(cached);

    checkRateLimit();
    const octokit = getOctokit(auth.accessToken);
    const username = auth.username;

    // Fetch PR stats and contribution calendar in parallel
    const [recentPRsRes, contributionsRes] = await Promise.all([
      octokit.search.issuesAndPullRequests({
        q: `is:pr author:${username}`,
        sort: 'created',
        order: 'desc',
        per_page: 100,
      }),
      // GraphQL contribution calendar — the definitive source for streaks.
      // Counts everything GitHub considers a contribution: commits, PRs opened,
      // PR reviews, issues opened, etc.
      octokit.graphql<{ viewer: { contributionsCollection: { contributionCalendar: {
        weeks: { contributionDays: { date: string; contributionCount: number }[] }[]
      }}}}>(`query { viewer { contributionsCollection { contributionCalendar { weeks { contributionDays { date contributionCount } } } } } }`),
    ]);

    let mergedPRs: number;
    let openPRs: number;

    if (recentPRsRes.data.total_count <= 100) {
      mergedPRs = recentPRsRes.data.items.filter((pr: any) => pr.pull_request?.merged_at).length;
      openPRs = recentPRsRes.data.items.filter((pr: any) => pr.state === 'open').length;
    } else {
      const [mergedRes, openRes] = await Promise.all([
        octokit.search.issuesAndPullRequests({ q: `is:pr is:merged author:${username}`, per_page: 1 }),
        octokit.search.issuesAndPullRequests({ q: `is:pr state:open author:${username}`, per_page: 1 }),
      ]);
      mergedPRs = mergedRes.data.total_count;
      openPRs = openRes.data.total_count;
    }

    const totalPRs = recentPRsRes.data.total_count;
    const closedPRs = Math.max(0, totalPRs - mergedPRs - openPRs);
    const mergeRate = totalPRs > 0 ? Math.round((mergedPRs / totalPRs) * 100) : 0;

    // Build contribution map from GraphQL calendar (covers past year)
    const calendar = contributionsRes.viewer.contributionsCollection.contributionCalendar;
    const dayMap = new Map<string, number>();
    for (const week of calendar.weeks) {
      for (const day of week.contributionDays) {
        dayMap.set(day.date, day.contributionCount);
      }
    }

    // The GraphQL calendar can be delayed — today's PRs may not yet appear.
    // Supplement: if PRs were created within the last 48h, ensure those
    // calendar days get counted. We use the calendar's own newest date
    // (allDays[0]) as "today" so we match GitHub's timezone, not UTC.
    const sortedCalendarDates = Array.from(dayMap.keys()).sort((a, b) => b.localeCompare(a));
    const calendarToday = sortedCalendarDates[0]; // e.g. "2026-03-05"
    const calendarYesterday = sortedCalendarDates[1];

    if (calendarToday) {
      const todayStart = new Date(calendarToday + 'T00:00:00Z').getTime();
      const yesterdayStart = calendarYesterday ? new Date(calendarYesterday + 'T00:00:00Z').getTime() : 0;

      recentPRsRes.data.items.forEach(item => {
        const createdMs = new Date(item.created_at).getTime();
        // PR created after yesterday midnight (UTC approx) → count for today or yesterday
        if (createdMs >= todayStart) {
          dayMap.set(calendarToday, Math.max(dayMap.get(calendarToday) ?? 0, 1));
        } else if (yesterdayStart && createdMs >= yesterdayStart) {
          dayMap.set(calendarYesterday!, Math.max(dayMap.get(calendarYesterday!) ?? 0, 1));
        }
        const mergedAt = (item as any).pull_request?.merged_at;
        if (mergedAt) {
          const mergedMs = new Date(mergedAt).getTime();
          if (mergedMs >= todayStart) {
            dayMap.set(calendarToday, Math.max(dayMap.get(calendarToday) ?? 0, 1));
          } else if (yesterdayStart && mergedMs >= yesterdayStart) {
            dayMap.set(calendarYesterday!, Math.max(dayMap.get(calendarYesterday!) ?? 0, 1));
          }
        }
      });
    }

    const allDays = Array.from(dayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date));

    // Current streak: consecutive days with contributions from today/yesterday backwards
    let currentStreak = 0;
    let start = 0;
    // If today has no activity yet, allow starting from yesterday
    if (allDays[0]?.count === 0) start = 1;
    if (start < allDays.length && allDays[start].count > 0) {
      for (let i = start; i < allDays.length; i++) {
        if (allDays[i].count > 0) currentStreak++;
        else break;
      }
    }

    // Max streak: longest consecutive run with contributions
    let maxStreak = 0;
    let tempStreak = 0;
    for (let i = allDays.length - 1; i >= 0; i--) {
      if (allDays[i].count > 0) {
        tempStreak++;
        if (tempStreak > maxStreak) maxStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }

    // Activity dates for the weekly throughput chart (timestamps of active days)
    const recentActivityDates = allDays
      .filter(d => d.count > 0)
      .map(d => new Date(d.date + 'T00:00:00Z').getTime());



    const result = {
      totalPRs,
      mergedPRs,
      openPRs,
      closedPRs,
      mergeRate,
      currentStreak,
      maxStreak,
      recentActivityDates,
    };

    serverCache.set(cacheKey, result);
    res.json(result);
  } catch (error: any) {
    if (handleRateLimitError(error, res)) return;
    console.error('Failed to fetch dashboard stats:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
};