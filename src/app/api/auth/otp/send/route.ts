import { NextRequest, NextResponse } from 'next/server';
import { sendVerification, normalizePhoneNumber, findUserByPhone, OtpChannel } from '@/lib/otp-service';
import { checkRateLimit, getClientIp, createRateLimitResponse, RATE_LIMITS } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(
      clientIp,
      'otp-send',
      RATE_LIMITS.OTP_SEND.limit,
      RATE_LIMITS.OTP_SEND.windowMs
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(createRateLimitResponse(rateLimitResult.resetAt), { status: 429 });
    }

    const body = await request.json();
    const { phone, countryCode = '+966', purpose = 'LOGIN', channel = 'sms' } = body;
    const otpChannel: OtpChannel = channel === 'whatsapp' ? 'whatsapp' : 'sms';

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'رقم الجوال مطلوب' },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhoneNumber(phone, countryCode);

    if (purpose === 'LOGIN') {
      const user = await findUserByPhone(normalizedPhone);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'لا يوجد حساب مسجل بهذا الرقم' },
          { status: 404 }
        );
      }
    }

    const result = await sendVerification(normalizedPhone, purpose, otpChannel, countryCode);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.messageAr, errorEn: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.messageAr,
      messageEn: result.message,
      expiresIn: result.expiresIn,
      channel: otpChannel
    });
  } catch (error: any) {
    console.error('OTP send error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في إرسال رمز التحقق' },
      { status: 500 }
    );
  }
}
