import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getAccessToken, getUserProfile } from '../services/github.service.js';
import { signToken, COOKIE_NAME, COOKIE_OPTIONS } from '../utils/auth.js';
import { upsertUser } from '../models/user.model.js';

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const APP_URL = process.env.APP_URL;

// Zod schema for request body validation
const CredentialsSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(30),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  email: z.string().email('Invalid email address').optional(),
});

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

    // Persist / update user in Supabase
    await upsertUser(
      userProfile.id.toString(),
      userProfile.login,
      userProfile.avatar_url
    );

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

/**
 * Demonstrates Password Hashing with bcryptjs and Request Body Validation with Zod
 */
export const registerWithPassword = async (req: Request, res: Response) => {
  try {
    const validationResult = CredentialsSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.flatten().fieldErrors,
      });
    }

    const { username, password, email } = validationResult.data;

    // Salt and hash password using bcrypt
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const passwordHash = await bcrypt.hash(password, salt);

    // Persist simulated hashed user
    const simulatedUserId = `local_${Date.now()}`;
    await upsertUser(simulatedUserId, username, 'https://github.com/ghost.png');

    const token = signToken({
      userId: simulatedUserId,
      username,
      avatarUrl: 'https://github.com/ghost.png',
    });

    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    return res.status(201).json({
      message: 'User registered successfully',
      user: { id: simulatedUserId, username, email },
      passwordHashPreview: passwordHash.substring(0, 15) + '...',
    });
  } catch (error) {
    console.error('Error registering user:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
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
  res.redirect('/');
};