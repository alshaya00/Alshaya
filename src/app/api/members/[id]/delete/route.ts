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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized', messageAr: 'غير مصرح' }, { status: 401 });
    }

    const permissions = getPermissionsForRole(user.role);
    if (!permissions.edit_member) {
      return NextResponse.json({ success: false, message: 'No permission', messageAr: 'لا تملك صلاحية لهذا الإجراء' }, { status: 403 });
    }

    const idVariants = getMemberIdVariants(params.id);
    const body = await request.json();
    const { reason, mergedIntoId, force, forceOverride } = body;

    const member = await prisma.familyMember.findFirst({
      where: { id: { in: idVariants } },
    });

    if (!member) {
      return NextResponse.json({ success: false, message: 'Member not found', messageAr: 'العضو غير موجود' }, { status: 404 });
    }

    const id = member.id;
    const memberIdVariants = getMemberIdVariants(id);

    if (member.deletedAt) {
      return NextResponse.json({ success: false, message: 'Member already deleted', messageAr: 'العضو محذوف بالفعل' }, { status: 400 });
    }

    const pendingMerge = await prisma.duplicateFlag.findFirst({
      where: {
        status: 'PENDING',
        OR: [
          { sourceMemberId: { in: memberIdVariants } },
          { targetMemberId: { in: memberIdVariants } },
        ],
      },
    });

    if (pendingMerge && !forceOverride) {
      return NextResponse.json({
        success: false,
        message: 'Cannot delete: member is involved in a pending merge operation',
        messageAr: 'لا يمكن حذف هذا العضو لأنه مشترك في عملية دمج معلقة. استخدم خيار التجاوز الإداري للمتابعة.',
        pendingMergeId: pendingMerge.id,
      }, { status: 400 });
    }

    const linkedUser = await prisma.user.findFirst({
      where: { linkedMemberId: { in: memberIdVariants } },
      select: { id: true, email: true, nameArabic: true },
    });

    if (linkedUser && !forceOverride) {
      return NextResponse.json({
        success: false,
        message: `Cannot delete: this member is linked to user account "${linkedUser.email}". Use force override or unlink the account first.`,
        messageAr: `لا يمكن الحذف: هذا العضو مرتبط بحساب المستخدم "${linkedUser.nameArabic}". استخدم خيار التجاوز الإداري أو قم بفك الارتباط أولاً.`,
        linkedUser: { id: linkedUser.id, email: linkedUser.email, name: linkedUser.nameArabic },
      }, { status: 400 });
    }

    const children = await prisma.familyMember.findMany({
      where: {
        fatherId: { in: memberIdVariants },
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        fullNameAr: true,
        gender: true,
      },
    });

    const childrenCount = children.length;

    if (childrenCount > 0 && !force && !mergedIntoId) {
      const childrenNames = children.slice(0, 5).map(c => c.fullNameAr || c.firstName);
      return NextResponse.json({
        success: false,
        warning: true,
        hasChildren: true,
        childrenCount,
        childrenNames,
        message: `This member has ${childrenCount} children. Proceed with deletion?`,
        messageAr: `هذا العضو لديه ${childrenCount} أبناء. هل تريد المتابعة؟`,
      }, { status: 200 });
    }

    const fullSnapshot = JSON.stringify(member);
    const overrideActions: string[] = [];

    let resolvedMergeTargetId = mergedIntoId;
    let mergeTransferSummary: Record<string, unknown> | null = null;

    if (mergedIntoId) {
      const mergeTargetVariants = getMemberIdVariants(mergedIntoId);
      const mergeTarget = await prisma.familyMember.findFirst({
        where: { id: { in: mergeTargetVariants }, deletedAt: null },
      });
      if (!mergeTarget) {
        return NextResponse.json({
          success: false,
          message: 'Merge target member not found',
          messageAr: 'العضو المستهدف للدمج غير موجود أو محذوف',
        }, { status: 404 });
      }
      resolvedMergeTargetId = mergeTarget.id;

      const relatedOrConditions = memberIdVariants.map(v => ({ relatedMemberIds: { contains: v } }));

      const [photos, journalsPrimary, journalsRelated, breastfeedingAsChild, breastfeedingAsNurse, breastfeedingAsMilkFather, targetLinkedUser, pendingMembers] = await Promise.all([
        prisma.memberPhoto.findMany({
          where: { memberId: { in: memberIdVariants } },
          select: { id: true },
        }),
        prisma.familyJournal.findMany({
          where: { primaryMemberId: { in: memberIdVariants } },
          select: { id: true },
        }),
        prisma.familyJournal.findMany({
          where: { OR: relatedOrConditions },
          select: { id: true, relatedMemberIds: true },
        }),
        prisma.breastfeedingRelationship.findMany({
          where: { childId: { in: memberIdVariants } },
          select: { id: true },
        }),
        prisma.breastfeedingRelationship.findMany({
          where: { nurseId: { in: memberIdVariants } },
          select: { id: true },
        }),
        prisma.breastfeedingRelationship.findMany({
          where: { milkFatherId: { in: memberIdVariants } },
          select: { id: true },
        }),
        prisma.user.findFirst({
          where: { linkedMemberId: resolvedMergeTargetId },
          select: { id: true },
        }),
        prisma.pendingMember.findMany({
          where: { proposedFatherId: { in: memberIdVariants } },
          select: { id: true },
        }),
      ]);

      const breastfeedingTotal = breastfeedingAsChild.length + breastfeedingAsNurse.length + breastfeedingAsMilkFather.length;

      mergeTransferSummary = {
        childrenMoved: children.map(c => c.id),
        photosTransferred: photos.length,
        journalsUpdated: journalsPrimary.length + journalsRelated.length,
        breastfeedingUpdated: breastfeedingTotal,
        linkedUserTransferred: (linkedUser && !targetLinkedUser) ? linkedUser.id : null,
        pendingMembersUpdated: pendingMembers.length,
      };

      await prisma.$transaction(async (tx) => {
        if (forceOverride && pendingMerge) {
          await tx.duplicateFlag.updateMany({
            where: {
              status: 'PENDING',
              OR: [
                { sourceMemberId: { in: memberIdVariants } },
                { targetMemberId: { in: memberIdVariants } },
              ],
            },
            data: {
              status: 'DISMISSED',
              resolvedBy: user.id,
              resolvedAt: new Date(),
              resolution: 'تم رفضه تلقائياً بسبب حذف/دمج العضو بتجاوز إداري',
            },
          });
          overrideActions.push('dismissed_pending_duplicates');
        }

        if (forceOverride && linkedUser) {
          if (!targetLinkedUser) {
            await tx.user.update({
              where: { id: linkedUser.id },
              data: { linkedMemberId: resolvedMergeTargetId },
            });
          } else {
            await tx.user.update({
              where: { id: linkedUser.id },
              data: { linkedMemberId: null },
            });
          }
          overrideActions.push('unlinked_user');
        }

        await tx.familyMember.updateMany({
          where: {
            fatherId: { in: memberIdVariants },
            deletedAt: null,
          },
          data: { fatherId: resolvedMergeTargetId },
        });

        if (photos.length > 0) {
          await tx.memberPhoto.updateMany({
            where: { memberId: { in: memberIdVariants } },
            data: { memberId: resolvedMergeTargetId },
          });
        }

        if (journalsPrimary.length > 0) {
          await tx.familyJournal.updateMany({
            where: { primaryMemberId: { in: memberIdVariants } },
            data: { primaryMemberId: resolvedMergeTargetId },
          });
        }

        for (const journal of journalsRelated) {
          if (journal.relatedMemberIds) {
            let updatedIds = journal.relatedMemberIds;
            for (const variant of memberIdVariants) {
              updatedIds = updatedIds.split(variant).join(resolvedMergeTargetId);
            }
            await tx.familyJournal.update({
              where: { id: journal.id },
              data: { relatedMemberIds: updatedIds },
            });
          }
        }

        if (breastfeedingAsChild.length > 0) {
          await tx.breastfeedingRelationship.updateMany({
            where: { childId: { in: memberIdVariants } },
            data: { childId: resolvedMergeTargetId },
          });
        }

        if (breastfeedingAsNurse.length > 0) {
          await tx.breastfeedingRelationship.updateMany({
            where: { nurseId: { in: memberIdVariants } },
            data: { nurseId: resolvedMergeTargetId },
          });
        }

        if (breastfeedingAsMilkFather.length > 0) {
          await tx.breastfeedingRelationship.updateMany({
            where: { milkFatherId: { in: memberIdVariants } },
            data: { milkFatherId: resolvedMergeTargetId },
          });
        }

        if (pendingMembers.length > 0) {
          await tx.pendingMember.updateMany({
            where: { proposedFatherId: { in: memberIdVariants } },
            data: { proposedFatherId: resolvedMergeTargetId },
          });
        }

        const sonsCount = await tx.familyMember.count({
          where: {
            fatherId: resolvedMergeTargetId,
            deletedAt: null,
            gender: { in: ['MALE', 'Male', 'male'] },
          },
        });
        const daughtersCount = await tx.familyMember.count({
          where: {
            fatherId: resolvedMergeTargetId,
            deletedAt: null,
            gender: { in: ['FEMALE', 'Female', 'female'] },
          },
        });

        await tx.familyMember.update({
          where: { id: resolvedMergeTargetId },
          data: { sonsCount, daughtersCount },
        });

        const mergeReason = reason || `تم الدمج في ${resolvedMergeTargetId}`;
        const mergeSnapshot = JSON.stringify({
          memberData: JSON.parse(fullSnapshot),
          transferSummary: mergeTransferSummary,
          overrideActions,
        });

        await tx.familyMember.update({
          where: { id },
          data: {
            deletedAt: new Date(),
            deletedBy: user.id,
            deletedReason: mergeReason,
          },
        });

        await tx.changeHistory.create({
          data: {
            memberId: id,
            fieldName: 'deletedAt',
            oldValue: null,
            newValue: new Date().toISOString(),
            changeType: 'DELETE',
            changedBy: user.id,
            changedByName: user.nameArabic,
            fullSnapshot: mergeSnapshot,
            reason: mergeReason,
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: 'Member merged and deleted successfully',
        messageAr: 'تم دمج وحذف العضو بنجاح',
        mergedIntoId: resolvedMergeTargetId,
        transferSummary: mergeTransferSummary,
      });
    }

    await prisma.$transaction(async (tx) => {
      if (forceOverride && pendingMerge) {
        await tx.duplicateFlag.updateMany({
          where: {
            status: 'PENDING',
            OR: [
              { sourceMemberId: id },
              { targetMemberId: id },
            ],
          },
          data: {
            status: 'DISMISSED',
            resolvedBy: user.id,
            resolvedAt: new Date(),
            resolution: 'تم رفضه تلقائياً بسبب حذف العضو بتجاوز إداري',
          },
        });
        overrideActions.push('dismissed_pending_duplicates');
      }

      if (forceOverride && linkedUser) {
        await tx.user.update({
          where: { id: linkedUser.id },
          data: { linkedMemberId: null },
        });
        overrideActions.push('unlinked_user');
      }

      const deleteReason = reason || 'حذف يدوي';
      const deleteSnapshot = JSON.stringify({
        memberData: JSON.parse(fullSnapshot),
        overrideActions,
      });

      await tx.familyMember.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedBy: user.id,
          deletedReason: deleteReason,
        },
      });

      await tx.changeHistory.create({
        data: {
          memberId: id,
          fieldName: 'deletedAt',
          oldValue: null,
          newValue: new Date().toISOString(),
          changeType: 'DELETE',
          changedBy: user.id,
          changedByName: user.nameArabic,
          fullSnapshot: deleteSnapshot,
          reason: deleteReason,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Member deleted successfully',
      messageAr: 'تم حذف العضو بنجاح',
    });
  } catch (error) {
    console.error('Error deleting member:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to delete member',
      messageAr: 'فشل في حذف العضو. يرجى المحاولة مرة أخرى.',
    }, { status: 500 });
  }
}
