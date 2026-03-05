import { Request, Response } from 'express';
import { getAccessToken, getUserProfile } from '../services/github.service';

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

    // @ts-ignore
    req.session.accessToken = accessToken;
    // @ts-ignore
    req.session.user = userProfile;

    res.redirect('/');
  } catch (error) {
    console.error('Error during GitHub OAuth callback:', error);
    res.status(500).send('Internal Server Error');
  }
};

export const getSession = (req: Request, res: Response) => {
    // @ts-ignore
  if (req.session.user) {
    // @ts-ignore
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
};