import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
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

    const body = await request.json();
    const { reason, mergedIntoId } = body;

    const member = await prisma.familyMember.findUnique({
      where: { id: params.id },
    });

    if (!member) {
      return NextResponse.json({ success: false, message: 'Member not found' }, { status: 404 });
    }

    if (member.deletedAt) {
      return NextResponse.json({ success: false, message: 'Member already deleted' }, { status: 400 });
    }

    // Check if member has linked user account - block deletion
    const linkedUser = await prisma.user.findFirst({
      where: { linkedMemberId: params.id },
      select: { id: true, email: true, nameArabic: true },
    });

    if (linkedUser) {
      return NextResponse.json({
        success: false,
        message: `Cannot delete: this member is linked to user account "${linkedUser.email}". Unlink the account first.`,
        messageAr: `لا يمكن الحذف: هذا العضو مرتبط بحساب المستخدم "${linkedUser.nameArabic}". يرجى فك الارتباط أولاً.`,
        linkedUser: { id: linkedUser.id, email: linkedUser.email, name: linkedUser.nameArabic },
      }, { status: 400 });
    }

    const fullSnapshot = JSON.stringify(member);

    if (mergedIntoId) {
      await prisma.familyMember.updateMany({
        where: { fatherId: params.id, deletedAt: null },
        data: { fatherId: mergedIntoId },
      });
    }

    await prisma.familyMember.update({
      where: { id: params.id },
      data: {
        deletedAt: new Date(),
        deletedBy: user.id,
        deletedReason: reason || (mergedIntoId ? `Merged into ${mergedIntoId}` : 'Manual deletion'),
      },
    });

    await prisma.changeHistory.create({
      data: {
        memberId: params.id,
        fieldName: 'deletedAt',
        oldValue: null,
        newValue: new Date().toISOString(),
        changeType: 'DELETE',
        changedBy: user.id,
        changedByName: user.nameArabic,
        fullSnapshot,
        reason: reason || (mergedIntoId ? `Merged into ${mergedIntoId}` : 'Manual deletion'),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Member deleted successfully',
      messageAr: 'تم حذف العضو بنجاح',
    });
  } catch (error) {
    console.error('Error deleting member:', error);
    return NextResponse.json({ success: false, message: 'Failed to delete member' }, { status: 500 });
  }
}
