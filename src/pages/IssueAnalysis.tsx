import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, useInView, useSpring, useMotionValue, useTransform } from 'motion/react';

import ReactMarkdown from 'react-markdown';

interface AnalysisIssue {
    title: string;
    body: string;
    html_url: string;
    number: number;
    state: string;
    repository_url: string;
    pull_request?: any;
    labels?: any[];
    mergeProbability?: number;
    updated_at?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────

const getMergeColor = (prob: number) => {
    if (prob >= 70) return { bar: 'bg-success', text: 'text-success', ring: 'ring-success/30' };
    if (prob >= 40) return { bar: 'bg-warning', text: 'text-warning', ring: 'ring-warning/30' };
    return { bar: 'bg-danger', text: 'text-danger', ring: 'ring-danger/30' };
};

// Parse markdown sections from AI response
const parseSections = (md: string) => {
    const sections: { title: string; content: string; icon: string; iconColor: string }[] = [];
    const lines = md.split('\n');
    let currentTitle = '';
    let currentContent: string[] = [];

    const sectionMeta: Record<string, { icon: string; iconColor: string }> = {
        'summary': { icon: '📋', iconColor: 'text-primary' },
        'merge likelihood assessment': { icon: '🎯', iconColor: 'text-success' },
        'merge likelihood': { icon: '🎯', iconColor: 'text-success' },
        'reviewer engagement strategy': { icon: '👥', iconColor: 'text-primary' },
        'reviewer engagement': { icon: '👥', iconColor: 'text-primary' },
        'risk factors': { icon: '⚠️', iconColor: 'text-warning' },
        'recommended next steps': { icon: '🚀', iconColor: 'text-success' },
        'next steps': { icon: '🚀', iconColor: 'text-success' },
        'file identification': { icon: '📁', iconColor: 'text-primary' },
        'implementation plan': { icon: '🔧', iconColor: 'text-primary' },
        'testing strategy': { icon: '✅', iconColor: 'text-success' },
    };

    const flushSection = () => {
        if (currentTitle && currentContent.length > 0) {
            const key = currentTitle.toLowerCase().replace(/\*\*/g, '').trim();
            const meta = Object.entries(sectionMeta).find(([k]) => key.includes(k));
            sections.push({
                title: currentTitle.replace(/\*\*/g, '').trim(),
                content: currentContent.join('\n').trim(),
                icon: meta?.[1]?.icon || '📌',
                iconColor: meta?.[1]?.iconColor || 'text-muted-foreground',
            });
        }
    };

    for (const line of lines) {
        const headingMatch = line.match(/^#{1,3}\s+(.+)/);
        if (headingMatch) {
            flushSection();
            currentTitle = headingMatch[1];
            currentContent = [];
        } else {
            currentContent.push(line);
        }
    }
    flushSection();

    return sections;
};

// ─── Component ────────────────────────────────────────────────────

export const IssueAnalysis: React.FC<{ issue: AnalysisIssue }> = ({ issue }) => {
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isTracking, setIsTracking] = useState(false);

    const isPR = !!issue.pull_request;

    // Mock intelligence data
    const mergeProb = issue.mergeProbability || Math.floor(Math.random() * 35 + 55);
    const colors = getMergeColor(mergeProb);
    const confidence = Math.min(100, Math.floor(mergeProb + (Math.random() * 12 - 6)));
    const responseTime = `${Math.max(2, Math.floor(Math.random() * 36))}h`;
    const similarSuccess = `${Math.floor(Math.random() * 25 + 55)}%`;
    const idleDays = Math.max(1, Math.floor((Date.now() - new Date(issue.updated_at || Date.now()).getTime()) / (1000 * 60 * 60 * 24)));

    const sections = useMemo(() => {
        if (!analysis) return [];
        return parseSections(analysis);
    }, [analysis]);

    useEffect(() => {
        const controller = new AbortController();
        const fetchAnalysis = async () => {
            setLoading(true);
            setError(null);
            try {
                const repoParts = issue.repository_url.split('/');
                const repo = repoParts.pop();
                const owner = repoParts.pop();

                const response = await fetch('/api/issues/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: issue.title,
                        body: issue.body,
                        owner,
                        repo,
                        isPR,
                    }),
                    signal: controller.signal,
                    credentials: 'include',
                });

                if (controller.signal.aborted) return;

                const data = await response.json();
                if (response.ok) {
                    setAnalysis(data.analysis);
                } else {
                    setError(data.message || 'Failed to generate analysis.');
                }
            } catch (err: any) {
                if (err.name === 'AbortError') return;
                setError('An unexpected error occurred while contacting the AI service.');
            }
            if (!controller.signal.aborted) setLoading(false);
        };

