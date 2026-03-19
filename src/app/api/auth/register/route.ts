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
import { checkRateLimit, getClientIp, createRateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
import { emailService, EMAIL_TEMPLATES } from '@/lib/services/email';
import { normalizePhone } from '@/lib/phone-utils';
import { apiError, apiSuccess, apiServerError, apiForbidden } from '@/lib/api-response';
export const dynamic = "force-dynamic";

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
    const rateLimitResult = checkRateLimit(clientIp, RATE_LIMITS.REGISTER);

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
      return apiForbidden('Self-registration is currently disabled', 'التسجيل الذاتي معطل حالياً');
    }

    // Validate required fields
    if (!email || !password || !nameArabic || !claimedRelation) {
      return apiError('Missing required fields', 'الحقول المطلوبة غير مكتملة', 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return apiError('Invalid email format', 'صيغة البريد الإلكتروني غير صحيحة', 400);
    }

    // Validate password
    const passwordValidation = validatePassword(password, settings.minPasswordLength || 8);
    if (!passwordValidation.valid) {
      return apiError(
        passwordValidation.errors.map((e) => e.en).join('. '),
        passwordValidation.errors.map((e) => e.ar).join('. '),
        400
      );
    }

    // Check if email already exists as a user
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return apiError('An account with this email already exists', 'يوجد حساب بهذا البريد الإلكتروني', 409);
    }

    // Check if there's already a pending request
    const existingRequest = await findAccessRequestByEmail(email);
    if (existingRequest && existingRequest.status === 'PENDING') {
      return apiError('You already have a pending access request', 'لديك طلب وصول بانتظار الموافقة', 409);
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

    return apiSuccess({
      requestId: accessRequest.id,
      requiresApproval: settings.requireApprovalForRegistration,
    }, 201);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('pending access request')) {
      return apiError('You already have a pending access request', 'لديك طلب وصول بانتظار الموافقة', 409);
    }

    return apiServerError(error);
  }
}
