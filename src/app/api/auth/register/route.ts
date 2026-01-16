import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import {
  findUserByEmail,
  createAccessRequest,
  findAccessRequestByEmail,
  getSiteSettings,
  logActivity,
} from '@/lib/auth/db-store';
import { validatePassword } from '@/lib/auth/password';
import { checkRateLimit, getClientIp, createRateLimitResponse, RATE_LIMITS } from '@/lib/rate-limiter';
import { emailService, EMAIL_TEMPLATES } from '@/lib/services/email';
import { normalizePhone } from '@/lib/phone-utils';

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
    // SECURITY: Rate limit by IP address - 5 requests per minute
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(
      clientIp,
      'register',
      RATE_LIMITS.REGISTER.limit,
      RATE_LIMITS.REGISTER.windowMs
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(createRateLimitResponse(rateLimitResult.resetAt), { status: 429 });
    }

    const body = await request.json();
    const {
      email,
      password,
      nameArabic,
      nameEnglish,
      phone,
      gender,
      claimedRelation,
      relatedMemberId,
      relationshipType,
      parentMemberId,
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

    // Normalize phone for consistent identity matching
    const normalizedPhone = phone ? normalizePhone(phone) : null;

    // Hash the password to store with the access request
    const passwordHash = await bcrypt.hash(password, 12);

    // Create access request with password hash
    const accessRequest = await createAccessRequest({
      email: sanitizeString(email).toLowerCase(),
      nameArabic: sanitizeString(nameArabic),
      nameEnglish: sanitizeString(nameEnglish),
      phone: normalizedPhone || sanitizeString(phone),
      gender: sanitizeString(gender),
      claimedRelation: sanitizeString(claimedRelation),
      relatedMemberId: sanitizeString(relatedMemberId),
      relationshipType: sanitizeString(relationshipType),
      parentMemberId: sanitizeString(parentMemberId),
      message: sanitizeString(message),
      passwordHash,
    });

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
        parentMemberId,
        gender,
      },
      ipAddress,
      userAgent,
      success: true,
    });

    // Send confirmation email
    try {
      await emailService.sendEmail({
        to: email,
        templateName: EMAIL_TEMPLATES.ACCESS_REQUEST_SUBMITTED,
        templateData: {
          name: nameArabic,
        },
      });
    } catch (emailError) {
      console.error('Failed to send access request confirmation email:', emailError);
    }

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
