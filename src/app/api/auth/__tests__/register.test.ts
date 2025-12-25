import { NextRequest } from 'next/server';
import { POST } from '../register/route';

jest.mock('@/lib/auth/db-store', () => ({
  findUserByEmail: jest.fn(),
  createAccessRequest: jest.fn(),
  findAccessRequestByEmail: jest.fn(),
  getSiteSettings: jest.fn(),
  logActivity: jest.fn(),
}));

jest.mock('@/lib/auth/password', () => ({
  validatePassword: jest.fn(),
}));

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn(),
  getClientIp: jest.fn(),
  rateLimiters: { register: { maxRequests: 3, windowMs: 60000, keyPrefix: 'register' } },
  createRateLimitResponse: jest.fn((result) => ({
    success: false,
    message: 'Too many requests',
    retryAfter: result.retryAfterMs,
  })),
}));

import {
  findUserByEmail,
  createAccessRequest,
  findAccessRequestByEmail,
  getSiteSettings,
  logActivity,
} from '@/lib/auth/db-store';
import { validatePassword } from '@/lib/auth/password';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const mockFindUserByEmail = findUserByEmail as jest.Mock;
const mockCreateAccessRequest = createAccessRequest as jest.Mock;
const mockFindAccessRequestByEmail = findAccessRequestByEmail as jest.Mock;
const mockGetSiteSettings = getSiteSettings as jest.Mock;
const mockLogActivity = logActivity as jest.Mock;
const mockValidatePassword = validatePassword as jest.Mock;
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

