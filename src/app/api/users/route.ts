import { NextRequest, NextResponse } from 'next/server';
import {
  findSessionByToken,
  findUserById,
  getAllUsers,
  updateUser,
  deleteUser,
  createUser,
  logActivity,
} from '@/lib/auth/store';
import { getPermissionsForRole, getAssignableRoles } from '@/lib/auth/permissions';
import { UserRole, UserStatus, ROLE_LABELS, STATUS_LABELS } from '@/lib/auth/types';

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

// GET /api/users - List all users
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
    if (!permissions.view_users) {
      return NextResponse.json(
        { success: false, message: 'No permission to view users', messageAr: 'لا تملك صلاحية عرض المستخدمين' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as UserStatus | null;
    const role = searchParams.get('role') as UserRole | null;
    const search = searchParams.get('search');

    let users = await getAllUsers();

    // Filter by status
    if (status) {
      users = users.filter((u) => u.status === status);
    }

    // Filter by role
    if (role) {
      users = users.filter((u) => u.role === role);
    }

    // Search by name or email
    if (search) {
      const query = search.toLowerCase();
      users = users.filter(
        (u) =>
          u.nameArabic.toLowerCase().includes(query) ||
          u.nameEnglish?.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query)
      );
    }

    // Branch leaders can only see users in their branch
    if (user.role === 'BRANCH_LEADER' && user.assignedBranch) {
      users = users.filter(
        (u) => u.assignedBranch === user.assignedBranch || u.role === 'MEMBER'
      );
    }

    // Remove password hash from response
    const safeUsers = users.map((u) => ({
      id: u.id,
      email: u.email,
      nameArabic: u.nameArabic,
      nameEnglish: u.nameEnglish,
      phone: u.phone,
      avatarUrl: u.avatarUrl,
      role: u.role,
      roleLabel: ROLE_LABELS[u.role],
      status: u.status,
      statusLabel: STATUS_LABELS[u.status],
      linkedMemberId: u.linkedMemberId,
      assignedBranch: u.assignedBranch,
      createdAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt?.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      users: safeUsers,
      total: safeUsers.length,
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get users', messageAr: 'فشل جلب المستخدمين' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create a new user (admin only)
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
    if (!permissions.invite_users) {
      return NextResponse.json(
        { success: false, message: 'No permission to create users', messageAr: 'لا تملك صلاحية إنشاء المستخدمين' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, password, nameArabic, nameEnglish, phone, role, status, assignedBranch } = body;

    if (!email || !password || !nameArabic) {
      return NextResponse.json(
        { success: false, message: 'Email, password, and name are required', messageAr: 'البريد الإلكتروني وكلمة المرور والاسم مطلوبة' },
        { status: 400 }
      );
    }

    // Check if role can be assigned
    const targetRole = (role as UserRole) || 'MEMBER';
    const assignableRoles = getAssignableRoles(currentUser.role);
    if (!assignableRoles.includes(targetRole)) {
      return NextResponse.json(
        { success: false, message: 'Cannot assign this role', messageAr: 'لا يمكنك تعيين هذا الدور' },
        { status: 403 }
      );
    }

    const newUser = await createUser({
      email,
      password,
      nameArabic,
      nameEnglish,
      phone,
      role: targetRole,
      status: (status as UserStatus) || 'ACTIVE',
      assignedBranch,
    });

    await logActivity({
      userId: currentUser.id,
      userEmail: currentUser.email,
      userName: currentUser.nameArabic,
      action: 'CREATE_USER',
      category: 'USER',
      targetType: 'USER',
      targetId: newUser.id,
      targetName: newUser.nameArabic,
      details: { role: targetRole, status: status || 'ACTIVE' },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      success: true,
    });

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      messageAr: 'تم إنشاء المستخدم بنجاح',
      user: {
        id: newUser.id,
        email: newUser.email,
        nameArabic: newUser.nameArabic,
        role: newUser.role,
        status: newUser.status,
      },
    });
  } catch (error) {
    console.error('Create user error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('already exists')) {
      return NextResponse.json(
        { success: false, message: 'User with this email already exists', messageAr: 'يوجد مستخدم بهذا البريد الإلكتروني' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to create user', messageAr: 'فشل إنشاء المستخدم' },
      { status: 500 }
    );
  }
}

// PATCH /api/users - Update a user
export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getAuthUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId, role, status, assignedBranch } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required', messageAr: 'معرف المستخدم مطلوب' },
        { status: 400 }
      );
    }

    const targetUser = await findUserById(userId);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'User not found', messageAr: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    const permissions = getPermissionsForRole(currentUser.role);

    // Check role change permission
    if (role && role !== targetUser.role) {
      if (!permissions.change_user_roles) {
        return NextResponse.json(
          { success: false, message: 'No permission to change roles', messageAr: 'لا تملك صلاحية تغيير الأدوار' },
          { status: 403 }
        );
      }

      const assignableRoles = getAssignableRoles(currentUser.role);
      if (!assignableRoles.includes(role as UserRole)) {
        return NextResponse.json(
          { success: false, message: 'Cannot assign this role', messageAr: 'لا يمكنك تعيين هذا الدور' },
          { status: 403 }
        );
      }
    }

    // Check status change permission
    if (status && status !== targetUser.status) {
      if (status === 'DISABLED' && !permissions.disable_users) {
        return NextResponse.json(
          { success: false, message: 'No permission to disable users', messageAr: 'لا تملك صلاحية تعطيل المستخدمين' },
          { status: 403 }
        );
      }
    }

    // Prevent self-demotion for super admin
    if (currentUser.id === userId && currentUser.role === 'SUPER_ADMIN' && role && role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Cannot demote yourself', messageAr: 'لا يمكنك تخفيض صلاحياتك' },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    if (assignedBranch !== undefined) updateData.assignedBranch = assignedBranch;

    const updatedUser = await updateUser(userId, updateData);

    await logActivity({
      userId: currentUser.id,
      userEmail: currentUser.email,
      userName: currentUser.nameArabic,
      action: 'EDIT_USER',
      category: 'USER',
      targetType: 'USER',
      targetId: userId,
      targetName: targetUser.nameArabic,
      details: { changes: updateData, previousRole: targetUser.role, previousStatus: targetUser.status },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      success: true,
    });

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      messageAr: 'تم تحديث المستخدم بنجاح',
      user: {
        id: updatedUser?.id,
        role: updatedUser?.role,
        status: updatedUser?.status,
        assignedBranch: updatedUser?.assignedBranch,
      },
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update user', messageAr: 'فشل تحديث المستخدم' },
      { status: 500 }
    );
  }
}

// DELETE /api/users - Delete a user
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getAuthUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    // Only super admin can delete users
    if (currentUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Only super admin can delete users', messageAr: 'فقط المدير العام يمكنه حذف المستخدمين' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required', messageAr: 'معرف المستخدم مطلوب' },
        { status: 400 }
      );
    }

    // Prevent self-deletion
    if (currentUser.id === userId) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete yourself', messageAr: 'لا يمكنك حذف نفسك' },
        { status: 403 }
      );
    }

    const targetUser = await findUserById(userId);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'User not found', messageAr: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    await deleteUser(userId);

    await logActivity({
      userId: currentUser.id,
      userEmail: currentUser.email,
      userName: currentUser.nameArabic,
      action: 'DELETE_USER',
      category: 'USER',
      targetType: 'USER',
      targetId: userId,
      targetName: targetUser.nameArabic,
      details: { deletedUserEmail: targetUser.email, deletedUserRole: targetUser.role },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      success: true,
    });

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
      messageAr: 'تم حذف المستخدم بنجاح',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete user', messageAr: 'فشل حذف المستخدم' },
      { status: 500 }
    );
  }
}
