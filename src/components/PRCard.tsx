import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useInView, useSpring, useTransform } from 'motion/react';

const getMergeColor = (prob: number) => {
    if (prob >= 70) return { bar: 'bg-success', text: 'text-success' };
    if (prob >= 40) return { bar: 'bg-warning', text: 'text-warning' };
    return { bar: 'bg-danger', text: 'text-danger' };
};

const AnimatedBar = ({ value, colorClass }: { value: number; colorClass: string }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });
    return (
        <div ref={ref} className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
            <motion.div
                className={`h-full rounded-full ${colorClass}`}
                initial={{ width: 0 }}
                animate={isInView ? { width: `${value}%` } : { width: 0 }}
                transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
        </div>
    );
};

export const PRCard: React.FC<{ pr: any; index?: number; onAnalyze?: (pr: any) => void }> = ({ pr, index = 0, onAnalyze }) => {
    const [expanded, setExpanded] = useState(false);

    const mergeProb = pr.mergeProbability || Math.floor(Math.random() * 40 + 40);
    const colors = getMergeColor(mergeProb);

    const createdTime = new Date(pr.created_at).getTime();
    const updatedTime = new Date(pr.updated_at).getTime();
    const now = Date.now();

    const confidenceScore = Math.min(100, Math.max(0, mergeProb + Math.min(10, (pr.comments || 0) * 2) - 5));
    const responseHours = Math.max(1, Math.round((updatedTime - createdTime) / (1000 * 60 * 60)));
    const responseTime = responseHours >= 24 ? `${Math.round(responseHours / 24)}d` : `${responseHours}h`;
    const similarSuccess = `${mergeProb}%`;
    const activeAge = Math.max(1, Math.floor((now - updatedTime) / (1000 * 60 * 60 * 24)));
    const repoName = typeof pr.repository_url === 'string'
        ? pr.repository_url.replace('https://api.github.com/repos/', '')
        : 'Unknown repo';

    const isMerged = pr.pull_request && !!pr.pull_request.merged_at;
    const isClosed = pr.state === 'closed';
    const mergedTheme = isMerged;

    let stateLabel = 'Open';
    let stateDot = 'bg-warning';

    if (isMerged) {
        stateLabel = 'Merged';
        stateDot = 'bg-[#a371f7]';
    } else if (isClosed) {
        stateLabel = 'Closed';
        stateDot = 'bg-danger';
    }

    const handleAnalyze = () => {
        if (onAnalyze) onAnalyze(pr);
    };

    return (
        <motion.div
            className={`v-card p-5 flex flex-col gap-4 relative overflow-hidden group ${mergedTheme ? 'bg-[#171022] border-[#5b3cc4]/45 shadow-[0_0_0_1px_rgba(163,113,247,0.08)]' : ''}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
            whileHover={{ y: -2, borderColor: mergedTheme ? 'rgba(163,113,247,0.5)' : 'rgba(255,255,255,0.08)' }}
        >
            <div className="absolute left-3 right-3 top-3 z-20 pointer-events-none opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
                <div className={`rounded-md border px-2.5 py-2 backdrop-blur ${mergedTheme ? 'border-[#5b3cc4]/40 bg-[#1a1228]/95' : 'border-border/80 bg-[#0f0f0f]/95'}`}>
                    <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1">Hover Preview</div>
                    <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground truncate pr-2">{repoName}</span>
                        <span className={`font-medium ${mergedTheme ? 'text-[#d6bcfa]' : 'text-foreground'}`}>{stateLabel}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">Comments: {pr.comments || 0}</span>
                        <span className={`${activeAge <= 2 ? 'text-success' : activeAge <= 7 ? 'text-warning' : 'text-danger'}`}>{activeAge}d idle</span>
                    </div>
                </div>
            </div>

            <div className="flex items-start justify-between gap-3">
                <a
                    href={pr.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`font-medium text-[13px] leading-snug transition-colors line-clamp-2 flex-1 ${mergedTheme ? 'text-[#d6bcfa] hover:text-white' : 'hover:text-foreground text-muted-foreground'}`}
                >
                    {pr.title}
                </a>
                <div className="flex items-center gap-2 shrink-0 mt-0.5">
                    <span className="text-[11px] text-muted-foreground font-mono">#{pr.number}</span>
                    <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className={`w-1.5 h-1.5 rounded-full ${stateDot}`} />
                        {stateLabel}
                    </span>
                </div>
            </div>

            {/* Merge Probability */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Merge probability</span>
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold font-mono ${mergedTheme ? 'text-[#a371f7]' : colors.text}`}>{mergeProb}%</span>
                        <span className="text-[10px] text-muted-foreground/60">{confidenceScore}/100</span>
                    </div>
                </div>
                <div className={`h-1 rounded-full overflow-hidden ${mergedTheme ? 'bg-[#261a3b]' : 'bg-[#1a1a1a]'}`}>
                    <AnimatedBar value={mergeProb} colorClass={mergedTheme ? 'bg-[#a371f7]' : colors.bar} />
                </div>
            </div>

            {/* Metrics */}
            <div className={`grid grid-cols-3 gap-px rounded-lg overflow-hidden ${mergedTheme ? 'bg-[#402a66]' : 'bg-border'}`}>
                <div className={`px-3 py-2 ${mergedTheme ? 'bg-[#1d1530]' : 'bg-card'}`}>
                    <div className="text-[10px] text-muted-foreground mb-0.5">Response</div>
                    <div className="text-xs font-medium font-mono">{responseTime}</div>
                </div>
                <div className={`px-3 py-2 ${mergedTheme ? 'bg-[#1d1530]' : 'bg-card'}`}>
                    <div className="text-[10px] text-muted-foreground mb-0.5">Similar</div>
                    <div className={`text-xs font-medium font-mono ${mergedTheme ? 'text-[#c4b5fd]' : 'text-success'}`}>{similarSuccess}</div>
                </div>
                <div className={`px-3 py-2 ${mergedTheme ? 'bg-[#1d1530]' : 'bg-card'}`}>
                    <div className="text-[10px] text-muted-foreground mb-0.5">Idle</div>
                    <div className="text-xs font-medium font-mono">{activeAge}d</div>
                </div>
            </div>

            {/* Expandable */}
            <button
                onClick={() => setExpanded(!expanded)}
                className={`w-full flex items-center justify-between text-[11px] transition-colors pt-2 border-t ${mergedTheme ? 'text-[#b8a6dd] hover:text-white border-[#4b3572]' : 'text-muted-foreground hover:text-foreground border-border'}`}
            >
                <span>Details</span>
                <svg
                    style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {expanded && (
                <motion.div
                    className="space-y-2 text-[11px]"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Comments</span>
                        <span className={`font-medium ${(pr.comments || 0) > 2 ? 'text-success' : (pr.comments || 0) > 0 ? 'text-warning' : 'text-muted-foreground'}`}>
                            {pr.comments || 0}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Recency</span>
                        <span className={`font-medium ${activeAge <= 3 ? 'text-success' : activeAge <= 14 ? 'text-warning' : 'text-danger'}`}>
                            {activeAge <= 3 ? 'Active' : activeAge <= 14 ? 'Recent' : 'Stale'}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Labels</span>
                        <span className="font-medium">{pr.labels?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Response</span>
                        <span className={`font-medium ${responseHours < 24 ? 'text-success' : responseHours < 72 ? 'text-warning' : 'text-danger'}`}>
                            {responseHours < 24 ? 'Fast' : responseHours < 72 ? 'Moderate' : 'Slow'}
                        </span>
                    </div>
                </motion.div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-[10px] text-muted-foreground">
                    {new Date(pr.updated_at).toLocaleDateString()}
                </span>
                <button
                    onClick={handleAnalyze}
                    disabled={isClosed || !onAnalyze}
                    title={isClosed ? 'AI Analysis is not available for closed issues' : 'Analyze PR Impact'}
                    className={`text-[11px] font-semibold transition-all px-2.5 py-1 rounded-md border ${isClosed || !onAnalyze
                        ? 'text-muted-foreground/40 border-border/50 bg-[#101010] cursor-not-allowed'
                        : mergedTheme
                            ? 'text-[#f2e9ff] border-[#6a4ccf] bg-[#2b1e42] hover:bg-[#35224f] shadow-[0_0_0_1px_rgba(163,113,247,0.2)] cursor-pointer'
                            : 'text-foreground border-[#3a3a3a] bg-[#191919] hover:bg-[#222] hover:border-[#4a4a4a] shadow-[0_0_0_1px_rgba(255,255,255,0.03)] cursor-pointer'
                        }`}
                >
                    Analyze AI
                </button>
            </div>
        </motion.div>
    );
};
