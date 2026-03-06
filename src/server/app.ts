import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { attachUser } from './utils/auth.js';
import authRoutes from './routes/auth.routes.js';
import apiRoutes from './routes/api.routes.js';
import watchlistRoutes from './routes/watchlist.routes.js';
import userRoutes from './routes/user.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const injectPublicMeta = (html: string, username: string, baseUrl: string) => {
  const safeUsername = escapeHtml(username);
  const pageUrl = `${baseUrl}/u/${encodeURIComponent(username)}`;
  const imageUrl = `${baseUrl}/api/public/${encodeURIComponent(username)}/share-card.svg`;
  const title = `${safeUsername}'s PR Radar Scorecard`;
  const description = `Momentum, streak, badges, and weekly wins for @${safeUsername}.`;

  const tags = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<meta property="og:type" content="profile" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${pageUrl}" />`,
    `<meta property="og:image" content="${imageUrl}" />`,
    `<meta property="twitter:card" content="summary_large_image" />`,
    `<meta property="twitter:title" content="${title}" />`,
    `<meta property="twitter:description" content="${description}" />`,
    `<meta property="twitter:image" content="${imageUrl}" />`,
  ].join('\n    ');

  if (html.includes('</head>')) {
    return html.replace('</head>', `    ${tags}\n  </head>`);
  }

  return html;
};

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

    app.get(['/u/:username', '/api/u/:username'], async (req, res, next) => {
      try {
        const templatePath = path.resolve(projectRoot, 'index.html');
        const template = await fs.readFile(templatePath, 'utf-8');
        const protocol = req.headers['x-forwarded-proto']?.toString() || req.protocol;
        const host = req.headers['x-forwarded-host']?.toString() || req.get('host') || 'localhost:3000';
        const baseUrl = `${protocol}://${host}`;
        const html = injectPublicMeta(template, req.params.username, baseUrl);
        const transformed = await vite.transformIndexHtml(req.originalUrl, html);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(transformed);
      } catch (error) {
        next(error);
      }
    });

    app.use(vite.middlewares);
  } else {
    app.get(['/u/:username', '/api/u/:username'], async (req, res) => {
      try {
        const distTemplatePath = path.resolve(projectRoot, 'dist/index.html');
        const fallbackTemplatePath = path.resolve(projectRoot, 'index.html');
        let template = '';
        try {
          template = await fs.readFile(distTemplatePath, 'utf-8');
        } catch {
          try {
            template = await fs.readFile(fallbackTemplatePath, 'utf-8');
          } catch {
            // Serverless fallback: minimal SPA shell that bootstraps the app
            template = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head><body><div id="root"></div></body></html>`;
          }
        }

        const protocol = req.headers['x-forwarded-proto']?.toString() || req.protocol;
        const host = req.headers['x-forwarded-host']?.toString() || req.get('host') || 'localhost:3000';
        const baseUrl = `${protocol}://${host}`;
        const html = injectPublicMeta(template, req.params.username, baseUrl);
        res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
      } catch (error) {
        console.error('Failed to serve public scorecard page with meta:', error);
        res.status(500).send('Failed to render public scorecard page');
      }
    });
  }

  return app;
};
