import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authService from '@modules/auth/auth.service';
import { UserModel } from '@modules/users/users.schema';

describe('AuthService', () => {
  describe('registerUser', () => {
    it('should register a new user and queue a confirmation email', async () => {
      const { sendMail } = await import('@infrastructure/mailer/mailer.js');

      await authService.registerUser({
        username: 'testuser1',
        first_name: 'John',
        last_name: 'Doe',
        password: 'password123',
        phone: '0123456789',
        email: 'test@example.com',
        dob: '2000-01-01',
        role: 'customer',
      });

      const user = await UserModel.findOne({ email: 'test@example.com' });
      expect(user).toBeTruthy();
      expect(user!.username).toBe('testuser1');
      expect(user!.isConfirmed).toBe(false);
      expect(sendMail).toHaveBeenCalledOnce();
    });

    it('should throw ConflictError if username already exists', async () => {
      await authService.registerUser({
        username: 'testuser2',
        first_name: 'Jane',
        last_name: 'Doe',
        password: 'password123',
        phone: '0123456788',
        email: 'test2@example.com',
        dob: '2000-01-01',
        role: 'customer',
      });

      await expect(
        authService.registerUser({
          username: 'testuser2',
          first_name: 'Other',
          last_name: 'User',
          password: 'password123',
          phone: '0123456787',
          email: 'other@example.com',
          dob: '2000-01-01',
          role: 'customer',
        }),
      ).rejects.toMatchObject({ code: 'CONFLICT', message: expect.stringContaining('Username') });
    });
  });

  describe('loginUser', () => {
    beforeEach(async () => {
      // Register + activate a test user
      await authService.registerUser({
        username: 'logintest',
        first_name: 'Login',
        last_name: 'Test',
        password: 'password123',
        phone: '0123456790',
        email: 'login@example.com',
        dob: '2000-01-01',
        role: 'customer',
      });
      // Manually confirm
      await UserModel.findOneAndUpdate({ username: 'logintest' }, { isConfirmed: true });
    });

    it('should return token pair on valid credentials', async () => {
      const tokens = await authService.loginUser({ username: 'logintest', password: 'password123' });
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedError on invalid password', async () => {
      await expect(
        authService.loginUser({ username: 'logintest', password: 'wrongpassword' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });

    it('should throw UnauthorizedError if user does not exist', async () => {
      await expect(
        authService.loginUser({ username: 'nonexistent', password: 'password123' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });
  });

  describe('generateTokenPair', () => {
    it('should return signed access and refresh tokens', () => {
      const mockUser = { _id: '507f1f77bcf86cd799439011', username: 'test', role: 'customer' } as Parameters<typeof authService.generateTokenPair>[0];
      const tokens = authService.generateTokenPair(mockUser);
      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();
      expect(typeof tokens.accessToken).toBe('string');
    });
  });
});
