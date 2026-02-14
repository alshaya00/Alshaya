import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { getMemberIdVariants } from '@/lib/utils';

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
      return NextResponse.json({ success: false, message: 'Unauthorized', messageAr: 'غير مصرح' }, { status: 401 });
    }

    const permissions = getPermissionsForRole(user.role);
    if (!permissions.edit_member) {
      return NextResponse.json({ success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' }, { status: 403 });
    }

    const body = await request.json();
    const { memberId } = body;

    if (!memberId) {
      return NextResponse.json({ success: false, message: 'memberId is required', messageAr: 'معرف العضو مطلوب' }, { status: 400 });
    }

    const idVariants = getMemberIdVariants(memberId);
    const member = await prisma.familyMember.findFirst({
      where: { id: { in: idVariants } },
    });

    if (!member) {
      return NextResponse.json({ success: false, message: 'Member not found', messageAr: 'العضو غير موجود' }, { status: 404 });
    }

    if (!member.deletedAt) {
      return NextResponse.json({ success: false, message: 'Member is not deleted', messageAr: 'العضو غير محذوف' }, { status: 400 });
    }

    const changeRecord = await prisma.changeHistory.findFirst({
      where: {
        memberId: member.id,
        changeType: { in: ['DELETE', 'MERGE'] },
        fullSnapshot: { not: null },
      },
      orderBy: { changedAt: 'desc' },
    });

    let childrenRestored = 0;

    if (changeRecord?.fullSnapshot) {
      try {
        const snapshot = JSON.parse(changeRecord.fullSnapshot);

        if (snapshot.transferSummary && snapshot.mergeTarget) {
          await prisma.familyMember.update({
            where: { id: member.id },
            data: {
              deletedAt: null,
              deletedBy: null,
              deletedReason: null,
            },
          });

          if (snapshot.transferSummary.childrenMoved && Array.isArray(snapshot.transferSummary.childrenMoved)) {
            const childIds = snapshot.transferSummary.childrenMoved;
            for (const childId of childIds) {
              const childVariants = getMemberIdVariants(childId);
              await prisma.familyMember.updateMany({
                where: {
                  id: { in: childVariants },
                  fatherId: { in: getMemberIdVariants(snapshot.mergeTarget) },
                },
                data: { fatherId: member.id },
              });
            }
            childrenRestored = childIds.length;
          }
        } else {
          await prisma.familyMember.update({
            where: { id: member.id },
            data: {
              deletedAt: null,
              deletedBy: null,
              deletedReason: null,
            },
          });
        }
      } catch {
        await prisma.familyMember.update({
          where: { id: member.id },
          data: {
            deletedAt: null,
            deletedBy: null,
            deletedReason: null,
          },
        });
      }
    } else {
      await prisma.familyMember.update({
        where: { id: member.id },
        data: {
          deletedAt: null,
          deletedBy: null,
          deletedReason: null,
        },
      });
    }

    await prisma.changeHistory.create({
      data: {
        memberId: member.id,
        fieldName: 'deletedAt',
        oldValue: member.deletedAt.toISOString(),
        newValue: null,
        changeType: 'RESTORE',
        changedBy: user.id,
        changedByName: user.nameArabic,
        reason: `Undo merge/delete - children restored: ${childrenRestored}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Member restored',
      messageAr: 'تم استعادة العضو بنجاح',
      childrenRestored,
    });
  } catch (error) {
    console.error('Error undoing merge:', error);
    return NextResponse.json({ success: false, message: 'Failed to undo merge', messageAr: 'فشل في التراجع عن الدمج' }, { status: 500 });
  }
}
