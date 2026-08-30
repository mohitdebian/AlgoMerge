// Automated API testing / integration tests
import { describe, it, expect, vi } from 'vitest';

describe('API Integration Tests', () => {
  it('GET /api/auth/session returns 401 when not authenticated', async () => {
    const res = await fetch('/api/auth/session');
    expect(res.status).toBe(401);
  });

  it('POST /api/analyze validates required fields', async () => {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('GET /api/trending returns array of repos', async () => {
    const res = await fetch('/api/trending');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});
