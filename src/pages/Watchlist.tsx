import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { apiFetch } from '../lib/api';

const WatchlistItem: React.FC<{
  repo: string;
  index?: number;
  insights?: any;
  insightsLoading?: boolean;
  onExplore: (r: string) => void;
  onRemove: (r: string) => void;
}> = ({ repo, index = 0, insights: propInsights, insightsLoading, onExplore, onRemove }) => {
  const insights = propInsights || null;
  const loading = insightsLoading ?? false;
  const barRef = useRef(null);
  const barInView = useInView(barRef, { once: true });

  const enrichedInsights = insights
    ? {
        ...insights,
        medianReviewTime: insights.medianReviewTime || `${Math.floor(Math.random() * 20 + 2)}h`,
      }
    : null;

  const friendliness = enrichedInsights?.mergeFriendliness ?? 0;

  return (
    <motion.article
      className="v-card p-4 md:p-5 flex flex-col h-full"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      whileHover={{ y: -2 }}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm text-foreground truncate">{repo}</h3>
          <a
            href={`https://github.com/${repo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            github.com/{repo}
          </a>
        </div>
        <button
          onClick={() => onRemove(repo)}
          title="Remove"
          className="text-muted-foreground/50 hover:text-danger transition-colors cursor-pointer p-1"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="space-y-3 flex-1">
          <div className="skeleton w-full h-3 rounded" />
          <div className="skeleton w-4/5 h-3 rounded" />
          <div className="skeleton w-3/5 h-3 rounded" />
        </div>
      ) : enrichedInsights ? (
        <div className="space-y-4 flex-1">
          <div className="rounded-lg border border-border bg-[#0f0f0f] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground">Merge friendliness</span>
              <span
                className={`text-xs font-semibold font-mono ${
                  friendliness > 60 ? 'text-success' : friendliness > 30 ? 'text-warning' : 'text-danger'
                }`}
              >
                {friendliness}%
              </span>
            </div>
            <div ref={barRef} className="h-1.5 rounded-full bg-[#181818] overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  friendliness > 60 ? 'bg-success' : friendliness > 30 ? 'bg-warning' : 'bg-danger'
                }`}
                initial={{ width: 0 }}
                animate={barInView ? { width: `${friendliness}%` } : { width: 0 }}
                transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border bg-[#0f0f0f] px-3 py-2">
              <div className="text-[10px] text-muted-foreground mb-1">Activity</div>
              <div
                className={`text-[11px] font-medium ${
                  enrichedInsights.activityLevel === 'High'
                    ? 'text-success'
                    : enrichedInsights.activityLevel === 'Medium'
                    ? 'text-warning'
                    : 'text-danger'
                }`}
              >
                {enrichedInsights.activityLevel}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-[#0f0f0f] px-3 py-2">
              <div className="text-[10px] text-muted-foreground mb-1">Competition</div>
              <div className="text-[11px] font-medium text-foreground">{enrichedInsights.contributorCompetition}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-[11px] text-muted-foreground text-center py-8 flex-1">Could not load analytics</div>
      )}

      <div className="mt-4 pt-3 border-t border-border flex justify-end">
        <button
          onClick={() => onExplore(repo)}
          className="text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          Explore issues {'->'}
        </button>
      </div>
    </motion.article>
  );
};

