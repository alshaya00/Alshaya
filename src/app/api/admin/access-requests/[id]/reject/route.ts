import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById, logActivity } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { logAuditToDb } from '@/lib/db-audit';
import { emailService, EMAIL_TEMPLATES } from '@/lib/services/email';
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
    const { reason, reviewNote } = body;

    const accessRequest = await prisma.accessRequest.findUnique({
      where: { id: params.id },
    });

    if (!accessRequest) {
      return NextResponse.json(
        { success: false, message: 'Access request not found', messageAr: 'طلب الانضمام غير موجود' },
        { status: 404 }
      );
    }

    if (accessRequest.status === 'REJECTED') {
      return NextResponse.json(
        { success: false, message: 'Request already rejected', messageAr: 'تم رفض الطلب مسبقاً' },
        { status: 400 }
      );
    }

    const rejectionNote = reason || reviewNote || null;

    const updated = await prisma.accessRequest.update({
      where: { id: params.id },
      data: {
        status: 'REJECTED',
        reviewedById: user.id,
        reviewedAt: new Date(),
        reviewNote: rejectionNote,
      },
    });

    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logActivity({
      userId: user.id,
      userEmail: user.email,
      userName: user.nameArabic,
      action: 'ACCESS_REQUEST_REJECTED',
      category: 'USER',
      targetType: 'ACCESS_REQUEST',
      targetId: params.id,
      targetName: accessRequest.nameArabic,
      details: { reason: rejectionNote },
      ipAddress,
      userAgent,
      success: true,
    });

    try {
      await logAuditToDb({
        action: 'ACCESS_REQUEST_REJECT',
        severity: 'WARNING',
        userId: user.id,
        userName: user.email,
        userRole: user.role,
        targetType: 'ACCESS_REQUEST',
        targetId: params.id,
        targetName: accessRequest.nameArabic,
        description: `تم رفض طلب الانضمام: ${accessRequest.nameArabic}`,
        details: { reason: rejectionNote },
        previousState: accessRequest as unknown as Record<string, unknown>,
        newState: updated as unknown as Record<string, unknown>,
        success: true,
      });
    } catch (auditError) {
      console.error('Audit logging failed:', auditError);
    }

    // Send rejection email to the user
    try {
      await emailService.sendEmail({
        to: accessRequest.email,
        templateName: EMAIL_TEMPLATES.ACCESS_REQUEST_REJECTED,
        templateData: {
          name: accessRequest.nameArabic,
          reason: rejectionNote || undefined,
        },
      });
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'Access request rejected',
      messageAr: 'تم رفض طلب الانضمام',
      accessRequest: updated,
    });
  } catch (error) {
    console.error('Error rejecting access request:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to reject access request', messageAr: 'فشل في رفض طلب الانضمام' },
      { status: 500 }
    );
  }
}
