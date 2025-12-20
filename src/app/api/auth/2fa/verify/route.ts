import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/prisma';
import {
  findUserByEmail,
  createSession,
  updateUser,
  logActivity,
} from '@/lib/auth/db-store';
import { verifyTOTP, verifyBackupCode } from '@/lib/auth/totp';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { checkRateLimit, getClientIp, rateLimiters, createRateLimitResponse } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP address
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(clientIp, rateLimiters.login);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(createRateLimitResponse(rateLimitResult), { status: 429 });
    }

    const body = await request.json();
    const { email, code, isBackupCode, rememberMe, tempToken } = body;

    if (!email || !code) {
      return NextResponse.json(
        {
          success: false,
          message: 'Email and code are required',
          messageAr: 'البريد الإلكتروني والرمز مطلوبان',
        },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Find user
    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid credentials',
          messageAr: 'بيانات الاعتماد غير صالحة',
        },
        { status: 401 }
      );
    }

    // Get 2FA secret
    const twoFactorSecret = await prisma.userPermissionOverride.findFirst({
      where: {
        userId: user.id,
        permissionKey: 'two_factor_secret',
        allowed: true,
      },
    });

    if (!twoFactorSecret || !twoFactorSecret.reason) {
      return NextResponse.json(
        {
          success: false,
          message: '2FA is not enabled for this account',
          messageAr: 'المصادقة الثنائية غير مفعلة لهذا الحساب',
        },
        { status: 400 }
      );
    }

    let isValid = false;

    if (isBackupCode) {
      // Verify backup code
      const backupCodesData = await prisma.userPermissionOverride.findFirst({
        where: {
          userId: user.id,
          permissionKey: 'two_factor_backup_codes',
        },
      });

      if (backupCodesData && backupCodesData.reason) {
        const hashedCodes: string[] = JSON.parse(backupCodesData.reason);
        const result = verifyBackupCode(code, hashedCodes);

        if (result.valid) {
          isValid = true;
          // Remove used backup code
          hashedCodes.splice(result.usedIndex, 1);
          await prisma.userPermissionOverride.update({
            where: {
              userId_permissionKey: {
                userId: user.id,
                permissionKey: 'two_factor_backup_codes',
              },
            },
            data: {
              reason: JSON.stringify(hashedCodes),
            },
          });
        }
      }
    } else {
      // Verify TOTP code
      isValid = verifyTOTP(twoFactorSecret.reason, code);
    }

    if (!isValid) {
      await logActivity({
        userId: user.id,
        userEmail: user.email,
        userName: user.nameArabic,
        action: 'TWO_FACTOR_FAILED',
        category: 'AUTH',
        details: { isBackupCode },
        ipAddress,
        userAgent,
        success: false,
        errorMessage: 'Invalid 2FA code',
      });

      return NextResponse.json(
        {
          success: false,
          message: 'Invalid verification code',
          messageAr: 'رمز التحقق غير صحيح',
        },
        { status: 401 }
      );
    }

    // Create session
    const session = await createSession(user.id, rememberMe || false, ipAddress, userAgent);

    // Update last login
    await updateUser(user.id, { lastLoginAt: new Date() });

    // Log successful login
    await logActivity({
      userId: user.id,
      userEmail: user.email,
      userName: user.nameArabic,
      action: 'LOGIN',
      category: 'AUTH',
      details: { with2FA: true, isBackupCode },
      ipAddress,
      userAgent,
      success: true,
    });

    // Build response user object
    const responseUser = {
      id: user.id,
      email: user.email,
      nameArabic: user.nameArabic,
      nameEnglish: user.nameEnglish,
      role: user.role,
      status: user.status,
      linkedMemberId: user.linkedMemberId,
      assignedBranch: user.assignedBranch,
      permissions: getPermissionsForRole(user.role),
      twoFactorEnabled: true,
    };

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      messageAr: 'تم تسجيل الدخول بنجاح',
      user: responseUser,
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('2FA verify error:', error);
    Sentry.captureException(error, {
      tags: { endpoint: 'auth/2fa/verify' },
    });
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
