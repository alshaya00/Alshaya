import { NextRequest, NextResponse } from 'next/server';
import {
  findSessionByToken,
  findUserById,
  updateSessionActivity,
} from '@/lib/auth/store';
import { getPermissionsForRole } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: 'No token provided',
          messageAr: 'لم يتم توفير رمز المصادقة',
        },
        { status: 401 }
      );
    }

    // Find session
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

    // Find user
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

    // Check if user is still active
    if (user.status === 'DISABLED') {
      return NextResponse.json(
        {
          success: false,
          message: 'Your account has been disabled',
          messageAr: 'تم تعطيل حسابك',
        },
        { status: 403 }
      );
    }

    // Update session activity
    await updateSessionActivity(token);

    // Build response user object
    const responseUser = {
      id: user.id,
      email: user.email,
      nameArabic: user.nameArabic,
      nameEnglish: user.nameEnglish,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role,
      status: user.status,
      linkedMemberId: user.linkedMemberId,
      assignedBranch: user.assignedBranch,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString(),
      permissions: getPermissionsForRole(user.role),
    };

    return NextResponse.json({
      success: true,
      user: responseUser,
      session: {
        expiresAt: session.expiresAt.toISOString(),
        rememberMe: session.rememberMe,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
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
