import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { normalizeMemberId } from '@/lib/utils';
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const permissions = getPermissionsForRole(user.role);
    if (!permissions.edit_member) {
      return NextResponse.json({ success: false, message: 'No permission' }, { status: 403 });
    }

    const id = normalizeMemberId(params.id) || params.id;
    const member = await prisma.familyMember.findUnique({
      where: { id },
    });

    if (!member) {
      return NextResponse.json({ success: false, message: 'Member not found' }, { status: 404 });
    }

    if (!member.deletedAt) {
      return NextResponse.json({ success: false, message: 'Member is not deleted' }, { status: 400 });
    }

    await prisma.familyMember.update({
      where: { id },
      data: {
        deletedAt: null,
        deletedBy: null,
        deletedReason: null,
      },
    });

    await prisma.changeHistory.create({
      data: {
        memberId: id,
        fieldName: 'deletedAt',
        oldValue: member.deletedAt.toISOString(),
        newValue: null,
        changeType: 'RESTORE',
        changedBy: user.id,
        changedByName: user.nameArabic,
        reason: 'Restored from deleted',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Member restored successfully',
      messageAr: 'تم استعادة العضو بنجاح',
    });
  } catch (error) {
    console.error('Error restoring member:', error);
    return NextResponse.json({ success: false, message: 'Failed to restore member' }, { status: 500 });
  }
}
