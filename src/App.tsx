/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Discover } from './pages/Discover';
import { Watchlist } from './pages/Watchlist';
import { MyPRs } from './pages/MyPRs';
import { MyIssues } from './pages/MyIssues';
import { Dashboard } from './pages/Dashboard';
import { IssueAnalysis } from './pages/IssueAnalysis';

// ─── Icons (inline SVG) ───────────────────────────────────────────

const RadarIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" opacity="0.3" />
    <circle cx="12" cy="12" r="6" opacity="0.5" />
    <circle cx="12" cy="12" r="2" />
    <line x1="12" y1="2" x2="12" y2="6" />
    <path d="M12 12 L17 7" strokeWidth="2" />
  </svg>
);

const DashboardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
  </svg>
);

const DiscoverIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const WatchlistIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const PRIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="18" r="3" />
    <circle cx="6" cy="6" r="3" />
    <path d="M6 9v12" />
    <path d="M18 9a9 9 0 0 0-9 9" />
  </svg>
);

const GitHubIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);


// ─── Landing Page (Logged Out) ────────────────────────────────────

const LandingPage = () => {
  const features = [
    { title: 'Smart Scoring', desc: 'AI-powered merge probability analysis for every PR.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> },
    { title: 'Issue Discovery', desc: 'Surface the best issues to contribute to, fast.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
    { title: 'Repo Insights', desc: 'Real-time repository health and activity data.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg> },
    { title: 'Competition Intel', desc: 'Know your odds before you write a line of code.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> },
  ];

  return (
    <div className="min-h-screen relative">
      {/* Dot grid background */}
      <div className="absolute inset-0 dot-grid dot-grid-fade pointer-events-none" />
      <div className="absolute inset-0 hero-glow pointer-events-none" />

      {/* Nav */}
      <nav className="relative flex items-center justify-between px-6 lg:px-8 py-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span className="text-foreground"><RadarIcon /></span>
          <span className="text-sm font-semibold tracking-tight">Algomerge</span>
        </div>
        <a
          href="/api/auth/github"
          className="v-btn-secondary flex items-center gap-2 text-xs py-2 px-4"
        >
          <GitHubIcon />
          <span>Sign in</span>
        </a>
      </nav>

      {/* Hero */}
      <div className="relative flex flex-col items-center justify-center px-6 pt-32 pb-24">
        <div className="text-center max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-xs text-muted-foreground mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Open source contribution intelligence
            </div>
          </motion.div>

          <motion.h1
            className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <span className="text-gradient">Find your next<br />contribution</span>
          </motion.h1>

          <motion.p
            className="text-base md:text-lg text-muted-foreground max-w-md mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            AI-powered scoring. Smart issue discovery. Real&#8209;time repo insights. Know your merge odds before you start.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <a
              href="/api/auth/github"
              className="v-btn-primary inline-flex items-center gap-2.5 px-6 py-3 rounded-lg text-sm font-medium"
            >
              <GitHubIcon />
              Continue with GitHub
            </a>
          </motion.div>
        </div>

        {/* Feature Grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px mt-24 max-w-4xl mx-auto w-full bg-border rounded-xl overflow-hidden"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
        >
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className="bg-card p-6 flex flex-col gap-3 hover:bg-[#0f0f0f] transition-colors"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 + i * 0.08 }}
              whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
            >
              <div className="text-muted-foreground">{f.icon}</div>
              <h3 className="font-medium text-sm text-foreground">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Footer */}
      <div className="relative text-center py-12 border-t border-border/50">
        <p className="text-xs text-muted-foreground">Built for developers who contribute.</p>
      </div>
    </div>
  );
};


// ─── Sidebar (Logged In) ──────────────────────────────────────────

const IssueIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon />, shortcut: 'D' },
  { id: 'discover', label: 'Discover', icon: <DiscoverIcon />, shortcut: 'F' },
  { id: 'watchlist', label: 'Watchlist', icon: <WatchlistIcon />, shortcut: 'W' },
  { id: 'my-prs', label: 'My PRs', icon: <PRIcon />, shortcut: 'P' },
  { id: 'my-issues', label: 'My Issues', icon: <IssueIcon />, shortcut: 'I' },
];

const isTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || target.isContentEditable;
};

const AnalysisIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

const Sidebar = ({
  user,
  page,
  setPage,
  analysisIssueTitle,
  selectedRepoInfo
}: {
  user: any;
  page: string;
  setPage: (p: string) => void;
  analysisIssueTitle?: string;
  selectedRepoInfo?: { repo: string; desc?: string } | null;
}) => (
  <aside className="fixed top-0 left-0 bottom-0 w-64 z-40 p-3 border-r border-border bg-[#090909]">
    <div className="h-full w-full rounded-xl border border-border bg-gradient-to-b from-[#141414] via-[#101010] to-[#0d0d0d] flex flex-col overflow-hidden">
      <div className="relative px-4 pt-4 pb-3 border-b border-border/80">
        <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex items-center gap-2.5">
          <span className="text-foreground"><RadarIcon /></span>
          <div>
            <div className="text-sm font-semibold tracking-tight text-foreground">Algomerge</div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Contributor Radar</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-2 mb-2">Navigation</div>
        <div className="space-y-1.5">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer w-full text-left
                ${page === item.id
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.03]'
                }`}
            >
              {page === item.id && (
                <>
                  <motion.div
                    className="absolute inset-0 rounded-lg bg-white/[0.06] border border-white/[0.08]"
                    layoutId="sidebar-active"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-white" />
                </>
              )}
              <span className="relative z-10 flex items-center gap-3">
                {item.icon}
                {item.label}
              </span>
              <span className="relative z-10 ml-auto text-[10px] px-1.5 py-0.5 rounded border border-border/80 text-muted-foreground/80 bg-black/20">
                {item.shortcut}
              </span>
            </button>
          ))}
        </div>

        {analysisIssueTitle && (
          <div className="mt-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-2 mb-2">In Progress</div>
            <button
              onClick={() => setPage('issue-analysis')}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer w-full text-left
                ${page === 'issue-analysis'
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.03]'
                }`}
            >
              {page === 'issue-analysis' && (
                <>
                  <motion.div
                    className="absolute inset-0 rounded-lg bg-white/[0.06] border border-white/[0.08]"
                    layoutId="sidebar-active"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-white" />
                </>
              )}
              <span className="relative z-10 flex items-center gap-3 min-w-0">
                <AnalysisIcon />
                <span className="truncate">{analysisIssueTitle}</span>
              </span>
            </button>
          </div>
        )}

        {selectedRepoInfo && (
          <div className="mt-4 rounded-lg border border-border/80 bg-[#0f0f0f] p-3">
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1">Active Repo</div>
            <button
              onClick={() => setPage('discover')}
              className="w-full text-left text-sm font-medium text-foreground hover:text-white transition-colors truncate cursor-pointer"
              title={selectedRepoInfo.repo}
            >
              {selectedRepoInfo.repo}
            </button>
          </div>
        )}
      </nav>

      <div className="p-3 border-t border-border/80">
        <div className="rounded-lg border border-border bg-[#0f0f0f] p-3">
          <div className="flex items-center gap-2.5 mb-2">
            <img src={user.avatar_url} alt={user.login} className="w-8 h-8 rounded-full ring-1 ring-border" />
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground truncate">{user.login}</div>
              <div className="text-[11px] text-muted-foreground">Signed in</div>
            </div>
          </div>
          <a
            href="/api/auth/logout"
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-white/[0.03] transition-all duration-150"
          >
            <LogoutIcon />
            Sign out
          </a>
        </div>
      </div>
    </div>
  </aside>
);


