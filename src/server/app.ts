import express from 'express';
import session from 'express-session';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import apiRoutes from './routes/api.routes.js';
import watchlistRoutes from './routes/watchlist.routes.js';
import userRoutes from './routes/user.routes.js';

export const createApp = async ({ withVite = false }: { withVite?: boolean } = {}) => {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(session({
    secret: process.env.SESSION_SECRET || 'a_very_secret_key_that_should_be_in_env',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
  }));

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
