import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { getMemberIdVariants } from '@/lib/utils';
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

    const idVariants = getMemberIdVariants(params.id);
    const body = await request.json();
    const { reason, mergedIntoId, force } = body;

    const member = await prisma.familyMember.findFirst({
      where: { id: { in: idVariants } },
    });

    if (!member) {
      return NextResponse.json({ success: false, message: 'Member not found', messageAr: 'العضو غير موجود' }, { status: 404 });
    }

    const id = member.id;

    if (member.deletedAt) {
      return NextResponse.json({ success: false, message: 'Member already deleted' }, { status: 400 });
    }

    // Check if member is involved in a pending merge operation - block deletion
    const pendingMerge = await prisma.duplicateFlag.findFirst({
      where: {
        status: 'PENDING',
        OR: [
          { sourceMemberId: id },
          { targetMemberId: id },
        ],
      },
    });

    if (pendingMerge) {
      return NextResponse.json({
        success: false,
        message: 'Cannot delete: member is involved in a pending merge operation',
        messageAr: 'لا يمكن حذف هذا العضو لأنه مشترك في عملية دمج معلقة',
        pendingMergeId: pendingMerge.id,
      }, { status: 400 });
    }

    // Check if member has linked user account - block deletion
    const linkedUser = await prisma.user.findFirst({
      where: { linkedMemberId: id },
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

    // Check if member has children - warn unless force=true
    const children = await prisma.familyMember.findMany({
      where: {
        fatherId: id,
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        fullNameAr: true,
      },
      take: 5,
    });

    const childrenCount = await prisma.familyMember.count({
      where: {
        fatherId: id,
        deletedAt: null,
      },
    });

    if (childrenCount > 0 && !force) {
      const childrenNames = children.map(c => c.fullNameAr || c.firstName);
      return NextResponse.json({
        success: false,
        warning: true,
        hasChildren: true,
        childrenCount,
        childrenNames,
        message: `This member has ${childrenCount} children. Proceed with deletion?`,
        messageAr: `هذا العضو لديه ${childrenCount} أبناء. هل تريد المتابعة؟`,
      }, { status: 200 });
    }

    const fullSnapshot = JSON.stringify(member);

    let resolvedMergeTargetId = mergedIntoId;
    if (mergedIntoId) {
      const mergeTargetVariants = getMemberIdVariants(mergedIntoId);
      const mergeTarget = await prisma.familyMember.findFirst({
        where: { id: { in: mergeTargetVariants }, deletedAt: null },
        select: { id: true },
      });
      if (mergeTarget) {
        resolvedMergeTargetId = mergeTarget.id;
      }

      await prisma.familyMember.updateMany({
        where: { fatherId: id, deletedAt: null },
        data: { fatherId: resolvedMergeTargetId },
      });
    }

    await prisma.familyMember.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: user.id,
        deletedReason: reason || (resolvedMergeTargetId ? `Merged into ${resolvedMergeTargetId}` : 'Manual deletion'),
      },
    });

    await prisma.changeHistory.create({
      data: {
        memberId: id,
        fieldName: 'deletedAt',
        oldValue: null,
        newValue: new Date().toISOString(),
        changeType: 'DELETE',
        changedBy: user.id,
        changedByName: user.nameArabic,
        fullSnapshot,
        reason: reason || (resolvedMergeTargetId ? `Merged into ${resolvedMergeTargetId}` : 'Manual deletion'),
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
