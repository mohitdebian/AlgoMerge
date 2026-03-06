import { Request, Response } from 'express';
import { getOctokit, checkRateLimit, handleRateLimitError } from '../services/github.service.js';
import { calculateMergeProbability } from '../services/scoring.service.js';
import { serverCache } from '../utils/cache.js';

type WeeklyMomentumPoint = {
  weekLabel: string;
  activeDays: number;
  createdPRs: number;
  mergedPRs: number;
  consistencyScore: number;
  impactScore: number;
  consistencyGrade: number;
  impactGrade: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const getWeekStartUtc = (timestamp: number) => {
  const day = new Date(timestamp).getUTCDay();
  const mondayOffset = (day + 6) % 7;
  return timestamp - (mondayOffset * DAY_MS);
};

const gradeFromScore = (score: number): number => {
  return Math.round((score / 10) * 10) / 10;
};

const formatWeekLabel = (weekStartUtc: number) => {
  const endDate = new Date(weekStartUtc + (6 * DAY_MS));
  return endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const getAuthenticatedUser = (req: Request): { username: string; accessToken: string } | null => {
  if (!req.user) return null;
  return { username: req.user.username, accessToken: req.user.accessToken };
};

export const getMyPRs = async (req: Request, res: Response) => {
  const auth = getAuthenticatedUser(req);
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
  const auth = getAuthenticatedUser(req);
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
  const auth = getAuthenticatedUser(req);
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



    // Weekly momentum trend (oldest -> newest)
    const now = new Date();
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const currentWeekStartUtc = getWeekStartUtc(todayUtc);

    const weeklyMomentum: WeeklyMomentumPoint[] = Array.from({ length: 8 }).map((_, index) => {
      const weekStartUtc = currentWeekStartUtc - ((7 - index) * 7 * DAY_MS);
      const weekEndUtc = weekStartUtc + (7 * DAY_MS);

      let activeDays = 0;
      dayMap.forEach((count, date) => {
        if (!count) return;
        const dateUtc = new Date(date + 'T00:00:00Z').getTime();
        if (dateUtc >= weekStartUtc && dateUtc < weekEndUtc) activeDays++;
      });

      const createdPRs = recentPRsRes.data.items.filter(item => {
        const createdAt = new Date(item.created_at).getTime();
        return createdAt >= weekStartUtc && createdAt < weekEndUtc;
      }).length;

      const mergedInWeek = recentPRsRes.data.items.filter((item: any) => {
        const mergedAt = item.pull_request?.merged_at;
        if (!mergedAt) return false;
        const mergedUtc = new Date(mergedAt).getTime();
        return mergedUtc >= weekStartUtc && mergedUtc < weekEndUtc;
      }).length;

      const consistencyScore = Math.round((activeDays / 7) * 100);
      const impactScore = Math.min(100, Math.round((mergedInWeek * 28) + (createdPRs * 10) + (consistencyScore * 0.22)));

      return {
        weekLabel: formatWeekLabel(weekStartUtc),
        activeDays,
        createdPRs,
        mergedPRs: mergedInWeek,
        consistencyScore,
        impactScore,
        consistencyGrade: gradeFromScore(consistencyScore),
        impactGrade: gradeFromScore(impactScore),
      };
    });

    const currentWeekMomentum = weeklyMomentum[weeklyMomentum.length - 1];
    const previousWeekMomentum = weeklyMomentum[weeklyMomentum.length - 2];

    // Challenge mode targets use current week progress.
    const firstSeenRepoCreatedAt = new Map<string, number>();
    recentPRsRes.data.items.forEach((item) => {
      const repoSlug = item.repository_url?.split('/repos/')[1] || '';
      if (!repoSlug) return;
      const createdAt = new Date(item.created_at).getTime();
      const currentMin = firstSeenRepoCreatedAt.get(repoSlug);
      if (!currentMin || createdAt < currentMin) {
        firstSeenRepoCreatedAt.set(repoSlug, createdAt);
      }
    });

    const newReposTouchedThisWeek = Array.from(firstSeenRepoCreatedAt.values()).filter(
      (createdAt) => createdAt >= currentWeekStartUtc && createdAt < (currentWeekStartUtc + (7 * DAY_MS))
    ).length;

    const challenges = [
      {
        id: 'merge-sprint',
        title: 'Merge Sprint',
        detail: 'Merge 2 pull requests this week.',
        target: 2,
        progress: currentWeekMomentum.mergedPRs,
      },
      {
        id: 'new-repo-move',
        title: 'New Repo Move',
        detail: 'Open a PR in one new repository this week.',
        target: 1,
        progress: newReposTouchedThisWeek,
      },
      {
        id: 'consistency-5',
        title: 'Consistency 5',
        detail: 'Hit 5 active contribution days this week.',
        target: 5,
        progress: currentWeekMomentum.activeDays,
      },
    ].map((challenge) => ({
      ...challenge,
      complete: challenge.progress >= challenge.target,
    }));

    // Habit nudges become actionable when momentum dips.
    const nudges: { id: string; message: string; tone: 'up' | 'neutral' | 'alert' }[] = [];
    if (previousWeekMomentum && (currentWeekMomentum.consistencyScore + 15) < previousWeekMomentum.consistencyScore) {
      nudges.push({
        id: 'consistency-dip',
        tone: 'alert',
        message: `Consistency dropped ${previousWeekMomentum.consistencyScore - currentWeekMomentum.consistencyScore} points week-over-week. Schedule one short coding session today.`,
      });
    }
    if (openPRs >= 3 && currentWeekMomentum.mergedPRs === 0) {
      nudges.push({
        id: 'review-bottleneck',
        tone: 'neutral',
        message: 'You have 3+ open PRs with no merges this week. Prioritize one review-ready PR to regain momentum.',
      });
    }
    if (currentStreak === 0) {
      nudges.push({
        id: 'restart-streak',
        tone: 'up',
        message: 'Fresh week, fresh streak. One meaningful contribution today restarts your momentum chain.',
      });
    }
    if (nudges.length === 0) {
      nudges.push({
        id: 'steady-pace',
        tone: 'up',
        message: 'Momentum is stable this week. Keep shipping small merged changes to level up.',
      });
    }

    const mergedLast30Days = recentPRsRes.data.items.filter((item: any) => {
      const mergedAt = item.pull_request?.merged_at;
      if (!mergedAt) return false;
      return (todayUtc - new Date(mergedAt).getTime()) <= (30 * DAY_MS);
    }).length;

    const bestStreakSeen = Math.max(currentStreak, maxStreak);
    const badges = [
      {
        id: 'first-merge',
        label: 'First Merge',
        detail: 'Complete your first merged PR.',
        target: 1,
        progress: Math.min(mergedPRs, 1),
      },
      {
        id: 'ten-merges',
        label: 'Double Digits',
        detail: 'Reach 10 merged PRs.',
        target: 10,
        progress: Math.min(mergedPRs, 10),
      },
      {
        id: 'quality-ace',
        label: 'Quality Ace',
        detail: 'Maintain a 70% merge rate.',
        target: 70,
        progress: Math.min(mergeRate, 70),
      },
      {
        id: 'streak-warrior',
        label: 'Streak Warrior',
        detail: 'Hold a 7-day contribution streak.',
        target: 7,
        progress: Math.min(bestStreakSeen, 7),
      },
      {
        id: 'monthly-closer',
        label: 'Monthly Closer',
        detail: 'Merge 5 PRs in the last 30 days.',
        target: 5,
        progress: Math.min(mergedLast30Days, 5),
      },
    ].map((badge) => ({
      ...badge,
      unlocked: badge.progress >= badge.target,
    }));

    const result = {
      totalPRs,
      mergedPRs,
      openPRs,
      closedPRs,
      mergeRate,
      currentStreak,
      maxStreak,
      recentActivityDates,
      momentum: {
        weekly: weeklyMomentum,
        currentConsistencyGrade: currentWeekMomentum.consistencyGrade,
        currentImpactGrade: currentWeekMomentum.impactGrade,
      },
      challenges,
      nudges,
      badges,
    };

    serverCache.set(cacheKey, result);
    res.json(result);
  } catch (error: any) {
    if (handleRateLimitError(error, res)) return;
    console.error('Failed to fetch dashboard stats:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
};