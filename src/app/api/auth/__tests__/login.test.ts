import { NextRequest } from 'next/server';
import { POST } from '../login/route';

jest.mock('@/lib/auth/db-store', () => ({
  findUserByEmail: jest.fn(),
  verifyPassword: jest.fn(),
  createSession: jest.fn(),
  updateUser: jest.fn(),
  checkLoginAttempts: jest.fn(),
  recordFailedLogin: jest.fn(),
  clearLoginAttempts: jest.fn(),
  logActivity: jest.fn(),
}));

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn(),
  getClientIp: jest.fn(),
  rateLimiters: { login: { maxRequests: 5, windowMs: 60000, keyPrefix: 'login' } },
  createRateLimitResponse: jest.fn((result) => ({
    success: false,
    message: 'Too many requests',
    retryAfter: result.retryAfterMs,
  })),
}));

import {
  findUserByEmail,
  verifyPassword,
  createSession,
  updateUser,
  checkLoginAttempts,
  recordFailedLogin,
  clearLoginAttempts,
  logActivity,
} from '@/lib/auth/db-store';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const mockFindUserByEmail = findUserByEmail as jest.Mock;
const mockVerifyPassword = verifyPassword as jest.Mock;
const mockCreateSession = createSession as jest.Mock;
const mockUpdateUser = updateUser as jest.Mock;
const mockCheckLoginAttempts = checkLoginAttempts as jest.Mock;
const mockRecordFailedLogin = recordFailedLogin as jest.Mock;
const mockClearLoginAttempts = clearLoginAttempts as jest.Mock;
const mockLogActivity = logActivity as jest.Mock;
const mockCheckRateLimit = checkRateLimit as jest.Mock;
const mockGetClientIp = getClientIp as jest.Mock;

function createMockRequest(body: Record<string, unknown>): NextRequest {
  return {
    json: jest.fn().mockResolvedValue(body),
    headers: {
      get: jest.fn((name: string) => {
        if (name === 'x-forwarded-for') return '127.0.0.1';
        if (name === 'user-agent') return 'test-agent';
        return null;
      }),
    },
  } as unknown as NextRequest;
}

