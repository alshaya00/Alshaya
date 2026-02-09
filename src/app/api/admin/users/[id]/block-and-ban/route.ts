import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById, deleteUserSessions } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { logAuditToDb } from '@/lib/db-audit';
import { normalizePhone } from '@/lib/phone-utils';
export const dynamic = "force-dynamic";

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
    const { reason, blockPhone, blockEmail, unlinkMember } = body;

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'User not found', messageAr: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    if (targetUser.role === 'SUPER_ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Cannot block super admin', messageAr: 'لا يمكن حظر المدير الأعلى' },
        { status: 403 }
      );
    }

    if (targetUser.id === user.id) {
      return NextResponse.json(
        { success: false, message: 'Cannot block own account', messageAr: 'لا يمكن حظر حسابك الخاص' },
        { status: 400 }
      );
    }

    const blockedItems: string[] = [];

    if (blockPhone && targetUser.phone) {
      const normalizedPhone = normalizePhone(targetUser.phone);
      const phoneToBlock = normalizedPhone || targetUser.phone;
      
      await prisma.blocklist.upsert({
        where: {
          type_value: {
            type: 'PHONE',
            value: phoneToBlock,
          },
        },
        create: {
          type: 'PHONE',
          value: phoneToBlock,
          reason: reason || 'حساب متطفل',
          blockedBy: user.id,
          blockedByName: user.nameArabic,
          relatedUserId: targetUser.id,
          relatedUserName: targetUser.nameArabic,
        },
        update: {
          reason: reason || 'حساب متطفل',
          blockedBy: user.id,
          blockedByName: user.nameArabic,
          relatedUserId: targetUser.id,
          relatedUserName: targetUser.nameArabic,
        },
      });
      blockedItems.push(`رقم الجوال: ${phoneToBlock}`);
    }

    if (blockEmail) {
      await prisma.blocklist.upsert({
        where: {
          type_value: {
            type: 'EMAIL',
            value: targetUser.email.toLowerCase(),
          },
        },
        create: {
          type: 'EMAIL',
          value: targetUser.email.toLowerCase(),
          reason: reason || 'حساب متطفل',
          blockedBy: user.id,
          blockedByName: user.nameArabic,
          relatedUserId: targetUser.id,
          relatedUserName: targetUser.nameArabic,
        },
        update: {
          reason: reason || 'حساب متطفل',
          blockedBy: user.id,
          blockedByName: user.nameArabic,
          relatedUserId: targetUser.id,
          relatedUserName: targetUser.nameArabic,
        },
      });
      blockedItems.push(`البريد الإلكتروني: ${targetUser.email}`);
    }

    const previousLinkedMemberId = targetUser.linkedMemberId;

    await prisma.user.update({
      where: { id },
      data: {
        status: 'DISABLED',
        verificationStatus: 'FRAUDULENT',
        linkedMemberId: unlinkMember ? null : targetUser.linkedMemberId,
      },
    });

    await deleteUserSessions(id);

    await logAuditToDb({
      action: 'USER_BLOCK_AND_BAN',
      severity: 'CRITICAL',
      userId: user.id,
      userName: user.nameArabic,
      userRole: user.role,
      targetType: 'USER',
      targetId: targetUser.id,
      targetName: targetUser.nameArabic,
      description: `تم حظر المستخدم وإضافته للقائمة السوداء: ${targetUser.nameArabic} (${targetUser.email})`,
      previousState: {
        status: targetUser.status,
        linkedMemberId: previousLinkedMemberId,
      },
      newState: {
        status: 'DISABLED',
        linkedMemberId: unlinkMember ? null : targetUser.linkedMemberId,
        blockedItems,
      },
      details: {
        userEmail: targetUser.email,
        userPhone: targetUser.phone,
        reason,
        blockPhone,
        blockEmail,
        unlinkMember,
        blockedItems,
        previousLinkedMemberId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'User blocked and banned successfully',
      messageAr: 'تم حظر المستخدم وإضافته للقائمة السوداء بنجاح',
      blockedItems,
      unlinkedMember: unlinkMember && previousLinkedMemberId ? true : false,
    });
  } catch (error) {
    console.error('Error blocking user:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to block user', messageAr: 'فشل في حظر المستخدم' },
      { status: 500 }
    );
  }
}
