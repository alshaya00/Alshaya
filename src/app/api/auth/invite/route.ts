import { NextRequest, NextResponse } from 'next/server';
import {
  findSessionByToken,
  findUserById,
  createInvite,
  findInviteByCode,
  markInviteUsed,
  createUser,
  findUserByEmail,
  getAllInvites,
  logActivity,
} from '@/lib/auth/store';
import { getPermissionsForRole, getAssignableRoles } from '@/lib/auth/permissions';
import { UserRole } from '@/lib/auth/types';
import { hashPassword } from '@/lib/auth/password';

// Sanitize string input
function sanitizeString(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
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

// POST /api/auth/invite - Create a new invite
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    // Check permission
    const permissions = getPermissionsForRole(user.role);
    if (!permissions.invite_users) {
      return NextResponse.json(
        { success: false, message: 'No permission to invite users', messageAr: 'لا تملك صلاحية دعوة المستخدمين' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, role, branch, message } = body;

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Valid email is required', messageAr: 'البريد الإلكتروني مطلوب' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'User with this email already exists', messageAr: 'يوجد مستخدم بهذا البريد الإلكتروني' },
        { status: 409 }
      );
    }

    // Validate role
    const targetRole = (role as UserRole) || 'MEMBER';
    const assignableRoles = getAssignableRoles(user.role);
    if (!assignableRoles.includes(targetRole)) {
      return NextResponse.json(
        { success: false, message: 'Cannot assign this role', messageAr: 'لا يمكنك تعيين هذا الدور' },
        { status: 403 }
      );
    }

    // Branch leaders can only invite to their branch
    let assignedBranch = branch;
    if (user.role === 'BRANCH_LEADER') {
      assignedBranch = user.assignedBranch;
    }

    // Create invite
    const invite = await createInvite({
      email: sanitizeString(email).toLowerCase(),
      role: targetRole,
      branch: sanitizeString(assignedBranch),
      sentById: user.id,
      message: sanitizeString(message),
      expiresInDays: 7,
    });

    // Log activity
    await logActivity({
      userId: user.id,
      userEmail: user.email,
      userName: user.nameArabic,
      action: 'INVITE_SENT',
      category: 'USER',
      targetType: 'INVITE',
      targetId: invite.id,
      targetName: email,
      details: { role: targetRole, branch: assignedBranch },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      success: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Invite sent successfully',
      messageAr: 'تم إرسال الدعوة بنجاح',
      invite: {
        id: invite.id,
        code: invite.code,
        email: invite.email,
        role: invite.role,
        branch: invite.branch,
        expiresAt: invite.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Create invite error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create invite', messageAr: 'فشل إنشاء الدعوة' },
      { status: 500 }
    );
  }
}

// GET /api/auth/invite - Get invites (admin) or validate invite code (public)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    // If code is provided, validate it (public endpoint)
    if (code) {
      const invite = await findInviteByCode(code);
      if (!invite) {
        return NextResponse.json(
          { success: false, message: 'Invalid or expired invite code', messageAr: 'رمز الدعوة غير صالح أو منتهي' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        invite: {
          email: invite.email,
          role: invite.role,
          branch: invite.branch,
          expiresAt: invite.expiresAt.toISOString(),
          message: invite.message,
        },
      });
    }

    // Otherwise, list invites (requires auth)
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const permissions = getPermissionsForRole(user.role);
    if (!permissions.view_users) {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const allInvites = await getAllInvites();

    // Filter for branch leaders
    let filteredInvites = allInvites;
    if (user.role === 'BRANCH_LEADER' && user.assignedBranch) {
      filteredInvites = allInvites.filter((i) => i.branch === user.assignedBranch);
    }

    return NextResponse.json({
      success: true,
      invites: filteredInvites.map((i) => ({
        id: i.id,
        code: i.code,
        email: i.email,
        role: i.role,
        branch: i.branch,
        expiresAt: i.expiresAt.toISOString(),
        usedAt: i.usedAt?.toISOString(),
        createdAt: i.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Get invites error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get invites', messageAr: 'فشل جلب الدعوات' },
      { status: 500 }
    );
  }
}

// PUT /api/auth/invite - Accept an invite and create account
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, password, nameArabic, nameEnglish, phone } = body;

    if (!code || !password || !nameArabic) {
      return NextResponse.json(
        { success: false, message: 'Code, password, and name are required', messageAr: 'الرمز وكلمة المرور والاسم مطلوبة' },
        { status: 400 }
      );
    }

    // Find invite
    const invite = await findInviteByCode(code);
    if (!invite) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired invite code', messageAr: 'رمز الدعوة غير صالح أو منتهي' },
        { status: 404 }
      );
    }

    // Check if email already exists
    const existingUser = await findUserByEmail(invite.email);
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'User already exists', messageAr: 'المستخدم موجود بالفعل' },
        { status: 409 }
      );
    }

    // Create user account
    const newUser = await createUser({
      email: invite.email,
      password,
      nameArabic: sanitizeString(nameArabic),
      nameEnglish: sanitizeString(nameEnglish),
      phone: sanitizeString(phone),
      role: invite.role,
      status: 'ACTIVE', // Invites bypass approval
      assignedBranch: invite.branch || undefined,
    });

    // Mark invite as used
    await markInviteUsed(code, newUser.id);

    // Log activity
    await logActivity({
      userId: newUser.id,
      userEmail: newUser.email,
      userName: newUser.nameArabic,
      action: 'INVITE_ACCEPTED',
      category: 'AUTH',
      targetType: 'INVITE',
      targetId: invite.id,
      details: { role: invite.role, branch: invite.branch },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      success: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. You can now login.',
      messageAr: 'تم إنشاء الحساب بنجاح. يمكنك الآن تسجيل الدخول.',
      user: {
        id: newUser.id,
        email: newUser.email,
        nameArabic: newUser.nameArabic,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to accept invite', messageAr: 'فشل قبول الدعوة' },
      { status: 500 }
    );
  }
}
