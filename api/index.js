// src/server/app.ts
import express from "express";
import session from "express-session";
import cors from "cors";

// src/server/routes/auth.routes.ts
import { Router } from "express";

// src/server/services/github.service.ts
import { Octokit } from "@octokit/rest";
import axios from "axios";
var rateLimitRemaining = 5e3;
var rateLimitReset = 0;
var getOctokit = (accessToken) => {
  const octokit = new Octokit({ auth: accessToken });
  octokit.hook.after("request", (response) => {
    const remaining = response.headers?.["x-ratelimit-remaining"];
    const reset = response.headers?.["x-ratelimit-reset"];
    if (remaining !== void 0) {
      rateLimitRemaining = parseInt(remaining, 10);
    }
    if (reset !== void 0) {
      rateLimitReset = parseInt(reset, 10) * 1e3;
    }
  });
  return octokit;
};
var checkRateLimit = () => {
  if (rateLimitRemaining < 10) {
    const retryAfter = Math.max(0, Math.ceil((rateLimitReset - Date.now()) / 1e3));
    const err = new Error(
      `GitHub API rate limit nearly exhausted (${rateLimitRemaining} remaining). Resets in ${retryAfter}s.`
    );
    err.status = 429;
    err.retryAfter = retryAfter;
    throw err;
  }
};
var handleRateLimitError = (error, res) => {
  if (error.status === 429 || error.status === 403 && error.message?.includes("rate limit")) {
    const retryAfter = error.retryAfter || 60;
    res.set?.("Retry-After", String(retryAfter));
    res.status(429).json({
      message: "GitHub API rate limit exceeded. Please try again later.",
      retryAfter
    });
    return true;
  }
  return false;
};
var getAccessToken = async (code) => {
  const response = await axios.post(
    "https://github.com/login/oauth/access_token",
    {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code
    },
    { headers: { Accept: "application/json" } }
  );
  return response.data.access_token;
};
var getUserProfile = async (accessToken) => {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.users.getAuthenticated();
  return data;
};

