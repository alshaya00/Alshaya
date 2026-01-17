import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, validatePassword } from '@/lib/auth/password';
import { logActivity, getSiteSettings, checkMemberLinkedToUser } from '@/lib/auth/db-store';
import { checkRateLimit, getClientIp, rateLimiters, createRateLimitResponse } from '@/lib/rate-limit';
import { emailService, EMAIL_TEMPLATES } from '@/lib/services/email';
import { normalizePhone } from '@/lib/phone-utils';

function sanitizeString(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(clientIp, rateLimiters.register);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(createRateLimitResponse(rateLimitResult), { status: 429 });
    }

    const body = await request.json();
    const { code, email, password, nameArabic, nameEnglish, phone } = body;

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    if (!code || !email || !password || !nameArabic) {
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

    const settings = await getSiteSettings();
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

    const normalizedCode = code.trim().toUpperCase();
    const invitation = await prisma.invitationCode.findUnique({
      where: { code: normalizedCode },
    });

    if (!invitation) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid invitation code',
          messageAr: 'رمز الدعوة غير صالح',
        },
        { status: 400 }
      );
    }

    if (invitation.status !== 'ACTIVE') {
      let reasonMessageAr = 'رمز الدعوة لم يعد نشطًا';
      if (invitation.status === 'REVOKED') {
        reasonMessageAr = 'تم إلغاء رمز الدعوة';
      } else if (invitation.status === 'USED') {
        reasonMessageAr = 'تم استخدام رمز الدعوة بالكامل';
      } else if (invitation.status === 'EXPIRED') {
        reasonMessageAr = 'انتهت صلاحية رمز الدعوة';
      }

      return NextResponse.json(
        {
          success: false,
          message: 'Invitation code is no longer valid',
          messageAr: reasonMessageAr,
        },
        { status: 400 }
      );
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      await prisma.invitationCode.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });

      return NextResponse.json(
        {
          success: false,
          message: 'Invitation code has expired',
          messageAr: 'انتهت صلاحية رمز الدعوة',
        },
        { status: 400 }
      );
    }

    if (invitation.usedCount >= invitation.maxUses) {
      await prisma.invitationCode.update({
        where: { id: invitation.id },
        data: { status: 'USED' },
      });

      return NextResponse.json(
        {
          success: false,
          message: 'Invitation code has reached maximum uses',
          messageAr: 'رمز الدعوة وصل للحد الأقصى من الاستخدامات',
        },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

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

    // Check if the linked member is already linked to another user
    if (invitation.linkedMemberId) {
      const existingLink = await checkMemberLinkedToUser(invitation.linkedMemberId);
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

    const passwordHash = await hashPassword(password);
    
    // Normalize phone number if provided - reject invalid Saudi format
    let normalizedPhone: string | null = null;
    if (phone) {
      normalizedPhone = normalizePhone(sanitizeString(phone));
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
    }

    const newUser = await prisma.user.create({
      data: {
        email: sanitizeString(email).toLowerCase(),
        passwordHash,
        nameArabic: sanitizeString(nameArabic),
        nameEnglish: sanitizeString(nameEnglish) || null,
        phone: normalizedPhone,
        role: 'MEMBER',
        status: 'ACTIVE',
        linkedMemberId: invitation.linkedMemberId || null,
        emailVerifiedAt: new Date(),
      },
    });

    // Sync user contact info to the linked FamilyMember
    if (invitation.linkedMemberId) {
      try {
        const updateData: Record<string, string | null> = {};
        const sanitizedEmail = sanitizeString(email).toLowerCase();
        
        if (sanitizedEmail) updateData.email = sanitizedEmail;
        if (normalizedPhone) updateData.phone = normalizedPhone;
        
        if (Object.keys(updateData).length > 0) {
          await prisma.familyMember.update({
            where: { id: invitation.linkedMemberId },
            data: updateData,
          });
          console.log(`Synced contact info to FamilyMember ${invitation.linkedMemberId}:`, updateData);
        }
      } catch (syncError) {
        console.error('Failed to sync contact info to FamilyMember:', syncError);
        // Don't fail registration if sync fails - user account is still created
      }
    }

    await prisma.invitationRedemption.create({
      data: {
        invitationId: invitation.id,
        userId: newUser.id,
        userEmail: newUser.email,
        userName: newUser.nameArabic,
      },
    });

    const newUsedCount = invitation.usedCount + 1;
    const newStatus = newUsedCount >= invitation.maxUses ? 'USED' : 'ACTIVE';

    await prisma.invitationCode.update({
      where: { id: invitation.id },
      data: {
        usedCount: newUsedCount,
        status: newStatus,
      },
    });

    await logActivity({
      userId: newUser.id,
      userEmail: newUser.email,
      userName: newUser.nameArabic,
      action: 'REGISTER_WITH_INVITE',
      category: 'AUTH',
      targetType: 'INVITATION_CODE',
      targetId: invitation.id,
      details: {
        invitationCode: invitation.code,
        linkedMemberId: invitation.linkedMemberId,
      },
      ipAddress,
      userAgent,
      success: true,
    });

    // Send welcome email
    try {
      await emailService.sendEmail({
        to: newUser.email,
        templateName: EMAIL_TEMPLATES.WELCOME,
        templateData: {
          name: newUser.nameArabic,
          loginUrl: `${process.env.REPLIT_DEV_DOMAIN || 'https://alshaye.repl.co'}/login`,
        },
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      messageAr: 'تم إنشاء الحساب بنجاح',
      user: {
        id: newUser.id,
        email: newUser.email,
        nameArabic: newUser.nameArabic,
        role: newUser.role,
        linkedMemberId: newUser.linkedMemberId,
      },
    });
  } catch (error) {
    console.error('Register with invite error:', error);
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
