import { NextRequest, NextResponse } from 'next/server';
import {
  findUserByEmail,
  verifyPassword,
  createSession,
  updateUser,
  checkLoginAttempts,
  recordFailedLogin,
  clearLoginAttempts,
  logActivity,
} from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { checkRateLimit, getClientIp, rateLimiters, createRateLimitResponse } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, apiServerError } from '@/lib/api-response';
export const dynamic = "force-dynamic";

async function recordLoginHistory(
  userId: string,
  success: boolean,
  method: string,
  ipAddress?: string,
  userAgent?: string,
  failureReason?: string
) {
  try {
    await prisma.loginHistory.create({
      data: {
        userId,
        success,
        method,
        ipAddress,
        userAgent,
        failureReason,
      },
    });
  } catch (error) {
    console.error('Failed to record login history:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Rate limit by IP address
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(clientIp, rateLimiters.login);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(createRateLimitResponse(rateLimitResult), { status: 429 });
    }

    const body = await request.json();
    const { email, password, rememberMe } = body;

    // Validate input
    if (!email || !password) {
      return apiError('Email and password are required', 'البريد الإلكتروني وكلمة المرور مطلوبان', 400);
    }

    // Get client info
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Check login attempts
    const attemptCheck = await checkLoginAttempts(email);
    if (!attemptCheck.allowed) {
      const lockMinutes = attemptCheck.lockedUntil
        ? Math.ceil((attemptCheck.lockedUntil.getTime() - Date.now()) / 60000)
        : 15;

      await logActivity({
        userEmail: email,
        action: 'LOGIN_FAILED',
        category: 'AUTH',
        details: { reason: 'Account locked', lockMinutes },
        ipAddress,
        userAgent,
        success: false,
        errorMessage: 'Account locked due to too many failed attempts',
      });

      return apiError(
        `Account locked. Try again in ${lockMinutes} minutes`,
        `الحساب مقفل. حاول مرة أخرى بعد ${lockMinutes} دقيقة`,
        429
      );
    }

    // Find user
    const user = await findUserByEmail(email);
    if (!user) {
      await recordFailedLogin(email);
      await logActivity({
        userEmail: email,
        action: 'LOGIN_FAILED',
        category: 'AUTH',
        details: { reason: 'User not found' },
        ipAddress,
        userAgent,
        success: false,
        errorMessage: 'User not found',
      });

      return apiError('Invalid email or password', 'البريد الإلكتروني أو كلمة المرور غير صحيحة', 401);
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      await recordFailedLogin(email);
      await recordLoginHistory(user.id, false, 'PASSWORD', ipAddress, userAgent, 'كلمة المرور غير صحيحة');
      await logActivity({
        userId: user.id,
        userEmail: user.email,
        userName: user.nameArabic,
        action: 'LOGIN_FAILED',
        category: 'AUTH',
        details: { reason: 'Invalid password' },
        ipAddress,
        userAgent,
        success: false,
        errorMessage: 'Invalid password',
      });

      return apiError('Invalid email or password', 'البريد الإلكتروني أو كلمة المرور غير صحيحة', 401);
    }

    // PENDING users can now login - admin will review later
    // Status check only blocks DISABLED accounts

    if (user.status === 'DISABLED') {
      await recordLoginHistory(user.id, false, 'PASSWORD', ipAddress, userAgent, 'الحساب معطل');
      await logActivity({
        userId: user.id,
        userEmail: user.email,
        userName: user.nameArabic,
        action: 'LOGIN_FAILED',
        category: 'AUTH',
        details: { reason: 'Account disabled' },
        ipAddress,
        userAgent,
        success: false,
        errorMessage: 'Account disabled',
      });

      return apiError('Your account has been disabled', 'تم تعطيل حسابك', 403);
    }

    // Clear failed login attempts
    await clearLoginAttempts(email);

    // Create session
    const session = await createSession(user.id, rememberMe || false, ipAddress, userAgent);

    // Update last login
    await updateUser(user.id, { lastLoginAt: new Date() });

    // Record successful login history
    await recordLoginHistory(user.id, true, 'PASSWORD', ipAddress, userAgent);

    // Log successful login
    await logActivity({
      userId: user.id,
      userEmail: user.email,
      userName: user.nameArabic,
      action: 'LOGIN',
      category: 'AUTH',
      details: { rememberMe: rememberMe || false },
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
    };

    return apiSuccess({
      user: responseUser,
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
    });
  } catch (error) {
    return apiServerError(error);
  }
}
