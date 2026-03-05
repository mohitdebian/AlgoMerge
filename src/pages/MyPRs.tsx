import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { PRCard } from '../components/PRCard';
import { apiFetch } from '../lib/api';

export const MyPRs = ({ onAnalyze }: { onAnalyze?: (issue: any) => void }) => {
  const [prs, setPRs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'All' | 'Merged' | 'Review Required' | 'Changes Required'>('All');

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      try {
        const [prsResult, statsResult] = await Promise.all([
          apiFetch('/api/user/prs', { signal: controller.signal }),
          apiFetch('/api/user/dashboard', { signal: controller.signal })
        ]);

        if (controller.signal.aborted) return;

        if (prsResult.ok) setPRs(prsResult.data);
        if (statsResult.ok) setStats(statsResult.data);
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        console.error('Failed to fetch user data:', error);
      }
      if (!controller.signal.aborted) setLoading(false);
    };

    fetchData();
    return () => controller.abort();
  }, []);

  const filteredPRs = prs.filter((pr) => {
    if (filter === 'All') return true;
    if (filter === 'Merged') return !!pr.pull_request?.merged_at;
    if (filter === 'Review Required') return pr.state === 'open' && !pr.pull_request?.merged_at && pr.comments === 0;
    if (filter === 'Changes Required') return pr.state === 'open' && !pr.pull_request?.merged_at && Math.abs(pr.comments || 0) > 0;
    return true;
  });

  const statTiles = [
    { label: 'Total', value: stats?.totalPRs ?? 0, valueClass: 'text-foreground' },
    { label: 'Merged', value: stats?.mergedPRs ?? 0, valueClass: 'text-success' },
    { label: 'Open', value: stats?.openPRs ?? 0, valueClass: 'text-warning' },
    { label: 'Closed', value: stats?.closedPRs ?? 0, valueClass: 'text-danger' }
  ];

  return (
    <div className="w-full space-y-6 md:space-y-8">
      <motion.section
        className="v-card p-5 md:p-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-2">Contributions</p>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-2">My Pull Requests</h1>
        <p className="text-sm text-muted-foreground">Track PR status, isolate bottlenecks, and focus on merge-ready work.</p>
      </motion.section>

      {!loading && stats && (
        <motion.section
          className="grid grid-cols-2 xl:grid-cols-4 gap-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.06 }}
        >
          {statTiles.map((item) => (
            <div key={item.label} className="v-card p-4">
              <div className={`text-2xl font-semibold tracking-tight ${item.valueClass}`}>{item.value}</div>
              <div className="text-[11px] text-muted-foreground mt-1 uppercase tracking-[0.14em]">{item.label}</div>
            </div>
          ))}
        </motion.section>
      )}

      <motion.section
        className="v-card p-4 md:p-5"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Filters</h2>
          {filteredPRs.length > 0 && <span className="text-[11px] text-muted-foreground">Showing up to 30</span>}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {['All', 'Merged', 'Review Required', 'Changes Required'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer border ${
                filter === f
                  ? 'bg-white/[0.08] text-foreground border-white/[0.12]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-[#111] border-transparent'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </motion.section>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="v-card p-5">
              <div className="skeleton w-3/4 h-4 rounded mb-3" />
              <div className="skeleton w-full h-2 rounded mb-3" />
              <div className="flex gap-2">
                <div className="skeleton w-20 h-5 rounded" />
                <div className="skeleton w-20 h-5 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredPRs.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredPRs.map((pr, i) => (
            <PRCard key={pr.id} pr={pr} index={i} onAnalyze={onAnalyze} />
          ))}
        </div>
      ) : (
        <div className="v-card p-12 text-center max-w-xl mx-auto">
          <div className="font-medium text-sm mb-1 text-foreground">No pull requests found</div>
          <div className="text-xs text-muted-foreground">Try adjusting your filters or discover issues to contribute to.</div>
        </div>
      )}
    </div>
  );
};
