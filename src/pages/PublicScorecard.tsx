import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { apiFetch } from '../lib/api';

type PublicScorecardResponse = {
  username: string;
  profile: {
    login: string;
    name?: string;
    avatarUrl: string;
    bio?: string;
    followers?: number;
    publicRepos?: number;
    htmlUrl: string;
  };
  totals: {
    totalPRs: number;
    mergedPRs: number;
    mergeRate: number;
    currentStreak: number;
    maxStreak: number;
  };
  weeklyWins: Array<{
    weekLabel: string;
    activeDays: number;
    events: number;
    momentum: number;
  }>;
  badges: Array<{
    id: string;
    label: string;
    unlocked: boolean;
  }>;
  generatedAt: string;
};

export const PublicScorecard = ({ username }: { username: string }) => {
  const [data, setData] = useState<PublicScorecardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await apiFetch<PublicScorecardResponse>(`/api/public/${encodeURIComponent(username)}`, {
          signal: controller.signal,
          cacheTTL: 5 * 60 * 1000,
        });

        if (!result.ok || !result.data) {
          setError(result.status === 404 ? 'User not found on GitHub.' : 'Failed to load public scorecard.');
          return;
        }

        setData(result.data);
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        setError('Failed to load public scorecard.');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => controller.abort();
  }, [username]);

  const pageUrl = useMemo(() => `${window.location.origin}/u/${encodeURIComponent(username)}`, [username]);
  const shareCardUrl = useMemo(() => `${window.location.origin}/api/public/${encodeURIComponent(username)}/share-card.svg`, [username]);
  const shareText = useMemo(() => `Check out @${username}'s PR Radar scorecard: momentum, streak, badges, and weekly wins.`, [username]);

  const xShareUrl = `https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(pageUrl)}`;
  const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
    } catch (err) {
      console.error('Failed to copy profile URL:', err);
    }
  };

  const copyImageUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareCardUrl);
    } catch (err) {
      console.error('Failed to copy share image URL:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-muted-foreground">Loading public scorecard...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="v-card p-6 max-w-md text-center">
          <h1 className="text-xl font-semibold text-foreground">Public Scorecard Unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error || 'Unable to load scorecard.'}</p>
          <a href="/" className="v-btn-secondary inline-flex mt-4 px-4 py-2 text-sm">Back to PR Radar</a>
        </div>
      </div>
    );
  }

  const unlockedBadges = data.badges.filter((badge) => badge.unlocked);

  return (
    <div className="min-h-screen px-4 sm:px-6 py-8 sm:py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <motion.header
          className="v-card p-5 md:p-7 relative overflow-hidden"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-success/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={data.profile.avatarUrl} alt={data.profile.login} className="w-16 h-16 rounded-full border border-border" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{data.profile.name || data.profile.login}</h1>
                <p className="text-sm text-muted-foreground">@{data.profile.login}</p>
                {data.profile.bio && <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{data.profile.bio}</p>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a href={xShareUrl} target="_blank" rel="noopener noreferrer" className="v-btn-primary text-xs px-3 py-2">Share to X</a>
              <a href={linkedinShareUrl} target="_blank" rel="noopener noreferrer" className="v-btn-secondary text-xs px-3 py-2">Share to LinkedIn</a>
              <a href={shareCardUrl} target="_blank" rel="noopener noreferrer" className="v-btn-secondary text-xs px-3 py-2">Open Share Card</a>
              <a href={shareCardUrl} download={`pr-radar-${data.profile.login}-card.svg`} className="v-btn-secondary text-xs px-3 py-2">Download Card</a>
              <button onClick={copyLink} className="v-btn-secondary text-xs px-3 py-2">Copy Link</button>
              <button onClick={copyImageUrl} className="v-btn-secondary text-xs px-3 py-2">Copy Card URL</button>
            </div>
          </div>
        </motion.header>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="v-card p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Momentum</div>
            <div className="text-2xl font-semibold text-foreground mt-1">{data.weeklyWins[data.weeklyWins.length - 1]?.momentum || 0}</div>
          </div>
          <div className="v-card p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Current Streak</div>
            <div className="text-2xl font-semibold text-foreground mt-1">{data.totals.currentStreak}d</div>
          </div>
          <div className="v-card p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Merge Rate</div>
            <div className="text-2xl font-semibold text-foreground mt-1">{data.totals.mergeRate}%</div>
          </div>
          <div className="v-card p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Merged PRs</div>
            <div className="text-2xl font-semibold text-foreground mt-1">{data.totals.mergedPRs}</div>
          </div>
          <div className="v-card p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Followers</div>
            <div className="text-2xl font-semibold text-foreground mt-1">{data.profile.followers || 0}</div>
          </div>
        </div>

        <section className="v-card p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Weekly Wins</h2>
            <span className="text-xs text-muted-foreground">Last 6 weeks</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
            {data.weeklyWins.map((week) => (
              <div key={week.weekLabel} className="rounded-lg border border-border bg-[#101010] p-3">
                <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{week.weekLabel}</div>
                <div className="text-lg font-semibold text-foreground mt-1">{week.momentum}</div>
                <div className="text-[11px] text-muted-foreground mt-2">{week.activeDays} active days</div>
                <div className="text-[11px] text-muted-foreground">{week.events} public events</div>
              </div>
            ))}
          </div>
        </section>

        <section className="v-card p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Milestone Badges</h2>
            <span className="text-xs text-muted-foreground">{unlockedBadges.length}/{data.badges.length} unlocked</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
            {data.badges.map((badge) => (
              <div key={badge.id} className={`rounded-lg border p-3 ${badge.unlocked ? 'border-success/30 bg-success/8' : 'border-border bg-[#101010]'}`}>
                <div className={`text-sm font-semibold ${badge.unlocked ? 'text-success' : 'text-foreground'}`}>{badge.label}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">{badge.unlocked ? 'Unlocked' : 'Locked'}</div>
              </div>
            ))}
          </div>
        </section>

        <div className="text-center text-xs text-muted-foreground pb-6">
          Updated {new Date(data.generatedAt).toLocaleString()} · Powered by GitHub public data
        </div>
      </div>
    </div>
  );
};