// src/server/controllers/auth.controller.ts
var GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
var APP_URL = process.env.APP_URL;
var githubLogin = (req, res) => {
  const redirectUri = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${APP_URL}/api/auth/github/callback&scope=user:email,repo`;
  res.redirect(redirectUri);
};
var githubCallback = async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send("Missing authorization code");
  }
  try {
    const accessToken = await getAccessToken(code);
    const userProfile = await getUserProfile(accessToken);
    req.session.accessToken = accessToken;
    req.session.user = userProfile;
    res.redirect("/");
  } catch (error) {
    console.error("Error during GitHub OAuth callback:", error);
    res.status(500).send("Internal Server Error");
  }
};
var getSession = (req, res) => {
  if (req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ message: "Not authenticated" });
  }
};

// src/server/routes/auth.routes.ts
var router = Router();
router.get("/github", githubLogin);
router.get("/github/callback", githubCallback);
router.get("/session", getSession);
var auth_routes_default = router;

// src/server/routes/api.routes.ts
import { Router as Router2 } from "express";

// src/server/services/scoring.service.ts
var calculateMergeProbability = (issue) => {
  const weights = {
    recency: 0.4,
    // How recently the issue was updated
    comments: 0.2,
    // Engagement level
    authorAssociation: 0.2,
    // Higher score if a maintainer opened it
    labelBoost: 0.2
    // Boost for 'good first issue', 'help wanted'
  };
  const daysSinceUpdate = (Date.now() - new Date(issue.updated_at).getTime()) / (1e3 * 3600 * 24);
  const recencyScore = Math.max(0, 1 - daysSinceUpdate / 90);
  const commentScore = Math.min(issue.comments / 20, 1);
  const authorAssociationScore = ["MEMBER", "OWNER"].includes(issue.author_association) ? 1 : 0;
  const hasGoodLabels = issue.labels.some(
    (label) => ["good first issue", "help wanted", "documentation"].includes(label.name.toLowerCase())
  );
  const labelBoostScore = hasGoodLabels ? 1 : 0;
  const finalScore = recencyScore * weights.recency + commentScore * weights.comments + authorAssociationScore * weights.authorAssociation + labelBoostScore * weights.labelBoost;
  return Math.round(finalScore * 100);
};
var calculateCompetition = (issue) => {
  if (issue.comments <= 1) return "Low";
  if (issue.comments <= 5) return "Medium";
  return "High";
};
var calculateMaintainerActivity = (issue) => {
  return "High";
};
var estimateComplexity = (issue) => {
  const body = issue.body || "";
  const hasTaskList = /-\s\[[ xX]\]/.test(body);
  const bodyLength = body.length;
  if (hasTaskList && bodyLength > 1500) return "High";
  if (bodyLength > 1e3 || hasTaskList) return "Medium";
  if (bodyLength < 250) return "Low";
  return "Medium";
};

// src/server/utils/cache.ts
var ServerCache = class {
  constructor(defaultTTL = 2 * 60 * 1e3, maxEntries = 500) {
    this.store = /* @__PURE__ */ new Map();
    this.defaultTTL = defaultTTL;
    this.maxEntries = maxEntries;
  }
  get(key, ttl) {
    const entry = this.store.get(key);
    if (!entry) return null;
    const effectiveTTL = ttl ?? this.defaultTTL;
    if (Date.now() - entry.timestamp > effectiveTTL) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }
  set(key, data, etag) {
    if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== void 0) this.store.delete(oldestKey);
    }
    this.store.set(key, { data, timestamp: Date.now(), etag });
  }
  getEtag(key) {
    return this.store.get(key)?.etag;
  }
  /** Return cached data even if expired (for use with 304 responses) */
  getStale(key) {
    const entry = this.store.get(key);
    return entry ? entry.data : null;
  }
  invalidate(key) {
    this.store.delete(key);
  }
  invalidatePrefix(prefix) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }
  clear() {
    this.store.clear();
  }
};
var serverCache = new ServerCache(2 * 60 * 1e3, 500);
var longCache = new ServerCache(15 * 60 * 1e3, 100);

// src/server/services/ai.service.ts
import { GoogleGenAI } from "@google/genai";
var apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("GEMINI_API_KEY environment variable is missing.");
}
var ai = new GoogleGenAI({ apiKey: apiKey || "" });
var generateIssueAnalysis = async (title, body, owner, repo, isPR = false) => {
  if (!apiKey) {
    throw new Error("AI analysis is disabled because GEMINI_API_KEY is not configured.");
  }
  const issuePrompt = `
You are a Staff Software Engineer analyzing a GitHub open-source issue in the repository "**${owner}/${repo}**".
Your task is to analyze the issue and provide a concrete, step-by-step implementation plan for a contributor to solve it.

**Context:**
- Issue Title: ${title}
- Issue Description:
${body || "No description provided."}

**Requirements for your response:**
1. Be extremely concise. Use markdown.
2. Provide a 1-sentence **Summary** of what needs to be built or fixed.
3. Provide a **File Identification** section guessing which files/folders might be involved (if applicable).
4. Provide a step-by-step **Implementation Plan** (3-5 bullet points) on how to tackle this issue technically.
5. Provide a short **Testing Strategy** (1-2 sentences).
6. Do not include introductory/outro conversational fluff. Output the markdown directly.
`;
  const prPrompt = `
You are a Staff Software Engineer analyzing a GitHub pull request in the repository "**${owner}/${repo}**".
Your task is to provide a strategic merge analysis for this PR, helping the contributor understand its likelihood of being merged and what actions to take.

**Context:**
- PR Title: ${title}
- PR Description:
${body || "No description provided."}

**Requirements for your response:**
1. Be extremely concise. Use markdown.
2. Provide a 1-sentence **Summary** of what this PR does.
3. Provide a **Merge Likelihood Assessment** with a qualitative rating (High / Medium / Low) and 2-3 bullet points explaining the key factors (e.g., scope, alignment with project goals, code quality signals).
4. Provide a **Reviewer Engagement Strategy** section (2-3 bullet points) advising how to increase chances of review and merge (e.g., who to tag, how to break up large PRs, responding to feedback).
5. Provide a **Risk Factors** section listing 1-3 potential blockers or concerns (e.g., breaking changes, missing tests, scope creep).
6. Provide a short **Recommended Next Steps** section (2-3 actionable bullet points).
7. Do not include introductory/outro conversational fluff. Output the markdown directly.
`;
  const prompt = isPR ? prPrompt : issuePrompt;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });
    return response.text || "Unable to generate analysis at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate AI analysis.");
  }
};

// src/server/controllers/api.controller.ts
var getIssues = async (req, res) => {
  const { owner, repo: name } = req.params;
  const { labels } = req.query;
  if (!req.session.accessToken) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const cacheKey = `issues_${owner}_${name}_${labels || ""}`;
  const cached = serverCache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }
  try {
    checkRateLimit();
    const octokit = getOctokit(req.session.accessToken);
    let q = `repo:${owner}/${name} is:issue is:open -linked:pr`;
    if (labels && typeof labels === "string" && labels.length > 0) {
      labels.split(",").forEach((label) => {
        q += ` label:"${label.trim()}"`;
      });
    }
    const { data } = await octokit.search.issuesAndPullRequests({
      q,
      sort: "updated",
      order: "desc",
      per_page: 30
    });
    const scoredIssues = data.items.map((issue) => ({
      ...issue,
      mergeProbability: calculateMergeProbability(issue),
      competition: calculateCompetition(issue),
      maintainerActivity: calculateMaintainerActivity(issue),
      complexity: estimateComplexity(issue)
    }));
    serverCache.set(cacheKey, scoredIssues);
    res.json(scoredIssues);
  } catch (error) {
    if (handleRateLimitError(error, res)) return;
    console.error(`Failed to fetch issues for ${owner}/${name}:`, error);
    res.status(500).json({ message: "Failed to fetch issues" });
  }
};
var analyzeIssue = async (req, res) => {
  if (!req.session.accessToken) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const { title, body, owner, repo, isPR } = req.body;
  if (!title || !owner || !repo) {
    return res.status(400).json({ message: "Missing required issue text parameters" });
  }
  try {
    const analysis = await generateIssueAnalysis(title, body || "", owner, repo, !!isPR);
    res.json({ analysis });
  } catch (error) {
    console.error("Failed to analyze issue:", error);
    res.status(500).json({ message: error.message || "Failed to generate AI analysis" });
  }
};
var getTrending = async (_req, res) => {
  const cachedTrending = longCache.get("trending");
  if (cachedTrending) {
    return res.json(cachedTrending);
  }
  try {
    const response = await fetch("https://github.com/trending?spoken_language_code=en");
    if (!response.ok) throw new Error(`GitHub trending returned ${response.status}`);
    const html = await response.text();
    const repos = [];
    const articleRegex = /<article[^>]*class="Box-row"[^>]*>([\s\S]*?)<\/article>/g;
    let match;
    while ((match = articleRegex.exec(html)) !== null && repos.length < 12) {
      const article = match[1];
      const h2Match = article.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
      if (!h2Match) continue;
      const repoMatch = h2Match[1].match(/href="\/([^"]+)"/);
      if (!repoMatch) continue;
      const repoName = repoMatch[1];
      const descMatch = article.match(/<p class="col-9[^"]*">([\s\S]*?)<\/p>/);
      const desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, "").trim() : "No description provided.";
      const langMatch = article.match(/<span itemprop="programmingLanguage">([\s\S]*?)<\/span>/);
      const language = langMatch ? langMatch[1].trim() : null;
      const starsMatch = article.match(/href="\/[^/]+\/[^/]+\/stargazers"[^>]*>.*?<svg[^>]*>.*?<\/svg>\s*([\d,]+)\s*<\/a>/s);
      const stars = starsMatch ? parseInt(starsMatch[1].replace(/,/g, "")) : 0;
      const todayMatch = article.match(/([\d,]+)\s*stars\s*(today|this week|this month)/);
      const starsToday = todayMatch ? parseInt(todayMatch[1].replace(/,/g, "")) : 0;
      const starsPeriod = todayMatch ? todayMatch[2] : "today";
      repos.push({
        repo: repoName,
        desc,
        language: language || "Unknown",
        stars,
        starsToday,
        starsPeriod,
        url: `https://github.com/${repoName}`
      });
    }
    longCache.set("trending", repos);
    res.json(repos);
  } catch (error) {
    const stale = longCache.getStale("trending");
    if (stale) return res.json(stale);
    console.error("Failed to fetch trending repos:", error);
    res.status(500).json({ message: "Failed to fetch trending repos" });
  }
};
var getRepoInfo = async (req, res) => {
  const { owner, repo } = req.params;
  if (!req.session.accessToken) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const cacheKey = `repo_${owner}_${repo}`;
  const cached = serverCache.get(cacheKey);
  if (cached) return res.json(cached);
  try {
    checkRateLimit();
    const octokit = getOctokit(req.session.accessToken);
    const { data } = await octokit.repos.get({ owner, repo });
    const result = {
      repo: data.full_name,
      desc: data.description,
      stars: data.stargazers_count,
      language: data.language,
      url: data.html_url
    };
    serverCache.set(cacheKey, result);
    res.json(result);
  } catch (error) {
    if (handleRateLimitError(error, res)) return;
    console.error(`Failed to fetch repo info for ${owner}/${repo}:`, error);
    res.status(500).json({ message: "Failed to fetch repository information" });
  }
};

