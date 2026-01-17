import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { checkVerification, normalizePhoneNumber } from '@/lib/otp-service';
import { findUserByEmail, logActivity, getSiteSettings, checkMemberLinkedToUser } from '@/lib/auth/db-store';
import { validatePassword } from '@/lib/auth/password';
import { checkRateLimit, getClientIp, rateLimiters, createRateLimitResponse } from '@/lib/rate-limit';
import crypto from 'crypto';

function sanitizeString(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
}

function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomBytes(8).toString('hex');
  return `c${timestamp}${randomPart}`;
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(clientIp, rateLimiters.register);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(createRateLimitResponse(rateLimitResult), { status: 429 });
    }

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

    const body = await request.json();
    const {
      email,
      password,
      nameArabic,
      nameEnglish,
      phone,
      countryCode = '+966',
      otp,
      gender,
      claimedRelation,
      relatedMemberId,
      relationshipType,
      parentMemberId,
      message,
    } = body;

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    if (!email || !password || !nameArabic || !phone || !otp) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields',
          messageAr: 'الحقول المطلوبة غير مكتملة',
        },
        { status: 400 }
      );
    }

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

    const passwordValidation = validatePassword(password, 8);
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

    const normalizedPhone = normalizePhoneNumber(phone, countryCode);
    const otpResult = await checkVerification(normalizedPhone, otp, 'REGISTRATION', countryCode);

    if (!otpResult.valid) {
      return NextResponse.json(
        {
          success: false,
          message: 'OTP verification failed',
          messageAr: otpResult.messageAr,
        },
        { status: 400 }
      );
    }

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

    const existingPhoneUser = await prisma.user.findFirst({
      where: { phone: normalizedPhone }
    });
    if (existingPhoneUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'An account with this phone number already exists',
          messageAr: 'يوجد حساب بهذا الرقم',
        },
        { status: 409 }
      );
    }

    // Check if the linked member is already linked to another user
    const targetLinkedMemberId = relatedMemberId || parentMemberId;
    if (targetLinkedMemberId) {
      const existingLink = await checkMemberLinkedToUser(targetLinkedMemberId);
      if (existingLink) {
        return NextResponse.json(
          {
            success: false,
            message: 'This member is already linked to another account',
            messageAr: 'هذا العضو مرتبط بحساب آخر',
          },
          { status: 409 }
        );
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        nameArabic: sanitizeString(nameArabic),
        nameEnglish: sanitizeString(nameEnglish) || null,
        phone: normalizedPhone,
        role: 'MEMBER',
        status: 'ACTIVE',
        phoneVerified: true,
        linkedMemberId: relatedMemberId || parentMemberId || null,
      }
    });

    const existingRequest = await prisma.accessRequest.findFirst({
      where: { 
        email: email.toLowerCase(),
        status: 'PENDING'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (existingRequest) {
      await prisma.accessRequest.update({
        where: { id: existingRequest.id },
        data: {
          nameArabic: sanitizeString(nameArabic),
          nameEnglish: sanitizeString(nameEnglish) || null,
          phone: normalizedPhone,
          gender: gender || null,
          claimedRelation: sanitizeString(claimedRelation) || 'Phone Verified Registration',
          relatedMemberId: relatedMemberId || null,
          relationshipType: relationshipType || null,
          parentMemberId: parentMemberId || null,
          message: sanitizeString(message) || null,
          ipAddress,
          userAgent,
          status: 'APPROVED',
          reviewedAt: new Date(),
          reviewNote: 'Auto-approved via phone verification',
          userId: user.id,
          approvedRole: 'MEMBER',
        }
      });
    } else {
      await prisma.accessRequest.create({
        data: {
          email: email.toLowerCase(),
          nameArabic: sanitizeString(nameArabic),
          nameEnglish: sanitizeString(nameEnglish) || null,
          phone: normalizedPhone,
          gender: gender || null,
          claimedRelation: sanitizeString(claimedRelation) || 'Phone Verified Registration',
          relatedMemberId: relatedMemberId || null,
          relationshipType: relationshipType || null,
          parentMemberId: parentMemberId || null,
          message: sanitizeString(message) || null,
          ipAddress,
          userAgent,
          status: 'APPROVED',
          reviewedAt: new Date(),
          reviewNote: 'Auto-approved via phone verification',
          userId: user.id,
          approvedRole: 'MEMBER',
        }
      });
    }

    await logActivity({
      userId: user.id,
      userEmail: email,
      userName: nameArabic,
      action: 'REGISTER_WITH_PHONE',
      category: 'AUTH',
      targetType: 'USER',
      targetId: user.id,
      targetName: nameArabic,
      details: JSON.stringify({
        method: 'phone_otp',
        autoApproved: true,
      }),
      ipAddress,
      userAgent,
      success: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      messageAr: 'تم إنشاء حسابك بنجاح',
      user: {
        id: user.id,
        email: user.email,
        nameArabic: user.nameArabic,
        nameEnglish: user.nameEnglish,
      }
    });
  } catch (error: any) {
    console.error('Registration with phone verification error:', error);
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
