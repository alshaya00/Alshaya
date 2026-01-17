import { NextRequest, NextResponse } from 'next/server';
import {
  findSessionByToken,
  findUserById,
  updateUserPassword,
  logActivity,
} from '@/lib/auth/db-store';
import { verifyPassword, validatePassword } from '@/lib/auth/password';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: 'Authentication required',
          messageAr: 'المصادقة مطلوبة',
        },
        { status: 401 }
      );
    }

    const session = await findSessionByToken(token);
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid or expired session',
          messageAr: 'جلسة غير صالحة أو منتهية',
        },
        { status: 401 }
      );
    }

    const user = await findUserById(session.userId);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'User not found',
          messageAr: 'المستخدم غير موجود',
        },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          message: 'All password fields are required',
          messageAr: 'جميع حقول كلمة المرور مطلوبة',
        },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          message: 'New passwords do not match',
          messageAr: 'كلمات المرور الجديدة غير متطابقة',
        },
        { status: 400 }
      );
    }

    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';

      await logActivity({
        userId: user.id,
        userEmail: user.email,
        userName: user.nameArabic,
        action: 'PASSWORD_CHANGE_FAILED',
        category: 'AUTH',
        details: { reason: 'Invalid current password' },
        ipAddress,
        userAgent,
        success: false,
        errorMessage: 'Invalid current password',
      });

      return NextResponse.json(
        {
          success: false,
          message: 'Current password is incorrect',
          messageAr: 'كلمة المرور الحالية غير صحيحة',
        },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          message: passwordValidation.errors.map(e => e.en).join(', '),
          messageAr: passwordValidation.errors.map(e => e.ar).join('، '),
        },
        { status: 400 }
      );
    }

    const updated = await updateUserPassword(user.id, newPassword);

    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to update password',
          messageAr: 'فشل في تحديث كلمة المرور',
        },
        { status: 500 }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logActivity({
      userId: user.id,
      userEmail: user.email,
      userName: user.nameArabic,
      action: 'PASSWORD_CHANGED',
      category: 'AUTH',
      details: { method: 'account_settings' },
      ipAddress,
      userAgent,
      success: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
      messageAr: 'تم تحديث كلمة المرور بنجاح',
    });
  } catch (error) {
    console.error('Update password error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred',
        messageAr: 'حدث خطأ',
      },
      { status: 500 }
    );
  }
}