// src/server/routes/api.routes.ts
var router2 = Router2();
router2.get("/issues/:owner/:repo", getIssues);
router2.post("/issues/analyze", analyzeIssue);
router2.get("/trending", getTrending);
router2.get("/repos/:owner/:repo", getRepoInfo);
var api_routes_default = router2;

// src/server/routes/watchlist.routes.ts
import { Router as Router3 } from "express";

// src/server/models/user.model.ts
var users = /* @__PURE__ */ new Map();
var getUser = (id) => {
  if (!users.has(id)) {
    users.set(id, { id, watchlist: [] });
  }
  return users.get(id);
};
var addToWatchlist = (userId, repo) => {
  const user = getUser(userId);
  if (user && !user.watchlist.includes(repo)) {
    user.watchlist.push(repo);
  }
  return user;
};
var removeFromWatchlist = (userId, repo) => {
  const user = getUser(userId);
  if (user) {
    user.watchlist = user.watchlist.filter((r) => r !== repo);
  }
  return user;
};
var getWatchlist = (userId) => {
  return getUser(userId)?.watchlist || [];
};

// src/server/services/watchlist.service.ts
var calculateRepoInsights = (issues) => {
  if (issues.length === 0) {
    return {
      activityLevel: "Low",
      mergeFriendliness: 0,
      contributorCompetition: "Low"
    };
  }
  const avgMergeProbability = issues.reduce((acc, issue) => acc + calculateMergeProbability(issue), 0) / issues.length;
  const recentIssues = issues.filter((i) => new Date(i.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3));
  return {
    activityLevel: recentIssues.length > 10 ? "High" : "Medium",
    mergeFriendliness: Math.round(avgMergeProbability),
    contributorCompetition: issues.reduce((acc, i) => acc + i.comments, 0) > 50 ? "High" : "Medium"
  };
};
var getRepoInsights = async (accessToken, repo) => {
  const cacheKey = `insights_${repo}`;
  const cached = serverCache.get(cacheKey);
  if (cached) return cached;
  const [owner, name] = repo.split("/");
  const octokit = getOctokit(accessToken);
  const { data: issues } = await octokit.issues.listForRepo({ owner, repo: name, state: "open" });
  const insights = calculateRepoInsights(issues);
  serverCache.set(cacheKey, insights);
  return insights;
};
var getBatchRepoInsights = async (accessToken, repos) => {
  const results = {};
  const MAX_CONCURRENT = 3;
  for (let i = 0; i < repos.length; i += MAX_CONCURRENT) {
    const batch = repos.slice(i, i + MAX_CONCURRENT);
    const settled = await Promise.allSettled(
      batch.map((repo) => getRepoInsights(accessToken, repo))
    );
    settled.forEach((result, idx) => {
      const repo = batch[idx];
      results[repo] = result.status === "fulfilled" ? result.value : null;
    });
  }
  return results;
};

