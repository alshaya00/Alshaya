import { NextRequest } from 'next/server';
import {
  findSessionByToken,
  findUserById,
  updateSessionActivity,
} from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { apiSuccess, apiUnauthorized, apiNotFound, apiForbidden, apiServerError } from '@/lib/api-response';
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return apiUnauthorized('No token provided', 'لم يتم توفير رمز المصادقة');
    }

    // Find session
    const session = await findSessionByToken(token);
    if (!session) {
      return apiUnauthorized('Invalid or expired session', 'جلسة غير صالحة أو منتهية');
    }

    // Find user
    const user = await findUserById(session.userId);
    if (!user) {
      return apiNotFound('User not found', 'المستخدم غير موجود');
    }

    // Check if user is still active
    if (user.status === 'DISABLED') {
      return apiForbidden('Your account has been disabled', 'تم تعطيل حسابك');
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

    return apiSuccess({
      user: responseUser,
      session: {
        expiresAt: session.expiresAt.toISOString(),
        rememberMe: session.rememberMe,
      },
    });
  } catch (error) {
    return apiServerError(error);
  }
}
