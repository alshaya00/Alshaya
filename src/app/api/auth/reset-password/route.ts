import { NextRequest, NextResponse } from 'next/server';
import {
  findPasswordResetToken,
  markPasswordResetTokenUsed,
  findUserByEmail,
  updateUserPassword,
  deleteUserSessions,
  logActivity,
} from '@/lib/auth/db-store';
import { validatePassword } from '@/lib/auth/password';
import { checkRateLimit, getClientIp, rateLimiters, createRateLimitResponse } from '@/lib/rate-limit';

// GET - Validate token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          message: 'Token is required',
          messageAr: 'الرمز مطلوب',
        },
        { status: 400 }
      );
    }

    const resetToken = await findPasswordResetToken(token);

    if (!resetToken) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          message: 'Invalid or expired reset link',
          messageAr: 'رابط إعادة التعيين غير صالح أو منتهي الصلاحية',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      valid: true,
      email: resetToken.email,
      message: 'Token is valid',
      messageAr: 'الرمز صالح',
    });
  } catch (error) {
    console.error('Validate reset token error:', error);
    return NextResponse.json(
      {
        success: false,
        valid: false,
        message: 'An error occurred',
        messageAr: 'حدث خطأ',
      },
      { status: 500 }
    );
  }
}

// POST - Reset password
export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP address
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(clientIp, rateLimiters.passwordReset);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(createRateLimitResponse(rateLimitResult), { status: 429 });
    }

    const body = await request.json();
    const { token, password, confirmPassword } = body;

    // Validate input
    if (!token || !password) {
      return NextResponse.json(
        {
          success: false,
          message: 'Token and password are required',
          messageAr: 'الرمز وكلمة المرور مطلوبان',
        },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          message: 'Passwords do not match',
          messageAr: 'كلمات المرور غير متطابقة',
        },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
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

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Find reset token
    const resetToken = await findPasswordResetToken(token);

    if (!resetToken) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid or expired reset link',
          messageAr: 'رابط إعادة التعيين غير صالح أو منتهي الصلاحية',
        },
        { status: 400 }
      );
    }

    // Find user
    const user = await findUserByEmail(resetToken.email);

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

    // Update password
    const updated = await updateUserPassword(user.id, password);

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

    // Mark token as used
    await markPasswordResetTokenUsed(token);

    // Invalidate all existing sessions for security
    await deleteUserSessions(user.id);

    // Log activity
    await logActivity({
      userId: user.id,
      userEmail: user.email,
      userName: user.nameArabic,
      action: 'PASSWORD_RESET_COMPLETED',
      category: 'AUTH',
      details: { tokenId: resetToken.id },
      ipAddress,
      userAgent,
      success: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. Please login with your new password.',
      messageAr: 'تم إعادة تعيين كلمة المرور بنجاح. يرجى تسجيل الدخول بكلمة المرور الجديدة.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
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