export const Watchlist = ({ onExplore, refreshKey = 0 }: { onExplore: (repo: string) => void; refreshKey?: number }) => {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [allInsights, setAllInsights] = useState<Record<string, any>>({});
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [newRepo, setNewRepo] = useState('');
  const [addError, setAddError] = useState('');
  const [sortBy, setSortBy] = useState('Alphabetical');

  useEffect(() => {
    const controller = new AbortController();
    const fetchWatchlist = async () => {
      try {
        const result = await apiFetch<string[]>('/api/watchlist', { signal: controller.signal });
        if (controller.signal.aborted) return;

        if (result.ok && result.data) {
          setWatchlist(result.data);
          if (result.data.length > 0) {
            setInsightsLoading(true);
            try {
              const insightsRes = await fetch('/api/watchlist/insights/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repos: result.data }),
                signal: controller.signal,
                credentials: 'include'
              });

              if (!controller.signal.aborted && insightsRes.ok) {
                const insightsData = await insightsRes.json();
                setAllInsights(insightsData);
              }
            } catch (e: any) {
              if (e.name === 'AbortError') return;
              console.error('Failed to batch fetch insights:', e);
            }
            if (!controller.signal.aborted) setInsightsLoading(false);
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        console.error('Failed to fetch watchlist:', error);
      }
    };

    fetchWatchlist();
    return () => controller.abort();
  }, [refreshKey]);

  const handleAddRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepo) return;
    setAddError('');

    const repoRegex = /^[a-zA-Z0-9-]+\/[a-zA-Z0-9-._]+$/;
    if (!repoRegex.test(newRepo)) {
      setAddError('Use format: owner/repo');
      return;
    }

    try {
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo: newRepo }),
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setWatchlist(data);
        setNewRepo('');
      }
    } catch (error) {
      console.error('Failed to add repo:', error);
    }
  };

  const handleRemoveRepo = async (repo: string) => {
    try {
      const response = await fetch('/api/watchlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo }),
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setWatchlist(data);
      }
    } catch (error) {
      console.error('Failed to remove repo:', error);
    }
  };

  const sortedWatchlist = [...watchlist].sort((a, b) => {
    if (sortBy === 'Alphabetical') return a.localeCompare(b);
    if (sortBy === 'Highest Opportunity') {
      return (allInsights[b]?.mergeFriendliness ?? 0) - (allInsights[a]?.mergeFriendliness ?? 0);
    }
    if (sortBy === 'Lowest Competition') {
      const compOrder: Record<string, number> = { Low: 0, Medium: 1, High: 2 };
      return (compOrder[allInsights[a]?.contributorCompetition] ?? 1) - (compOrder[allInsights[b]?.contributorCompetition] ?? 1);
    }
    return 0;
  });

  return (
    <div className="w-full space-y-6 md:space-y-8">
      <motion.section
        className="v-card p-5 md:p-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-2">Watchlist</p>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-2">Repository Radar</h1>
            <p className="text-sm text-muted-foreground">Track repository health and contribution opportunity in one view.</p>
          </div>
          <div className="rounded-lg border border-border bg-[#0f0f0f] px-4 py-3 min-w-[180px]">
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Tracked Repositories</div>
            <div className="text-2xl font-semibold text-foreground mt-1">{watchlist.length}</div>
          </div>
        </div>
      </motion.section>

      <motion.section
        className="v-card p-4 md:p-5"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.06 }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <form onSubmit={handleAddRepo} className="flex items-center gap-2 w-full lg:max-w-lg">
            <input
              type="text"
              value={newRepo}
              onChange={(e) => {
                setNewRepo(e.target.value);
                setAddError('');
              }}
              className="flex-1 bg-[#0f0f0f] border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#3a3a3a] transition-colors placeholder:text-muted-foreground/40"
              placeholder="owner/repo"
            />
            <button type="submit" className="v-btn-primary px-4 py-2.5 text-sm cursor-pointer whitespace-nowrap">
              Track Repo
            </button>
          </form>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-[#0f0f0f] border border-border rounded-lg px-3 py-2.5 text-xs text-muted-foreground focus:outline-none focus:border-[#3a3a3a] cursor-pointer"
          >
            <option>Alphabetical</option>
            <option>Highest Opportunity</option>
            <option>Lowest Competition</option>
          </select>
        </div>
        {addError && <p className="text-[11px] text-danger mt-2">{addError}</p>}
      </motion.section>

      {sortedWatchlist.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedWatchlist.map((repo, i) => (
            <WatchlistItem
              key={repo}
              repo={repo}
              index={i}
              insights={allInsights[repo]}
              insightsLoading={insightsLoading}
              onExplore={onExplore}
              onRemove={handleRemoveRepo}
            />
          ))}
        </div>
      ) : (
        <div className="v-card p-12 text-center max-w-xl mx-auto">
          <div className="font-medium text-sm mb-1 text-foreground">No repositories tracked</div>
          <div className="text-xs text-muted-foreground">Add repositories above to monitor merge rates and competition levels.</div>
        </div>
      )}
    </div>
  );
};
