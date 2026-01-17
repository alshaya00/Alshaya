import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';

async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) return null;

  const session = await findSessionByToken(token);
  if (!session) return null;

  const user = await findUserById(session.userId);
  if (!user || user.status !== 'ACTIVE') return null;

  return user;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const permissions = getPermissionsForRole(user.role);
    if (!permissions.manage_users && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const skip = (page - 1) * limit;

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
        };
      })
    );

    return NextResponse.json({
      success: true,
      users: usersWithMember,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      counts,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch users', messageAr: 'فشل في جلب المستخدمين' },
      { status: 500 }
    );
  }
}
