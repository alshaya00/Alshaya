import { NextRequest, NextResponse } from 'next/server';
import {
  findSessionByToken,
  deleteSessionByToken,
  findUserById,
  logActivity,
} from '@/lib/auth/store';

export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({
        success: true,
        message: 'Logged out',
        messageAr: 'تم تسجيل الخروج',
      });
    }

    // Get client info
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Find session to get user info for logging
    const session = await findSessionByToken(token);
    if (session) {
      const user = await findUserById(session.userId);

      // Delete the session
      await deleteSessionByToken(token);

      // Log the logout
      await logActivity({
        userId: user?.id,
        userEmail: user?.email,
        userName: user?.nameArabic,
        action: 'LOGOUT',
        category: 'AUTH',
        ipAddress,
        userAgent,
        success: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
      messageAr: 'تم تسجيل الخروج بنجاح',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({
      success: true,
      message: 'Logged out',
      messageAr: 'تم تسجيل الخروج',
    });
  }
}
