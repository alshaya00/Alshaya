import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import {
  findUserByEmail,
  createAccessRequest,
  findAccessRequestByEmail,
  getSiteSettings,
  logActivity,
} from '@/lib/auth/store';
import { validatePassword } from '@/lib/auth/password';
import { checkRateLimit, getClientIp, rateLimiters, createRateLimitResponse } from '@/lib/rate-limit';

// Sanitize string input
function sanitizeString(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Rate limit by IP address
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(clientIp, rateLimiters.register);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(createRateLimitResponse(rateLimitResult), { status: 429 });
    }

    const body = await request.json();
    const {
      email,
      password,
      nameArabic,
      nameEnglish,
      phone,
      claimedRelation,
      relatedMemberId,
      relationshipType,
      message,
    } = body;

    // Get client info
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Check if self-registration is allowed
    const settings = await getSiteSettings();
    if (!settings.allowSelfRegistration) {
      return NextResponse.json(
        {
          success: false,
          message: 'Self-registration is currently disabled',
          messageAr: 'التسجيل الذاتي معطل حالياً',
        },
        { status: 403 }
      );
    }

    // Validate required fields
    if (!email || !password || !nameArabic || !claimedRelation) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields',
          messageAr: 'الحقول المطلوبة غير مكتملة',
          requiredFields: ['email', 'password', 'nameArabic', 'claimedRelation'],
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid email format',
          messageAr: 'صيغة البريد الإلكتروني غير صحيحة',
        },
        { status: 400 }
      );
    }

    // Validate password
    const passwordValidation = validatePassword(password, settings.minPasswordLength || 8);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          message: passwordValidation.errors.map((e) => e.en).join('. '),
          messageAr: passwordValidation.errors.map((e) => e.ar).join('. '),
          errors: passwordValidation.errors,
        },
        { status: 400 }
      );
    }

    // Check if email already exists as a user
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'An account with this email already exists',
          messageAr: 'يوجد حساب بهذا البريد الإلكتروني',
        },
        { status: 409 }
      );
    }

    // Check if there's already a pending request
    const existingRequest = await findAccessRequestByEmail(email);
    if (existingRequest && existingRequest.status === 'PENDING') {
      return NextResponse.json(
        {
          success: false,
          message: 'You already have a pending access request',
          messageAr: 'لديك طلب وصول بانتظار الموافقة',
          requestId: existingRequest.id,
        },
        { status: 409 }
      );
    }

    // Create access request
    const accessRequest = await createAccessRequest({
      email: sanitizeString(email).toLowerCase(),
      nameArabic: sanitizeString(nameArabic),
      nameEnglish: sanitizeString(nameEnglish),
      phone: sanitizeString(phone),
      claimedRelation: sanitizeString(claimedRelation),
      relatedMemberId: sanitizeString(relatedMemberId),
      relationshipType: sanitizeString(relationshipType),
      message: sanitizeString(message),
    });

    // Store password hash temporarily in the request (in real implementation,
    // this would be stored securely or the user would set password after approval)
    // For now, we'll create the user account when approved

    // Log the registration
    await logActivity({
      userEmail: email,
      userName: nameArabic,
      action: 'REGISTER',
      category: 'AUTH',
      targetType: 'ACCESS_REQUEST',
      targetId: accessRequest.id,
      details: {
        claimedRelation,
        relatedMemberId,
        relationshipType,
      },
      ipAddress,
      userAgent,
      success: true,
    });

    return NextResponse.json({
      success: true,
      message: settings.requireApprovalForRegistration
        ? 'Your request has been submitted. You will be notified once approved.'
        : 'Registration successful. Please check your email to verify your account.',
      messageAr: settings.requireApprovalForRegistration
        ? 'تم تقديم طلبك. سيتم إشعارك عند الموافقة.'
        : 'تم التسجيل بنجاح. يرجى التحقق من بريدك الإلكتروني.',
      requestId: accessRequest.id,
      requiresApproval: settings.requireApprovalForRegistration,
    });
  } catch (error) {
    console.error('Registration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('pending access request')) {
      return NextResponse.json(
        {
          success: false,
          message: 'You already have a pending access request',
          messageAr: 'لديك طلب وصول بانتظار الموافقة',
        },
        { status: 409 }
      );
    }

    Sentry.captureException(error, {
      tags: { endpoint: 'auth/register' },
    });

    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred during registration',
        messageAr: 'حدث خطأ أثناء التسجيل',
      },
      { status: 500 }
    );
  }
}