describe('POST /api/auth/register', () => {
  const validRegistrationData = {
    email: 'newuser@example.com',
    password: 'Password123',
    nameArabic: 'مستخدم جديد',
    nameEnglish: 'New User',
    phone: '+966501234567',
    claimedRelation: 'ابن عم',
    relatedMemberId: 'member-1',
    relationshipType: 'cousin',
    message: 'I would like to join the family tree',
  };

  const mockAccessRequest = {
    id: 'request-1',
    email: 'newuser@example.com',
    nameArabic: 'مستخدم جديد',
    status: 'PENDING',
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetClientIp.mockReturnValue('127.0.0.1');
    mockCheckRateLimit.mockReturnValue({ allowed: true, remaining: 3 });
    mockGetSiteSettings.mockResolvedValue({
      allowSelfRegistration: true,
      requireApprovalForRegistration: true,
      minPasswordLength: 8,
    });
    mockValidatePassword.mockReturnValue({ valid: true, errors: [] });
  });

  describe('Successful registration', () => {
    it('should create access request with valid data', async () => {
      mockFindUserByEmail.mockResolvedValue(null);
      mockFindAccessRequestByEmail.mockResolvedValue(null);
      mockCreateAccessRequest.mockResolvedValue(mockAccessRequest);
      mockLogActivity.mockResolvedValue(undefined);

      const request = createMockRequest(validRegistrationData);
      const response = await POST(request);

      expect(response.success).toBe(true);
      expect(response.requestId).toBe('request-1');
      expect(response.requiresApproval).toBe(true);
      expect(mockCreateAccessRequest).toHaveBeenCalled();
    });

    it('should sanitize input data', async () => {
      mockFindUserByEmail.mockResolvedValue(null);
      mockFindAccessRequestByEmail.mockResolvedValue(null);
      mockCreateAccessRequest.mockResolvedValue(mockAccessRequest);
      mockLogActivity.mockResolvedValue(undefined);

      const request = createMockRequest({
        ...validRegistrationData,
        nameArabic: '<script>alert("xss")</script>مستخدم',
      });

      await POST(request);

      expect(mockCreateAccessRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          nameArabic: expect.not.stringContaining('<script>'),
        })
      );
    });

    it('should convert email to lowercase', async () => {
      mockFindUserByEmail.mockResolvedValue(null);
      mockFindAccessRequestByEmail.mockResolvedValue(null);
      mockCreateAccessRequest.mockResolvedValue(mockAccessRequest);
      mockLogActivity.mockResolvedValue(undefined);

      const request = createMockRequest({
        ...validRegistrationData,
        email: 'NewUser@Example.COM',
      });

      await POST(request);

      expect(mockCreateAccessRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@example.com',
        })
      );
    });

    it('should log registration activity', async () => {
      mockFindUserByEmail.mockResolvedValue(null);
      mockFindAccessRequestByEmail.mockResolvedValue(null);
      mockCreateAccessRequest.mockResolvedValue(mockAccessRequest);
      mockLogActivity.mockResolvedValue(undefined);

      const request = createMockRequest(validRegistrationData);
      await POST(request);

      expect(mockLogActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'REGISTER',
          category: 'AUTH',
          success: true,
        })
      );
    });
  });

  describe('Validation errors', () => {
    it('should return 400 when email is missing', async () => {
      const request = createMockRequest({
        ...validRegistrationData,
        email: undefined,
      });

      const response = await POST(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(400);
    });

    it('should return 400 when password is missing', async () => {
      const request = createMockRequest({
        ...validRegistrationData,
        password: undefined,
      });

      const response = await POST(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(400);
    });

    it('should return 400 when nameArabic is missing', async () => {
      const request = createMockRequest({
        ...validRegistrationData,
        nameArabic: undefined,
      });

      const response = await POST(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(400);
    });

    it('should return 400 when claimedRelation is missing', async () => {
      const request = createMockRequest({
        ...validRegistrationData,
        claimedRelation: undefined,
      });

      const response = await POST(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid email format', async () => {
      const request = createMockRequest({
        ...validRegistrationData,
        email: 'invalid-email',
      });

      const response = await POST(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(400);
      expect(response.message).toContain('email');
    });

    it('should return 400 for weak password', async () => {
      mockValidatePassword.mockReturnValue({
        valid: false,
        errors: [
          { en: 'Password must be at least 8 characters', ar: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' },
        ],
      });

      const request = createMockRequest({
        ...validRegistrationData,
        password: 'weak',
      });

      const response = await POST(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(400);
      expect(response.errors).toBeDefined();
    });
  });

  describe('Duplicate checks', () => {
    it('should return 409 when email already exists as user', async () => {
      mockFindUserByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'newuser@example.com',
      });

      const request = createMockRequest(validRegistrationData);
      const response = await POST(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(409);
      expect(response.message).toContain('already exists');
    });

    it('should return 409 when pending request exists', async () => {
      mockFindUserByEmail.mockResolvedValue(null);
      mockFindAccessRequestByEmail.mockResolvedValue({
        id: 'request-1',
        email: 'newuser@example.com',
        status: 'PENDING',
      });

      const request = createMockRequest(validRegistrationData);
      const response = await POST(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(409);
      expect(response.message).toContain('pending');
    });
  });

  describe('Site settings', () => {
    it('should return 403 when self-registration is disabled', async () => {
      mockGetSiteSettings.mockResolvedValue({
        allowSelfRegistration: false,
      });

      const request = createMockRequest(validRegistrationData);
      const response = await POST(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(403);
      expect(response.message).toContain('disabled');
    });

    it('should indicate when approval is not required', async () => {
      mockGetSiteSettings.mockResolvedValue({
        allowSelfRegistration: true,
        requireApprovalForRegistration: false,
        minPasswordLength: 8,
      });
      mockFindUserByEmail.mockResolvedValue(null);
      mockFindAccessRequestByEmail.mockResolvedValue(null);
      mockCreateAccessRequest.mockResolvedValue(mockAccessRequest);
      mockLogActivity.mockResolvedValue(undefined);

      const request = createMockRequest(validRegistrationData);
      const response = await POST(request);

      expect(response.success).toBe(true);
      expect(response.requiresApproval).toBe(false);
    });
  });

  describe('Rate limiting', () => {
    it('should return 429 when rate limited', async () => {
      mockCheckRateLimit.mockReturnValue({
        allowed: false,
        remaining: 0,
        retryAfterMs: 60000,
      });

      const request = createMockRequest(validRegistrationData);
      const response = await POST(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(429);
    });
  });

  describe('Error handling', () => {
    it('should return 500 on database error', async () => {
      mockGetSiteSettings.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest(validRegistrationData);
      const response = await POST(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(500);
    });

    it('should handle duplicate pending request error', async () => {
      mockFindUserByEmail.mockResolvedValue(null);
      mockFindAccessRequestByEmail.mockResolvedValue(null);
      mockCreateAccessRequest.mockRejectedValue(new Error('pending access request'));

      const request = createMockRequest(validRegistrationData);
      const response = await POST(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(409);
    });
  });
});
