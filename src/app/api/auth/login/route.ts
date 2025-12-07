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
} from '@/lib/auth/store';
import { getPermissionsForRole } from '@/lib/auth/permissions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, rememberMe } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: 'Email and password are required',
          messageAr: 'البريد الإلكتروني وكلمة المرور مطلوبان',
        },
        { status: 400 }
      );
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

      return NextResponse.json(
        {
          success: false,
          message: `Account locked. Try again in ${lockMinutes} minutes`,
          messageAr: `الحساب مقفل. حاول مرة أخرى بعد ${lockMinutes} دقيقة`,
          locked: true,
          lockMinutes,
        },
        { status: 429 }
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

      return NextResponse.json(
        {
          success: false,
          message: 'Invalid email or password',
          messageAr: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
          remainingAttempts: attemptCheck.remainingAttempts - 1,
        },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      await recordFailedLogin(email);
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

      return NextResponse.json(
        {
          success: false,
          message: 'Invalid email or password',
          messageAr: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
          remainingAttempts: attemptCheck.remainingAttempts - 1,
        },
        { status: 401 }
      );
    }

    // Check user status
    if (user.status === 'PENDING') {
      await logActivity({
        userId: user.id,
        userEmail: user.email,
        userName: user.nameArabic,
        action: 'LOGIN_FAILED',
        category: 'AUTH',
        details: { reason: 'Account pending approval' },
        ipAddress,
        userAgent,
        success: false,
        errorMessage: 'Account pending approval',
      });

      return NextResponse.json(
        {
          success: false,
          message: 'Your account is pending approval',
          messageAr: 'حسابك بانتظار الموافقة',
          pending: true,
        },
        { status: 403 }
      );
    }

    if (user.status === 'DISABLED') {
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

      return NextResponse.json(
        {
          success: false,
          message: 'Your account has been disabled',
          messageAr: 'تم تعطيل حسابك',
          disabled: true,
        },
        { status: 403 }
      );
    }

    // Clear failed login attempts
    await clearLoginAttempts(email);

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

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      messageAr: 'تم تسجيل الدخول بنجاح',
      user: responseUser,
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred during login',
        messageAr: 'حدث خطأ أثناء تسجيل الدخول',
      },
      { status: 500 }
    );
  }
}
