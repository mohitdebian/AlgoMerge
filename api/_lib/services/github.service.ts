import { Octokit } from '@octokit/rest';
import axios from 'axios';

const GITHUB_API_URL = 'https://api.github.com';

/** Track remaining rate limit across all Octokit instances */
let rateLimitRemaining = 5000;
let rateLimitReset = 0;

export const getRateLimitStatus = () => ({
  remaining: rateLimitRemaining,
  resetAt: rateLimitReset,
  isLow: rateLimitRemaining < 100,
  isExhausted: rateLimitRemaining < 10,
});

export const getOctokit = (accessToken: string) => {
  const octokit = new Octokit({ auth: accessToken });

  // Hook into responses to track rate limit headers
  octokit.hook.after('request', (response: any) => {
    const remaining = response.headers?.['x-ratelimit-remaining'];
    const reset = response.headers?.['x-ratelimit-reset'];
    if (remaining !== undefined) {
      rateLimitRemaining = parseInt(remaining, 10);
    }
    if (reset !== undefined) {
      rateLimitReset = parseInt(reset, 10) * 1000;
    }
  });

  return octokit;
};

/**
 * Check rate limit before making a request. Returns true if safe to proceed.
 * If exhausted, throws an error with retry-after info.
 */
export const checkRateLimit = (): void => {
  if (rateLimitRemaining < 10) {
    const retryAfter = Math.max(0, Math.ceil((rateLimitReset - Date.now()) / 1000));
    const err: any = new Error(
      `GitHub API rate limit nearly exhausted (${rateLimitRemaining} remaining). Resets in ${retryAfter}s.`
    );
    err.status = 429;
    err.retryAfter = retryAfter;
    throw err;
  }
};

/**
 * Shared rate limit error handler for controllers.
 * Returns true if the error was a rate limit error and a response was sent.
 */
export const handleRateLimitError = (error: any, res: any): boolean => {
  if (error.status === 429 || (error.status === 403 && error.message?.includes('rate limit'))) {
    const retryAfter = error.retryAfter || 60;
    res.set?.('Retry-After', String(retryAfter));
    res.status(429).json({
      message: 'GitHub API rate limit exceeded. Please try again later.',
      retryAfter,
    });
    return true;
  }
  return false;
};

export const getAccessToken = async (code: string) => {
  const response = await axios.post(
    'https://github.com/login/oauth/access_token',
    {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    },
    { headers: { Accept: 'application/json' } }
  );
  return response.data.access_token;
};

export const getUserProfile = async (accessToken: string) => {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.users.getAuthenticated();
  return data;
};