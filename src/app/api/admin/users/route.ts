import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { getAuthUser } from '@/lib/api-auth';
import { apiSuccess, apiForbidden, apiServerError, parsePagination } from '@/lib/api-response';
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthUser(request);
    if (authError) return authError;

    const permissions = getPermissionsForRole(user!.role);
    if (!permissions.manage_users && user!.role !== 'SUPER_ADMIN' && user!.role !== 'ADMIN') {
      return apiForbidden('No permission', 'لا تملك الصلاحية');
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const where: Record<string, unknown> = {};

    if (status && ['ACTIVE', 'PENDING', 'DISABLED'].includes(status)) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { nameArabic: { contains: search, mode: 'insensitive' } },
        { nameEnglish: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Find duplicate phone numbers
    const duplicatePhones = await prisma.$queryRaw<{ phone: string; count: bigint }[]>`
      SELECT phone, COUNT(*) as count 
      FROM "User" 
      WHERE phone IS NOT NULL 
      GROUP BY phone 
      HAVING COUNT(*) > 1
    `;
    const duplicatePhoneNumbers = duplicatePhones.map(d => d.phone);

    const [users, total, statusCounts] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          nameArabic: true,
          nameEnglish: true,
          phone: true,
          phoneVerified: true,
          role: true,
          status: true,
          createdAt: true,
          lastLoginAt: true,
          linkedMemberId: true,
          failedLoginAttempts: true,
          verificationStatus: true,
          verifiedAt: true,
          verifierName: true,
          verificationNotes: true,
        },
      }),
      prisma.user.count({ where }),
      prisma.user.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
    ]);

    const counts = {
      total: 0,
      ACTIVE: 0,
      PENDING: 0,
      DISABLED: 0,
    };
    statusCounts.forEach((sc) => {
      counts[sc.status as keyof typeof counts] = sc._count.status;
      counts.total += sc._count.status;
    });

    const usersWithMember = await Promise.all(
      users.map(async (u) => {
        let linkedMember = null;
        if (u.linkedMemberId) {
          linkedMember = await prisma.familyMember.findUnique({
            where: { id: u.linkedMemberId },
            select: {
              id: true,
              firstName: true,
              fullNameAr: true,
              fullNameEn: true,
            },
          });
        }

        const [loginCount, lastFailedLogin] = await Promise.all([
          prisma.loginHistory.count({
            where: { userId: u.id, success: true },
          }),
          prisma.loginHistory.findFirst({
            where: { userId: u.id, success: false },
            orderBy: { loginAt: 'desc' },
            select: { loginAt: true, failureReason: true, ipAddress: true },
          }),
        ]);

        return {
          ...u,
          linkedMember,
          loginCount,
          lastFailedLogin,
          hasDuplicatePhone: u.phone ? duplicatePhoneNumbers.includes(u.phone) : false,
        };
      })
    );

    return apiSuccess({
      users: usersWithMember,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      counts,
      duplicatePhoneCount: duplicatePhoneNumbers.length,
      duplicatePhoneNumbers,
    });
  } catch (error) {
    return apiServerError(error);
  }
}
