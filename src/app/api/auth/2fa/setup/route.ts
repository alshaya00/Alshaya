import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/prisma';
import {
  findUserById,
  findSessionByToken,
  logActivity,
} from '@/lib/auth/db-store';
import {
  generateTOTPSecret,
  generateTOTPUri,
  verifyTOTP,
  generateBackupCodes,
  hashBackupCode,
} from '@/lib/auth/totp';

// GET - Get 2FA setup info (secret and QR code URI)
export async function GET(request: NextRequest) {
  try {
    // Get session token from header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const session = await findSessionByToken(token);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Invalid session', messageAr: 'جلسة غير صالحة' },
        { status: 401 }
      );
    }

    const user = await findUserById(session.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found', messageAr: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    // Check if 2FA is already enabled
    const twoFactorData = await prisma.userPermissionOverride.findFirst({
      where: {
        userId: user.id,
        permissionKey: 'two_factor_secret',
      },
    });

    if (twoFactorData && twoFactorData.allowed) {
      return NextResponse.json(
        {
          success: false,
          enabled: true,
          message: '2FA is already enabled',
          messageAr: 'المصادقة الثنائية مفعلة بالفعل',
        },
        { status: 400 }
      );
    }

    // Generate new secret
    const secret = generateTOTPSecret();
    const uri = generateTOTPUri(secret, user.email, 'آل شايع - Al-Shaye');

    // Store temporary secret (not yet confirmed)
    await prisma.userPermissionOverride.upsert({
      where: {
        userId_permissionKey: {
          userId: user.id,
          permissionKey: 'two_factor_temp_secret',
        },
      },
      update: {
        reason: secret,
        setAt: new Date(),
      },
      create: {
        userId: user.id,
        permissionKey: 'two_factor_temp_secret',
        allowed: false,
        setBy: user.id,
        reason: secret,
      },
    });

    return NextResponse.json({
      success: true,
      secret,
      uri,
      message: 'Scan the QR code with your authenticator app',
      messageAr: 'امسح رمز QR باستخدام تطبيق المصادقة',
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    Sentry.captureException(error, {
      tags: { endpoint: 'auth/2fa/setup' },
    });
    return NextResponse.json(
      { success: false, message: 'An error occurred', messageAr: 'حدث خطأ' },
      { status: 500 }
    );
  }
}

// POST - Verify and enable 2FA
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const session = await findSessionByToken(token);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Invalid session', messageAr: 'جلسة غير صالحة' },
        { status: 401 }
      );
    }

    const user = await findUserById(session.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found', messageAr: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, message: 'Verification code is required', messageAr: 'رمز التحقق مطلوب' },
        { status: 400 }
      );
    }

    // Get temporary secret
    const tempSecret = await prisma.userPermissionOverride.findFirst({
      where: {
        userId: user.id,
        permissionKey: 'two_factor_temp_secret',
      },
    });

    if (!tempSecret || !tempSecret.reason) {
      return NextResponse.json(
        {
          success: false,
          message: 'No 2FA setup in progress. Please start setup first.',
          messageAr: 'لا توجد عملية إعداد جارية. يرجى بدء الإعداد أولاً.',
        },
        { status: 400 }
      );
    }

    // Verify the code
    const isValid = verifyTOTP(tempSecret.reason, code);

    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid verification code',
          messageAr: 'رمز التحقق غير صحيح',
        },
        { status: 400 }
      );
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes(10);
    const hashedBackupCodes = backupCodes.map(hashBackupCode);

    // Store the secret and backup codes
    await prisma.userPermissionOverride.upsert({
      where: {
        userId_permissionKey: {
          userId: user.id,
          permissionKey: 'two_factor_secret',
        },
      },
      update: {
        allowed: true,
        reason: tempSecret.reason,
        setAt: new Date(),
      },
      create: {
        userId: user.id,
        permissionKey: 'two_factor_secret',
        allowed: true,
        setBy: user.id,
        reason: tempSecret.reason,
      },
    });

    await prisma.userPermissionOverride.upsert({
      where: {
        userId_permissionKey: {
          userId: user.id,
          permissionKey: 'two_factor_backup_codes',
        },
      },
      update: {
        allowed: true,
        reason: JSON.stringify(hashedBackupCodes),
        setAt: new Date(),
      },
      create: {
        userId: user.id,
        permissionKey: 'two_factor_backup_codes',
        allowed: true,
        setBy: user.id,
        reason: JSON.stringify(hashedBackupCodes),
      },
    });

    // Delete temporary secret
    await prisma.userPermissionOverride.deleteMany({
      where: {
        userId: user.id,
        permissionKey: 'two_factor_temp_secret',
      },
    });

    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Log activity
    await logActivity({
      userId: user.id,
      userEmail: user.email,
      userName: user.nameArabic,
      action: 'TWO_FACTOR_ENABLED',
      category: 'AUTH',
      ipAddress,
      userAgent,
      success: true,
    });

    return NextResponse.json({
      success: true,
      backupCodes,
      message: '2FA has been enabled. Save your backup codes in a safe place.',
      messageAr: 'تم تفعيل المصادقة الثنائية. احفظ رموز الاسترداد في مكان آمن.',
    });
  } catch (error) {
    console.error('2FA enable error:', error);
    Sentry.captureException(error, {
      tags: { endpoint: 'auth/2fa/enable' },
    });
    return NextResponse.json(
      { success: false, message: 'An error occurred', messageAr: 'حدث خطأ' },
      { status: 500 }
    );
  }
}

// DELETE - Disable 2FA
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const session = await findSessionByToken(token);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Invalid session', messageAr: 'جلسة غير صالحة' },
        { status: 401 }
      );
    }

    const user = await findUserById(session.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found', messageAr: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { password, code } = body;

    if (!password && !code) {
      return NextResponse.json(
        {
          success: false,
          message: 'Password or 2FA code is required',
          messageAr: 'كلمة المرور أو رمز المصادقة مطلوب',
        },
        { status: 400 }
      );
    }

    // If 2FA code provided, verify it
    if (code) {
      const twoFactorSecret = await prisma.userPermissionOverride.findFirst({
        where: {
          userId: user.id,
          permissionKey: 'two_factor_secret',
          allowed: true,
        },
      });

      if (!twoFactorSecret || !twoFactorSecret.reason) {
        return NextResponse.json(
          { success: false, message: '2FA is not enabled', messageAr: 'المصادقة الثنائية غير مفعلة' },
          { status: 400 }
        );
      }

      const isValid = verifyTOTP(twoFactorSecret.reason, code);
      if (!isValid) {
        return NextResponse.json(
          { success: false, message: 'Invalid 2FA code', messageAr: 'رمز المصادقة غير صحيح' },
          { status: 400 }
        );
      }
    }

    // Delete 2FA data
    await prisma.userPermissionOverride.deleteMany({
      where: {
        userId: user.id,
        permissionKey: { in: ['two_factor_secret', 'two_factor_backup_codes', 'two_factor_temp_secret'] },
      },
    });

    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Log activity
    await logActivity({
      userId: user.id,
      userEmail: user.email,
      userName: user.nameArabic,
      action: 'TWO_FACTOR_DISABLED',
      category: 'AUTH',
      ipAddress,
      userAgent,
      success: true,
    });

    return NextResponse.json({
      success: true,
      message: '2FA has been disabled',
      messageAr: 'تم تعطيل المصادقة الثنائية',
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    Sentry.captureException(error, {
      tags: { endpoint: 'auth/2fa/disable' },
    });
    return NextResponse.json(
      { success: false, message: 'An error occurred', messageAr: 'حدث خطأ' },
      { status: 500 }
    );
  }
}
