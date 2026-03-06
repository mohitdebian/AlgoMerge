import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { IssueCard } from '../components/IssueCard';
import { apiFetch, invalidateCachePrefix } from '../lib/api';

export const Discover = ({
  initialRepo,
  onAnalyze,
  selectedRepoInfo,
  onSelectRepo,
  onTrackedRepo
}: {
  initialRepo?: string | null;
  onAnalyze?: (issue: any) => void;
  selectedRepoInfo?: { repo: string; desc?: string; stars?: number; language?: string } | null;
  onSelectRepo?: (info: any) => void;
  onTrackedRepo?: (repo: string, updatedWatchlist?: string[]) => void;
}) => {
  const PRESET_STORAGE_KEY = 'pr_radar_discover_presets';
  const [repo, setRepo] = useState(initialRepo || '');
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [searched, setSearched] = useState(false);
  const [trending, setTrending] = useState<any[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [trackFeedback, setTrackFeedback] = useState<string>('');
  const [presetName, setPresetName] = useState('');
  const [presets, setPresets] = useState<Array<{ id: string; name: string; repo: string; filter: string }>>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PRESET_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setPresets(parsed.filter((p) => p?.id && p?.name && p?.repo));
      }
    } catch {
      // Ignore invalid local preset data
    }
  }, []);

  const savePresets = (next: Array<{ id: string; name: string; repo: string; filter: string }>) => {
    setPresets(next);
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(next));
  };

  useEffect(() => {
    const controller = new AbortController();
    const fetchTrending = async () => {
      setTrendingLoading(true);
      try {
        const result = await apiFetch('/api/trending', { signal: controller.signal });
        if (!controller.signal.aborted && result.ok) {
          setTrending(result.data);
        }
      } catch (e: any) {
        if (e.name === 'AbortError') return;
        console.error('Failed to fetch trending repos:', e);
      }
      if (!controller.signal.aborted) setTrendingLoading(false);
    };

    fetchTrending();
    return () => controller.abort();
  }, []);

  const loadIssues = async (repoToFetch: string, filterToFetch: string) => {
    setLoading(true);
    setSearched(true);
    try {
      const [owner, name] = repoToFetch.split('/');
      if (!owner || !name) throw new Error('Invalid repo format');

      const response = await fetch(`/api/issues/${owner}/${name}?labels=${filterToFetch}`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setIssues(data);
      } else {
        setIssues([]);
      }
    } catch (error) {
      console.error('Failed to fetch issues:', error);
      setIssues([]);
    }
    setLoading(false);
  };

  const fetchRepoInfo = async (repoFullName: string) => {
    const [owner, name] = repoFullName.split('/');
    if (!owner || !name) {
      onSelectRepo?.({ repo: repoFullName });
      return;
    }

    try {
      const res = await fetch(`/api/repos/${owner}/${name}`, { credentials: 'include' });
      if (res.ok) {
        const info = await res.json();
        onSelectRepo?.(info);
      } else {
        onSelectRepo?.({ repo: repoFullName });
      }
    } catch {
      onSelectRepo?.({ repo: repoFullName });
    }
  };

  React.useEffect(() => {
    if (initialRepo) {
      setRepo(initialRepo);
      loadIssues(initialRepo, filter);

      const needsRepoMeta = !selectedRepoInfo || selectedRepoInfo.repo !== initialRepo || selectedRepoInfo.stars === undefined;
      if (needsRepoMeta) {
        fetchRepoInfo(initialRepo);
      }
    }
  }, [initialRepo]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (repo.includes('/')) {
      if (onSelectRepo && (!selectedRepoInfo || selectedRepoInfo.repo !== repo || selectedRepoInfo.stars === undefined)) {
        await fetchRepoInfo(repo);
      }
    }
    loadIssues(repo, filter);
  };

  const handleTrackRepository = async () => {
    if (!repo) return;
    setIsTracking(true);
    setTrackFeedback('');
    try {
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo }),
        credentials: 'include'
      });
      if (response.ok) {
        const updatedWatchlist = await response.json();
        invalidateCachePrefix('/api/watchlist');
        setTrackFeedback(`Added ${repo} to watchlist`);
        onTrackedRepo?.(repo, Array.isArray(updatedWatchlist) ? updatedWatchlist : undefined);
      } else {
        setTrackFeedback('Could not add repository to watchlist');
      }
    } catch (e) {
      console.error('Failed to track repository:', e);
      setTrackFeedback('Could not add repository to watchlist');
    }
    setIsTracking(false);
  };

  const handleFilterClick = (newFilter: string) => {
    setFilter(newFilter);
    if (repo.includes('/')) {
      loadIssues(repo, newFilter);
    }
  };

  const handleSavePreset = () => {
    const cleanRepo = repo.trim();
    const cleanName = presetName.trim();
    if (!cleanRepo.includes('/') || !cleanName) return;

    const next = [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: cleanName,
        repo: cleanRepo,
        filter,
      },
      ...presets,
    ].slice(0, 8);

    savePresets(next);
    setPresetName('');
  };

  const handleApplyPreset = async (preset: { repo: string; filter: string }) => {
    setRepo(preset.repo);
    setFilter(preset.filter);
    setSearched(true);
    await fetchRepoInfo(preset.repo);
    loadIssues(preset.repo, preset.filter);
  };

  const handleDeletePreset = (id: string) => {
    savePresets(presets.filter((p) => p.id !== id));
  };

  const handleBackToTrending = () => {
    setSearched(false);
    setIssues([]);
    setRepo('');
    setFilter('');
    onSelectRepo?.(null);
  };

  const formatStars = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  };

  const normalizeTrendingRepo = (item: any) => {
    const repoName = item.repo || item.full_name || item.name || '';
    return {
      repo: repoName,
      desc: item.desc || item.description || 'No description available.',
      language: item.language || 'Unknown',
      stars: typeof item.stars === 'number' ? item.stars : (item.stargazers_count || 0),
      starsToday: item.starsToday || 0,
    };
  };

  const filters = [
    { label: 'All', value: '' },
    { label: 'Good First Issue', value: 'good first issue' },
    { label: 'Help Wanted', value: 'help wanted' },
    { label: 'Bug', value: 'bug' },
    { label: 'Enhancement', value: 'enhancement' }
  ];

  return (
    <div className="w-full space-y-6 md:space-y-8">
      <motion.section
        className="v-card p-5 md:p-6 relative overflow-hidden"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-white/5 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Discovery</p>
            {searched && (
              <button
                onClick={handleBackToTrending}
                className="text-base md:text-lg font-semibold tracking-tight text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Back to Trending
              </button>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-2">Find High-Value Issues</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">Search any repository, filter contribution labels, and prioritize issues with clearer decision signals.</p>
        </div>
      </motion.section>

      <motion.section
        className="v-card p-4 md:p-5"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.06 }}
      >
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              className="w-full bg-[#0f0f0f] border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#3a3a3a] transition-colors placeholder:text-muted-foreground/40"
              placeholder="owner/repository (e.g. vercel/next.js)"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="v-btn-primary px-5 py-2.5 text-sm disabled:opacity-50 cursor-pointer md:w-auto w-full"
          >
            {loading ? 'Loading...' : 'Search Issues'}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-border/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Preset name (e.g. Next.js good-first-issues)"
              className="flex-1 bg-[#0f0f0f] border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#3a3a3a] transition-colors placeholder:text-muted-foreground/40"
            />
            <button
              type="button"
              onClick={handleSavePreset}
              disabled={!repo.includes('/') || !presetName.trim()}
              className="v-btn-secondary px-3 py-2 text-xs disabled:opacity-50"
            >
              Save Preset
            </button>
          </div>

          {presets.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-2">Saved Presets</div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {presets.map((preset) => (
                  <div key={preset.id} className="flex items-center gap-1 rounded-md border border-border bg-[#0f0f0f] px-2 py-1">
                    <button
                      type="button"
                      onClick={() => void handleApplyPreset(preset)}
                      className="text-[11px] text-foreground hover:text-white whitespace-nowrap"
                      title={`${preset.repo}${preset.filter ? ` • ${preset.filter}` : ''}`}
                    >
                      {preset.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePreset(preset.id)}
                      className="text-[11px] text-muted-foreground hover:text-danger px-1"
                      title="Delete preset"
                      aria-label={`Delete preset ${preset.name}`}
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {searched && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground uppercase tracking-[0.14em]">Issue Filters</span>
            </div>
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-1">
              {filters.map((f) => (
                <button
                  key={f.value}
                  onClick={() => handleFilterClick(f.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer whitespace-nowrap ${
                    filter === f.value
                      ? 'bg-white/[0.08] text-foreground border border-white/[0.12]'
                      : 'text-muted-foreground hover:text-foreground hover:bg-[#111] border border-transparent'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.section>

      {searched && selectedRepoInfo && (
        <motion.section
          className="v-card p-4 md:p-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-semibold tracking-tight text-foreground truncate">{selectedRepoInfo.repo}</h2>
                <a
                  href={`https://github.com/${selectedRepoInfo.repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Open repository"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                {selectedRepoInfo.language && (
                  <span className="px-2 py-1 rounded-md border border-border bg-[#0f0f0f] text-muted-foreground">{selectedRepoInfo.language}</span>
                )}
                <span className="text-muted-foreground">{formatStars(selectedRepoInfo.stars || 0)} stars</span>
              </div>
              {selectedRepoInfo.desc && <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">{selectedRepoInfo.desc}</p>}
            </div>
            <button
              onClick={handleTrackRepository}
              disabled={isTracking}
              className="v-btn-secondary px-4 py-2 text-xs shrink-0 disabled:opacity-50 cursor-pointer"
            >
              {isTracking ? 'Tracking...' : 'Track Repo'}
            </button>
          </div>
          {trackFeedback && (
            <p className="mt-3 text-xs text-success">{trackFeedback}</p>
          )}
        </motion.section>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="v-card p-5">
              <div className="skeleton w-3/4 h-4 rounded mb-3" />
              <div className="skeleton w-full h-2 rounded mb-2" />
              <div className="skeleton w-2/3 h-2 rounded mb-4" />
              <div className="flex gap-2">
                <div className="skeleton w-20 h-5 rounded" />
                <div className="skeleton w-20 h-5 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : searched ? (
        issues.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">Matched Issues</h2>
              <span className="text-[11px] text-muted-foreground">{issues.length} results</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {issues.map((issue, i) => (
                <IssueCard key={issue.id} issue={issue} index={i} onAnalyze={onAnalyze} />
              ))}
            </div>
          </div>
        ) : (
          <div className="v-card p-12 text-center max-w-xl mx-auto">
            <div className="font-medium text-sm mb-1 text-foreground">No actionable issues found</div>
            <div className="text-xs text-muted-foreground">Try loosening filters or selecting another repository.</div>
          </div>
        )
      ) : (
        <motion.section
          className="v-card p-4 md:p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.12 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">Trending on GitHub</h2>
            <span className="text-[10px] text-muted-foreground">github.com/trending</span>
          </div>

          {trendingLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="v-card p-5">
                  <div className="skeleton w-2/3 h-4 rounded mb-3" />
                  <div className="skeleton w-full h-2 rounded mb-2" />
                  <div className="skeleton w-4/5 h-2 rounded mb-4" />
                  <div className="flex gap-2">
                    <div className="skeleton w-16 h-5 rounded" />
                    <div className="skeleton w-20 h-5 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : trending.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {trending.map((item: any, i: number) => {
                const normalized = normalizeTrendingRepo(item);
                return (
                <motion.button
                  key={normalized.repo || i}
                  onClick={() => {
                    if (!normalized.repo) return;
                    setRepo(normalized.repo);
                    onSelectRepo?.({
                      repo: normalized.repo,
                      desc: normalized.desc,
                      stars: normalized.stars,
                      language: normalized.language
                    });
                    void fetchRepoInfo(normalized.repo);
                    loadIssues(normalized.repo, '');
                  }}
                  className="v-card p-4 text-left flex flex-col h-full cursor-pointer hover:border-white/[0.15] transition-colors"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.04 }}
                  whileHover={{ y: -2 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-[13px] text-foreground truncate pr-2">{normalized.repo || 'Unknown repository'}</h3>
                    <span className="text-[10px] text-muted-foreground font-mono">{formatStars(normalized.stars)}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/70 line-clamp-2 leading-relaxed flex-1">{normalized.desc}</p>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-border text-[10px]">
                    {normalized.language && normalized.language !== 'Unknown' ? <span className="text-muted-foreground">{normalized.language}</span> : <span />}
                    {normalized.starsToday > 0 && <span className="text-success font-mono">+{formatStars(normalized.starsToday)}</span>}
                  </div>
                </motion.button>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8 text-xs">Could not load trending repos. Try refreshing.</div>
          )}
        </motion.section>
      )}
    </div>
  );
};
