import { NextRequest, NextResponse } from 'next/server';
import {
  findUserByEmail,
  createPasswordResetToken,
  logActivity,
} from '@/lib/auth/db-store';
import { emailService } from '@/lib/services/email';
import { checkRateLimit, getClientIp, rateLimiters, createRateLimitResponse } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP address
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(clientIp, rateLimiters.passwordReset);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(createRateLimitResponse(rateLimitResult), { status: 429 });
    }

    const body = await request.json();
    const { email } = body;

    // Validate input
    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message: 'Email is required',
          messageAr: 'البريد الإلكتروني مطلوب',
        },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Find user
    const user = await findUserByEmail(email);

    // Always return success to prevent email enumeration
    // But only send email if user exists
    if (user) {
      // Create reset token
      const resetToken = await createPasswordResetToken(email);

      // Get base URL
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const resetUrl = `${baseUrl}/reset-password?token=${resetToken.token}`;

      // Send email
      await emailService.sendPasswordResetEmail(email, {
        resetUrl,
        expiresIn: '1 ساعة',
      });

      // Log activity
      await logActivity({
        userId: user.id,
        userEmail: user.email,
        userName: user.nameArabic,
        action: 'PASSWORD_RESET_REQUESTED',
        category: 'AUTH',
        details: { tokenId: resetToken.id },
        ipAddress,
        userAgent,
        success: true,
      });
    } else {
      // Log failed attempt (user not found)
      await logActivity({
        userEmail: email,
        action: 'PASSWORD_RESET_REQUESTED',
        category: 'AUTH',
        details: { reason: 'User not found' },
        ipAddress,
        userAgent,
        success: false,
        errorMessage: 'User not found',
      });
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent',
      messageAr: 'إذا كان هناك حساب مرتبط بهذا البريد الإلكتروني، فقد تم إرسال رابط إعادة تعيين كلمة المرور',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
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
