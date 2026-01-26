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

interface OrphanedUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

interface OrphanedMember {
  id: string;
  nameAr: string | null;
  nameEn: string | null;
  generation: number | null;
  fatherId: string | null;
  reason: 'no_parent' | 'invalid_parent';
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
    const hasPermission = 
      user.role === 'SUPER_ADMIN' || 
      user.role === 'ADMIN' ||
      permissions.edit_member;

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const usersWithoutLink = await prisma.user.findMany({
      where: {
        linkedMemberId: null,
      },
      select: {
        id: true,
        nameArabic: true,
        nameEnglish: true,
        email: true,
        createdAt: true,
      },
    });

    const orphanedUsers: OrphanedUser[] = usersWithoutLink.map(u => ({
      id: u.id,
      name: u.nameArabic || u.nameEnglish || 'Unknown',
      email: u.email,
      createdAt: u.createdAt,
    }));

    const membersWithoutParent = await prisma.familyMember.findMany({
      where: {
        fatherId: null,
        generation: { not: 1 },
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        fullNameAr: true,
        fullNameEn: true,
        generation: true,
        fatherId: true,
      },
    });

    const orphanedMembersNoParent: OrphanedMember[] = membersWithoutParent.map(m => ({
      id: m.id,
      nameAr: m.fullNameAr || m.firstName,
      nameEn: m.fullNameEn,
      generation: m.generation,
      fatherId: m.fatherId,
      reason: 'no_parent' as const,
    }));

    const allMembersWithParent = await prisma.familyMember.findMany({
      where: {
        fatherId: { not: null },
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        fullNameAr: true,
        fullNameEn: true,
        generation: true,
        fatherId: true,
      },
    });

    const allMemberIds = await prisma.familyMember.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });
    const memberIdSet = new Set(allMemberIds.map(m => m.id));

    const membersWithInvalidParent = allMembersWithParent.filter(
      m => m.fatherId && !memberIdSet.has(m.fatherId)
    );

    const orphanedMembersInvalidParent: OrphanedMember[] = membersWithInvalidParent.map(m => ({
      id: m.id,
      nameAr: m.fullNameAr || m.firstName,
      nameEn: m.fullNameEn,
      generation: m.generation,
      fatherId: m.fatherId,
      reason: 'invalid_parent' as const,
    }));

    const orphanedMembers = [...orphanedMembersNoParent, ...orphanedMembersInvalidParent];

    return NextResponse.json({
      success: true,
      orphanedUsers,
      orphanedMembers,
      stats: {
        usersWithoutLink: orphanedUsers.length,
        membersWithoutParent: orphanedMembersNoParent.length,
        invalidLinks: orphanedMembersInvalidParent.length,
      },
    });
  } catch (error) {
    console.error('Error fetching orphaned members:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch orphaned data', messageAr: 'فشل في جلب البيانات اليتيمة' },
      { status: 500 }
    );
  }
}
