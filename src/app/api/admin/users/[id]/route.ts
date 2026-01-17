import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById, createPasswordResetToken, deleteUserSessions } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { logAuditToDb } from '@/lib/db-audit';
import { emailService } from '@/lib/services/email';

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
    const { status } = body;

    if (!status || !['ACTIVE', 'DISABLED'].includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Invalid status', messageAr: 'حالة غير صالحة' },
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

    if (targetUser.role === 'SUPER_ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Cannot modify super admin', messageAr: 'لا يمكن تعديل المدير الأعلى' },
        { status: 403 }
      );
    }

    if (targetUser.id === user.id) {
      return NextResponse.json(
        { success: false, message: 'Cannot modify own account', messageAr: 'لا يمكن تعديل حسابك الخاص' },
        { status: 400 }
      );
    }

    const previousStatus = targetUser.status;
    
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        email: true,
        nameArabic: true,
        nameEnglish: true,
        phone: true,
        phoneVerified: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        linkedMemberId: true,
      },
    });

    const action = status === 'DISABLED' ? 'USER_BLOCK' : 'USER_UNBLOCK';
    const actionAr = status === 'DISABLED' ? 'حظر' : 'إلغاء حظر';

    await logAuditToDb({
      action,
      severity: 'WARNING',
      userId: user.id,
      userName: user.nameArabic,
      userRole: user.role,
      targetType: 'USER',
      targetId: targetUser.id,
      targetName: targetUser.nameArabic,
      description: `تم ${actionAr} المستخدم: ${targetUser.nameArabic} (${targetUser.email})`,
      previousState: { status: previousStatus },
      newState: { status },
      details: {
        userEmail: targetUser.email,
        previousStatus,
        newStatus: status,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: status === 'DISABLED' ? 'User blocked' : 'User unblocked',
      messageAr: status === 'DISABLED' ? 'تم حظر المستخدم' : 'تم إلغاء حظر المستخدم',
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update user', messageAr: 'فشل في تحديث المستخدم' },
      { status: 500 }
    );
  }
}

export async function GET(
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

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        nameArabic: true,
        nameEnglish: true,
        phone: true,
        phoneVerified: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        linkedMemberId: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'User not found', messageAr: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    let linkedMember = null;
    if (targetUser.linkedMemberId) {
      linkedMember = await prisma.familyMember.findUnique({
        where: { id: targetUser.linkedMemberId },
        select: {
          id: true,
          firstName: true,
          fullNameAr: true,
          fullNameEn: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        ...targetUser,
        linkedMember,
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch user', messageAr: 'فشل في جلب المستخدم' },
      { status: 500 }
    );
  }
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

    if (id === user.id) {
      return NextResponse.json(
        { success: false, message: 'Cannot reset own password', messageAr: 'لا يمكن إعادة تعيين كلمة مرورك الخاصة' },
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

    if (targetUser.role === 'SUPER_ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Cannot reset super admin password', messageAr: 'لا يمكن إعادة تعيين كلمة مرور المدير الأعلى' },
        { status: 403 }
      );
    }

    const resetToken = await createPasswordResetToken(targetUser.email);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000';
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken.token}`;

    await emailService.sendPasswordResetEmail(targetUser.email, {
      name: targetUser.nameArabic,
      resetUrl,
      expiresIn: '1 ساعة',
    });

    await logAuditToDb({
      action: 'ADMIN_PASSWORD_RESET',
      severity: 'WARNING',
      userId: user.id,
      userName: user.nameArabic,
      userRole: user.role,
      targetType: 'USER',
      targetId: targetUser.id,
      targetName: targetUser.nameArabic,
      description: `تم إرسال رابط إعادة تعيين كلمة المرور للمستخدم: ${targetUser.nameArabic} (${targetUser.email})`,
      details: {
        userEmail: targetUser.email,
        initiatedBy: user.email,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Password reset email sent',
      messageAr: 'تم إرسال رابط إعادة تعيين كلمة المرور',
    });
  } catch (error) {
    console.error('Error sending password reset:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to send password reset email', messageAr: 'فشل في إرسال رابط إعادة تعيين كلمة المرور' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    if (id === user.id) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete own account', messageAr: 'لا يمكن حذف حسابك الخاص' },
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

    if (targetUser.role === 'SUPER_ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Cannot delete super admin', messageAr: 'لا يمكن حذف المدير الأعلى' },
        { status: 403 }
      );
    }

    if (targetUser.linkedMemberId) {
      await prisma.user.update({
        where: { id },
        data: { linkedMemberId: null },
      });
    }

    await deleteUserSessions(id);

    await prisma.accessRequest.deleteMany({
      where: { userId: id },
    });

    await prisma.user.delete({
      where: { id },
    });

    await logAuditToDb({
      action: 'USER_DELETE',
      severity: 'CRITICAL',
      userId: user.id,
      userName: user.nameArabic,
      userRole: user.role,
      targetType: 'USER',
      targetId: targetUser.id,
      targetName: targetUser.nameArabic,
      description: `تم حذف المستخدم: ${targetUser.nameArabic} (${targetUser.email})`,
      previousState: {
        id: targetUser.id,
        email: targetUser.email,
        nameArabic: targetUser.nameArabic,
        role: targetUser.role,
        status: targetUser.status,
      },
      details: {
        userEmail: targetUser.email,
        deletedBy: user.email,
        hadLinkedMember: !!targetUser.linkedMemberId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
      messageAr: 'تم حذف المستخدم بنجاح',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete user', messageAr: 'فشل في حذف المستخدم' },
      { status: 500 }
    );
  }
}
