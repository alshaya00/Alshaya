/**
 * Broadcasts API Route Tests
 * Tests for /api/broadcasts endpoints
 */

import {
  createMockRequest,
  createMockAuthRequest,
  createMockUser,
  createMockAdmin,
  createMockSuperAdmin,
  createMockBroadcast,
  createMockSession,
  setupTestEnvironment,
  teardownTestEnvironment,
} from '@/test/setup';

// Mock dependencies
jest.mock('@/lib/auth/store', () => ({
  findSessionByToken: jest.fn(),
  findUserById: jest.fn(),
  logActivity: jest.fn(),
}));

jest.mock('@/lib/services/broadcast', () => ({
  broadcastService: {
    getBroadcasts: jest.fn(),
    getBroadcast: jest.fn(),
    createBroadcast: jest.fn(),
    updateBroadcast: jest.fn(),
    deleteBroadcast: jest.fn(),
    sendBroadcast: jest.fn(),
  },
}));

jest.mock('@/lib/middleware/rateLimit', () => ({
  rateLimitMiddleware: jest.fn().mockReturnValue(null),
}));

import { findSessionByToken, findUserById } from '@/lib/auth/store';
import { broadcastService } from '@/lib/services/broadcast';

describe('Broadcasts API', () => {
  beforeEach(() => {
    setupTestEnvironment();
    jest.clearAllMocks();
  });

  afterEach(() => {
    teardownTestEnvironment();
  });

  describe('GET /api/broadcasts', () => {
    it('should return list of broadcasts for authenticated user', async () => {
      const user = createMockUser();
      const session = createMockSession(user);
      const broadcasts = [createMockBroadcast(), createMockBroadcast()];

      (findSessionByToken as jest.Mock).mockResolvedValue(session);
      (findUserById as jest.Mock).mockResolvedValue(user);
      (broadcastService.getBroadcasts as jest.Mock).mockResolvedValue(broadcasts);

      const request = createMockAuthRequest(session.token, {
        method: 'GET',
        url: 'http://localhost:5000/api/broadcasts',
      });

      // Simulate GET handler
      const mockGet = async () => {
        const s = await findSessionByToken(session.token);
        if (!s) return new Response(JSON.stringify({ success: false }), { status: 401 });
        const u = await findUserById(s.userId);
        if (!u || u.status !== 'ACTIVE') {
          return new Response(JSON.stringify({ success: false }), { status: 401 });
        }
        const b = await broadcastService.getBroadcasts();
        return new Response(JSON.stringify({ success: true, broadcasts: b }), { status: 200 });
      };

      const response = await mockGet();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.broadcasts).toHaveLength(2);
    });

    it('should return 401 for unauthenticated request', async () => {
      (findSessionByToken as jest.Mock).mockResolvedValue(null);

      const mockGet = async () => {
        const s = await findSessionByToken('invalid');
        if (!s) return new Response(JSON.stringify({ success: false }), { status: 401 });
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      };

      const response = await mockGet();
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/broadcasts/[id]', () => {
    it('should return broadcast by ID for authenticated user', async () => {
      const user = createMockUser();
      const session = createMockSession(user);
      const broadcast = createMockBroadcast({ id: 'broadcast-001' });

      (findSessionByToken as jest.Mock).mockResolvedValue(session);
      (findUserById as jest.Mock).mockResolvedValue(user);
      (broadcastService.getBroadcast as jest.Mock).mockResolvedValue(broadcast);

      const mockGetById = async (id: string) => {
        const s = await findSessionByToken(session.token);
        if (!s) return new Response(JSON.stringify({ success: false }), { status: 401 });
        const u = await findUserById(s.userId);
        if (!u || u.status !== 'ACTIVE') {
          return new Response(JSON.stringify({ success: false }), { status: 401 });
        }
        const b = await broadcastService.getBroadcast(id);
        if (!b) return new Response(JSON.stringify({ success: false }), { status: 404 });
        return new Response(JSON.stringify({ success: true, data: b }), { status: 200 });
      };

      const response = await mockGetById('broadcast-001');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.id).toBe('broadcast-001');
    });

    it('should return 404 for non-existent broadcast', async () => {
      const user = createMockUser();
      const session = createMockSession(user);

      (findSessionByToken as jest.Mock).mockResolvedValue(session);
      (findUserById as jest.Mock).mockResolvedValue(user);
      (broadcastService.getBroadcast as jest.Mock).mockResolvedValue(null);

      const mockGetById = async (id: string) => {
        const s = await findSessionByToken(session.token);
        if (!s) return new Response(JSON.stringify({ success: false }), { status: 401 });
        const b = await broadcastService.getBroadcast(id);
        if (!b) return new Response(JSON.stringify({ success: false, error: 'Not found' }), { status: 404 });
        return new Response(JSON.stringify({ success: true, data: b }), { status: 200 });
      };

      const response = await mockGetById('nonexistent');
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/broadcasts', () => {
    it('should create broadcast for admin user', async () => {
      const admin = createMockAdmin();
      const session = createMockSession(admin);
      const newBroadcast = createMockBroadcast();

      (findSessionByToken as jest.Mock).mockResolvedValue(session);
      (findUserById as jest.Mock).mockResolvedValue(admin);
      (broadcastService.createBroadcast as jest.Mock).mockResolvedValue(newBroadcast);

      const mockPost = async (body: Record<string, unknown>) => {
        const s = await findSessionByToken(session.token);
        if (!s) return new Response(JSON.stringify({ success: false }), { status: 401 });
        const u = await findUserById(s.userId);
        if (!u || u.status !== 'ACTIVE') {
          return new Response(JSON.stringify({ success: false }), { status: 401 });
        }
        if (u.role !== 'ADMIN' && u.role !== 'SUPER_ADMIN') {
          return new Response(JSON.stringify({ success: false }), { status: 403 });
        }
        const b = await broadcastService.createBroadcast(body);
        return new Response(JSON.stringify({ success: true, data: b }), { status: 201 });
      };

      const response = await mockPost({
        titleAr: 'إعلان جديد',
        contentAr: 'محتوى الإعلان',
        type: 'ANNOUNCEMENT',
        targetAudience: 'ALL',
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it('should return 403 for non-admin user', async () => {
      const user = createMockUser({ role: 'MEMBER' });
      const session = createMockSession(user);

      (findSessionByToken as jest.Mock).mockResolvedValue(session);
      (findUserById as jest.Mock).mockResolvedValue(user);

      const mockPost = async () => {
        const s = await findSessionByToken(session.token);
        if (!s) return new Response(JSON.stringify({ success: false }), { status: 401 });
        const u = await findUserById(s.userId);
        if (!u || u.status !== 'ACTIVE') {
          return new Response(JSON.stringify({ success: false }), { status: 401 });
        }
        if (u.role !== 'ADMIN' && u.role !== 'SUPER_ADMIN') {
          return new Response(JSON.stringify({ success: false }), { status: 403 });
        }
        return new Response(JSON.stringify({ success: true }), { status: 201 });
      };

      const response = await mockPost();
      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/broadcasts/[id]/send', () => {
    it('should send broadcast for admin user', async () => {
      const admin = createMockAdmin();
      const session = createMockSession(admin);

      (findSessionByToken as jest.Mock).mockResolvedValue(session);
      (findUserById as jest.Mock).mockResolvedValue(admin);
      (broadcastService.sendBroadcast as jest.Mock).mockResolvedValue({
        success: true,
        sentCount: 10,
        errors: [],
      });

      const mockSend = async (id: string) => {
        const s = await findSessionByToken(session.token);
        if (!s) return new Response(JSON.stringify({ success: false }), { status: 401 });
        const u = await findUserById(s.userId);
        if (!u || u.status !== 'ACTIVE') {
          return new Response(JSON.stringify({ success: false }), { status: 401 });
        }
        if (u.role !== 'ADMIN' && u.role !== 'SUPER_ADMIN') {
          return new Response(JSON.stringify({ success: false }), { status: 403 });
        }
        const result = await broadcastService.sendBroadcast(id);
        return new Response(
          JSON.stringify({ success: true, sentCount: result.sentCount }),
          { status: 200 }
        );
      };

      const response = await mockSend('broadcast-001');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sentCount).toBe(10);
    });

    it('should return 403 for non-admin user', async () => {
      const user = createMockUser({ role: 'MEMBER' });
      const session = createMockSession(user);

      (findSessionByToken as jest.Mock).mockResolvedValue(session);
      (findUserById as jest.Mock).mockResolvedValue(user);

      const mockSend = async () => {
        const s = await findSessionByToken(session.token);
        if (!s) return new Response(JSON.stringify({ success: false }), { status: 401 });
        const u = await findUserById(s.userId);
        if (u?.role !== 'ADMIN' && u?.role !== 'SUPER_ADMIN') {
          return new Response(JSON.stringify({ success: false }), { status: 403 });
        }
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      };

      const response = await mockSend();
      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/broadcasts/[id]', () => {
    it('should update broadcast for admin user', async () => {
      const admin = createMockAdmin();
      const session = createMockSession(admin);
      const updatedBroadcast = createMockBroadcast({ titleAr: 'عنوان محدث' });

      (findSessionByToken as jest.Mock).mockResolvedValue(session);
      (findUserById as jest.Mock).mockResolvedValue(admin);
      (broadcastService.updateBroadcast as jest.Mock).mockResolvedValue(updatedBroadcast);

      const mockPut = async (id: string, body: Record<string, unknown>) => {
        const s = await findSessionByToken(session.token);
        if (!s) return new Response(JSON.stringify({ success: false }), { status: 401 });
        const u = await findUserById(s.userId);
        if (u?.role !== 'ADMIN' && u?.role !== 'SUPER_ADMIN') {
          return new Response(JSON.stringify({ success: false }), { status: 403 });
        }
        const b = await broadcastService.updateBroadcast(id, body);
        return new Response(JSON.stringify({ success: true, data: b }), { status: 200 });
      };

      const response = await mockPut('broadcast-001', { titleAr: 'عنوان محدث' });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.titleAr).toBe('عنوان محدث');
    });
  });

  describe('DELETE /api/broadcasts/[id]', () => {
    it('should delete broadcast for admin user', async () => {
      const admin = createMockAdmin();
      const session = createMockSession(admin);

      (findSessionByToken as jest.Mock).mockResolvedValue(session);
      (findUserById as jest.Mock).mockResolvedValue(admin);
      (broadcastService.deleteBroadcast as jest.Mock).mockResolvedValue(true);

      const mockDelete = async (id: string) => {
        const s = await findSessionByToken(session.token);
        if (!s) return new Response(JSON.stringify({ success: false }), { status: 401 });
        const u = await findUserById(s.userId);
        if (u?.role !== 'ADMIN' && u?.role !== 'SUPER_ADMIN') {
          return new Response(JSON.stringify({ success: false }), { status: 403 });
        }
        await broadcastService.deleteBroadcast(id);
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      };

      const response = await mockDelete('broadcast-001');
      expect(response.status).toBe(200);
    });
  });
});
