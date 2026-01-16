import { NextRequest, NextResponse } from 'next/server';
import { createAndSendOtp, normalizePhoneNumber, findUserByPhone } from '@/lib/otp-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, countryCode = '+966', purpose = 'LOGIN' } = body;

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

    const result = await createAndSendOtp(normalizedPhone, purpose);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      expiresIn: result.expiresIn
    });
  } catch (error: any) {
    console.error('OTP send error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في إرسال رمز التحقق' },
      { status: 500 }
    );
  }
}
