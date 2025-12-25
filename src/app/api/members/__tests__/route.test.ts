import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

jest.mock('@/lib/db', () => ({
  getAllMembersFromDb: jest.fn(),
  getNextIdFromDb: jest.fn(),
  memberExistsInDb: jest.fn(),
  createMemberInDb: jest.fn(),
}));

jest.mock('@/lib/auth/db-store', () => ({
  findSessionByToken: jest.fn(),
  findUserById: jest.fn(),
}));

jest.mock('@/lib/auth/permissions', () => ({
  getPermissionsForRole: jest.fn(),
}));

jest.mock('@/lib/db-audit', () => ({
  logAuditToDb: jest.fn(),
}));

import { getAllMembersFromDb, getNextIdFromDb, memberExistsInDb, createMemberInDb } from '@/lib/db';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { logAuditToDb } from '@/lib/db-audit';

const mockGetAllMembers = getAllMembersFromDb as jest.Mock;
const mockGetNextId = getNextIdFromDb as jest.Mock;
const mockMemberExists = memberExistsInDb as jest.Mock;
const mockCreateMember = createMemberInDb as jest.Mock;
const mockFindSession = findSessionByToken as jest.Mock;
const mockFindUser = findUserById as jest.Mock;
const mockGetPermissions = getPermissionsForRole as jest.Mock;
const mockLogAudit = logAuditToDb as jest.Mock;

function createMockRequest(options: {
  method?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  searchParams?: Record<string, string>;
}): NextRequest {
  const url = new URL('http://localhost:3000/api/members');
  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return {
    method: options.method || 'GET',
    json: jest.fn().mockResolvedValue(options.body || {}),
    headers: {
      get: jest.fn((name: string) => options.headers?.[name] || null),
    },
    nextUrl: {
      searchParams: url.searchParams,
    },
  } as unknown as NextRequest;
}