// src/server/controllers/watchlist.controller.ts
var getWatchlist2 = (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const watchlist = getWatchlist(req.session.user.id.toString());
  res.json(watchlist);
};
var addToWatchlist2 = (req, res) => {
  const { repo } = req.body;
  if (!req.session.user || !repo) {
    return res.status(400).json({ message: "Missing user or repo" });
  }
  const updatedUser = addToWatchlist(req.session.user.id.toString(), repo);
  res.json(updatedUser.watchlist);
};
var removeFromWatchlist2 = (req, res) => {
  const { repo } = req.body;
  if (!req.session.user || !repo) {
    return res.status(400).json({ message: "Missing user or repo" });
  }
  const updatedUser = removeFromWatchlist(req.session.user.id.toString(), repo);
  res.json(updatedUser?.watchlist || []);
};
var fetchRepoInsights = async (req, res) => {
  const { owner, repo } = req.params;
  if (!req.session.accessToken) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  try {
    checkRateLimit();
    const insights = await getRepoInsights(req.session.accessToken, `${owner}/${repo}`);
    res.json(insights);
  } catch (error) {
    if (handleRateLimitError(error, res)) return;
    console.error(`Failed to fetch insights for ${repo}:`, error);
    res.status(500).json({ message: "Failed to fetch insights" });
  }
};
var fetchBatchRepoInsights = async (req, res) => {
  if (!req.session.accessToken) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const { repos } = req.body;
  if (!Array.isArray(repos) || repos.length === 0) {
    return res.status(400).json({ message: "Missing repos array" });
  }
  const reposToFetch = repos.slice(0, 20);
  try {
    checkRateLimit();
    const insights = await getBatchRepoInsights(req.session.accessToken, reposToFetch);
    res.json(insights);
  } catch (error) {
    if (handleRateLimitError(error, res)) return;
    console.error("Failed to fetch batch insights:", error);
    res.status(500).json({ message: "Failed to fetch batch insights" });
  }
};

