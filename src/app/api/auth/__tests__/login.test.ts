/**
 * Login API Route Tests
 * POST /api/auth/login
 */

import { POST } from '../login/route';
import {
  createMockRequest,
  createMockUser,
  createMockLockedUser,
  createMockDisabledUser,
  createMockPendingUser,
  setupTestEnvironment,
  teardownTestEnvironment,
} from '@/test/setup';

// Mock the auth store (includes all auth functions)
jest.mock('@/lib/auth/store', () => ({
  findUserByEmail: jest.fn(),
  verifyPassword: jest.fn(),
  createSession: jest.fn(),
  updateUser: jest.fn(),
  checkLoginAttempts: jest.fn(),
  recordFailedLogin: jest.fn(),
  clearLoginAttempts: jest.fn(),
  logActivity: jest.fn(),
}));

// Mock rate limiter
jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn().mockReturnValue({ allowed: true }),
  getClientIp: jest.fn().mockReturnValue('127.0.0.1'),
  rateLimiters: { login: {} },
  createRateLimitResponse: jest.fn(),
}));

// Mock permissions
jest.mock('@/lib/auth/permissions', () => ({
  getPermissionsForRole: jest.fn().mockReturnValue([]),
}));

import { findUserByEmail, verifyPassword, createSession, checkLoginAttempts, recordFailedLogin } from '@/lib/auth/store';

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    setupTestEnvironment();
    jest.clearAllMocks();
  });

  afterEach(() => {
    teardownTestEnvironment();
  });

  describe('Successful Login', () => {
    it('should return session token for valid credentials', async () => {
      const user = createMockUser({ status: 'ACTIVE' });
      const mockSession = { token: 'test-session-token', userId: user.id };

      (findUserByEmail as jest.Mock).mockResolvedValue(user);
      (verifyPassword as jest.Mock).mockResolvedValue(true);
      (checkLoginAttempts as jest.Mock).mockResolvedValue({ allowed: true, attempts: 0 });
      (createSession as jest.Mock).mockResolvedValue(mockSession);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:5000/api/auth/login',
        body: {
          email: user.email,
          password: 'ValidPassword123',
          rememberMe: false,
        },
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.token).toBe('test-session-token');
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(user.email);
    });

    it('should handle remember me option', async () => {
      const user = createMockUser();

      (findUserByEmail as jest.Mock).mockResolvedValue(user);
      (verifyPassword as jest.Mock).mockResolvedValue(true);
      (checkLoginAttempts as jest.Mock).mockResolvedValue({ allowed: true, attempts: 0 });
      (createSession as jest.Mock).mockResolvedValue({ token: 'token', userId: user.id });

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:5000/api/auth/login',
        body: {
          email: user.email,
          password: 'ValidPassword123',
          rememberMe: true,
        },
      });

      await POST(request as any);

      expect(createSession).toHaveBeenCalledWith(
        expect.objectContaining({ id: user.id }),
        expect.anything(),
        expect.anything(),
        true // rememberMe
      );
    });
  });

  describe('Authentication Failures', () => {
    it('should return 401 for invalid password', async () => {
      const user = createMockUser();

      (findUserByEmail as jest.Mock).mockResolvedValue(user);
      (verifyPassword as jest.Mock).mockResolvedValue(false);
      (checkLoginAttempts as jest.Mock).mockResolvedValue({ allowed: true, attempts: 0 });

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:5000/api/auth/login',
        body: {
          email: user.email,
          password: 'WrongPassword123',
        },
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(recordFailedLogin).toHaveBeenCalled();
    });

    it('should return 401 for non-existent user', async () => {
      (findUserByEmail as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:5000/api/auth/login',
        body: {
          email: 'nonexistent@test.com',
          password: 'Password123',
        },
      });

      const response = await POST(request as any);

      expect(response.status).toBe(401);
    });

    it('should return 403 for disabled user', async () => {
      const user = createMockDisabledUser();

      (findUserByEmail as jest.Mock).mockResolvedValue(user);
      (verifyPassword as jest.Mock).mockResolvedValue(true);
      (checkLoginAttempts as jest.Mock).mockResolvedValue({ allowed: true, attempts: 0 });

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:5000/api/auth/login',
        body: {
          email: user.email,
          password: 'Password123',
        },
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 403 for pending user', async () => {
      const user = createMockPendingUser();

      (findUserByEmail as jest.Mock).mockResolvedValue(user);
      (verifyPassword as jest.Mock).mockResolvedValue(true);
      (checkLoginAttempts as jest.Mock).mockResolvedValue({ allowed: true, attempts: 0 });

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:5000/api/auth/login',
        body: {
          email: user.email,
          password: 'Password123',
        },
      });

      const response = await POST(request as any);

      expect(response.status).toBe(403);
    });

    it('should return 429 for locked account', async () => {
      const user = createMockLockedUser();

      (findUserByEmail as jest.Mock).mockResolvedValue(user);
      (checkLoginAttempts as jest.Mock).mockResolvedValue({
        allowed: false,
        attempts: 5,
        lockedUntil: user.lockedUntil,
      });

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:5000/api/auth/login',
        body: {
          email: user.email,
          password: 'Password123',
        },
      });

      const response = await POST(request as any);

      expect(response.status).toBe(429);
    });
  });

  describe('Input Validation', () => {
    it('should return 400 for missing email', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:5000/api/auth/login',
        body: {
          password: 'Password123',
        },
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 for missing password', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:5000/api/auth/login',
        body: {
          email: 'test@test.com',
        },
      });

      const response = await POST(request as any);

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid email format', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:5000/api/auth/login',
        body: {
          email: 'not-an-email',
          password: 'Password123',
        },
      });

      const response = await POST(request as any);

      expect(response.status).toBe(400);
    });
  });
});
