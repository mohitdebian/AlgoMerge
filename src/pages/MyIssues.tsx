import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { IssueCard } from '../components/IssueCard';
import { apiFetch } from '../lib/api';

export const MyIssues = ({ onAnalyze }: { onAnalyze?: (issue: any) => void }) => {
  const [issues, setIssues] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const fetchIssues = async () => {
      setLoading(true);
      try {
        const result = await apiFetch('/api/user/issues', { signal: controller.signal });
        if (!controller.signal.aborted && result.ok) {
          setIssues(result.data.items || []);
          setStats(result.data.stats || null);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        console.error('Failed to fetch issues:', error);
      }
      if (!controller.signal.aborted) setLoading(false);
    };

    fetchIssues();
    return () => controller.abort();
  }, []);

  const statTiles = [
    { label: 'Total', value: stats?.totalIssues ?? 0, valueClass: 'text-foreground' },
    { label: 'Open', value: stats?.openIssues ?? 0, valueClass: 'text-warning' },
    { label: 'Closed', value: stats?.closedIssues ?? 0, valueClass: 'text-success' }
  ];

  return (
    <div className="w-full space-y-6 md:space-y-8">
      <motion.section
        className="v-card p-5 md:p-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-2">Issue Tracker</p>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-2">My Issues</h1>
        <p className="text-sm text-muted-foreground">Monitor every issue you opened and prioritize threads that need your response.</p>
      </motion.section>

      {!loading && stats && (
        <motion.section
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
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
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Recent Issues</h2>
          {issues.length > 0 && <span className="text-[11px] text-muted-foreground">Showing up to 30</span>}
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
      ) : issues.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {issues.map((issue, i) => (
            <IssueCard key={issue.id} issue={issue} index={i} onAnalyze={onAnalyze} />
          ))}
        </div>
      ) : (
        <div className="v-card p-12 text-center max-w-xl mx-auto">
          <div className="font-medium text-sm mb-1 text-foreground">No issues opened yet</div>
          <div className="text-xs text-muted-foreground">When you open issues on GitHub, they will appear here.</div>
        </div>
      )}
    </div>
  );
};
