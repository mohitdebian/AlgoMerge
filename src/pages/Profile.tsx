import { useMemo, useState } from 'react';
import { motion } from 'motion/react';

type ThemeMode = 'dark' | 'light';

export const Profile = ({ user, theme }: { user: any; theme: ThemeMode }) => {
  const [copied, setCopied] = useState(false);

  const baseUrl = useMemo(() => (typeof window !== 'undefined' ? window.location.origin : ''), []);
  const username = user?.login || 'developer';
  const publicScorecardUrl = `${baseUrl}/u/${encodeURIComponent(username)}`;
  const xShareUrl = `https://x.com/intent/post?text=${encodeURIComponent(`Check out my PR Radar scorecard — momentum, streak, badges & weekly wins.`)}&url=${encodeURIComponent(publicScorecardUrl)}`;
  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicScorecardUrl)}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicScorecardUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <div className="w-full space-y-6 md:space-y-8">
      <motion.header
        className="v-card p-6 md:p-7 relative overflow-hidden"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="absolute -right-20 -top-20 w-52 h-52 rounded-full bg-success/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <img src={user?.avatar_url} alt={username} className="w-14 h-14 rounded-full border border-border" />
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Profile</p>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">@{username}</h1>
              <p className="text-sm text-muted-foreground mt-1">Your public scorecard — share it anywhere.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={copyLink}
              className={`text-sm px-4 py-2 rounded-md border transition-colors cursor-pointer ${theme === 'light' ? 'border-[#cdd6e3] bg-white hover:bg-[#f0f3f7] text-[#374151]' : 'border-border bg-[#121212] text-muted-foreground hover:text-foreground'}`}
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <a href={xShareUrl} target="_blank" rel="noopener noreferrer" className={`text-sm px-4 py-2 rounded-md border transition-colors ${theme === 'light' ? 'border-[#cdd6e3] bg-white hover:bg-[#f0f3f7] text-[#374151]' : 'border-border bg-[#121212] text-muted-foreground hover:text-foreground'}`}>
              Share to X
            </a>
            <a href={linkedInShareUrl} target="_blank" rel="noopener noreferrer" className={`text-sm px-4 py-2 rounded-md border transition-colors ${theme === 'light' ? 'border-[#cdd6e3] bg-white hover:bg-[#f0f3f7] text-[#374151]' : 'border-border bg-[#121212] text-muted-foreground hover:text-foreground'}`}>
              Share to LinkedIn
            </a>
            <a href={publicScorecardUrl} target="_blank" rel="noopener noreferrer" className="v-btn-primary text-sm px-4 py-2">
              Open Public Scorecard
            </a>
          </div>
        </div>
      </motion.header>

      <motion.section
        className="v-card overflow-hidden"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
      >
        <div className={`px-5 py-3 border-b text-[10px] uppercase tracking-[0.16em] text-muted-foreground ${theme === 'light' ? 'border-[#dce4ee] bg-[#f8fafc]' : 'border-border bg-[#0a0a0a]'}`}>
          Public Scorecard Preview
        </div>
        <iframe
          src={publicScorecardUrl}
          title="Public Scorecard"
          className="w-full border-0"
          style={{ height: '70vh', minHeight: 480 }}
        />
      </motion.section>
    </div>
  );
};
