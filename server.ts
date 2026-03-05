import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import session from 'express-session';
import cors from 'cors';
import authRoutes from './src/server/routes/auth.routes.ts';
import apiRoutes from './src/server/routes/api.routes.ts';
import watchlistRoutes from './src/server/routes/watchlist.routes.ts';
import userRoutes from './src/server/routes/user.routes.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

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

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
