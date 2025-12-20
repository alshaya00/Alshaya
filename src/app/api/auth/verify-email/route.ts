import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import {
  findEmailVerificationToken,
  markEmailVerificationTokenUsed,
  markEmailVerified,
  findUserByEmail,
  createEmailVerificationToken,
  logActivity,
} from '@/lib/auth/db-store';
import { emailService } from '@/lib/services/email';
import { checkRateLimit, getClientIp, rateLimiters, createRateLimitResponse } from '@/lib/rate-limit';

// GET - Verify email with token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: 'Token is required',
          messageAr: 'الرمز مطلوب',
        },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Find verification token
    const verificationToken = await findEmailVerificationToken(token);

    if (!verificationToken) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid or expired verification link',
          messageAr: 'رابط التحقق غير صالح أو منتهي الصلاحية',
        },
        { status: 400 }
      );
    }

    // Mark email as verified
    await markEmailVerified(verificationToken.email);
    await markEmailVerificationTokenUsed(token);

    // Find user for logging
    const user = await findUserByEmail(verificationToken.email);

    // Log activity
    await logActivity({
      userId: user?.id,
      userEmail: verificationToken.email,
      userName: user?.nameArabic,
      action: 'EMAIL_VERIFIED',
      category: 'AUTH',
      ipAddress,
      userAgent,
      success: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      messageAr: 'تم التحقق من البريد الإلكتروني بنجاح',
    });
  } catch (error) {
    console.error('Verify email error:', error);
    Sentry.captureException(error, {
      tags: { endpoint: 'auth/verify-email' },
    });
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

// POST - Resend verification email
export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP address
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(clientIp, rateLimiters.register);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(createRateLimitResponse(rateLimitResult), { status: 429 });
    }

    const body = await request.json();
    const { email } = body;

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

    if (!user) {
      // Don't reveal if user exists
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a verification link has been sent',
        messageAr: 'إذا كان هناك حساب مرتبط بهذا البريد الإلكتروني، فقد تم إرسال رابط التحقق',
      });
    }

    if (user.emailVerifiedAt) {
      return NextResponse.json(
        {
          success: false,
          message: 'Email is already verified',
          messageAr: 'البريد الإلكتروني مُتحقق منه بالفعل',
        },
        { status: 400 }
      );
    }

    // Create new verification token
    const verificationToken = await createEmailVerificationToken(email);

    // Get base URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const verifyUrl = `${baseUrl}/verify-email?token=${verificationToken.token}`;

    // Send email
    await emailService.sendVerificationEmail(email, { verifyUrl });

    // Log activity
    await logActivity({
      userId: user.id,
      userEmail: user.email,
      userName: user.nameArabic,
      action: 'VERIFICATION_EMAIL_RESENT',
      category: 'AUTH',
      ipAddress,
      userAgent,
      success: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Verification email sent',
      messageAr: 'تم إرسال رابط التحقق',
    });
  } catch (error) {
    console.error('Resend verification email error:', error);
    Sentry.captureException(error, {
      tags: { endpoint: 'auth/verify-email/resend' },
    });
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
