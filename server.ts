import 'dotenv/config';
import { createApp } from './api/_lib/app.ts';

async function startServer() {
  const app = await createApp({ withVite: process.env.NODE_ENV !== 'production' });
  const PORT = 3000;

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
