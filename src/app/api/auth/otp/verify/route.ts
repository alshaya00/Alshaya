import { NextRequest, NextResponse } from 'next/server';
import { checkVerification, normalizePhoneNumber, findUserByPhone } from '@/lib/otp-service';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { checkRateLimit, getClientIp, createRateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(clientIp, RATE_LIMITS.OTP_VERIFY);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(createRateLimitResponse(rateLimitResult), { status: 429 });
    }

    const body = await request.json();
    const { phone, countryCode = '+966', code, purpose = 'LOGIN', rememberMe = false } = body;

    if (!phone || !code) {
      return NextResponse.json(
        { success: false, error: 'رقم الجوال ورمز التحقق مطلوبان' },
        { status: 400 }
      );
    }

    let normalizedPhone: string;
    try {
      normalizedPhone = normalizePhoneNumber(phone, countryCode);
    } catch {
      return NextResponse.json(
        { success: false, error: 'صيغة رقم الجوال غير صحيحة', errorEn: 'Invalid phone number format' },
        { status: 400 }
      );
    }
    
    const result = await checkVerification(normalizedPhone, code, purpose, countryCode);

    if (!result.valid) {
      return NextResponse.json(
        { success: false, error: result.messageAr, errorEn: result.message },
        { status: 400 }
      );
    }

    if (purpose === 'LOGIN') {
      const user = await findUserByPhone(normalizedPhone);
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'لا يوجد حساب مسجل بهذا الرقم' },
          { status: 404 }
        );
      }

      const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';

      const token = randomBytes(32).toString('hex');
      const expiresAt = rememberMe
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
          rememberMe,
          ipAddress,
          userAgent,
          deviceName: 'تسجيل دخول برمز التحقق'
        }
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { 
          lastLoginAt: new Date(),
          phoneVerified: true
        }
      });

      try {
        await prisma.loginHistory.create({
          data: {
            userId: user.id,
            success: true,
            method: 'OTP',
            ipAddress,
            userAgent,
            deviceName: 'تسجيل دخول برمز التحقق',
          },
        });
      } catch (error) {
        console.error('Failed to record OTP login history:', error);
      }

      return NextResponse.json({
        success: true,
        message: 'تم تسجيل الدخول بنجاح',
        token,
        user: {
          id: user.id,
          nameArabic: user.nameArabic,
          nameEnglish: user.nameEnglish,
          email: user.email,
          phone: user.phone,
          role: user.role,
          linkedMemberId: user.linkedMemberId
        }
      });
    }

    if (purpose === 'VERIFICATION') {
      return NextResponse.json({
        success: true,
        message: 'تم التحقق من رقم الجوال بنجاح',
        verified: true
      });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      verified: true
    });
  } catch (error: any) {
    console.error('OTP verify error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في التحقق من الرمز' },
      { status: 500 }
    );
  }
}
