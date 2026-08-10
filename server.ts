import 'dotenv/config';
import mongoose from 'mongoose';
import { createApp } from './src/server/app.ts';

async function startServer() {
  // Connect to MongoDB
  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri);
      console.log('Connected to MongoDB');
    } catch (err) {
      console.error('Failed to connect to MongoDB:', err);
    }
  } else {
    console.warn('MONGODB_URI is not set. AI Analysis caching will be disabled.');
  }

  const app = await createApp({ withVite: process.env.NODE_ENV !== 'production' });
  const PORT = 3000;

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
