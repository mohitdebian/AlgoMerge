import { createApp } from '../src/server/app';

const appPromise = createApp({ withVite: false });

export default async function handler(req: any, res: any) {
  const app = await appPromise;
  return app(req, res);
}