describe('POST /api/auth/login', () => {
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    nameArabic: 'مستخدم اختباري',
    nameEnglish: 'Test User',
    role: 'MEMBER',
    status: 'ACTIVE',
    linkedMemberId: null,
    assignedBranch: null,
  };

  const mockSession = {
    token: 'session-token-123',
    expiresAt: new Date(Date.now() + 86400000),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetClientIp.mockReturnValue('127.0.0.1');
    mockCheckRateLimit.mockReturnValue({ allowed: true, remaining: 5 });
    mockCheckLoginAttempts.mockResolvedValue({ allowed: true, remainingAttempts: 5 });
  });

  describe('Successful login', () => {
    it('should login user with valid credentials', async () => {
      mockFindUserByEmail.mockResolvedValue(mockUser);
      mockVerifyPassword.mockResolvedValue(true);
      mockCreateSession.mockResolvedValue(mockSession);
      mockUpdateUser.mockResolvedValue(mockUser);
      mockClearLoginAttempts.mockResolvedValue(undefined);
      mockLogActivity.mockResolvedValue(undefined);

      const request = createMockRequest({
        email: 'test@example.com',
        password: 'Password123',
      });

      const response = await POST(request);

      expect(response.success).toBe(true);
      expect(response.user).toBeDefined();
      expect(response.user.email).toBe('test@example.com');
      expect(response.token).toBe('session-token-123');
      expect(mockClearLoginAttempts).toHaveBeenCalledWith('test@example.com');
    });

    it('should include user permissions in response', async () => {
      mockFindUserByEmail.mockResolvedValue(mockUser);
      mockVerifyPassword.mockResolvedValue(true);
      mockCreateSession.mockResolvedValue(mockSession);
      mockUpdateUser.mockResolvedValue(mockUser);
      mockClearLoginAttempts.mockResolvedValue(undefined);
      mockLogActivity.mockResolvedValue(undefined);

      const request = createMockRequest({
        email: 'test@example.com',
        password: 'Password123',
      });

      const response = await POST(request);

      expect(response.user.permissions).toBeDefined();
      expect(response.user.role).toBe('MEMBER');
    });

    it('should handle rememberMe option', async () => {
      mockFindUserByEmail.mockResolvedValue(mockUser);
      mockVerifyPassword.mockResolvedValue(true);
      mockCreateSession.mockResolvedValue(mockSession);
      mockUpdateUser.mockResolvedValue(mockUser);
      mockClearLoginAttempts.mockResolvedValue(undefined);
      mockLogActivity.mockResolvedValue(undefined);

      const request = createMockRequest({
        email: 'test@example.com',
        password: 'Password123',
        rememberMe: true,
      });

      await POST(request);

      expect(mockCreateSession).toHaveBeenCalledWith(
        mockUser.id,
        true,
        expect.any(String),
        expect.any(String)
      );
    });
  });

  describe('Validation errors', () => {
    it('should return 400 when email is missing', async () => {
      const request = createMockRequest({
        password: 'Password123',
      });

      const response = await POST(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(400);
      expect(response.message).toContain('required');
    });

    it('should return 400 when password is missing', async () => {
      const request = createMockRequest({
        email: 'test@example.com',
      });

      const response = await POST(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(400);
    });

    it('should return 400 when both fields are missing', async () => {
      const request = createMockRequest({});

      const response = await POST(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(400);
    });
  });

  describe('Authentication failures', () => {
    it('should return 401 when user not found', async () => {
      mockFindUserByEmail.mockResolvedValue(null);
      mockRecordFailedLogin.mockResolvedValue(undefined);
      mockLogActivity.mockResolvedValue(undefined);

      const request = createMockRequest({
        email: 'nonexistent@example.com',
        password: 'Password123',
      });

      const response = await POST(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(401);
      expect(response.message).toContain('Invalid');
      expect(mockRecordFailedLogin).toHaveBeenCalled();
    });

    it('should return 401 when password is incorrect', async () => {
      mockFindUserByEmail.mockResolvedValue(mockUser);
      mockVerifyPassword.mockResolvedValue(false);
      mockRecordFailedLogin.mockResolvedValue(undefined);
      mockLogActivity.mockResolvedValue(undefined);

      const request = createMockRequest({
        email: 'test@example.com',
        password: 'WrongPassword',
      });

      const response = await POST(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(401);
      expect(mockRecordFailedLogin).toHaveBeenCalled();
    });

    it('should include remaining attempts in response', async () => {
      mockCheckLoginAttempts.mockResolvedValue({ allowed: true, remainingAttempts: 3 });
      mockFindUserByEmail.mockResolvedValue(mockUser);
      mockVerifyPassword.mockResolvedValue(false);
      mockRecordFailedLogin.mockResolvedValue(undefined);
      mockLogActivity.mockResolvedValue(undefined);

      const request = createMockRequest({
        email: 'test@example.com',
        password: 'WrongPassword',
      });

      const response = await POST(request);

      expect(response.remainingAttempts).toBe(2);
    });
  });

  describe('Account status checks', () => {
    it('should return 403 when account is pending', async () => {
      mockFindUserByEmail.mockResolvedValue({ ...mockUser, status: 'PENDING' });
      mockVerifyPassword.mockResolvedValue(true);
      mockLogActivity.mockResolvedValue(undefined);

      const request = createMockRequest({
        email: 'test@example.com',
        password: 'Password123',
      });

      const response = await POST(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(403);
      expect(response.pending).toBe(true);
    });

    it('should return 403 when account is disabled', async () => {
      mockFindUserByEmail.mockResolvedValue({ ...mockUser, status: 'DISABLED' });
      mockVerifyPassword.mockResolvedValue(true);
      mockLogActivity.mockResolvedValue(undefined);

      const request = createMockRequest({
        email: 'test@example.com',
        password: 'Password123',
      });

      const response = await POST(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(403);
      expect(response.disabled).toBe(true);
    });
  });

  describe('Rate limiting', () => {
    it('should return 429 when rate limited', async () => {
      mockCheckRateLimit.mockReturnValue({
        allowed: false,
        remaining: 0,
        retryAfterMs: 60000,
      });

      const request = createMockRequest({
        email: 'test@example.com',
        password: 'Password123',
      });

      const response = await POST(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(429);
    });

    it('should return 429 when account is locked', async () => {
      mockCheckLoginAttempts.mockResolvedValue({
        allowed: false,
        lockedUntil: new Date(Date.now() + 900000),
      });
      mockLogActivity.mockResolvedValue(undefined);

      const request = createMockRequest({
        email: 'test@example.com',
        password: 'Password123',
      });

      const response = await POST(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(429);
      expect(response.locked).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should return 500 on database error', async () => {
      mockFindUserByEmail.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest({
        email: 'test@example.com',
        password: 'Password123',
      });

      const response = await POST(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(500);
    });
  });
});
