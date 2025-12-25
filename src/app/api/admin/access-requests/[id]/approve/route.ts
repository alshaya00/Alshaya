import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById, logActivity, createUser, createUserWithHash, findUserByEmail } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { logAuditToDb } from '@/lib/db-audit';
import crypto from 'crypto';
import { emailService, EMAIL_TEMPLATES } from '@/lib/services/email';

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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const permissions = getPermissionsForRole(user.role);
    if (!permissions.manage_users && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { password, role = 'MEMBER', reviewNote } = body;

    const accessRequest = await prisma.accessRequest.findUnique({
      where: { id: params.id },
    });

    if (!accessRequest) {
      return NextResponse.json(
        { success: false, message: 'Access request not found', messageAr: 'طلب الانضمام غير موجود' },
        { status: 404 }
      );
    }

    if (accessRequest.status === 'APPROVED') {
      return NextResponse.json(
        { success: false, message: 'Request already approved', messageAr: 'تمت الموافقة على الطلب مسبقاً' },
        { status: 400 }
      );
    }

    const existingUser = await findUserByEmail(accessRequest.email);
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'User with this email already exists', messageAr: 'يوجد مستخدم بهذا البريد الإلكتروني' },
        { status: 409 }
      );
    }

    // Check if the access request has a stored password hash from registration
    let newUser;
    let userPassword: string | undefined;
    let isTemporaryPassword = false;

    if (accessRequest.passwordHash && !password) {
      // Use the stored password hash from registration
      newUser = await createUserWithHash({
        email: accessRequest.email,
        passwordHash: accessRequest.passwordHash,
        nameArabic: accessRequest.nameArabic,
        nameEnglish: accessRequest.nameEnglish || undefined,
        phone: accessRequest.phone || undefined,
        role: role,
        status: 'ACTIVE',
        linkedMemberId: accessRequest.relatedMemberId || undefined,
      });
      isTemporaryPassword = false;
    } else {
      // No stored hash (legacy request) or admin provided a new password
      userPassword = password || crypto.randomBytes(12).toString('base64').slice(0, 16);
      isTemporaryPassword = !password;

      newUser = await createUser({
        email: accessRequest.email,
        password: userPassword,
        nameArabic: accessRequest.nameArabic,
        nameEnglish: accessRequest.nameEnglish || undefined,
        phone: accessRequest.phone || undefined,
        role: role,
        status: 'ACTIVE',
        linkedMemberId: accessRequest.relatedMemberId || undefined,
      });
    }

    const updated = await prisma.accessRequest.update({
      where: { id: params.id },
      data: {
        status: 'APPROVED',
        reviewedById: user.id,
        reviewedAt: new Date(),
        reviewNote: reviewNote || null,
        userId: newUser.id,
        approvedRole: role,
      },
    });

    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logActivity({
      userId: user.id,
      userEmail: user.email,
      userName: user.nameArabic,
      action: 'ACCESS_REQUEST_APPROVED',
      category: 'USER',
      targetType: 'ACCESS_REQUEST',
      targetId: params.id,
      targetName: accessRequest.nameArabic,
      details: { newUserId: newUser.id, role, linkedMemberId: accessRequest.relatedMemberId },
      ipAddress,
      userAgent,
      success: true,
    });

    try {
      await logAuditToDb({
        action: 'ACCESS_REQUEST_APPROVE',
        severity: 'INFO',
        userId: user.id,
        userName: user.email,
        userRole: user.role,
        targetType: 'ACCESS_REQUEST',
        targetId: params.id,
        targetName: accessRequest.nameArabic,
        description: `تمت الموافقة على طلب الانضمام: ${accessRequest.nameArabic}`,
        details: { newUserId: newUser.id, role, linkedMemberId: accessRequest.relatedMemberId, reviewNote },
        previousState: accessRequest as unknown as Record<string, unknown>,
        newState: updated as unknown as Record<string, unknown>,
        success: true,
      });
    } catch (auditError) {
      console.error('Audit logging failed:', auditError);
    }

    const loginUrl = `${process.env.REPLIT_DEV_DOMAIN || 'https://alshaye.repl.co'}/login`;

    try {
      await emailService.sendEmail({
        to: accessRequest.email,
        templateName: EMAIL_TEMPLATES.ACCESS_REQUEST_APPROVED,
        templateData: {
          name: accessRequest.nameArabic,
          loginUrl,
          temporaryPassword: isTemporaryPassword ? userPassword : undefined,
          includePasswordInfo: isTemporaryPassword,
        },
      });
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'Access request approved and user created',
      messageAr: 'تمت الموافقة على الطلب وإنشاء المستخدم',
      accessRequest: updated,
      user: {
        id: newUser.id,
        email: newUser.email,
        nameArabic: newUser.nameArabic,
        role: newUser.role,
        status: newUser.status,
      },
      temporaryPassword: isTemporaryPassword ? userPassword : undefined,
    });
  } catch (error) {
    console.error('Error approving access request:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to approve access request', messageAr: 'فشل في الموافقة على طلب الانضمام' },
      { status: 500 }
    );
  }
}
