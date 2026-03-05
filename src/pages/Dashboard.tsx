import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useInView, useMotionValue, useSpring, useTransform } from 'motion/react';
import { generatePriorityActions, PriorityAction } from '../utils/priorityActions';
import { apiFetch } from '../lib/api';

type DashboardStats = {
  totalPRs?: number;
  openPRs?: number;
  mergedPRs?: number;
  mergeRate?: number;
  currentStreak?: number;
  maxStreak?: number;
  recentActivityDates?: number[];
};

const AnimatedNumber = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { stiffness: 90, damping: 20 });
  const displayValue = useTransform(springValue, (n) => `${Math.round(n)}${suffix}`);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) motionValue.set(value);
  }, [isInView, value, motionValue]);

  useEffect(() => {
    const unsub = displayValue.on('change', (v) => {
      if (ref.current) ref.current.textContent = v;
    });
    return unsub;
  }, [displayValue]);

  return <span ref={ref}>0{suffix}</span>;
};

const Section = ({
  title,
  caption,
  children,
  className = '',
  delay = 0
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) => (
  <motion.section
    className={`v-card p-5 md:p-6 ${className}`}
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
  >
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-sm md:text-base font-semibold tracking-tight text-foreground">{title}</h2>
      {caption && <span className="text-[11px] text-muted-foreground">{caption}</span>}
    </div>
    {children}
  </motion.section>
);

const MetricTile = ({
  title,
  value,
  suffix,
  detail,
  accent,
  index
}: {
  title: string;
  value: number;
  suffix?: string;
  detail: string;
  accent: string;
  index: number;
}) => (
  <motion.div
    className="v-card p-4 md:p-5 relative overflow-hidden"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay: 0.06 * index }}
  >
    <div className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
    <div className="pl-3">
      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-2">{title}</div>
      <div className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-1">
        <AnimatedNumber value={value} suffix={suffix} />
      </div>
      <div className="text-xs text-muted-foreground">{detail}</div>
    </div>
  </motion.div>
);

const ProgressTrack = ({ label, value, colorClass }: { label: string; value: number; colorClass: string }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}%</span>
    </div>
    <div className="h-2 rounded-full bg-[#121212] border border-border overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${colorClass}`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 0.6 }}
      />
    </div>
  </div>
);

const getUrgencyChip = (urgency: PriorityAction['urgency']) => {
  if (urgency === 'high') return 'text-danger border-danger/30 bg-danger/8';
  if (urgency === 'medium') return 'text-warning border-warning/30 bg-warning/8';
  return 'text-success border-success/30 bg-success/8';
};

