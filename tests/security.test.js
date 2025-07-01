const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');

// Helper: Wait for rate limit window to reset
const wait = ms => new Promise(res => setTimeout(res, ms));

describe('Security & Validation', () => {
  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('Health endpoint returns 200 and security headers', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    // Helmet headers
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['x-dns-prefetch-control']).toBeDefined();
  });

  it('Signup fails with invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Test', email: 'bademail', password: 'Password1' });
    expect(res.status).toBe(400);
    expect(res.body.error || res.body.message).toBeDefined();
  });

  it('Login fails with missing password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error || res.body.message).toBeDefined();
  });

  it('Book GET by invalid ID returns 400', async () => {
    const res = await request(app).get('/api/books/invalidid');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('Event GET by invalid ID returns 400', async () => {
    const res = await request(app).get('/api/events/invalidid');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('User DELETE by invalid ID returns 400 (admin only)', async () => {
    const res = await request(app).delete('/api/users/invalidid');
    // Should be 401 (unauthorized) or 403 (forbidden) if not admin, or 400 for validation
    expect([400,401,403]).toContain(res.status);
  });

  it('Rate limiting works (auth route)', async () => {
    // Exceed 5 requests in 15 min window
    let lastRes;
    for (let i = 0; i < 6; i++) {
      lastRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Password1' });
    }
    expect(lastRes.status).toBe(429);
    expect(lastRes.body.error).toMatch(/too many/i);
    // Wait for rate limit window to reset
    await wait(1000);
  });
}); 