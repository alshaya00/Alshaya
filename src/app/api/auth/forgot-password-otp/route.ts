import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizePhone } from '@/lib/phone-utils';
import { sendVerification, checkVerification } from '@/lib/otp-service';
import { updateUserPassword, deleteUserSessions, logActivity } from '@/lib/auth/db-store';
import { validatePassword } from '@/lib/auth/password';
import { checkRateLimit, getClientIp, rateLimiters, createRateLimitResponse } from '@/lib/rate-limit';
export const dynamic = "force-dynamic";

// POST - Send OTP for password reset
export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(clientIp, rateLimiters.passwordReset);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(createRateLimitResponse(rateLimitResult), { status: 429 });
    }

    const body = await request.json();
    const { phone } = body;

    if (!phone) {
      return NextResponse.json(
        {
          success: false,
          message: 'Phone number is required',
          messageAr: 'رقم الجوال مطلوب',
        },
        { status: 400 }
      );
    }

    const channel = 'sms';

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this phone number, a verification code has been sent',
        messageAr: 'إذا كان هناك حساب مرتبط برقم الجوال هذا، فقد تم إرسال رمز التحقق',
      });
    }

    const user = await prisma.user.findFirst({
      where: { phone: normalizedPhone }
    });

    if (user) {
      const result = await sendVerification(normalizedPhone, 'VERIFICATION', channel);

      await logActivity({
        userId: user.id,
        userEmail: user.email,
        userName: user.nameArabic,
        action: 'PASSWORD_RESET_OTP_REQUESTED',
        category: 'AUTH',
        details: { channel, phone: normalizedPhone.slice(0, 7) + '***' },
        ipAddress,
        userAgent,
        success: result.success,
        errorMessage: result.success ? undefined : result.message,
      });
    } else {
      await logActivity({
        action: 'PASSWORD_RESET_OTP_REQUESTED',
        category: 'AUTH',
        details: { reason: 'User not found', phone: phone.slice(0, 7) + '***' },
        ipAddress,
        userAgent,
        success: false,
        errorMessage: 'User not found',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this phone number, a verification code has been sent',
      messageAr: 'إذا كان هناك حساب مرتبط برقم الجوال هذا، فقد تم إرسال رمز التحقق',
    });
  } catch (error) {
    console.error('Forgot password OTP error:', error);
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

// PUT - Verify OTP and reset password
export async function PUT(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(clientIp, rateLimiters.passwordReset);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(createRateLimitResponse(rateLimitResult), { status: 429 });
    }

    const body = await request.json();
    const { phone, otp, newPassword, confirmPassword } = body;

    if (!phone || !otp || !newPassword) {
      return NextResponse.json(
        {
          success: false,
          message: 'Phone, OTP, and new password are required',
          messageAr: 'رقم الجوال ورمز التحقق وكلمة المرور الجديدة مطلوبة',
        },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          message: 'Passwords do not match',
          messageAr: 'كلمات المرور غير متطابقة',
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

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid phone number format',
          messageAr: 'صيغة رقم الجوال غير صحيحة',
        },
        { status: 400 }
      );
    }

    const verificationResult = await checkVerification(normalizedPhone, otp, 'VERIFICATION');

    if (!verificationResult.valid) {
      await logActivity({
        action: 'PASSWORD_RESET_OTP_FAILED',
        category: 'AUTH',
        details: { phone: normalizedPhone.slice(0, 7) + '***', reason: verificationResult.message },
        ipAddress,
        userAgent,
        success: false,
        errorMessage: verificationResult.message,
      });

      return NextResponse.json(
        {
          success: false,
          message: verificationResult.message,
          messageAr: verificationResult.messageAr,
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { phone: normalizedPhone }
    });

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

    await deleteUserSessions(user.id);

    await logActivity({
      userId: user.id,
      userEmail: user.email,
      userName: user.nameArabic,
      action: 'PASSWORD_RESET_OTP_COMPLETED',
      category: 'AUTH',
      details: { phone: normalizedPhone.slice(0, 7) + '***' },
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
    console.error('Reset password OTP error:', error);
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