describe('GET /api/members', () => {
  const mockMembers = [
    {
      id: 'M001',
      firstName: 'أحمد',
      fullNameAr: 'أحمد محمد آل شايع',
      gender: 'Male',
      generation: 1,
      branch: 'branch1',
      status: 'Living',
    },
    {
      id: 'M002',
      firstName: 'فاطمة',
      fullNameAr: 'فاطمة أحمد آل شايع',
      gender: 'Female',
      generation: 2,
      branch: 'branch1',
      status: 'Living',
    },
  ];

  const mockUser = {
    id: 'user-1',
    email: 'admin@example.com',
    role: 'ADMIN',
    status: 'ACTIVE',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when no authorization header', async () => {
      const request = createMockRequest({});
      const response = await GET(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(401);
    });

    it('should return 401 when session not found', async () => {
      mockFindSession.mockResolvedValue(null);

      const request = createMockRequest({
        headers: { Authorization: 'Bearer invalid-token' },
      });
      const response = await GET(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(401);
    });

    it('should return 401 when user not found', async () => {
      mockFindSession.mockResolvedValue({ userId: 'user-1', token: 'valid-token' });
      mockFindUser.mockResolvedValue(null);

      const request = createMockRequest({
        headers: { Authorization: 'Bearer valid-token' },
      });
      const response = await GET(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(401);
    });

    it('should return 401 when user is not active', async () => {
      mockFindSession.mockResolvedValue({ userId: 'user-1', token: 'valid-token' });
      mockFindUser.mockResolvedValue({ ...mockUser, status: 'DISABLED' });

      const request = createMockRequest({
        headers: { Authorization: 'Bearer valid-token' },
      });
      const response = await GET(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(401);
    });
  });

  describe('Authorization', () => {
    it('should return 403 when user lacks view permission', async () => {
      mockFindSession.mockResolvedValue({ userId: 'user-1', token: 'valid-token' });
      mockFindUser.mockResolvedValue(mockUser);
      mockGetPermissions.mockReturnValue({ view_member_profiles: false });

      const request = createMockRequest({
        headers: { Authorization: 'Bearer valid-token' },
      });
      const response = await GET(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(403);
    });
  });

  describe('Successful retrieval', () => {
    beforeEach(() => {
      mockFindSession.mockResolvedValue({ userId: 'user-1', token: 'valid-token' });
      mockFindUser.mockResolvedValue(mockUser);
      mockGetPermissions.mockReturnValue({ view_member_profiles: true });
    });

    it('should return all members', async () => {
      mockGetAllMembers.mockResolvedValue(mockMembers);

      const request = createMockRequest({
        headers: { Authorization: 'Bearer valid-token' },
      });
      const response = await GET(request);

      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(2);
    });

    it('should filter by gender', async () => {
      mockGetAllMembers.mockResolvedValue(mockMembers);

      const request = createMockRequest({
        headers: { Authorization: 'Bearer valid-token' },
        searchParams: { gender: 'male' },
      });
      const response = await GET(request);

      expect(response.success).toBe(true);
      expect(response.data.every((m: { gender: string }) => m.gender === 'Male')).toBe(true);
    });

    it('should filter males only', async () => {
      mockGetAllMembers.mockResolvedValue(mockMembers);

      const request = createMockRequest({
        headers: { Authorization: 'Bearer valid-token' },
        searchParams: { males: 'true' },
      });
      const response = await GET(request);

      expect(response.success).toBe(true);
      expect(response.data.every((m: { gender: string }) => m.gender === 'Male')).toBe(true);
    });

    it('should filter by generation', async () => {
      mockGetAllMembers.mockResolvedValue(mockMembers);

      const request = createMockRequest({
        headers: { Authorization: 'Bearer valid-token' },
        searchParams: { generation: '1' },
      });
      const response = await GET(request);

      expect(response.success).toBe(true);
      expect(response.data.every((m: { generation: number }) => m.generation === 1)).toBe(true);
    });

    it('should filter by branch', async () => {
      mockGetAllMembers.mockResolvedValue(mockMembers);

      const request = createMockRequest({
        headers: { Authorization: 'Bearer valid-token' },
        searchParams: { branch: 'branch1' },
      });
      const response = await GET(request);

      expect(response.success).toBe(true);
    });

    it('should filter by search query', async () => {
      mockGetAllMembers.mockResolvedValue(mockMembers);

      const request = createMockRequest({
        headers: { Authorization: 'Bearer valid-token' },
        searchParams: { search: 'أحمد' },
      });
      const response = await GET(request);

      expect(response.success).toBe(true);
    });

    it('should paginate results', async () => {
      mockGetAllMembers.mockResolvedValue(mockMembers);

      const request = createMockRequest({
        headers: { Authorization: 'Bearer valid-token' },
        searchParams: { page: '1', limit: '1' },
      });
      const response = await GET(request);

      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(1);
      expect(response.pagination).toBeDefined();
      expect(response.pagination.page).toBe(1);
      expect(response.pagination.limit).toBe(1);
      expect(response.pagination.total).toBe(2);
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      mockFindSession.mockResolvedValue({ userId: 'user-1', token: 'valid-token' });
      mockFindUser.mockResolvedValue(mockUser);
      mockGetPermissions.mockReturnValue({ view_member_profiles: true });
    });

    it('should return 500 on database error', async () => {
      mockGetAllMembers.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest({
        headers: { Authorization: 'Bearer valid-token' },
      });
      const response = await GET(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(500);
    });
  });
});

describe('POST /api/members', () => {
  const mockUser = {
    id: 'user-1',
    email: 'admin@example.com',
    role: 'ADMIN',
    status: 'ACTIVE',
  };

  const validMemberData = {
    firstName: 'محمد',
    gender: 'Male',
    fatherName: 'أحمد',
    birthYear: 1990,
    branch: 'branch1',
    generation: 3,
  };

  const mockCreatedMember = {
    id: 'M003',
    firstName: 'محمد',
    gender: 'Male',
    fatherName: 'أحمد',
    birthYear: 1990,
    branch: 'branch1',
    generation: 3,
    status: 'Living',
    familyName: 'آل شايع',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindSession.mockResolvedValue({ userId: 'user-1', token: 'valid-token' });
    mockFindUser.mockResolvedValue(mockUser);
    mockGetPermissions.mockReturnValue({ add_member: true });
    mockLogAudit.mockResolvedValue(undefined);
  });

  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: validMemberData,
      });
      const response = await POST(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(401);
    });
  });

  describe('Authorization', () => {
    it('should return 403 when user lacks add_member permission', async () => {
      mockGetPermissions.mockReturnValue({ add_member: false });

      const request = createMockRequest({
        method: 'POST',
        body: validMemberData,
        headers: { Authorization: 'Bearer valid-token' },
      });
      const response = await POST(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(403);
    });
  });

  describe('Validation', () => {
    it('should return 400 when firstName is missing', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: { gender: 'Male' },
        headers: { Authorization: 'Bearer valid-token' },
      });
      const response = await POST(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(400);
      expect(response.error).toContain('firstName');
    });

    it('should return 400 when gender is missing', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: { firstName: 'محمد' },
        headers: { Authorization: 'Bearer valid-token' },
      });
      const response = await POST(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(400);
      expect(response.error).toContain('gender');
    });

    it('should return 400 for invalid gender', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: { firstName: 'محمد', gender: 'invalid' },
        headers: { Authorization: 'Bearer valid-token' },
      });
      const response = await POST(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(400);
    });

    it('should accept case-insensitive gender values', async () => {
      mockGetNextId.mockResolvedValue('M003');
      mockMemberExists.mockResolvedValue(false);
      mockCreateMember.mockResolvedValue(mockCreatedMember);

      const request = createMockRequest({
        method: 'POST',
        body: { ...validMemberData, gender: 'male' },
        headers: { Authorization: 'Bearer valid-token' },
      });
      const response = await POST(request);

      expect(response.success).toBe(true);
    });
  });

  describe('Duplicate check', () => {
    it('should return 409 when member ID already exists', async () => {
      mockMemberExists.mockResolvedValue(true);

      const request = createMockRequest({
        method: 'POST',
        body: { ...validMemberData, id: 'M001' },
        headers: { Authorization: 'Bearer valid-token' },
      });
      const response = await POST(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(409);
    });
  });

  describe('Successful creation', () => {
    it('should create member with valid data', async () => {
      mockGetNextId.mockResolvedValue('M003');
      mockMemberExists.mockResolvedValue(false);
      mockCreateMember.mockResolvedValue(mockCreatedMember);

      const request = createMockRequest({
        method: 'POST',
        body: validMemberData,
        headers: { Authorization: 'Bearer valid-token' },
      });
      const response = await POST(request);

      expect(response.success).toBe(true);
      expect(response.status).toBe(201);
      expect(response.data).toBeDefined();
      expect(response.data.firstName).toBe('محمد');
    });

    it('should generate ID if not provided', async () => {
      mockGetNextId.mockResolvedValue('M004');
      mockMemberExists.mockResolvedValue(false);
      mockCreateMember.mockResolvedValue({ ...mockCreatedMember, id: 'M004' });

      const request = createMockRequest({
        method: 'POST',
        body: validMemberData,
        headers: { Authorization: 'Bearer valid-token' },
      });
      const response = await POST(request);

      expect(response.success).toBe(true);
      expect(mockGetNextId).toHaveBeenCalled();
    });

    it('should use provided ID if given', async () => {
      mockMemberExists.mockResolvedValue(false);
      mockCreateMember.mockResolvedValue({ ...mockCreatedMember, id: 'CUSTOM-ID' });

      const request = createMockRequest({
        method: 'POST',
        body: { ...validMemberData, id: 'CUSTOM-ID' },
        headers: { Authorization: 'Bearer valid-token' },
      });
      const response = await POST(request);

      expect(response.success).toBe(true);
      expect(mockGetNextId).not.toHaveBeenCalled();
    });

    it('should sanitize input fields', async () => {
      mockGetNextId.mockResolvedValue('M003');
      mockMemberExists.mockResolvedValue(false);
      mockCreateMember.mockResolvedValue(mockCreatedMember);

      const request = createMockRequest({
        method: 'POST',
        body: {
          ...validMemberData,
          firstName: '<script>alert("xss")</script>محمد',
        },
        headers: { Authorization: 'Bearer valid-token' },
      });
      
      await POST(request);

      expect(mockCreateMember).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: expect.not.stringContaining('<script>'),
        })
      );
    });

    it('should log audit entry on creation', async () => {
      mockGetNextId.mockResolvedValue('M003');
      mockMemberExists.mockResolvedValue(false);
      mockCreateMember.mockResolvedValue(mockCreatedMember);

      const request = createMockRequest({
        method: 'POST',
        body: validMemberData,
        headers: { Authorization: 'Bearer valid-token' },
      });
      await POST(request);

      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MEMBER_CREATE',
          userId: 'user-1',
        })
      );
    });

    it('should set default values', async () => {
      mockGetNextId.mockResolvedValue('M003');
      mockMemberExists.mockResolvedValue(false);
      mockCreateMember.mockResolvedValue(mockCreatedMember);

      const request = createMockRequest({
        method: 'POST',
        body: { firstName: 'محمد', gender: 'Male' },
        headers: { Authorization: 'Bearer valid-token' },
      });
      
      await POST(request);

      expect(mockCreateMember).toHaveBeenCalledWith(
        expect.objectContaining({
          familyName: 'آل شايع',
          status: 'Living',
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should return 500 on database error', async () => {
      mockGetNextId.mockResolvedValue('M003');
      mockMemberExists.mockResolvedValue(false);
      mockCreateMember.mockResolvedValue(null);

      const request = createMockRequest({
        method: 'POST',
        body: validMemberData,
        headers: { Authorization: 'Bearer valid-token' },
      });
      const response = await POST(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(500);
    });

    it('should handle audit logging failure gracefully', async () => {
      mockGetNextId.mockResolvedValue('M003');
      mockMemberExists.mockResolvedValue(false);
      mockCreateMember.mockResolvedValue(mockCreatedMember);
      mockLogAudit.mockRejectedValue(new Error('Audit error'));

      const request = createMockRequest({
        method: 'POST',
        body: validMemberData,
        headers: { Authorization: 'Bearer valid-token' },
      });
      const response = await POST(request);

      expect(response.success).toBe(true);
    });
  });
});
