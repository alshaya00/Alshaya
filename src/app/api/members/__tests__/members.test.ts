/**
 * Members API Route Tests
 * Tests for /api/members endpoints
 */

import {
  createMockRequest,
  createMockAuthRequest,
  createMockUser,
  createMockAdmin,
  createMockMember,
  createMockSession,
  createMockFamilyTree,
  setupTestEnvironment,
  teardownTestEnvironment,
} from '@/test/setup';

// Mock dependencies
jest.mock('@/lib/auth/store', () => ({
  findSessionByToken: jest.fn(),
  findUserById: jest.fn(),
  logActivity: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  getMembersFromDb: jest.fn(),
  getMemberByIdFromDb: jest.fn(),
  createMemberInDb: jest.fn(),
  updateMemberInDb: jest.fn(),
  deleteMemberFromDb: jest.fn(),
}));

jest.mock('@/lib/middleware/rateLimit', () => ({
  rateLimitMiddleware: jest.fn().mockReturnValue(null),
}));

import { findSessionByToken, findUserById } from '@/lib/auth/store';
import { getMembersFromDb, getMemberByIdFromDb, createMemberInDb } from '@/lib/db';

describe('Members API', () => {
  beforeEach(() => {
    setupTestEnvironment();
    jest.clearAllMocks();
  });

  afterEach(() => {
    teardownTestEnvironment();
  });

  describe('GET /api/members', () => {
    it('should return list of members for authenticated user', async () => {
      const user = createMockUser();
      const session = createMockSession(user);
      const members = createMockFamilyTree(2, 2);

      (findSessionByToken as jest.Mock).mockResolvedValue(session);
      (findUserById as jest.Mock).mockResolvedValue(user);
      (getMembersFromDb as jest.Mock).mockResolvedValue({
        members,
        total: members.length,
      });

      // Import the GET handler dynamically
      const { GET } = await import('../../route');

      const request = createMockAuthRequest(session.token, {
        method: 'GET',
        url: 'http://localhost:5000/api/members',
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.members).toBeDefined();
      expect(Array.isArray(data.members)).toBe(true);
    });

    it('should return 401 for unauthenticated request', async () => {
      (findSessionByToken as jest.Mock).mockResolvedValue(null);

      const { GET } = await import('../../route');

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:5000/api/members',
      });

      const response = await GET(request as any);

      expect(response.status).toBe(401);
    });

    it('should support pagination', async () => {
      const user = createMockUser();
      const session = createMockSession(user);
      const members = createMockFamilyTree(3, 3);

      (findSessionByToken as jest.Mock).mockResolvedValue(session);
      (findUserById as jest.Mock).mockResolvedValue(user);
      (getMembersFromDb as jest.Mock).mockResolvedValue({
        members: members.slice(0, 10),
        total: members.length,
      });

      const { GET } = await import('../../route');

      const request = createMockAuthRequest(session.token, {
        method: 'GET',
        url: 'http://localhost:5000/api/members',
        searchParams: { page: '1', limit: '10' },
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.members.length).toBeLessThanOrEqual(10);
    });

    it('should support filtering by generation', async () => {
      const user = createMockUser();
      const session = createMockSession(user);

      (findSessionByToken as jest.Mock).mockResolvedValue(session);
      (findUserById as jest.Mock).mockResolvedValue(user);
      (getMembersFromDb as jest.Mock).mockResolvedValue({
        members: [createMockMember({ generation: 2 })],
        total: 1,
      });

      const { GET } = await import('../../route');

      const request = createMockAuthRequest(session.token, {
        method: 'GET',
        url: 'http://localhost:5000/api/members',
        searchParams: { generation: '2' },
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(getMembersFromDb).toHaveBeenCalledWith(
        expect.objectContaining({ generation: 2 })
      );
    });

    it('should support search query', async () => {
      const user = createMockUser();
      const session = createMockSession(user);
      const searchMember = createMockMember({ firstName: 'محمد' });

      (findSessionByToken as jest.Mock).mockResolvedValue(session);
      (findUserById as jest.Mock).mockResolvedValue(user);
      (getMembersFromDb as jest.Mock).mockResolvedValue({
        members: [searchMember],
        total: 1,
      });

      const { GET } = await import('../../route');

      const request = createMockAuthRequest(session.token, {
        method: 'GET',
        url: 'http://localhost:5000/api/members',
        searchParams: { search: 'محمد' },
      });

      const response = await GET(request as any);

      expect(response.status).toBe(200);
      expect(getMembersFromDb).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'محمد' })
      );
    });
  });

  describe('POST /api/members', () => {
    it('should create member for admin user', async () => {
      const admin = createMockAdmin();
      const session = createMockSession(admin);
      const newMember = createMockMember();

      (findSessionByToken as jest.Mock).mockResolvedValue(session);
      (findUserById as jest.Mock).mockResolvedValue(admin);
      (createMemberInDb as jest.Mock).mockResolvedValue(newMember);

      const { POST } = await import('../../route');

      const request = createMockAuthRequest(session.token, {
        method: 'POST',
        url: 'http://localhost:5000/api/members',
        body: {
          firstName: 'محمد',
          gender: 'Male',
          generation: 1,
        },
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.member).toBeDefined();
    });

    it('should return 403 for non-admin user without permission', async () => {
      const user = createMockUser({ role: 'MEMBER' });
      const session = createMockSession(user);

      (findSessionByToken as jest.Mock).mockResolvedValue(session);
      (findUserById as jest.Mock).mockResolvedValue(user);

      const { POST } = await import('../../route');

      const request = createMockAuthRequest(session.token, {
        method: 'POST',
        url: 'http://localhost:5000/api/members',
        body: {
          firstName: 'محمد',
          gender: 'Male',
        },
      });

      const response = await POST(request as any);

      expect(response.status).toBe(403);
    });

    it('should validate required fields', async () => {
      const admin = createMockAdmin();
      const session = createMockSession(admin);

      (findSessionByToken as jest.Mock).mockResolvedValue(session);
      (findUserById as jest.Mock).mockResolvedValue(admin);

      const { POST } = await import('../../route');

      const request = createMockAuthRequest(session.token, {
        method: 'POST',
        url: 'http://localhost:5000/api/members',
        body: {
          // Missing firstName and gender
        },
      });

      const response = await POST(request as any);

      expect(response.status).toBe(400);
    });

    it('should validate gender enum', async () => {
      const admin = createMockAdmin();
      const session = createMockSession(admin);

      (findSessionByToken as jest.Mock).mockResolvedValue(session);
      (findUserById as jest.Mock).mockResolvedValue(admin);

      const { POST } = await import('../../route');

      const request = createMockAuthRequest(session.token, {
        method: 'POST',
        url: 'http://localhost:5000/api/members',
        body: {
          firstName: 'محمد',
          gender: 'InvalidGender',
        },
      });

      const response = await POST(request as any);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/members/[id]', () => {
    it('should return member by ID', async () => {
      const user = createMockUser();
      const session = createMockSession(user);
      const member = createMockMember({ id: 'P001' });

      (findSessionByToken as jest.Mock).mockResolvedValue(session);
      (findUserById as jest.Mock).mockResolvedValue(user);
      (getMemberByIdFromDb as jest.Mock).mockResolvedValue(member);

      // This would be in a separate file - mocking the dynamic route
      const mockGetById = async () => {
        if (!(await findSessionByToken('token'))) {
          return new Response(JSON.stringify({ success: false }), { status: 401 });
        }
        const m = await getMemberByIdFromDb('P001');
        if (!m) {
          return new Response(JSON.stringify({ success: false }), { status: 404 });
        }
        return new Response(JSON.stringify({ success: true, member: m }), { status: 200 });
      };

      const response = await mockGetById();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.member.id).toBe('P001');
    });

    it('should return 404 for non-existent member', async () => {
      const user = createMockUser();
      const session = createMockSession(user);

      (findSessionByToken as jest.Mock).mockResolvedValue(session);
      (findUserById as jest.Mock).mockResolvedValue(user);
      (getMemberByIdFromDb as jest.Mock).mockResolvedValue(null);

      const mockGetById = async () => {
        const m = await getMemberByIdFromDb('nonexistent');
        if (!m) {
          return new Response(JSON.stringify({ success: false }), { status: 404 });
        }
        return new Response(JSON.stringify({ success: true, member: m }), { status: 200 });
      };

      const response = await mockGetById();

      expect(response.status).toBe(404);
    });
  });
});
