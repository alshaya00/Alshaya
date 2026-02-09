import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { logAuditToDb } from '@/lib/db-audit';
import { normalizeMemberId } from '@/lib/utils';

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    if (body.memberId) body.memberId = normalizeMemberId(body.memberId) || body.memberId;
    const { memberId } = body;

    if (!memberId) {
      return NextResponse.json(
        { success: false, message: 'Member ID is required', messageAr: 'معرف العضو مطلوب' },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'User not found', messageAr: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    if (targetUser.linkedMemberId) {
      return NextResponse.json(
        { success: false, message: 'User is already linked to a member', messageAr: 'المستخدم مرتبط بعضو بالفعل' },
        { status: 400 }
      );
    }

    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        firstName: true,
        fullNameAr: true,
        fullNameEn: true,
        generation: true,
        branch: true,
        fatherName: true,
      },
    });

    if (!member) {
      return NextResponse.json(
        { success: false, message: 'Member not found', messageAr: 'العضو غير موجود' },
        { status: 404 }
      );
    }

    const existingLink = await prisma.user.findFirst({
      where: { linkedMemberId: memberId },
    });

    if (existingLink) {
      return NextResponse.json(
        { success: false, message: 'Member is already linked to another user', messageAr: 'العضو مرتبط بمستخدم آخر بالفعل' },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { linkedMemberId: memberId },
      select: {
        id: true,
        email: true,
        nameArabic: true,
        nameEnglish: true,
        phone: true,
        phoneVerified: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        linkedMemberId: true,
      },
    });

    await logAuditToDb({
      action: 'USER_LINK_MEMBER',
      severity: 'INFO',
      userId: user.id,
      userName: user.nameArabic,
      userRole: user.role,
      targetType: 'USER',
      targetId: targetUser.id,
      targetName: targetUser.nameArabic,
      description: `تم ربط المستخدم "${targetUser.nameArabic}" بالعضو "${member.fullNameAr || member.firstName}"`,
      previousState: { linkedMemberId: null },
      newState: { linkedMemberId: memberId },
      details: {
        userEmail: targetUser.email,
        memberId: member.id,
        memberName: member.fullNameAr || member.firstName,
        linkedBy: user.email,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        ...updatedUser,
        linkedMember: member,
      },
      message: 'User linked to member successfully',
      messageAr: 'تم ربط المستخدم بالعضو بنجاح',
    });
  } catch (error) {
    console.error('Error linking user to member:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to link user to member', messageAr: 'فشل في ربط المستخدم بالعضو' },
      { status: 500 }
    );
  }
}
