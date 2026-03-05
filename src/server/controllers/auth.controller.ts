import { Request, Response } from 'express';
import { getAccessToken, getUserProfile } from '../services/github.service.js';
import { signToken, COOKIE_NAME, COOKIE_OPTIONS } from '../utils/auth.js';

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const APP_URL = process.env.APP_URL;

export const githubLogin = (req: Request, res: Response) => {
  const redirectUri = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${APP_URL}/api/auth/github/callback&scope=user:email,repo`;
  res.redirect(redirectUri);
};

export const githubCallback = async (req: Request, res: Response) => {
  const code = req.query.code as string;
  if (!code) {
    return res.status(400).send('Missing authorization code');
  }

  try {
    const accessToken = await getAccessToken(code);
    const userProfile = await getUserProfile(accessToken);

    const token = signToken({
      userId: userProfile.id,
      username: userProfile.login,
      avatarUrl: userProfile.avatar_url,
      accessToken,
    });

    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    res.redirect('/');
  } catch (error) {
    console.error('Error during GitHub OAuth callback:', error);
    res.status(500).send('Internal Server Error');
  }
};

export const getSession = (req: Request, res: Response) => {
  if (req.user) {
    res.json({ user: { id: req.user.userId, login: req.user.username, avatar_url: req.user.avatarUrl } });
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
};

export const logout = (_req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
  res.json({ message: 'Logged out' });
};