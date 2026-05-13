import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { UserModel } from '@modules/users/users.schema';
import { Express } from 'express';

let app: Express;

beforeAll(() => {
  app = createApp();
});

describe('Auth Integration Tests', () => {
  const testUser = {
    username: 'integtest1',
    first_name: 'Integration',
    last_name: 'Test',
    password: 'password123',
    phone: '0123456000',
    email: 'integration@example.com',
    dob: '2000-01-01',
    role: 'customer',
  };

  describe('POST /api/users/register', () => {
    it('should register a new user', async () => {
      const res = await request(app).post('/api/users/register').send(testUser);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('confirmation');
    });

    it('should return 400 for invalid email', async () => {
      const res = await request(app)
        .post('/api/users/register')
        .send({ ...testUser, email: 'not-an-email' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 409 for duplicate username', async () => {
      await request(app).post('/api/users/register').send(testUser);
      const res = await request(app).post('/api/users/register').send({
        ...testUser,
        email: 'other@example.com',
        phone: '0987654321',
      });
      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/users/login', () => {
    beforeAll(async () => {
      // Create and confirm user
      await request(app).post('/api/users/register').send(testUser);
      await UserModel.findOneAndUpdate({ username: testUser.username }, { isConfirmed: true });
    });

    it('should login with valid credentials', async () => {
      const res = await request(app).post('/api/users/login').send({
        username: testUser.username,
        password: testUser.password,
      });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('access_token');
      expect(res.body).toHaveProperty('refresh_token');
    });

    it('should return 401 with wrong password', async () => {
      const res = await request(app).post('/api/users/login').send({
        username: testUser.username,
        password: 'wrongpassword',
      });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/users/me', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/users/me');
      expect(res.status).toBe(401);
    });

    it('should return profile with valid token', async () => {
      await request(app).post('/api/users/register').send({ ...testUser, username: 'me_test', email: 'me@example.com', phone: '0999000001' });
      await UserModel.findOneAndUpdate({ username: 'me_test' }, { isConfirmed: true });

      const loginRes = await request(app).post('/api/users/login').send({ username: 'me_test', password: testUser.password });
      const token = loginRes.body.access_token as string;

      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toMatchObject({ username: 'me_test' });
    });
  });

  describe('Security', () => {
    it('should include X-Request-ID header', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['x-request-id']).toBeTruthy();
    });

    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/api/unknown-route-xyz');
      expect(res.status).toBe(404);
    });
  });
});