// ─── Main App ─────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [page, setPage] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [exploreRepo, setExploreRepo] = useState<string | null>(null);
  const [selectedRepoInfo, setSelectedRepoInfo] = useState<{ repo: string; desc?: string; stars?: number; language?: string } | null>(null);
  const [analysisIssue, setAnalysisIssue] = useState<any>(null);
  const [watchlistRefreshKey, setWatchlistRefreshKey] = useState(0);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [cursor, setCursor] = useState({ x: 40, y: 40 });

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Failed to fetch session:', error);
        setUser(null);
      }
      setLoading(false);
    };
    fetchSession();
  }, []);

  const handleExplore = (repo: string) => {
    setExploreRepo(repo);
    setSelectedRepoInfo({ repo }); // Basic info, Discover will enrich if needed
    setPage('discover');
  };

  const handleSelectRepo = (info: any) => {
    if (!info) {
      setSelectedRepoInfo(null);
      setExploreRepo(null);
      return;
    }
    setSelectedRepoInfo(info);
    setExploreRepo(info.repo);
  };

  const handleAnalyze = (issue: any) => {
    setAnalysisIssue(issue);
    setPage('issue-analysis');
  };

  const handleRepoTracked = () => {
    // Signal watchlist page to refetch latest repositories and insights
    setWatchlistRefreshKey((k) => k + 1);
  };

  const commands = useMemo(() => {
    const items: Array<{ id: string; label: string; hint: string; run: () => void }> = [
      { id: 'dashboard', label: 'Go to Dashboard', hint: 'D', run: () => setPage('dashboard') },
      { id: 'discover', label: 'Open Discover', hint: 'F', run: () => setPage('discover') },
      { id: 'watchlist', label: 'Open Watchlist', hint: 'W', run: () => setPage('watchlist') },
      { id: 'my-prs', label: 'Open My PRs', hint: 'P', run: () => setPage('my-prs') },
      { id: 'my-issues', label: 'Open My Issues', hint: 'I', run: () => setPage('my-issues') },
      {
        id: 'clear-repo',
        label: 'Clear Active Repository',
        hint: 'Repo',
        run: () => {
          setSelectedRepoInfo(null);
          setExploreRepo(null);
          setPage('discover');
        }
      },
      { id: 'refresh', label: 'Reload Page Data', hint: 'R', run: () => window.location.reload() },
      { id: 'signout', label: 'Sign Out', hint: 'Auth', run: () => { window.location.href = '/api/auth/logout'; } }
    ];

    if (analysisIssue) {
      items.splice(5, 0, {
        id: 'analysis',
        label: 'Open Issue Analysis',
        hint: 'A',
        run: () => setPage('issue-analysis')
      });
    }

    return items;
  }, [analysisIssue]);

  const filteredCommands = useMemo(() => {
    const q = commandQuery.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((cmd) => cmd.label.toLowerCase().includes(q) || cmd.hint.toLowerCase().includes(q));
  }, [commandQuery, commands]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen((open) => !open);
        return;
      }

      if (event.key === 'Escape') {
        setCommandOpen(false);
        setCommandQuery('');
        return;
      }

      if (isTypingTarget(event.target)) return;

      if (event.key === '/') {
        event.preventDefault();
        setCommandOpen(true);
        return;
      }

      const key = event.key.toLowerCase();
      if (key === 'd') setPage('dashboard');
      if (key === 'f') setPage('discover');
      if (key === 'w') setPage('watchlist');
      if (key === 'p') setPage('my-prs');
      if (key === 'i') setPage('my-issues');
      if (key === 'a' && analysisIssue) setPage('issue-analysis');
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [analysisIssue]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground animate-spin">
          <RadarIcon />
        </div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  const pageComponent = () => {
    switch (page) {
      case 'discover': return <Discover initialRepo={exploreRepo} onAnalyze={handleAnalyze} selectedRepoInfo={selectedRepoInfo} onSelectRepo={handleSelectRepo} onTrackedRepo={handleRepoTracked} />;
      case 'watchlist': return <Watchlist onExplore={handleExplore} refreshKey={watchlistRefreshKey} />;
      case 'my-prs': return <MyPRs onAnalyze={handleAnalyze} />;
      case 'my-issues': return <MyIssues onAnalyze={handleAnalyze} />;
      case 'issue-analysis': return analysisIssue ? <IssueAnalysis issue={analysisIssue} /> : <Dashboard user={user} />;
      default: return <Dashboard user={user} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row pb-14 md:pb-0">
      <div className="hidden md:block">
        <Sidebar
          user={user}
          page={page}
          setPage={setPage}
          analysisIssueTitle={analysisIssue?.title}
          selectedRepoInfo={selectedRepoInfo}
        />
      </div>

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-black sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <span className="text-foreground"><RadarIcon /></span>
          <span className="text-sm font-semibold tracking-tight">Algomerge</span>
        </div>
        <img src={user.avatar_url} alt={user.login} className="w-7 h-7 rounded-full" />
      </div>

      <main
        className="md:ml-64 flex-1 overflow-x-hidden overflow-y-auto w-full relative"
        onMouseMove={(e) => {
          const bounds = e.currentTarget.getBoundingClientRect();
          setCursor({ x: e.clientX - bounds.left, y: e.clientY - bounds.top });
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 spotlight-surface"
          style={{
            background: `radial-gradient(420px circle at ${cursor.x}px ${cursor.y}px, rgba(255,255,255,0.06), rgba(255,255,255,0) 55%)`
          }}
        />

        <div className="max-w-6xl mx-auto px-6 py-8 relative z-10">
          <div className="mb-4 flex items-center justify-end">
            <button
              onClick={() => setCommandOpen(true)}
              className="text-xs px-3 py-1.5 rounded-md border border-border bg-[#121212] text-muted-foreground hover:text-foreground hover:border-[#3a3a3a] transition-colors"
              title="Open command menu"
            >
              Quick Actions  Ctrl/Cmd+K
            </button>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {pageComponent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {commandOpen && (
          <motion.div
            className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm px-4 py-20 md:py-24"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setCommandOpen(false);
              setCommandQuery('');
            }}
          >
            <motion.div
              className="max-w-xl mx-auto rounded-xl border border-border bg-[#101010] shadow-2xl overflow-hidden"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-border/80">
                <input
                  autoFocus
                  value={commandQuery}
                  onChange={(e) => setCommandQuery(e.target.value)}
                  placeholder="Type a command or page name..."
                  className="w-full bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="max-h-[55vh] overflow-y-auto p-2">
                {filteredCommands.length ? (
                  filteredCommands.map((cmd) => (
                    <button
                      key={cmd.id}
                      onClick={() => {
                        cmd.run();
                        setCommandOpen(false);
                        setCommandQuery('');
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-md hover:bg-white/[0.05] transition-colors flex items-center justify-between gap-3"
                    >
                      <span className="text-sm text-foreground">{cmd.label}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-border/80 text-muted-foreground">{cmd.hint}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-8 text-center text-xs text-muted-foreground">No matching commands</div>
                )}
              </div>
              <div className="px-4 py-2 border-t border-border/80 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Press Enter by clicking a command</span>
                <span>Esc to close</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 v-glass z-50 flex items-center justify-around px-2 py-1.5">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            className={`flex flex-col items-center gap-0.5 p-2 rounded-md transition-colors ${page === item.id ? 'text-foreground' : 'text-muted-foreground'}`}
          >
            {item.icon}
            <span className="text-[9px] font-medium">{item.label}</span>
          </button>
        ))}
        {analysisIssue && (
          <button
            onClick={() => setPage('issue-analysis')}
            className={`flex flex-col items-center gap-0.5 p-2 rounded-md transition-colors ${page === 'issue-analysis' ? 'text-foreground' : 'text-muted-foreground'}`}
          >
            <AnalysisIcon />
            <span className="text-[9px] font-medium truncate w-10 text-center">Analysis</span>
          </button>
        )}
      </div>
    </div>
  );
}
