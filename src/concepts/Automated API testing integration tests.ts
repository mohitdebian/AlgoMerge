// Automated API testing / integration tests
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { createApp } from '../server/app';

describe('API Integration Tests', () => {
  it('GET /api/session returns 401 when not authenticated', async () => {
    const app = await createApp({ withVite: false });
    const res = await request(app).get('/api/auth/session');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Not authenticated');
  });

  it('GET /api/health returns 200', async () => {
    const app = await createApp({ withVite: false });
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });

  it('POST /api/auth/register validates request body', async () => {
    const app = await createApp({ withVite: false });
    const res = await request(app).post('/api/auth/register').send({ username: 'ab' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });
});
