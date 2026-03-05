export interface PriorityAction {
    id: string | number;
    title: string;
    desc: string;
    urgency: 'high' | 'medium' | 'low';
    cta: string;
    icon: string;
    type: 'stalled_pr' | 'high_prob_pr' | 'opportunity';
    link?: string;
}

export const detectStalledPRs = (prs: any[]): PriorityAction[] => {
    const actions: PriorityAction[] = [];
    const now = new Date().getTime();

    for (const pr of prs) {
        if (pr.state !== 'open' || pr.pull_request?.merged_at) continue;

        const updatedTime = new Date(pr.updated_at || pr.created_at).getTime();
        const idleDays = Math.floor((now - updatedTime) / (1000 * 60 * 60 * 24));
        const parts = pr.repository_url?.split('/') || [];
        const repoName = `${parts[parts.length - 2] || ''}/${parts[parts.length - 1] || ''}`;
        const prNumber = pr.number ? `#${pr.number}` : '';
        const prTitle = pr.title || 'Untitled PR';

        if (idleDays >= 7) {
            // Stalled: idle for 7+ days
            actions.push({
                id: `stalled-${pr.id}`,
                title: `${prNumber} — idle for ${idleDays} days, reviewer may need a nudge`,
                desc: `${repoName} · ${prTitle}`,
                urgency: 'high',
                cta: 'View PR',
                icon: '⏳',
                type: 'stalled_pr',
                link: pr.html_url
            });
        } else if (idleDays >= 2) {
            // Needs attention: idle 2-7 days
            actions.push({
                id: `attention-${pr.id}`,
                title: `${prNumber} — awaiting review for ${idleDays} days`,
                desc: `${repoName} · ${prTitle}`,
                urgency: 'medium',
                cta: 'View PR',
                icon: '👀',
                type: 'stalled_pr',
                link: pr.html_url
            });
        } else {
            // Recently opened (< 2 days)
            const hoursAgo = Math.max(1, Math.floor((now - updatedTime) / (1000 * 60 * 60)));
            actions.push({
                id: `active-${pr.id}`,
                title: `${prNumber} — opened ${hoursAgo < 24 ? hoursAgo + 'h ago' : '1d ago'}`,
                desc: `${repoName} · ${prTitle}`,
                urgency: 'low',
                cta: 'View PR',
                icon: '🟢',
                type: 'stalled_pr',
                link: pr.html_url
            });
        }
    }
    return actions;
};

export const calculateMergeProbabilityActions = (prs: any[]): PriorityAction[] => {
    const highProb: PriorityAction[] = [];

    for (const pr of prs) {
        if (pr.state !== 'open' || pr.pull_request?.merged_at) continue;

        const prob = pr.mergeProbability || 0;
        if (prob >= 70) {
            const parts = pr.repository_url?.split('/') || [];
            const repoName = `${parts[parts.length - 2] || ''}/${parts[parts.length - 1] || ''}`;

            highProb.push({
                id: `highprob-${pr.id}`,
                title: 'High Merge Probability PR',
                desc: `Repository: ${repoName}\nEstimated Merge Probability: ${prob}%\nSuggested action: follow up with reviewers or keep discussion active.`,
                urgency: 'medium',
                cta: 'View PR',
                icon: '✨',
                type: 'high_prob_pr',
                link: pr.html_url
            });
        }
    }
    return highProb;
};

export const findContributionOpportunities = (watchlist: string[]): PriorityAction[] => {
    const opportunities: PriorityAction[] = [];

    for (const repo of watchlist) {
        // Generate mock heuristics for the repository
        // In a real scenario, this would check GitHub API for issues, competition, merge rate
        const seed = repo.length;
        const mergeRate = 60 + (seed % 30);
        const hasLowCompetition = seed % 2 === 0;

        if (mergeRate >= 70 && hasLowCompetition) {
            opportunities.push({
                id: `opp-${repo}`,
                title: 'Contribution Opportunity',
                desc: `Repository: ${repo}\nReason: Favorable conditions (${mergeRate}% merge rate, low contributor competition).\nSuggested action: browse open issues.`,
                urgency: 'low',
                cta: 'Find Issues',
                icon: '🚀',
                type: 'opportunity',
                link: `https://github.com/${repo}/issues`
            });
        }
    }
    return opportunities;
};

export const generatePriorityActions = (prs: any[], watchlist: string[]): PriorityAction[] => {
    const validPRs = prs || [];
    const validWatchlist = watchlist || [];

    const prActions = detectStalledPRs(validPRs);
    const highProbActions = calculateMergeProbabilityActions(validPRs);
    const opportunities = findContributionOpportunities(validWatchlist);

    // Prioritize: 1. stalled PRs, 2. high-prob PRs, 3. watchlist opportunities
    const allActions = [...prActions, ...highProbActions, ...opportunities];

    // If no user PR alerts are generated and no opportunities, show a helpful empty state
    if (allActions.length === 0) {
        allActions.push({
            id: 'opp-default',
            title: 'No active PRs found',
            desc: `Head to Discover to find issues to contribute to, or add repos to your Watchlist.`,
            urgency: 'low',
            cta: 'Discover',
            icon: '🔍',
            type: 'opportunity',
            link: '#'
        });
    }

    // Show up to 5 items so the user sees all their open PRs
    return allActions.slice(0, 5);
};
