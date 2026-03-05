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
    {
      title: 'Merge Probability Engine',
      desc: 'Estimate merge success using PR state, repository behavior, and response patterns.',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
    },
    {
      title: 'Issue Fit Discovery',
      desc: 'Find issues that match your stack, urgency, and contributor bandwidth.',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    },
    {
      title: 'Live Repo Radar',
      desc: 'Track contribution health, activity level, and opportunity across your watchlist.',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
    },
    {
      title: 'Actionable Queue',
      desc: 'Prioritize what to do next with a ranked queue built from your real contribution data.',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
    },
  ];

  const highlights = [
    { label: 'Tracked Repositories', value: '120+' },
    { label: 'Signals per PR', value: '14' },
    { label: 'Avg Setup Time', value: '< 2m' },
  ];

  const workflow = [
    {
      step: '01',
      title: 'Connect GitHub',
      desc: 'Sign in once and import your PR history, issue patterns, and repository context automatically.'
    },
    {
      step: '02',
      title: 'Pick High-Value Work',
      desc: 'Discover issues with better fit, lower competition, and stronger probability of merge.'
    },
    {
      step: '03',
      title: 'Ship With Confidence',
      desc: 'Track merge signals in real time, prioritize next steps, and maintain contribution momentum.'
    }
  ];

  const testimonials = [
    {
      quote: 'AlgoMerge cut my issue-hunting time in half and helped me focus on work that actually gets merged.',
      author: 'Ari K.',
      role: 'Open Source Contributor',
      company: 'Prefix.dev',
      handle: '@arik',
      rating: 5,
      impact: '2.1x faster issue selection'
    },
    {
      quote: 'The watchlist and priority queue make it easy to know where to spend my next two hours.',
      author: 'Nisha R.',
      role: 'Backend Engineer',
      company: 'Rocket.Chat',
      handle: '@nishar',
      rating: 5,
      impact: '41% more merged PRs'
    },
    {
      quote: 'I finally have one place to manage streaks, PR health, and contribution opportunities.',
      author: 'Leo M.',
      role: 'Student Developer',
      company: 'Vercel OSS',
      handle: '@leom',
      rating: 5,
      impact: 'Stayed consistent for 30 days'
    }
  ];

  const logos = ['Prefix.dev', 'Rocket.Chat', 'Vercel OSS', 'AionDemand', 'Rattler'];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Dot grid background */}
      <div className="absolute inset-0 dot-grid dot-grid-fade pointer-events-none" />
      <div className="absolute inset-0 hero-glow pointer-events-none" />
      <div className="absolute -top-40 -left-24 w-[28rem] h-[28rem] rounded-full bg-success/10 blur-3xl pointer-events-none" />
      <div className="absolute top-24 -right-20 w-[22rem] h-[22rem] rounded-full bg-white/8 blur-3xl pointer-events-none" />

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
      <section className="relative px-6 lg:px-8 pt-16 md:pt-24 pb-14 md:pb-20">
        <div className="max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8 items-center">
          <div className="xl:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-xs text-muted-foreground"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Built for open-source contributors
            </motion.div>

            <motion.h1
              className="mt-5 text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.02]"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.05 }}
            >
              <span className="text-gradient">Ship Better PRs.</span>
              <br />
              <span className="text-foreground">Pick Smarter Issues.</span>
            </motion.h1>

            <motion.p
              className="mt-5 text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.12 }}
            >
              AlgoMerge helps you decide what to contribute, when to contribute, and how to improve merge outcomes with focused data and AI guidance.
            </motion.p>

            <motion.div
              className="mt-8 flex flex-wrap items-center gap-3"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.2 }}
            >
              <a
                href="/api/auth/github"
                className="v-btn-primary inline-flex items-center gap-2.5 px-6 py-3 rounded-lg text-sm font-semibold"
              >
                <GitHubIcon />
                Continue with GitHub
              </a>
              <a
                href="#features"
                className="v-btn-secondary inline-flex items-center gap-2 text-sm py-3 px-5"
              >
                Explore Features
              </a>
            </motion.div>

            <motion.div
              className="mt-8 grid grid-cols-3 gap-px rounded-xl overflow-hidden border border-border/80 bg-border max-w-xl"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.26 }}
            >
              {highlights.map((item) => (
                <div key={item.label} className="bg-card px-4 py-3">
                  <div className="text-lg md:text-xl font-semibold text-foreground tracking-tight">{item.value}</div>
                  <div className="text-[10px] md:text-[11px] uppercase tracking-[0.14em] text-muted-foreground mt-1">{item.label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            className="xl:col-span-5"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
          >
            <div className="v-card p-5 md:p-6 bg-gradient-to-br from-[#161616] via-[#121212] to-[#0f0f0f]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Live Snapshot</div>
                  <div className="text-sm font-semibold text-foreground">Contribution Command Center</div>
                </div>
                <span className="text-[10px] px-2 py-1 rounded-md border border-success/30 text-success bg-success/10">Realtime</span>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border border-border bg-[#0f0f0f] p-3">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                    <span>Merge efficiency</span>
                    <span className="font-medium text-foreground">74%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-success"
                      initial={{ width: 0 }}
                      animate={{ width: '74%' }}
                      transition={{ duration: 0.8, delay: 0.4 }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border bg-[#0f0f0f] p-3">
                    <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Streak</div>
                    <div className="text-xl font-semibold text-foreground">12d</div>
                  </div>
                  <div className="rounded-lg border border-border bg-[#0f0f0f] p-3">
                    <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Open PRs</div>
                    <div className="text-xl font-semibold text-foreground">8</div>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-[#0f0f0f] p-3">
                  <div className="text-[11px] text-muted-foreground">Top Next Action</div>
                  <div className="text-sm font-medium text-foreground mt-1">Review and update PR #38205 before peak maintainer hours.</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="relative px-6 lg:px-8 pb-16">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between gap-3 mb-5">
            <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">Everything You Need To Contribute Better</h2>
            <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Core Capabilities</span>
          </div>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.28 }}
          >
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="bg-card p-5 md:p-6 flex flex-col gap-3"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.34 + i * 0.06 }}
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.035)', y: -2 }}
              >
                <div className="text-muted-foreground">{f.icon}</div>
                <h3 className="font-semibold text-sm text-foreground">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="relative px-6 lg:px-8 pb-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Contributors Work Across</div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-px rounded-xl overflow-hidden border border-border/80 bg-border">
            {logos.map((logo, i) => (
              <motion.div
                key={logo}
                className="bg-card px-4 py-4 text-center text-xs md:text-sm font-medium text-muted-foreground"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
              >
                {logo}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="relative px-6 lg:px-8 pb-16">
        <div className="max-w-6xl mx-auto">
          <div className="mb-5">
            <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">How It Works</div>
            <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground mt-2">A Faster Contribution Workflow</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {workflow.map((item, i) => (
              <motion.div
                key={item.step}
                className="v-card p-5 md:p-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.15 + i * 0.06 }}
                whileHover={{ y: -2, borderColor: 'rgba(255,255,255,0.09)' }}
              >
                <div className="text-[10px] uppercase tracking-[0.2em] text-success mb-3">Step {item.step}</div>
                <h3 className="text-base font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative px-6 lg:px-8 pb-16">
        <div className="max-w-6xl mx-auto">
          <div className="mb-5 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Testimonials</div>
              <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground mt-2">Built for Contributors Who Ship</h2>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-[#0f0f0f] text-[11px] text-muted-foreground">
              <span className="text-success">★★★★★</span>
              Rated 4.9/5 by early users
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <motion.blockquote
              className="lg:col-span-2 v-card p-5 md:p-6 bg-gradient-to-br from-[#171717] via-[#121212] to-[#0f0f0f]"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-success text-sm">★★★★★</span>
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Featured Story</span>
              </div>
              <p className="text-base md:text-lg text-foreground leading-relaxed">"{testimonials[0].quote}"</p>
              <footer className="mt-5 pt-4 border-t border-border/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border border-border bg-[#0f0f0f] flex items-center justify-center text-sm font-semibold text-foreground">
                    {testimonials[0].author.split(' ').map((p) => p[0]).join('')}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{testimonials[0].author} <span className="text-muted-foreground">{testimonials[0].handle}</span></div>
                    <div className="text-xs text-muted-foreground">{testimonials[0].role} · {testimonials[0].company}</div>
                  </div>
                </div>
                <div className="text-xs px-2.5 py-1 rounded-md border border-success/30 text-success bg-success/10 w-fit">{testimonials[0].impact}</div>
              </footer>
            </motion.blockquote>

            <div className="space-y-4">
              {testimonials.slice(1).map((item, i) => (
                <motion.blockquote
                  key={item.author}
                  className="v-card p-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.26 + i * 0.06 }}
                  whileHover={{ y: -2, borderColor: 'rgba(255,255,255,0.09)' }}
                >
                  <div className="text-success text-xs mb-2">{'★'.repeat(item.rating)}</div>
                  <p className="text-sm text-foreground leading-relaxed">"{item.quote}"</p>
                  <footer className="mt-4 pt-3 border-t border-border/80 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium text-foreground">{item.author}</div>
                      <div className="text-xs text-muted-foreground">{item.role} · {item.company}</div>
                    </div>
                    <div className="text-[10px] px-2 py-1 rounded-md border border-border text-muted-foreground">{item.handle}</div>
                  </footer>
                </motion.blockquote>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative px-6 lg:px-8 pb-16">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="v-card p-6 md:p-8 bg-gradient-to-br from-[#181818] via-[#131313] to-[#101010]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.28 }}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-2">Ready to contribute smarter?</div>
                <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Start Your Contributor Command Center</h3>
              </div>
              <a
                href="/api/auth/github"
                className="v-btn-primary inline-flex items-center gap-2.5 px-6 py-3 rounded-lg text-sm font-semibold whitespace-nowrap"
              >
                <GitHubIcon />
                Get Started with GitHub
              </a>
            </div>
          </motion.div>
        </div>
      </section>

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
