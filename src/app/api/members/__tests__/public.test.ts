import { NextRequest } from 'next/server';
import { GET } from '../public/route';
import { prismaMock, resetPrismaMock } from '@/__tests__/utils/prisma-mock';

jest.mock('@/lib/prisma', () => ({
  prisma: require('@/__tests__/utils/prisma-mock').prismaMock,
}));

function createMockRequest(searchParams: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/members/public');
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return {
    url: url.toString(),
    nextUrl: url,
  } as unknown as NextRequest;
}

describe('GET /api/members/public', () => {
  const mockMembers = [
    {
      id: 'M001',
      firstName: 'أحمد',
      fullNameAr: 'أحمد محمد آل شايع',
      fullNameEn: 'Ahmed Mohammed Al-Shaye',
      generation: 1,
      branch: 'main',
      fatherId: null,
      deletedAt: null,
    },
    {
      id: 'M002',
      firstName: 'محمد',
      fullNameAr: 'محمد أحمد آل شايع',
      fullNameEn: 'Mohammed Ahmed Al-Shaye',
      generation: 2,
      branch: 'main',
      fatherId: 'M001',
      deletedAt: null,
    },
    {
      id: 'M003',
      firstName: 'فهد',
      fullNameAr: 'فهد أحمد آل شايع',
      fullNameEn: 'Fahad Ahmed Al-Shaye',
      generation: 2,
      branch: 'secondary',
      fatherId: 'M001',
      deletedAt: null,
    },
  ];

  beforeEach(() => {
    resetPrismaMock();
    prismaMock.familyMember.findMany.mockResolvedValue(mockMembers);
  });

  describe('Successful retrieval', () => {
    it('should return public members without authentication', async () => {
      const request = createMockRequest();
      const response = await GET(request);

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.count).toBeDefined();
    });

    it('should only return selected fields', async () => {
      const request = createMockRequest();
      await GET(request);

      expect(prismaMock.familyMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            id: true,
            firstName: true,
            fullNameAr: true,
            fullNameEn: true,
            generation: true,
            branch: true,
            fatherId: true,
          }),
        })
      );
    });

    it('should exclude deleted members', async () => {
      const request = createMockRequest();
      await GET(request);

      expect(prismaMock.familyMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        })
      );
    });

    it('should order by generation and firstName', async () => {
      const request = createMockRequest();
      await GET(request);

      expect(prismaMock.familyMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ generation: 'asc' }, { firstName: 'asc' }],
        })
      );
    });
  });

  describe('Search functionality', () => {
    it('should filter by search query', async () => {
      const request = createMockRequest({ q: 'أحمد' });
      await GET(request);

      expect(prismaMock.familyMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { firstName: { contains: 'أحمد', mode: 'insensitive' } },
              { fullNameAr: { contains: 'أحمد', mode: 'insensitive' } },
              { fullNameEn: { contains: 'أحمد', mode: 'insensitive' } },
            ]),
          }),
        })
      );
    });

    it('should handle empty search query', async () => {
      const request = createMockRequest({ q: '' });
      await GET(request);

      expect(prismaMock.familyMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            OR: undefined,
          }),
        })
      );
    });

    it('should handle English search query', async () => {
      const request = createMockRequest({ q: 'Ahmed' });
      await GET(request);

      expect(prismaMock.familyMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { fullNameEn: { contains: 'Ahmed', mode: 'insensitive' } },
            ]),
          }),
        })
      );
    });
  });

  describe('Limit parameter', () => {
    it('should use default limit of 50', async () => {
      const request = createMockRequest();
      await GET(request);

      expect(prismaMock.familyMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        })
      );
    });

    it('should respect custom limit', async () => {
      const request = createMockRequest({ limit: '20' });
      await GET(request);

      expect(prismaMock.familyMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
        })
      );
    });

    it('should cap limit at 100', async () => {
      const request = createMockRequest({ limit: '200' });
      await GET(request);

      expect(prismaMock.familyMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        })
      );
    });

    it('should handle invalid limit', async () => {
      const request = createMockRequest({ limit: 'invalid' });
      await GET(request);

      expect(prismaMock.familyMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: NaN,
        })
      );
    });
  });

  describe('Response format', () => {
    it('should return success and data fields', async () => {
      prismaMock.familyMember.findMany.mockResolvedValue(mockMembers);

      const request = createMockRequest();
      const response = await GET(request);

      expect(response).toHaveProperty('success', true);
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('count');
    });

    it('should return count matching data length', async () => {
      prismaMock.familyMember.findMany.mockResolvedValue(mockMembers);

      const request = createMockRequest();
      const response = await GET(request);

      expect(response.count).toBe(mockMembers.length);
    });

    it('should return empty array when no members found', async () => {
      prismaMock.familyMember.findMany.mockResolvedValue([]);

      const request = createMockRequest({ q: 'nonexistent' });
      const response = await GET(request);

      expect(response.success).toBe(true);
      expect(response.data).toEqual([]);
      expect(response.count).toBe(0);
    });
  });

  describe('Error handling', () => {
    it('should return 500 on database error', async () => {
      prismaMock.familyMember.findMany.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest();
      const response = await GET(request);

      expect(response.success).toBe(false);
      expect(response.status).toBe(500);
      expect(response.error).toBeDefined();
    });

    it('should not expose internal error details', async () => {
      prismaMock.familyMember.findMany.mockRejectedValue(new Error('Sensitive database info'));

      const request = createMockRequest();
      const response = await GET(request);

      expect(response.error).toBe('Failed to fetch members');
      expect(response.error).not.toContain('Sensitive');
    });
  });

  describe('Edge cases', () => {
    it('should handle special characters in search query', async () => {
      const request = createMockRequest({ q: 'آل شايع' });
      await GET(request);

      expect(prismaMock.familyMember.findMany).toHaveBeenCalled();
    });

    it('should handle very long search queries', async () => {
      const longQuery = 'a'.repeat(500);
      const request = createMockRequest({ q: longQuery });
      await GET(request);

      expect(prismaMock.familyMember.findMany).toHaveBeenCalled();
    });

    it('should handle zero limit', async () => {
      const request = createMockRequest({ limit: '0' });
      await GET(request);

      expect(prismaMock.familyMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 0,
        })
      );
    });

    it('should handle negative limit', async () => {
      const request = createMockRequest({ limit: '-10' });
      await GET(request);

      expect(prismaMock.familyMember.findMany).toHaveBeenCalled();
    });
  });
});
