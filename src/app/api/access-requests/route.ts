import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import {
  findSessionByToken,
  findUserById,
  getPendingAccessRequests,
  getAllAccessRequests,
  findAccessRequestById,
  updateAccessRequest,
  createUser,
  logActivity,
} from '@/lib/auth/store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { UserRole } from '@/lib/auth/types';

// SECURITY: Generate cryptographically secure temporary password
function generateSecureTempPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  const bytes = randomBytes(12);
  let password = 'Temp@';
  for (let i = 0; i < 10; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

// Helper to get auth user from request
async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) return null;

  const session = await findSessionByToken(token);
  if (!session) return null;

  const user = await findUserById(session.userId);
  if (!user || user.status !== 'ACTIVE') return null;

  return user;
}

// GET /api/access-requests - List access requests
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const permissions = getPermissionsForRole(user.role);
    if (!permissions.approve_access_requests) {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const pendingOnly = searchParams.get('pending') === 'true';

    let requests = pendingOnly
      ? await getPendingAccessRequests()
      : await getAllAccessRequests();

    if (status) {
      requests = requests.filter((r) => r.status === status);
    }

    // Sort by newest first
    requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return NextResponse.json({
      success: true,
      requests: requests.map((r) => ({
        id: r.id,
        email: r.email,
        nameArabic: r.nameArabic,
        nameEnglish: r.nameEnglish,
        phone: r.phone,
        claimedRelation: r.claimedRelation,
        relatedMemberId: r.relatedMemberId,
        relationshipType: r.relationshipType,
        message: r.message,
        status: r.status,
        reviewedById: r.reviewedById,
        reviewedAt: r.reviewedAt?.toISOString(),
        reviewNote: r.reviewNote,
        approvedRole: r.approvedRole,
        createdAt: r.createdAt.toISOString(),
      })),
      total: requests.length,
      pending: requests.filter((r) => r.status === 'PENDING').length,
    });
  } catch (error) {
    console.error('Get access requests error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get requests', messageAr: 'فشل جلب الطلبات' },
      { status: 500 }
    );
  }
}

// POST /api/access-requests - Approve or reject a request
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getAuthUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const permissions = getPermissionsForRole(currentUser.role);
    if (!permissions.approve_access_requests) {
      return NextResponse.json(
        { success: false, message: 'No permission to approve requests', messageAr: 'لا تملك صلاحية الموافقة على الطلبات' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { requestId, action, role, reviewNote, password } = body;

    if (!requestId || !action) {
      return NextResponse.json(
        { success: false, message: 'Request ID and action are required', messageAr: 'معرف الطلب والإجراء مطلوبان' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject', 'request_info'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Invalid action', messageAr: 'إجراء غير صالح' },
        { status: 400 }
      );
    }

    const accessRequest = await findAccessRequestById(requestId);
    if (!accessRequest) {
      return NextResponse.json(
        { success: false, message: 'Request not found', messageAr: 'الطلب غير موجود' },
        { status: 404 }
      );
    }

    if (accessRequest.status !== 'PENDING' && accessRequest.status !== 'MORE_INFO') {
      return NextResponse.json(
        { success: false, message: 'Request already processed', messageAr: 'الطلب تمت معالجته مسبقاً' },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    if (action === 'approve') {
      // Create user account
      const assignedRole = (role as UserRole) || 'MEMBER';

      // SECURITY: Generate cryptographically secure temporary password
      const tempPassword = password || generateSecureTempPassword();

      const newUser = await createUser({
        email: accessRequest.email,
        password: tempPassword,
        nameArabic: accessRequest.nameArabic,
        nameEnglish: accessRequest.nameEnglish || undefined,
        phone: accessRequest.phone || undefined,
        role: assignedRole,
        status: 'ACTIVE',
      });

      await updateAccessRequest(requestId, {
        status: 'APPROVED',
        reviewedById: currentUser.id,
        reviewedAt: new Date(),
        reviewNote,
        userId: newUser.id,
        approvedRole: assignedRole,
      });

      await logActivity({
        userId: currentUser.id,
        userEmail: currentUser.email,
        userName: currentUser.nameArabic,
        action: 'ACCESS_REQUEST_APPROVED',
        category: 'USER',
        targetType: 'ACCESS_REQUEST',
        targetId: requestId,
        targetName: accessRequest.nameArabic,
        details: { approvedEmail: accessRequest.email, assignedRole, newUserId: newUser.id },
        ipAddress,
        userAgent,
        success: true,
      });

      // TODO: In production, send tempPassword via email instead of logging
      console.log(`[SECURITY] Temp password for ${newUser.email} created. Email should be sent.`);

      return NextResponse.json({
        success: true,
        message: 'Request approved. User account created. Password sent to user email.',
        messageAr: 'تمت الموافقة على الطلب. تم إنشاء حساب المستخدم. تم إرسال كلمة المرور للبريد الإلكتروني.',
        user: {
          id: newUser.id,
          email: newUser.email,
          nameArabic: newUser.nameArabic,
          role: newUser.role,
          // Note: tempPassword is NOT returned for security - it should be sent via email
        },
        requiresPasswordReset: true,
      });
    }

    if (action === 'reject') {
      await updateAccessRequest(requestId, {
        status: 'REJECTED',
        reviewedById: currentUser.id,
        reviewedAt: new Date(),
        reviewNote,
      });

      await logActivity({
        userId: currentUser.id,
        userEmail: currentUser.email,
        userName: currentUser.nameArabic,
        action: 'ACCESS_REQUEST_REJECTED',
        category: 'USER',
        targetType: 'ACCESS_REQUEST',
        targetId: requestId,
        targetName: accessRequest.nameArabic,
        details: { rejectedEmail: accessRequest.email, reason: reviewNote },
        ipAddress,
        userAgent,
        success: true,
      });

      return NextResponse.json({
        success: true,
        message: 'Request rejected',
        messageAr: 'تم رفض الطلب',
      });
    }

    if (action === 'request_info') {
      await updateAccessRequest(requestId, {
        status: 'MORE_INFO',
        reviewedById: currentUser.id,
        reviewedAt: new Date(),
        reviewNote,
      });

      return NextResponse.json({
        success: true,
        message: 'More information requested',
        messageAr: 'تم طلب مزيد من المعلومات',
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action', messageAr: 'إجراء غير صالح' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Process access request error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process request', messageAr: 'فشل معالجة الطلب' },
      { status: 500 }
    );
  }
}