export const Dashboard = ({ user }: { user: any }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [priorityActions, setPriorityActions] = useState<PriorityAction[]>([]);
  const [queueItems, setQueueItems] = useState<PriorityAction[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadDashboard = async () => {
      setLoading(true);
      try {
        const [statsResult, prsResult, watchlistResult] = await Promise.all([
          apiFetch('/api/user/dashboard', { signal: controller.signal }),
          apiFetch('/api/user/prs', { signal: controller.signal }),
          apiFetch('/api/watchlist', { signal: controller.signal })
        ]);

        if (controller.signal.aborted) return;

        if (statsResult.ok) {
          setStats(statsResult.data);
        }

        const prs = prsResult.ok ? prsResult.data : [];
        const watchlist = watchlistResult.ok ? watchlistResult.data : [];
        setPriorityActions(generatePriorityActions(prs, watchlist));
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Failed to fetch dashboard data:', error);
        }
      }

      if (!controller.signal.aborted) {
        setLoading(false);
      }
    };

    loadDashboard();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    setQueueItems(priorityActions);
  }, [priorityActions]);

  const totalPRs = stats?.totalPRs ?? 0;
  const openPRs = stats?.openPRs ?? 0;
  const mergedPRs = stats?.mergedPRs ?? 0;
  const mergeRate = stats?.mergeRate ?? 0;
  const currentStreak = stats?.currentStreak ?? 0;
  const maxStreak = stats?.maxStreak ?? 0;
  const productivityScore = Math.min(100, Math.round((mergeRate * 0.7) + (Math.min(30, currentStreak) * 1.0)));

  const weeklySeries = useMemo(() => {
    const recent = new Set(stats?.recentActivityDates || []);
    const now = new Date();
    const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

    return Array.from({ length: 7 }).map((_, i) => {
      const timestamp = todayUTC - (6 - i) * 86400000;
      const active = recent.has(timestamp);
      const day = new Date(timestamp);

      return {
        active,
        count: active ? 1 : 0,
        dateLabel: day.toLocaleDateString(),
        shortDay: day.toLocaleDateString(undefined, { weekday: 'short' })
      };
    });
  }, [stats]);

  const heatmapCells = useMemo(() => {
    const weeks = 14;
    const days = 7;
    const recent = new Set(stats?.recentActivityDates || []);
    const now = new Date();
    const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    // Start of the grid: go back (weeks-1) full weeks, then to Sunday of that week
    const todayDow = now.getDay(); // 0=Sun
    const gridStartUTC = todayUTC - ((weeks - 1) * 7 + todayDow) * 86400000;

    return Array.from({ length: weeks }).map((_, weekIndex) => {
      return Array.from({ length: days }).map((__, dayIndex) => {
        const t = gridStartUTC + (weekIndex * 7 + dayIndex) * 86400000;
        const future = t > todayUTC;
        const active = recent.has(t);
        const day = new Date(t);
        return { key: `${weekIndex}-${dayIndex}`, future, active, label: day.toLocaleDateString() };
      });
    });
  }, [stats]);

  const quickStats = [
    {
      title: 'Total Pull Requests',
      value: totalPRs,
      detail: `${openPRs} open and ${mergedPRs} merged`,
      accent: 'bg-white'
    },
    {
      title: 'Merge Efficiency',
      value: mergeRate,
      suffix: '%',
      detail: mergeRate >= 50 ? 'Strong merge consistency' : 'Room to improve merge quality',
      accent: mergeRate >= 50 ? 'bg-success' : 'bg-warning'
    },
    {
      title: 'Active Streak',
      value: currentStreak,
      suffix: 'd',
      detail: `Best streak: ${maxStreak} days`,
      accent: 'bg-[#60a5fa]'
    },
    {
      title: 'Productivity Score',
      value: productivityScore,
      suffix: '%',
      detail: 'Blend of quality and consistency',
      accent: 'bg-[#c084fc]'
    }
  ];

  const fallbackAction: PriorityAction = {
    urgency: 'low',
    title: 'No urgent actions right now',
    desc: 'Track repositories or open new PRs to populate this queue.',
    link: '#'
  };

  const moveQueueItem = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    setQueueItems((prev) => {
      if (from >= prev.length || to >= prev.length) return prev;
      const next = [...prev];
      const [picked] = next.splice(from, 1);
      next.splice(to, 0, picked);
      return next;
    });
  };

  const queueView = queueItems.length ? queueItems : [fallbackAction];

  return (
    <div className="w-full space-y-6 md:space-y-8">
      <motion.header
        className="v-card p-5 md:p-6 relative overflow-hidden"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="absolute -right-24 -top-24 w-56 h-56 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -left-20 bottom-0 w-48 h-48 rounded-full bg-success/8 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground mb-2">Overview</p>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Welcome back, {user?.login || 'Developer'}</h1>
            <p className="text-sm text-muted-foreground mt-2">Your contribution command center with cleaner priorities and stronger signal.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 min-w-[210px]">
            <div className="rounded-lg border border-border bg-[#101010] px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Contribution Streak</div>
              <div className="text-lg font-semibold text-foreground">{currentStreak}d</div>
            </div>
            <div className="rounded-lg border border-border bg-[#101010] px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Today</div>
              <div className="text-lg font-semibold text-foreground">{new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {quickStats.map((item, i) => (
          <MetricTile
            key={item.title}
            title={item.title}
            value={item.value}
            suffix={item.suffix}
            detail={item.detail}
            accent={item.accent}
            index={i}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-6">
        <div className="xl:col-span-8 space-y-4 md:space-y-6">
          <Section title="Priority Queue" caption="Actionable next steps" delay={0.12}>
            <div className="space-y-2">
              {queueView.map((action, idx) => (
                <motion.div
                  key={`${action.title}-${idx}`}
                  className={`group rounded-lg border bg-[#101010] hover:bg-[#141414] transition-colors ${dragOverIndex === idx ? 'border-white/25' : 'border-border'}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.04 * idx }}
                  draggable={queueItems.length > 1}
                  onDragStart={() => setDragIndex(idx)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (queueItems.length > 1) setDragOverIndex(idx);
                  }}
                  onDragLeave={() => setDragOverIndex((current) => (current === idx ? null : current))}
                  onDrop={() => {
                    if (dragIndex !== null && queueItems.length > 1) moveQueueItem(dragIndex, idx);
                    setDragIndex(null);
                    setDragOverIndex(null);
                  }}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setDragOverIndex(null);
                  }}
                >
                  <div className="px-4 py-3 md:px-5 md:py-4 flex items-start gap-3">
                    <div
                      className={`mt-0.5 rounded border px-1.5 py-1 text-[10px] text-muted-foreground ${queueItems.length > 1 ? 'cursor-grab active:cursor-grabbing border-border' : 'border-border/50 opacity-50'}`}
                      title={queueItems.length > 1 ? 'Drag to reorder queue' : 'Queue needs more items to reorder'}
                    >
                      ::
                    </div>
                    <span className={`text-[10px] uppercase tracking-[0.14em] px-2 py-1 rounded-md border ${getUrgencyChip(action.urgency)}`}>
                      {action.urgency}
                    </span>
                    <div className="min-w-0 flex-1">
                      <a
                        href={action.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-foreground truncate group-hover:text-white transition-colors block"
                      >
                        {action.title}
                      </a>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{action.desc.replace(/\n/g, ' . ')}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </Section>

          <Section title="Weekly Throughput" caption="Last 7 days" delay={0.18}>
            <div className="h-52 rounded-xl border border-border bg-[#0f0f0f] p-4 flex items-end gap-2">
              {weeklySeries.map((day, i) => {
                const percent = day.active ? 100 : 16;
                return (
                  <motion.div
                    key={i}
                    className="relative flex-1 h-full flex items-end"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.03 * i }}
                    onMouseEnter={() => setHoveredWeek(i)}
                    onMouseLeave={() => setHoveredWeek(null)}
                    onFocus={() => setHoveredWeek(i)}
                    onBlur={() => setHoveredWeek(null)}
                    tabIndex={0}
                  >
                    {hoveredWeek === i && (
                      <div className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-[#121212] px-2.5 py-1 text-[10px] text-foreground shadow-lg z-10">
                        {day.shortDay} • {day.active ? 'Active' : 'No activity'} • {day.dateLabel}
                      </div>
                    )}
                    <div
                      className={`w-full rounded-t-md border ${day.active ? 'bg-gradient-to-t from-success/50 to-success border-success/25' : 'bg-gradient-to-t from-[#1f1f1f] to-[#2a2a2a] border-[#333]'}`}
                      style={{ height: `${percent}%` }}
                      title={`${day.shortDay}: ${day.count} active day`}
                    />
                  </motion.div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>6 days ago</span>
              <span>Today</span>
            </div>
          </Section>
        </div>

        <div className="xl:col-span-4 space-y-4 md:space-y-6">
          <Section title="Contribution Health" caption="Signals" delay={0.2}>
            <div className="space-y-4">
              <ProgressTrack label="Merge rate" value={mergeRate} colorClass="bg-success" />
              <ProgressTrack
                label="Consistency"
                value={maxStreak ? Math.round((currentStreak / Math.max(maxStreak, 1)) * 100) : 0}
                colorClass="bg-warning"
              />
              <ProgressTrack
                label="Execution"
                value={totalPRs ? Math.round(((mergedPRs + openPRs) / Math.max(totalPRs, 1)) * 100) : 0}
                colorClass="bg-white"
              />
            </div>
          </Section>

          <Section title="Activity Heatmap" caption="Past 14 weeks" delay={0.24}>
            <div className="flex gap-[4px] overflow-x-auto pb-2 scrollbar-hide">
              {heatmapCells.map((week, wi) => (
                <div key={`week-${wi}`} className="flex flex-col gap-[4px] min-w-fit">
                  {week.map((cell) => (
                    <motion.div
                      key={cell.key}
                      className={`w-3 h-3 rounded-sm border border-border/60 ${cell.future ? 'opacity-0' : cell.active ? 'bg-success' : 'bg-[#101010]'}`}
                      title={cell.active ? `Active on ${cell.label}` : `No activity on ${cell.label}`}
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: cell.future ? 0 : 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Less</span>
              <div className="flex items-center gap-[4px]">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#101010] border border-border" />
                <span className="w-2.5 h-2.5 rounded-sm bg-success/40 border border-success/30" />
                <span className="w-2.5 h-2.5 rounded-sm bg-success border border-success" />
              </div>
              <span>More</span>
            </div>
          </Section>

          <Section title="Status" caption="Realtime" delay={0.28}>
            <div className="rounded-lg border border-border bg-[#101010] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Data state</span>
                <span className={`text-xs font-medium ${loading ? 'text-warning' : 'text-success'}`}>{loading ? 'Refreshing' : 'Up to date'}</span>
              </div>
              <div className="mt-3 text-sm text-foreground">
                {loading
                  ? 'Syncing your latest PR and watchlist activity.'
                  : 'Dashboard metrics are synced and ready for action.'}
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
};