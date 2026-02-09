import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById, logActivity } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { logAuditToDb } from '@/lib/db-audit';
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

export async function GET(
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
    if (!permissions.manage_users && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const accessRequest = await prisma.accessRequest.findUnique({
      where: { id: params.id },
    });

    if (!accessRequest) {
      return NextResponse.json(
        { success: false, message: 'Access request not found', messageAr: 'طلب الانضمام غير موجود' },
        { status: 404 }
      );
    }

    let relatedMember = null;
    if (accessRequest.relatedMemberId) {
      relatedMember = await prisma.familyMember.findUnique({
        where: { id: accessRequest.relatedMemberId },
        select: {
          id: true,
          firstName: true,
          fatherName: true,
          grandfatherName: true,
          fullNameAr: true,
          fullNameEn: true,
          generation: true,
          branch: true,
          gender: true,
          status: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      accessRequest: {
        ...accessRequest,
        relatedMember,
      },
    });
  } catch (error) {
    console.error('Error fetching access request:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch access request', messageAr: 'فشل في جلب طلب الانضمام' },
      { status: 500 }
    );
  }
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
    if (!permissions.manage_users && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status, reviewNote } = body;

    const accessRequest = await prisma.accessRequest.findUnique({
      where: { id: params.id },
    });

    if (!accessRequest) {
      return NextResponse.json(
        { success: false, message: 'Access request not found', messageAr: 'طلب الانضمام غير موجود' },
        { status: 404 }
      );
    }

    if (!status || !['PENDING', 'APPROVED', 'REJECTED', 'MORE_INFO'].includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Invalid status', messageAr: 'الحالة غير صالحة' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      status,
      reviewedById: user.id,
      reviewedAt: new Date(),
    };

    if (reviewNote !== undefined) {
      updateData.reviewNote = reviewNote;
    }

    const updated = await prisma.accessRequest.update({
      where: { id: params.id },
      data: updateData,
    });

    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logActivity({
      userId: user.id,
      userEmail: user.email,
      userName: user.nameArabic,
      action: 'ACCESS_REQUEST_STATUS_UPDATE',
      category: 'USER',
      targetType: 'ACCESS_REQUEST',
      targetId: params.id,
      targetName: accessRequest.nameArabic,
      details: { previousStatus: accessRequest.status, newStatus: status, reviewNote },
      ipAddress,
      userAgent,
      success: true,
    });

    try {
      await logAuditToDb({
        action: 'ACCESS_REQUEST_UPDATE',
        severity: 'INFO',
        userId: user.id,
        userName: user.email,
        userRole: user.role,
        targetType: 'ACCESS_REQUEST',
        targetId: params.id,
        targetName: accessRequest.nameArabic,
        description: `تم تحديث حالة طلب الانضمام: ${accessRequest.nameArabic}`,
        details: { previousStatus: accessRequest.status, newStatus: status, reviewNote },
        previousState: accessRequest as unknown as Record<string, unknown>,
        newState: updated as unknown as Record<string, unknown>,
        success: true,
      });
    } catch (auditError) {
      console.error('Audit logging failed:', auditError);
    }

    return NextResponse.json({
      success: true,
      message: 'Access request updated',
      messageAr: 'تم تحديث طلب الانضمام',
      accessRequest: updated,
    });
  } catch (error) {
    console.error('Error updating access request:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update access request', messageAr: 'فشل في تحديث طلب الانضمام' },
      { status: 500 }
    );
  }
}
