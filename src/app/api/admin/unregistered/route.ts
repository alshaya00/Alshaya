import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
export const dynamic = "force-dynamic";

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
    const branch = searchParams.get('branch') || '';
    const generation = searchParams.get('generation') || '';
    const skip = (page - 1) * limit;

    const linkedMemberIds = await prisma.user.findMany({
      where: { linkedMemberId: { not: null } },
      select: { linkedMemberId: true },
    });
    const linkedIds = linkedMemberIds
      .map((u) => u.linkedMemberId)
      .filter((id): id is string => id !== null);

    const where: Record<string, unknown> = {
      id: { notIn: linkedIds },
      deletedAt: null,
    };

    if (branch) {
      where.branch = branch;
    }

    if (generation) {
      where.generation = parseInt(generation, 10);
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { fullNameAr: { contains: search, mode: 'insensitive' } },
        { fullNameEn: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [members, totalUnregistered, totalMembers, totalRegistered, branches, generations] = await Promise.all([
      prisma.familyMember.findMany({
        where,
        orderBy: [{ generation: 'asc' }, { firstName: 'asc' }],
        skip,
        take: limit,
        select: {
          id: true,
          firstName: true,
          fullNameAr: true,
          fullNameEn: true,
          phone: true,
          email: true,
          generation: true,
          branch: true,
          gender: true,
          status: true,
          city: true,
        },
      }),
      prisma.familyMember.count({ where }),
      prisma.familyMember.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { linkedMemberId: { not: null } } }),
      prisma.familyMember.findMany({
        where: { deletedAt: null, branch: { not: null } },
        select: { branch: true },
        distinct: ['branch'],
      }),
      prisma.familyMember.findMany({
        where: { deletedAt: null },
        select: { generation: true },
        distinct: ['generation'],
        orderBy: { generation: 'asc' },
      }),
    ]);

    const uniqueBranches = branches
      .map((b) => b.branch)
      .filter((b): b is string => b !== null)
      .sort();

    const uniqueGenerations = generations
      .map((g) => g.generation)
      .sort((a, b) => a - b);

    return NextResponse.json({
      success: true,
      members,
      total: totalUnregistered,
      page,
      limit,
      totalPages: Math.ceil(totalUnregistered / limit),
      stats: {
        totalMembers,
        registeredMembers: totalRegistered,
        unregisteredMembers: totalMembers - totalRegistered,
      },
      filters: {
        branches: uniqueBranches,
        generations: uniqueGenerations,
      },
    });
  } catch (error) {
    console.error('Error fetching unregistered members:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch unregistered members', messageAr: 'فشل في جلب الأعضاء غير المسجلين' },
      { status: 500 }
    );
  }
}
