import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    const { action, notes } = body;

    if (!action || !['verify', 'unverify'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Invalid action', messageAr: 'إجراء غير صالح' },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'User not found', messageAr: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    const previousStatus = targetUser.verificationStatus;
    const newStatus = action === 'verify' ? 'VERIFIED' : 'UNVERIFIED';

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        verificationStatus: newStatus,
        verifiedAt: action === 'verify' ? new Date() : null,
        verifiedBy: action === 'verify' ? user.id : null,
        verifierName: action === 'verify' ? user.nameArabic : null,
        verificationNotes: notes || null,
      },
      select: {
        id: true,
        email: true,
        nameArabic: true,
        nameEnglish: true,
        phone: true,
        phoneVerified: true,
        role: true,
        status: true,
        verificationStatus: true,
        verifiedAt: true,
        verifierName: true,
        verificationNotes: true,
        createdAt: true,
        lastLoginAt: true,
        linkedMemberId: true,
      },
    });

    const actionAr = action === 'verify' ? 'التحقق من' : 'إلغاء التحقق من';

    await logAuditToDb({
      action: action === 'verify' ? 'USER_VERIFY' : 'USER_UNVERIFY',
      severity: 'INFO',
      userId: user.id,
      userName: user.nameArabic,
      userRole: user.role,
      targetType: 'USER',
      targetId: targetUser.id,
      targetName: targetUser.nameArabic,
      description: `تم ${actionAr} المستخدم: ${targetUser.nameArabic} (${targetUser.email})`,
      previousState: { verificationStatus: previousStatus },
      newState: { verificationStatus: newStatus },
      details: {
        userEmail: targetUser.email,
        previousStatus,
        newStatus,
        notes: notes || null,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: action === 'verify' ? 'User verified' : 'User unverified',
      messageAr: action === 'verify' ? 'تم التحقق من المستخدم' : 'تم إلغاء التحقق من المستخدم',
    });
  } catch (error) {
    console.error('Error verifying user:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to verify user', messageAr: 'فشل في التحقق من المستخدم' },
      { status: 500 }
    );
  }
}