        fetchAnalysis();
        return () => controller.abort();
    }, [issue]);

    const repoName = (() => {
        const parts = issue.repository_url?.split('/') || [];
        return `${parts[parts.length - 2] || ''}/${parts[parts.length - 1] || ''}`;
    })();

    const handleTrackRepository = async () => {
        setIsTracking(true);
        try {
            await fetch('/api/watchlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repo: repoName }),
                credentials: 'include'
            });
            // Fallback for immediate UI updates / redundancy
            const localWatch = JSON.parse(localStorage.getItem('pr_radar_watchlist') || '[]');
            if (!localWatch.includes(repoName)) {
                localWatch.push(repoName);
                localStorage.setItem('pr_radar_watchlist', JSON.stringify(localWatch));
            }
        } catch (e) {
            console.error('Failed to track repository:', e);
            setIsTracking(false);
        }
    };

    const proseClasses = "prose prose-invert prose-sm max-w-none text-muted-foreground prose-headings:text-foreground prose-headings:font-semibold prose-a:text-foreground prose-strong:text-foreground prose-code:text-foreground prose-code:bg-[#111] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-pre:bg-[#111] prose-pre:text-[#999] prose-pre:border prose-pre:border-border prose-li:marker:text-muted-foreground";

    const mergeBarRef = useRef(null);
    const mergeBarInView = useInView(mergeBarRef, { once: true });

    // Animated merge number
    const mergeMotion = useMotionValue(0);
    const mergeSpring = useSpring(mergeMotion, { stiffness: 60, damping: 18 });
    const mergeDisplay = useTransform(mergeSpring, (v) => `${Math.round(v)}%`);
    const mergeRef = useRef<HTMLDivElement>(null);
    const mergeInView = useInView(mergeRef, { once: true });

    useEffect(() => {
        if (mergeInView) mergeMotion.set(mergeProb);
    }, [mergeInView, mergeProb, mergeMotion]);

    useEffect(() => {
        const unsub = mergeDisplay.on('change', (v) => {
            if (mergeRef.current) mergeRef.current.textContent = v;
        });
        return unsub;
    }, [mergeDisplay]);

    return (
        <div className="w-full space-y-8">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 flex-wrap">
                    <span className="flex items-center gap-1.5 text-[10px]">
                        <span className={`w-1.5 h-1.5 rounded-full ${issue.state === 'closed' ? 'bg-danger' : 'bg-success'}`} />
                        {issue.state === 'closed' ? 'Closed' : 'Open'}
                    </span>
                    <span>·</span>
                    <span>{isPR ? 'Pull Request' : 'Issue'}</span>
                    <span>·</span>
                    <span className="font-mono">#{issue.number}</span>
                    {issue.labels && issue.labels.length > 0 && (
                        <>
                            <span>·</span>
                            {issue.labels.slice(0, 3).map((label: any) => (
                                <span
                                    key={label.id || label.name}
                                    className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#111] text-muted-foreground"
                                >
                                    {label.name}
                                </span>
                            ))}
                        </>
                    )}
                </div>
                <h1 className="text-xl font-bold tracking-tight mb-2 leading-snug">{issue.title}</h1>
                <div className="flex items-center gap-3">
                    <a
                        href={issue.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    >
                        View on GitHub
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h10v10" /><path d="M7 17L17 7" /></svg>
                    </a>
                    <span className="text-[11px] text-muted-foreground/50">{repoName}</span>
                </div>
            </motion.div>

            {/* Two-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* LEFT: Analysis */}
                <div className="lg:col-span-2 space-y-4">
                    {loading ? (
                        [...Array(3)].map((_, i) => (
                            <div key={i} className="v-card p-6 space-y-3">
                                <div className="skeleton w-40 h-4 rounded" />
                                <div className="skeleton w-full h-3 rounded" />
                                <div className="skeleton w-5/6 h-3 rounded" />
                                <div className="skeleton w-4/6 h-3 rounded" />
                            </div>
                        ))
                    ) : error ? (
                        <div className="v-card p-6">
                            <div className="text-xs text-danger">
                                {error}
                            </div>
                        </div>
                    ) : sections.length > 0 ? (
                        sections.map((section, i) => (
                            <motion.div
                                key={section.title}
                                className="v-card p-6"
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.45, delay: i * 0.08 }}
                            >
                                <h2 className="text-sm font-medium mb-4 pb-3 border-b border-border">{section.title}</h2>
                                <div className={proseClasses}>
                                    <ReactMarkdown>{section.content}</ReactMarkdown>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <motion.div className="v-card p-6" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
                            <h2 className="text-sm font-medium mb-4 pb-3 border-b border-border">
                                {isPR ? 'PR Merge Analysis' : 'AI Analysis'}
                            </h2>
                            <div className={proseClasses}>
                                <ReactMarkdown>{analysis || ''}</ReactMarkdown>
                            </div>
                        </motion.div>
                    )}

                    {/* Original Description */}
                    {issue.body && (
                        <motion.div className="v-card p-6" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.3 }}>
                            <h2 className="text-sm font-medium mb-4 pb-3 border-b border-border">Original Description</h2>
                            <div className="prose prose-invert prose-sm max-w-none text-muted-foreground prose-headings:text-foreground prose-a:text-foreground prose-code:text-foreground prose-code:bg-[#111] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-pre:bg-[#111] prose-pre:text-[#999] prose-pre:border prose-pre:border-border">
                                <ReactMarkdown>{issue.body}</ReactMarkdown>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* RIGHT: Metrics */}
                <div className="lg:col-span-1 space-y-4">

                    {/* Merge Prediction */}
                    <motion.div className="v-card p-6" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.1 }}>
                        <h3 className="text-[11px] text-muted-foreground uppercase tracking-wider mb-4">
                            {isPR ? 'Merge Prediction' : 'Success Prediction'}
                        </h3>
                        <div className="text-center py-2">
                            <div ref={mergeRef} className={`text-4xl font-bold font-mono tracking-tighter ${colors.text}`}>
                                0%
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-1">
                                {isPR ? 'merge probability' : 'resolution probability'}
                            </div>
                        </div>
                        <div className="mt-4" ref={mergeBarRef}>
                            <div className="h-1 rounded-full bg-[#1a1a1a] overflow-hidden">
                                <motion.div
                                    className={`h-full rounded-full ${colors.bar}`}
                                    initial={{ width: 0 }}
                                    animate={mergeBarInView ? { width: `${mergeProb}%` } : { width: 0 }}
                                    transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border text-[11px]">
                            <span className="text-muted-foreground">Confidence</span>
                            <span className="font-medium font-mono">{confidence}/100</span>
                        </div>
                    </motion.div>

                    {/* Repository Signals */}
                    <motion.div className="v-card p-6" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.2 }}>
                        <h3 className="text-[11px] text-muted-foreground uppercase tracking-wider mb-4">Signals</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-[11px]">
                                <span className="text-muted-foreground">Avg response</span>
                                <span className="font-medium font-mono">{responseTime}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                                <span className="text-muted-foreground">Similar success</span>
                                <span className="font-medium font-mono text-success">{similarSuccess}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                                <span className="text-muted-foreground">Idle time</span>
                                <span className="font-medium font-mono">{idleDays}d</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Quick Actions */}
                    <motion.div className="v-card p-6" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.3 }}>
                        <h3 className="text-[11px] text-muted-foreground uppercase tracking-wider mb-4">Actions</h3>
                        <div className="space-y-2">
                            <a
                                href={issue.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-center gap-2 v-btn-primary py-2 text-xs"
                            >
                                {isPR ? 'View PR on GitHub' : 'View Issue on GitHub'}
                            </a>
                            <button
                                onClick={handleTrackRepository}
                                disabled={isTracking}
                                className="w-full v-btn-secondary py-2 text-xs disabled:opacity-50 cursor-pointer"
                            >
                                {isTracking ? 'Tracked' : 'Track Repository'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};
