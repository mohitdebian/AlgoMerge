import { createApp } from '../src/server/app.js';
import mongoose from 'mongoose';

const appPromise = createApp({ withVite: false }).then(async (app) => {
  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri && mongoose.connection.readyState !== 1) {
    try {
      await mongoose.connect(mongoUri);
      console.log('Connected to MongoDB (Serverless)');
    } catch (err) {
      console.error('Failed to connect to MongoDB in serverless:', err);
    }
  }
  return app;
});

export default async function handler(req: any, res: any) {
  const app = await appPromise;
  return app(req, res);
}
