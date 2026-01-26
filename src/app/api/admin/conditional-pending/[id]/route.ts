import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById, logActivity } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { logAuditToDb } from '@/lib/db-audit';

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const permissions = getPermissionsForRole(user.role);
    if (!permissions.approve_pending_members && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, parentPendingId } = body;

    if (!action || !['link', 'unlink'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Invalid action', messageAr: 'الإجراء غير صالح' },
        { status: 400 }
      );
    }

    const pending = await prisma.pendingMember.findUnique({
      where: { id: params.id },
    });

    if (!pending) {
      return NextResponse.json(
        { success: false, message: 'Pending member not found', messageAr: 'العضو المعلق غير موجود' },
        { status: 404 }
      );
    }

    if (pending.reviewStatus !== 'PENDING') {
      return NextResponse.json(
        { success: false, message: 'Member already processed', messageAr: 'تمت معالجة العضو مسبقاً' },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const previousState = { ...pending };

    if (action === 'link') {
      if (!parentPendingId) {
        return NextResponse.json(
          { success: false, message: 'Parent pending ID required', messageAr: 'معرف الأب المعلق مطلوب' },
          { status: 400 }
        );
      }

      if (parentPendingId === params.id) {
        return NextResponse.json(
          { success: false, message: 'Cannot link to self', messageAr: 'لا يمكن الربط بنفس العضو' },
          { status: 400 }
        );
      }

      const parentPending = await prisma.pendingMember.findUnique({
        where: { id: parentPendingId },
      });

      if (!parentPending) {
        return NextResponse.json(
          { success: false, message: 'Parent pending member not found', messageAr: 'الأب المعلق غير موجود' },
          { status: 404 }
        );
      }

      if (parentPending.reviewStatus !== 'PENDING') {
        return NextResponse.json(
          { success: false, message: 'Parent already processed', messageAr: 'تمت معالجة الأب المعلق مسبقاً' },
          { status: 400 }
        );
      }

      if (parentPending.gender !== 'Male') {
        return NextResponse.json(
          { success: false, message: 'Parent must be male', messageAr: 'يجب أن يكون الأب ذكراً' },
          { status: 400 }
        );
      }

      let currentParentId = parentPending.parentPendingId;
      while (currentParentId) {
        if (currentParentId === params.id) {
          return NextResponse.json(
            { success: false, message: 'Circular reference detected', messageAr: 'تم اكتشاف مرجع دائري' },
            { status: 400 }
          );
        }
        const currentParent = await prisma.pendingMember.findUnique({
          where: { id: currentParentId },
        });
        currentParentId = currentParent?.parentPendingId || null;
      }

      await prisma.pendingMember.update({
        where: { id: params.id },
        data: {
          parentPendingId,
          proposedFatherId: null,
        },
      });

      await logActivity({
        userId: user.id,
        userEmail: user.email,
        userName: user.nameArabic,
        action: 'CONDITIONAL_PENDING_LINKED',
        category: 'MEMBER',
        targetType: 'PENDING_MEMBER',
        targetId: params.id,
        targetName: pending.fullNameAr || pending.firstName,
        details: {
          parentPendingId,
          parentPendingName: parentPending.fullNameAr || parentPending.firstName,
        },
        ipAddress,
        userAgent,
        success: true,
      });

      try {
        await logAuditToDb({
          action: 'CONDITIONAL_PENDING_LINK',
          severity: 'INFO',
          userId: user.id,
          userName: user.email,
          userRole: user.role,
          targetType: 'PENDING_MEMBER',
          targetId: params.id,
          targetName: pending.fullNameAr || pending.firstName,
          description: `تم ربط العضو المعلق "${pending.firstName}" بالأب المعلق "${parentPending.firstName}"`,
          details: {
            parentPendingId,
            parentPendingName: parentPending.fullNameAr || parentPending.firstName,
          },
          previousState: previousState as unknown as Record<string, unknown>,
          newState: { parentPendingId },
          success: true,
        });
      } catch (auditError) {
        console.error('Audit logging failed:', auditError);
      }

      return NextResponse.json({
        success: true,
        message: 'Member linked to pending parent',
        messageAr: `تم ربط "${pending.firstName}" بالأب المعلق "${parentPending.firstName}"`,
      });
    }

    if (action === 'unlink') {
      if (!pending.parentPendingId) {
        return NextResponse.json(
          { success: false, message: 'Member has no parent pending link', messageAr: 'العضو غير مرتبط بأب معلق' },
          { status: 400 }
        );
      }

      const previousParent = await prisma.pendingMember.findUnique({
        where: { id: pending.parentPendingId },
      });

      await prisma.pendingMember.update({
        where: { id: params.id },
        data: {
          parentPendingId: null,
        },
      });

      await logActivity({
        userId: user.id,
        userEmail: user.email,
        userName: user.nameArabic,
        action: 'CONDITIONAL_PENDING_UNLINKED',
        category: 'MEMBER',
        targetType: 'PENDING_MEMBER',
        targetId: params.id,
        targetName: pending.fullNameAr || pending.firstName,
        details: {
          previousParentPendingId: pending.parentPendingId,
          previousParentName: previousParent?.fullNameAr || previousParent?.firstName,
        },
        ipAddress,
        userAgent,
        success: true,
      });

      try {
        await logAuditToDb({
          action: 'CONDITIONAL_PENDING_UNLINK',
          severity: 'INFO',
          userId: user.id,
          userName: user.email,
          userRole: user.role,
          targetType: 'PENDING_MEMBER',
          targetId: params.id,
          targetName: pending.fullNameAr || pending.firstName,
          description: `تم فك ربط العضو المعلق "${pending.firstName}" من الأب المعلق "${previousParent?.firstName || 'غير معروف'}"`,
          details: {
            previousParentPendingId: pending.parentPendingId,
            previousParentName: previousParent?.fullNameAr || previousParent?.firstName,
          },
          previousState: previousState as unknown as Record<string, unknown>,
          newState: { parentPendingId: null },
          success: true,
        });
      } catch (auditError) {
        console.error('Audit logging failed:', auditError);
      }

      return NextResponse.json({
        success: true,
        message: 'Member unlinked from pending parent',
        messageAr: `تم فك ربط "${pending.firstName}" من الأب المعلق`,
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action', messageAr: 'الإجراء غير صالح' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating conditional pending:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update conditional pending member' },
      { status: 500 }
    );
  }
}