// src/server/routes/watchlist.routes.ts
var router3 = Router3();
router3.get("/", getWatchlist2);
router3.post("/", addToWatchlist2);
router3.delete("/", removeFromWatchlist2);
router3.get("/insights/:owner/:repo", fetchRepoInsights);
router3.post("/insights/batch", fetchBatchRepoInsights);
var watchlist_routes_default = router3;

// src/server/routes/user.routes.ts
import { Router as Router4 } from "express";

// src/server/controllers/user.controller.ts
var getAuthenticatedUser = async (req) => {
  const accessToken = req.session.accessToken;
  if (!accessToken) return null;
  if (!req.session.user || !req.session.user.login) {
    try {
      const userProfile = await getUserProfile(accessToken);
      req.session.user = userProfile;
    } catch (e) {
      console.error("Failed to rehydrate user profile:", e);
      return null;
    }
  }
  return { username: req.session.user.login, accessToken };
};
var getMyPRs = async (req, res) => {
  const auth = await getAuthenticatedUser(req);
  if (!auth) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  try {
    const cacheKey = `prs_${auth.username}`;
    const cached = serverCache.get(cacheKey);
    if (cached) return res.json(cached);
    checkRateLimit();
    const octokit = getOctokit(auth.accessToken);
    const { data } = await octokit.search.issuesAndPullRequests({
      q: `is:pr author:${auth.username}`,
      sort: "updated",
      order: "desc",
      per_page: 100
    });
    const prs = data.items.map((pr) => ({
      ...pr,
      mergeProbability: calculateMergeProbability(pr)
    }));
    serverCache.set(cacheKey, prs);
    res.json(prs);
  } catch (error) {
    if (handleRateLimitError(error, res)) return;
    console.error("Failed to fetch user PRs:", error);
    res.status(500).json({ message: "Failed to fetch user PRs" });
  }
};
var getMyIssues = async (req, res) => {
  const auth = await getAuthenticatedUser(req);
  if (!auth) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  try {
    const cacheKey = `issues_${auth.username}`;
    const cached = serverCache.get(cacheKey);
    if (cached) return res.json(cached);
    checkRateLimit();
    const octokit = getOctokit(auth.accessToken);
    const username = auth.username;
    const dataRes = await octokit.search.issuesAndPullRequests({
      q: `is:issue author:${username}`,
      per_page: 100
    });
    let openIssues;
    let closedIssues;
    if (dataRes.data.total_count <= 100) {
      openIssues = dataRes.data.items.filter((i) => i.state === "open").length;
      closedIssues = dataRes.data.items.filter((i) => i.state === "closed").length;
    } else {
      const [openRes, closedRes] = await Promise.all([
        octokit.search.issuesAndPullRequests({ q: `is:issue is:open author:${username}`, per_page: 1 }),
        octokit.search.issuesAndPullRequests({ q: `is:issue is:closed author:${username}`, per_page: 1 })
      ]);
      openIssues = openRes.data.total_count;
      closedIssues = closedRes.data.total_count;
    }
    const result = {
      items: dataRes.data.items,
      stats: {
        totalIssues: dataRes.data.total_count,
        openIssues,
        closedIssues
      }
    };
    serverCache.set(cacheKey, result);
    res.json(result);
  } catch (error) {
    if (handleRateLimitError(error, res)) return;
    console.error("Failed to fetch user issues:", error);
    res.status(500).json({ message: "Failed to fetch user issues" });
  }
};
var getDashboardStats = async (req, res) => {
  const auth = await getAuthenticatedUser(req);
  if (!auth) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  try {
    const cacheKey = `stats_${auth.username}`;
    const cached = serverCache.get(cacheKey);
    if (cached) return res.json(cached);
    checkRateLimit();
    const octokit = getOctokit(auth.accessToken);
    const username = auth.username;
    const [recentPRsRes, contributionsRes] = await Promise.all([
      octokit.search.issuesAndPullRequests({
        q: `is:pr author:${username}`,
        sort: "created",
        order: "desc",
        per_page: 100
      }),
      // GraphQL contribution calendar — the definitive source for streaks.
      // Counts everything GitHub considers a contribution: commits, PRs opened,
      // PR reviews, issues opened, etc.
      octokit.graphql(`query { viewer { contributionsCollection { contributionCalendar { weeks { contributionDays { date contributionCount } } } } } }`)
    ]);
    let mergedPRs;
    let openPRs;
    if (recentPRsRes.data.total_count <= 100) {
      mergedPRs = recentPRsRes.data.items.filter((pr) => pr.pull_request?.merged_at).length;
      openPRs = recentPRsRes.data.items.filter((pr) => pr.state === "open").length;
    } else {
      const [mergedRes, openRes] = await Promise.all([
        octokit.search.issuesAndPullRequests({ q: `is:pr is:merged author:${username}`, per_page: 1 }),
        octokit.search.issuesAndPullRequests({ q: `is:pr state:open author:${username}`, per_page: 1 })
      ]);
      mergedPRs = mergedRes.data.total_count;
      openPRs = openRes.data.total_count;
    }
    const totalPRs = recentPRsRes.data.total_count;
    const closedPRs = Math.max(0, totalPRs - mergedPRs - openPRs);
    const mergeRate = totalPRs > 0 ? Math.round(mergedPRs / totalPRs * 100) : 0;
    const calendar = contributionsRes.viewer.contributionsCollection.contributionCalendar;
    const dayMap = /* @__PURE__ */ new Map();
    for (const week of calendar.weeks) {
      for (const day of week.contributionDays) {
        dayMap.set(day.date, day.contributionCount);
      }
    }
    const sortedCalendarDates = Array.from(dayMap.keys()).sort((a, b) => b.localeCompare(a));
    const calendarToday = sortedCalendarDates[0];
    const calendarYesterday = sortedCalendarDates[1];
    if (calendarToday) {
      const todayStart = (/* @__PURE__ */ new Date(calendarToday + "T00:00:00Z")).getTime();
      const yesterdayStart = calendarYesterday ? (/* @__PURE__ */ new Date(calendarYesterday + "T00:00:00Z")).getTime() : 0;
      recentPRsRes.data.items.forEach((item) => {
        const createdMs = new Date(item.created_at).getTime();
        if (createdMs >= todayStart) {
          dayMap.set(calendarToday, Math.max(dayMap.get(calendarToday) ?? 0, 1));
        } else if (yesterdayStart && createdMs >= yesterdayStart) {
          dayMap.set(calendarYesterday, Math.max(dayMap.get(calendarYesterday) ?? 0, 1));
        }
        const mergedAt = item.pull_request?.merged_at;
        if (mergedAt) {
          const mergedMs = new Date(mergedAt).getTime();
          if (mergedMs >= todayStart) {
            dayMap.set(calendarToday, Math.max(dayMap.get(calendarToday) ?? 0, 1));
          } else if (yesterdayStart && mergedMs >= yesterdayStart) {
            dayMap.set(calendarYesterday, Math.max(dayMap.get(calendarYesterday) ?? 0, 1));
          }
        }
      });
    }
    const allDays = Array.from(dayMap.entries()).map(([date, count]) => ({ date, count })).sort((a, b) => b.date.localeCompare(a.date));
    let currentStreak = 0;
    let start = 0;
    if (allDays[0]?.count === 0) start = 1;
    if (start < allDays.length && allDays[start].count > 0) {
      for (let i = start; i < allDays.length; i++) {
        if (allDays[i].count > 0) currentStreak++;
        else break;
      }
    }
    let maxStreak = 0;
    let tempStreak = 0;
    for (let i = allDays.length - 1; i >= 0; i--) {
      if (allDays[i].count > 0) {
        tempStreak++;
        if (tempStreak > maxStreak) maxStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }
    const recentActivityDates = allDays.filter((d) => d.count > 0).map((d) => (/* @__PURE__ */ new Date(d.date + "T00:00:00Z")).getTime());
    const result = {
      totalPRs,
      mergedPRs,
      openPRs,
      closedPRs,
      mergeRate,
      currentStreak,
      maxStreak,
      recentActivityDates
    };
    serverCache.set(cacheKey, result);
    res.json(result);
  } catch (error) {
    if (handleRateLimitError(error, res)) return;
    console.error("Failed to fetch dashboard stats:", error);
    res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
};

// src/server/routes/user.routes.ts
var router4 = Router4();
router4.get("/prs", getMyPRs);
router4.get("/issues", getMyIssues);
router4.get("/dashboard", getDashboardStats);
var user_routes_default = router4;

// src/server/app.ts
var createApp = async ({ withVite = false } = {}) => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(session({
    secret: process.env.SESSION_SECRET || "a_very_secret_key_that_should_be_in_env",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === "production" }
  }));
  app.use("/api/auth", auth_routes_default);
  app.use("/api", api_routes_default);
  app.use("/api/watchlist", watchlist_routes_default);
  app.use("/api/user", user_routes_default);
  if (withVite) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  return app;
};

// src/server/handler.ts
var appPromise = createApp({ withVite: false });
async function handler(req, res) {
  const app = await appPromise;
  return app(req, res);
}
export {
  handler as default
};
