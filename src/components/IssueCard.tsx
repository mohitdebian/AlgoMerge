import React, { useRef } from 'react';
import { motion, useInView } from 'motion/react';

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

export const IssueCard: React.FC<{ issue: any; index?: number; onAnalyze?: (issue: any) => void }> = ({ issue, index = 0, onAnalyze }) => {
  const mergeProb = issue.mergeProbability || 0;
  const colors = getMergeColor(mergeProb);
  const repoName = typeof issue.repository_url === 'string'
    ? issue.repository_url.replace('https://api.github.com/repos/', '')
    : 'Unknown repo';
  const issueAgeDays = Math.max(0, Math.round((Date.now() - new Date(issue.created_at).getTime()) / 86400000));
  const commentCount = issue.comments || 0;

  const isPR = !!issue.pull_request;
  const isMerged = isPR && !!issue.pull_request.merged_at;
  const isClosed = issue.state === 'closed';

  let stateLabel = 'Open';
  let stateDot = 'bg-warning';

  if (isMerged) {
    stateLabel = 'Merged';
    stateDot = 'bg-success';
  } else if (isClosed) {
    stateLabel = 'Closed';
    stateDot = 'bg-danger';
  }

  const handleAnalyze = () => {
    if (onAnalyze) onAnalyze(issue);
  };

  return (
    <motion.div
      className="v-card p-5 flex flex-col gap-3 relative overflow-hidden group"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -2, borderColor: 'rgba(255,255,255,0.08)' }}
    >
      <div className="absolute left-3 right-3 top-3 z-20 pointer-events-none opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
        <div className="rounded-md border border-border/80 bg-[#0f0f0f]/95 backdrop-blur px-2.5 py-2">
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1">Quick Preview</div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground truncate pr-2">{repoName}</span>
            <span className="text-foreground font-medium">{commentCount} comments</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">Labels: {issue.labels?.length || 0}</span>
            <span className={`${issueAgeDays <= 3 ? 'text-success' : issueAgeDays <= 14 ? 'text-warning' : 'text-danger'}`}>
              {issueAgeDays}d old
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-start justify-between gap-3">
        <a
          href={issue.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[13px] leading-snug hover:text-foreground text-muted-foreground transition-colors line-clamp-2 flex-1"
        >
          {issue.title}
        </a>
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          <span className="text-[11px] text-muted-foreground font-mono">#{issue.number}</span>
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className={`w-1.5 h-1.5 rounded-full ${stateDot}`} />
            {stateLabel}
          </span>
        </div>
      </div>

      {/* Merge probability bar (PRs only) */}
      {issue.pull_request && mergeProb > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Merge probability</span>
            <span className={`text-xs font-bold font-mono ${colors.text}`}>{mergeProb}%</span>
          </div>
          <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
            <AnimatedBar value={mergeProb} colorClass={colors.bar} />
          </div>
        </div>
      )}

      {/* Badges */}
      {(issue.competition || issue.complexity) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {issue.competition && (
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#111] text-muted-foreground border border-border">
              {issue.competition} competition
            </span>
          )}
          {issue.complexity && (
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#111] text-muted-foreground border border-border">
              {issue.complexity} complexity
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground">
            {new Date(issue.updated_at).toLocaleDateString()}
          </span>
          <button
            onClick={handleAnalyze}
            disabled={isClosed || !onAnalyze}
            title={isClosed ? 'AI Analysis is not available for closed issues' : 'Analyze with AI'}
            className={`text-[11px] font-semibold transition-all px-2.5 py-1 rounded-md border ${isClosed || !onAnalyze
              ? 'text-muted-foreground/40 border-border/50 bg-[#101010] cursor-not-allowed'
              : 'text-foreground border-[#3a3a3a] bg-[#191919] hover:bg-[#222] hover:border-[#4a4a4a] shadow-[0_0_0_1px_rgba(255,255,255,0.03)] cursor-pointer'
              }`}
          >
            {isPR ? 'Analyze PR' : 'Analyze AI'}
          </button>
        </div>
        {issue.labels && issue.labels.length > 0 && (
          <div className="flex items-center gap-1">
            {issue.labels.slice(0, 2).map((label: any) => (
              <span
                key={label.id || label.name}
                className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#111] text-muted-foreground"
              >
                {label.name}
              </span>
            ))}
            {issue.labels.length > 2 && (
              <span className="text-[10px] text-muted-foreground">+{issue.labels.length - 2}</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};