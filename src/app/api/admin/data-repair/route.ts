import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { logAuditToDb } from '@/lib/audit';
import { v4 as uuidv4 } from 'uuid';
import { normalizeMemberId, getMemberIdVariants } from '@/lib/utils';
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

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const permissions = getPermissionsForRole(user.role);
    const hasPermission = 
      user.role === 'SUPER_ADMIN' || 
      user.role === 'ADMIN' ||
      permissions.edit_member;

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const body = await request.json();
    if (body.memberId) body.memberId = normalizeMemberId(body.memberId) || body.memberId;
    if (body.newFatherId) body.newFatherId = normalizeMemberId(body.newFatherId) || body.newFatherId;
    if (body.fatherId) body.fatherId = normalizeMemberId(body.fatherId) || body.fatherId;
    const { action } = body;
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const changeId = uuidv4();

    if (action === 'link-user-to-member') {
      const { userId, memberId } = body;

      if (!userId || !memberId) {
        return NextResponse.json(
          { success: false, message: 'Missing userId or memberId' },
          { status: 400 }
        );
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, nameArabic: true, linkedMemberId: true },
      });

      if (!targetUser) {
        return NextResponse.json(
          { success: false, message: 'User not found' },
          { status: 404 }
        );
      }

      const member = await prisma.familyMember.findUnique({
        where: { id: memberId },
        select: { id: true, firstName: true, fullNameAr: true },
      });

      if (!member) {
        return NextResponse.json(
          { success: false, message: 'Member not found' },
          { status: 404 }
        );
      }

      const previousState = {
        userId: targetUser.id,
        linkedMemberId: targetUser.linkedMemberId,
      };

      await prisma.user.update({
        where: { id: userId },
        data: { linkedMemberId: memberId },
      });

      const newState = {
        userId: targetUser.id,
        linkedMemberId: memberId,
      };

      await logAuditToDb({
        action: 'DATA_REPAIR_LINK_USER',
        severity: 'WARNING',
        userId: user.id,
        userName: user.email,
        userRole: user.role,
        targetType: 'USER',
        targetId: userId,
        targetName: targetUser.nameArabic,
        description: `Linked user ${targetUser.email} to member ${member.fullNameAr || member.firstName}`,
        details: { changeId, action: 'link-user-to-member', userId, memberId },
        previousState,
        newState,
        ipAddress,
        success: true,
      });

      return NextResponse.json({
        success: true,
        changeId,
        message: 'User linked to member successfully',
        messageAr: 'تم ربط المستخدم بالعضو بنجاح',
      });
    }

    if (action === 'set-member-parent') {
      const { memberId, newFatherId } = body;

      if (!memberId || !newFatherId) {
        return NextResponse.json(
          { success: false, message: 'Missing memberId or newFatherId' },
          { status: 400 }
        );
      }

      const member = await prisma.familyMember.findUnique({
        where: { id: memberId },
        select: { id: true, firstName: true, fullNameAr: true, fatherId: true, generation: true },
      });

      if (!member) {
        return NextResponse.json(
          { success: false, message: 'Member not found' },
          { status: 404 }
        );
      }

      const newFather = await prisma.familyMember.findUnique({
        where: { id: newFatherId },
        select: { id: true, firstName: true, fullNameAr: true, generation: true },
      });

      if (!newFather) {
        return NextResponse.json(
          { success: false, message: 'New father not found' },
          { status: 404 }
        );
      }

      const previousState = {
        memberId: member.id,
        fatherId: member.fatherId,
        generation: member.generation,
      };

      const newGeneration = newFather.generation ? newFather.generation + 1 : member.generation;

      await prisma.familyMember.update({
        where: { id: memberId },
        data: { 
          fatherId: newFatherId,
          generation: newGeneration,
        },
      });

      const newState = {
        memberId: member.id,
        fatherId: newFatherId,
        generation: newGeneration,
      };

      await logAuditToDb({
        action: 'DATA_REPAIR_SET_PARENT',
        severity: 'WARNING',
        userId: user.id,
        userName: user.email,
        userRole: user.role,
        targetType: 'FAMILY_MEMBER',
        targetId: memberId,
        targetName: member.fullNameAr || member.firstName,
        description: `Set parent of ${member.fullNameAr || member.firstName} to ${newFather.fullNameAr || newFather.firstName}`,
        details: { changeId, action: 'set-member-parent', memberId, newFatherId },
        previousState,
        newState,
        ipAddress,
        success: true,
      });

      return NextResponse.json({
        success: true,
        changeId,
        message: 'Member parent updated successfully',
        messageAr: 'تم تحديث والد العضو بنجاح',
      });
    }

    if (action === 'create-member-for-user') {
      const { userId, nameAr, nameEn, gender } = body;
      let { fatherId } = body;

      if (!userId || !nameAr || !fatherId || !gender) {
        return NextResponse.json(
          { success: false, message: 'Missing required fields (userId, nameAr, fatherId, gender)' },
          { status: 400 }
        );
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, nameArabic: true, linkedMemberId: true },
      });

      if (!targetUser) {
        return NextResponse.json(
          { success: false, message: 'User not found' },
          { status: 404 }
        );
      }

      if (targetUser.linkedMemberId) {
        return NextResponse.json(
          { success: false, message: 'User already linked to a member' },
          { status: 400 }
        );
      }

      const fatherVariants = getMemberIdVariants(fatherId);
      let father = null;
      for (const variant of fatherVariants) {
        father = await prisma.familyMember.findUnique({
          where: { id: variant },
          select: { id: true, firstName: true, fullNameAr: true, generation: true, familyName: true },
        });
        if (father) {
          fatherId = variant;
          break;
        }
      }

      if (!father) {
        return NextResponse.json(
          { success: false, message: 'Father not found' },
          { status: 404 }
        );
      }

      const previousState = {
        userId: targetUser.id,
        linkedMemberId: null,
      };

      const newMemberId = uuidv4();
      const generation = father.generation ? father.generation + 1 : 2;

      await prisma.familyMember.create({
        data: {
          id: newMemberId,
          firstName: nameAr,
          fullNameAr: nameAr,
          fullNameEn: nameEn || null,
          fatherId,
          gender,
          generation,
          familyName: father.familyName || 'آل شايع',
          createdBy: user.id,
        },
      });

      await prisma.user.update({
        where: { id: userId },
        data: { linkedMemberId: newMemberId },
      });

      const newState = {
        userId: targetUser.id,
        linkedMemberId: newMemberId,
        member: {
          id: newMemberId,
          firstName: nameAr,
          fullNameAr: nameAr,
          fullNameEn: nameEn || null,
          fatherId,
          gender,
          generation,
        },
      };

      await logAuditToDb({
        action: 'DATA_REPAIR_CREATE_MEMBER',
        severity: 'WARNING',
        userId: user.id,
        userName: user.email,
        userRole: user.role,
        targetType: 'FAMILY_MEMBER',
        targetId: newMemberId,
        targetName: nameAr,
        description: `Created member ${nameAr} and linked to user ${targetUser.email}`,
        details: { changeId, action: 'create-member-for-user', userId, newMemberId, fatherId },
        previousState,
        newState,
        ipAddress,
        success: true,
      });

      return NextResponse.json({
        success: true,
        changeId,
        memberId: newMemberId,
        message: 'Member created and linked successfully',
        messageAr: 'تم إنشاء العضو وربطه بنجاح',
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in data repair:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to repair data', messageAr: 'فشل في إصلاح البيانات' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const permissions = getPermissionsForRole(user.role);
    const hasPermission = 
      user.role === 'SUPER_ADMIN' || 
      user.role === 'ADMIN' ||
      permissions.edit_member;

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { changeId } = body;
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';

    if (!changeId) {
      return NextResponse.json(
        { success: false, message: 'Missing changeId' },
        { status: 400 }
      );
    }

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        details: {
          path: ['changeId'],
          equals: changeId,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!auditLog) {
      return NextResponse.json(
        { success: false, message: 'Change not found in audit log' },
        { status: 404 }
      );
    }

    const previousState = auditLog.previousState as Record<string, unknown> | null;
    const details = auditLog.details as Record<string, unknown> | null;
    const action = details?.action as string;

    if (!previousState) {
      return NextResponse.json(
        { success: false, message: 'No previous state found for rollback' },
        { status: 400 }
      );
    }

    if (action === 'link-user-to-member') {
      const userId = previousState.userId as string;
      const previousLinkedMemberId = previousState.linkedMemberId as string | null;

      await prisma.user.update({
        where: { id: userId },
        data: { linkedMemberId: previousLinkedMemberId },
      });

      await logAuditToDb({
        action: 'DATA_REPAIR_ROLLBACK',
        severity: 'WARNING',
        userId: user.id,
        userName: user.email,
        userRole: user.role,
        targetType: 'USER',
        targetId: userId,
        description: `Rolled back link-user-to-member change (changeId: ${changeId})`,
        details: { originalChangeId: changeId, action: 'rollback-link-user-to-member' },
        previousState: auditLog.newState as Record<string, unknown>,
        newState: previousState,
        ipAddress,
        success: true,
      });
    } else if (action === 'set-member-parent') {
      const memberId = previousState.memberId as string;
      const previousFatherId = previousState.fatherId as string | null;
      const previousGeneration = previousState.generation as number | null;

      await prisma.familyMember.update({
        where: { id: memberId },
        data: { 
          fatherId: previousFatherId,
          generation: previousGeneration,
        },
      });

      await logAuditToDb({
        action: 'DATA_REPAIR_ROLLBACK',
        severity: 'WARNING',
        userId: user.id,
        userName: user.email,
        userRole: user.role,
        targetType: 'FAMILY_MEMBER',
        targetId: memberId,
        description: `Rolled back set-member-parent change (changeId: ${changeId})`,
        details: { originalChangeId: changeId, action: 'rollback-set-member-parent' },
        previousState: auditLog.newState as Record<string, unknown>,
        newState: previousState,
        ipAddress,
        success: true,
      });
    } else if (action === 'create-member-for-user') {
      const userId = previousState.userId as string;
      const newState = auditLog.newState as Record<string, unknown>;
      const memberId = (newState?.member as Record<string, unknown>)?.id as string;

      if (memberId) {
        await prisma.user.update({
          where: { id: userId },
          data: { linkedMemberId: null },
        });

        await prisma.familyMember.delete({
          where: { id: memberId },
        });
      }

      await logAuditToDb({
        action: 'DATA_REPAIR_ROLLBACK',
        severity: 'WARNING',
        userId: user.id,
        userName: user.email,
        userRole: user.role,
        targetType: 'FAMILY_MEMBER',
        targetId: memberId,
        description: `Rolled back create-member-for-user change (changeId: ${changeId})`,
        details: { originalChangeId: changeId, action: 'rollback-create-member-for-user', deletedMemberId: memberId },
        previousState: newState,
        newState: previousState,
        ipAddress,
        success: true,
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'Unknown action type for rollback' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Rollback completed successfully',
      messageAr: 'تم التراجع بنجاح',
    });
  } catch (error) {
    console.error('Error in data repair rollback:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to rollback change', messageAr: 'فشل في التراجع عن التغيير' },
      { status: 500 }
    );
  }
}
