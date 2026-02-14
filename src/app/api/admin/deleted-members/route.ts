import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
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
      return NextResponse.json({ success: false, message: 'Unauthorized', messageAr: 'غير مصرح' }, { status: 401 });
    }

    const permissions = getPermissionsForRole(user.role);
    if (!permissions.edit_member) {
      return NextResponse.json({ success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' }, { status: 403 });
    }

    const deletedMembers = await prisma.familyMember.findMany({
      where: {
        deletedAt: { not: null },
      },
      orderBy: { deletedAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        fullNameAr: true,
        deletedAt: true,
        deletedBy: true,
        deletedReason: true,
      },
    });

    return NextResponse.json({
      success: true,
      members: deletedMembers,
    });
  } catch (error) {
    console.error('Error fetching deleted members:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch deleted members', messageAr: 'فشل في جلب الأعضاء المحذوفين' }, { status: 500 });
  }
}
