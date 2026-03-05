import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { attachUser } from './utils/auth.js';
import authRoutes from './routes/auth.routes.js';
import apiRoutes from './routes/api.routes.js';
import watchlistRoutes from './routes/watchlist.routes.js';
import userRoutes from './routes/user.routes.js';

export const createApp = async ({ withVite = false }: { withVite?: boolean } = {}) => {
  const app = express();

  app.use(cors({
    origin: process.env.APP_URL || true,
    credentials: true,
  }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(attachUser);

  app.use('/api/auth', authRoutes);
  app.use('/api', apiRoutes);
  app.use('/api/watchlist', watchlistRoutes);
  app.use('/api/user', userRoutes);

  if (withVite) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  return app;
};
