import { NextRequest, NextResponse } from 'next/server';
import {
  findSessionByToken,
  findUserById,
  updateUser,
  findUserByEmail,
  logActivity,
} from '@/lib/auth/db-store';
import { verifyPassword } from '@/lib/auth/password';
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
    const { newEmail, password } = body;

    if (!newEmail || !password) {
      return NextResponse.json(
        {
          success: false,
          message: 'Email and password are required',
          messageAr: 'البريد الإلكتروني وكلمة المرور مطلوبان',
        },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid email format',
          messageAr: 'صيغة البريد الإلكتروني غير صحيحة',
        },
        { status: 400 }
      );
    }

    const normalizedEmail = newEmail.toLowerCase().trim();

    if (user.email === normalizedEmail) {
      return NextResponse.json(
        {
          success: false,
          message: 'This is already your email address',
          messageAr: 'هذا هو بريدك الإلكتروني الحالي',
        },
        { status: 400 }
      );
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';

      await logActivity({
        userId: user.id,
        userEmail: user.email,
        userName: user.nameArabic,
        action: 'EMAIL_CHANGE_FAILED',
        category: 'ACCOUNT',
        details: { reason: 'Invalid password', attemptedEmail: normalizedEmail },
        ipAddress,
        userAgent,
        success: false,
        errorMessage: 'Invalid password',
      });

      return NextResponse.json(
        {
          success: false,
          message: 'Password is incorrect',
          messageAr: 'كلمة المرور غير صحيحة',
        },
        { status: 400 }
      );
    }

    const existingUser = await findUserByEmail(normalizedEmail);
    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'This email is already registered to another account',
          messageAr: 'البريد الإلكتروني هذا مسجل بالفعل في حساب آخر',
        },
        { status: 400 }
      );
    }

    const oldEmail = user.email;
    const updatedUser = await updateUser(user.id, { 
      email: normalizedEmail,
      emailVerifiedAt: null,
    });

    if (!updatedUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to update email',
          messageAr: 'فشل في تحديث البريد الإلكتروني',
        },
        { status: 500 }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logActivity({
      userId: user.id,
      userEmail: normalizedEmail,
      userName: user.nameArabic,
      action: 'EMAIL_CHANGED',
      category: 'ACCOUNT',
      details: { oldEmail, newEmail: normalizedEmail },
      ipAddress,
      userAgent,
      success: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Email updated successfully. Please verify your new email address.',
      messageAr: 'تم تحديث البريد الإلكتروني بنجاح. يرجى التحقق من عنوان بريدك الإلكتروني الجديد.',
    });
  } catch (error) {
    console.error('Update email error:', error);
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
