import { NextRequest, NextResponse } from 'next/server';
import { verifyOtp, normalizePhoneNumber, findUserByPhone } from '@/lib/otp-service';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, countryCode = '+966', code, purpose = 'LOGIN', rememberMe = false } = body;

    if (!phone || !code) {
      return NextResponse.json(
        { success: false, error: 'رقم الجوال ورمز التحقق مطلوبان' },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhoneNumber(phone, countryCode);
    
    const result = await verifyOtp(normalizedPhone, code, purpose);

    if (!result.valid) {
      return NextResponse.json(
        { success: false, error: result.message },
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
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          deviceName: 'Phone Login'
        }
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { 
          lastLoginAt: new Date(),
          phoneVerified: true
        }
      });

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
