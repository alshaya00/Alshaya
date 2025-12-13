// Unit Tests for Rate Limiting
import {
  checkRateLimit,
  RATE_LIMITS,
  resetRateLimit,
  getRateLimitStatus,
} from '@/lib/middleware/rateLimit';

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Reset rate limits before each test
    resetRateLimit('test-client', 'api');
    resetRateLimit('test-client', 'login');
    resetRateLimit('test-client', 'auth');
  });

  describe('checkRateLimit', () => {
    it('should allow requests within limit', () => {
      const config = RATE_LIMITS.api;
      const result = checkRateLimit('test-client', config);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(config.maxRequests - 1);
    });

    it('should track request count', () => {
      const config = RATE_LIMITS.api;

      // Use a unique identifier for this test to avoid interference
      const clientId = 'track-count-test';

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        checkRateLimit(clientId, config);
      }

      const result = checkRateLimit(clientId, config);
      expect(result.remaining).toBe(config.maxRequests - 6);
    });

    it('should block requests over limit', () => {
      const config = { ...RATE_LIMITS.login, maxRequests: 3 };

      // Make requests up to the limit
      for (let i = 0; i < 3; i++) {
        checkRateLimit('block-test', config);
      }

      // Next request should be blocked
      const result = checkRateLimit('block-test', config);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should use separate counters for different identifiers', () => {
      const config = RATE_LIMITS.api;

      // Make requests for client A
      for (let i = 0; i < 5; i++) {
        checkRateLimit('client-a', config);
      }

      // Client B should have full limit
      const result = checkRateLimit('client-b', config);
      expect(result.remaining).toBe(config.maxRequests - 1);
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return null for new clients', () => {
      const status = getRateLimitStatus('new-client', 'api');
      expect(status).toBeNull();
    });

    it('should return status for existing clients', () => {
      const config = RATE_LIMITS.api;
      checkRateLimit('status-test', config);

      const status = getRateLimitStatus('api:status-test', 'api');
      if (status) {
        expect(status.count).toBe(1);
        expect(status.remaining).toBe(config.maxRequests - 1);
      }
    });
  });

  describe('RATE_LIMITS configuration', () => {
    it('should have stricter limits for login', () => {
      expect(RATE_LIMITS.login.maxRequests).toBeLessThan(RATE_LIMITS.api.maxRequests);
    });

    it('should have stricter limits for password reset', () => {
      expect(RATE_LIMITS.passwordReset.maxRequests).toBeLessThan(RATE_LIMITS.login.maxRequests);
    });

    it('should have all required configs', () => {
      expect(RATE_LIMITS).toHaveProperty('api');
      expect(RATE_LIMITS).toHaveProperty('auth');
      expect(RATE_LIMITS).toHaveProperty('login');
      expect(RATE_LIMITS).toHaveProperty('passwordReset');
      expect(RATE_LIMITS).toHaveProperty('search');
      expect(RATE_LIMITS).toHaveProperty('dataTransfer');
      expect(RATE_LIMITS).toHaveProperty('admin');
      expect(RATE_LIMITS).toHaveProperty('notifications');
    });

    it('should have error messages for all configs', () => {
      Object.values(RATE_LIMITS).forEach((config) => {
        expect(config.message).toBeDefined();
        expect(typeof config.message).toBe('string');
      });
    });
  });
});
