import { NextRequest, NextResponse } from 'next/server';
import {
  findSessionByToken,
  findUserById,
  updateUser,
  logActivity,
} from '@/lib/auth/db-store';
import { normalizePhone, isValidSaudiPhone } from '@/lib/phone-utils';
import { sendVerification, checkVerification } from '@/lib/otp-service';
import { prisma } from '@/lib/prisma';
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: 'Authentication required',
          messageAr: 'المصادقة مطلوبة',
        },
        { status: 401 }
      );
    }

    const session = await findSessionByToken(token);
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid or expired session',
          messageAr: 'جلسة غير صالحة أو منتهية',
        },
        { status: 401 }
      );
    }

    const user = await findUserById(session.userId);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'User not found',
          messageAr: 'المستخدم غير موجود',
        },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { newPhone } = body;

    if (!newPhone) {
      return NextResponse.json(
        {
          success: false,
          message: 'New phone number is required',
          messageAr: 'رقم الجوال الجديد مطلوب',
        },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(newPhone);
    if (!normalizedPhone || !isValidSaudiPhone(normalizedPhone)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid phone number format',
          messageAr: 'صيغة رقم الجوال غير صحيحة',
        },
        { status: 400 }
      );
    }

    if (user.phone === normalizedPhone) {
      return NextResponse.json(
        {
          success: false,
          message: 'This is already your phone number',
          messageAr: 'هذا هو رقم جوالك الحالي',
        },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        phone: normalizedPhone,
        id: { not: user.id },
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'This phone number is already registered to another account',
          messageAr: 'رقم الجوال هذا مسجل بالفعل في حساب آخر',
        },
        { status: 400 }
      );
    }

    const result = await sendVerification(normalizedPhone, 'VERIFICATION', 'sms');

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: result.message,
          messageAr: result.messageAr,
        },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logActivity({
      userId: user.id,
      userEmail: user.email,
      userName: user.nameArabic,
      action: 'PHONE_CHANGE_INITIATED',
      category: 'ACCOUNT',
      details: { newPhone: normalizedPhone.slice(0, 7) + '****' },
      ipAddress,
      userAgent,
      success: true,
    });

    return NextResponse.json({
      success: true,
      message: result.message,
      messageAr: result.messageAr,
      expiresIn: result.expiresIn,
    });
  } catch (error) {
    console.error('Update phone initiate error:', error);
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

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: 'Authentication required',
          messageAr: 'المصادقة مطلوبة',
        },
        { status: 401 }
      );
    }

    const session = await findSessionByToken(token);
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid or expired session',
          messageAr: 'جلسة غير صالحة أو منتهية',
        },
        { status: 401 }
      );
    }

    const user = await findUserById(session.userId);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'User not found',
          messageAr: 'المستخدم غير موجود',
        },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { newPhone, otp } = body;

    if (!newPhone || !otp) {
      return NextResponse.json(
        {
          success: false,
          message: 'Phone number and OTP are required',
          messageAr: 'رقم الجوال ورمز التحقق مطلوبان',
        },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(newPhone);
    if (!normalizedPhone || !isValidSaudiPhone(normalizedPhone)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid phone number format',
          messageAr: 'صيغة رقم الجوال غير صحيحة',
        },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        phone: normalizedPhone,
        id: { not: user.id },
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'This phone number is already registered to another account',
          messageAr: 'رقم الجوال هذا مسجل بالفعل في حساب آخر',
        },
        { status: 400 }
      );
    }

    const verificationResult = await checkVerification(normalizedPhone, otp, 'VERIFICATION');

    if (!verificationResult.valid) {
      return NextResponse.json(
        {
          success: false,
          message: verificationResult.message,
          messageAr: verificationResult.messageAr,
        },
        { status: 400 }
      );
    }

    const oldPhone = user.phone;
    const updatedUser = await updateUser(user.id, { phone: normalizedPhone });

    if (!updatedUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to update phone number',
          messageAr: 'فشل في تحديث رقم الجوال',
        },
        { status: 500 }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logActivity({
      userId: user.id,
      userEmail: user.email,
      userName: user.nameArabic,
      action: 'PHONE_CHANGED',
      category: 'ACCOUNT',
      details: {
        oldPhone: oldPhone ? oldPhone.slice(0, 7) + '****' : null,
        newPhone: normalizedPhone.slice(0, 7) + '****',
      },
      ipAddress,
      userAgent,
      success: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Phone number updated successfully',
      messageAr: 'تم تحديث رقم الجوال بنجاح',
    });
  } catch (error) {
    console.error('Update phone verify error:', error);
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
