import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { logAuditToDb } from '@/lib/db-audit';
export const dynamic = "force-dynamic";

async function getAdminUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;
  const session = await findSessionByToken(token);
  if (!session) return null;
  const user = await findUserById(session.userId);
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) return null;
  return user;
}

function getStandardId(id: string): string {
  const numMatch = id.match(/^P?0*(\d+)$/i);
  if (!numMatch) return id;
  const num = parseInt(numMatch[1], 10);
  return `P${String(num).padStart(4, '0')}`;
}

function getNumericValue(id: string): number {
  const numMatch = id.match(/^P?0*(\d+)$/i);
  if (!numMatch) return Infinity;
  return parseInt(numMatch[1], 10);
}

async function countReferences(memberId: string) {
  const [
    childrenCount,
    photosCount,
    journalsPrimaryCount,
    usersCount,
    pendingMembersCount,
    duplicateSourceCount,
    duplicateTargetCount,
    changeHistoryCount,
    breastfeedingChildCount,
    breastfeedingNurseCount,
    breastfeedingMilkFatherCount,
  ] = await Promise.all([
    prisma.familyMember.count({ where: { fatherId: memberId } }),
    prisma.memberPhoto.count({ where: { memberId } }),
    prisma.familyJournal.count({ where: { primaryMemberId: memberId } }),
    prisma.user.count({ where: { linkedMemberId: memberId } }),
    prisma.pendingMember.count({ where: { proposedFatherId: memberId } }),
    prisma.duplicateFlag.count({ where: { sourceMemberId: memberId } }),
    prisma.duplicateFlag.count({ where: { targetMemberId: memberId } }),
    prisma.changeHistory.count({ where: { memberId } }),
    prisma.breastfeedingRelationship.count({ where: { childId: memberId } }),
    prisma.breastfeedingRelationship.count({ where: { nurseId: memberId } }),
    prisma.breastfeedingRelationship.count({ where: { milkFatherId: memberId } }),
  ]);

  const journalsRelated = await prisma.familyJournal.findMany({
    where: { relatedMemberIds: { not: null } },
    select: { id: true, relatedMemberIds: true },
  });
  let journalsRelatedCount = 0;
  for (const j of journalsRelated) {
    if (j.relatedMemberIds && j.relatedMemberIds.includes(memberId)) {
      journalsRelatedCount++;
    }
  }

  return {
    children: childrenCount,
    photos: photosCount,
    journalsPrimary: journalsPrimaryCount,
    journalsRelated: journalsRelatedCount,
    users: usersCount,
    pendingMembers: pendingMembersCount,
    duplicateFlags: duplicateSourceCount + duplicateTargetCount,
    changeHistory: changeHistoryCount,
    breastfeeding: breastfeedingChildCount + breastfeedingNurseCount + breastfeedingMilkFatherCount,
    total:
      childrenCount +
      photosCount +
      journalsPrimaryCount +
      journalsRelatedCount +
      usersCount +
      pendingMembersCount +
      duplicateSourceCount +
      duplicateTargetCount +
      changeHistoryCount +
      breastfeedingChildCount +
      breastfeedingNurseCount +
      breastfeedingMilkFatherCount,
  };
}

async function scanMembersNeedingFix(filterIds?: string[]) {
  const whereClause: Record<string, unknown> = { deletedAt: null };
  if (filterIds && filterIds.length > 0) {
    whereClause.id = { in: filterIds };
  }

  const members = await prisma.familyMember.findMany({
    where: whereClause,
    select: {
      id: true,
      firstName: true,
      generation: true,
    },
  });

  const needsFix: Array<{
    currentId: string;
    newId: string;
    firstName: string;
    generation: number;
    referencesCount: number;
    references: Record<string, number>;
  }> = [];

  for (const member of members) {
    const standardId = getStandardId(member.id);
    if (standardId !== member.id) {
      const refs = await countReferences(member.id);
      needsFix.push({
        currentId: member.id,
        newId: standardId,
        firstName: member.firstName,
        generation: member.generation,
        referencesCount: refs.total,
        references: {
          children: refs.children,
          photos: refs.photos,
          journalsPrimary: refs.journalsPrimary,
          journalsRelated: refs.journalsRelated,
          users: refs.users,
          pendingMembers: refs.pendingMembers,
          duplicateFlags: refs.duplicateFlags,
          changeHistory: refs.changeHistory,
          breastfeeding: refs.breastfeeding,
        },
      });
    }
  }

  needsFix.sort((a, b) => getNumericValue(a.currentId) - getNumericValue(b.currentId));

  return needsFix;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAdminUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const membersToFix = await scanMembersNeedingFix();

    const totalReferences = membersToFix.reduce((sum, m) => sum + m.referencesCount, 0);

    return NextResponse.json({
      success: true,
      summary: {
        totalMembersToFix: membersToFix.length,
        totalReferencesToUpdate: totalReferences,
      },
      members: membersToFix,
    });
  } catch (error) {
    console.error('Error scanning IDs for normalization:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to scan member IDs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAdminUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { preview = true, memberIds } = body as {
      preview?: boolean;
      memberIds?: string[];
    };

    const membersToFix = await scanMembersNeedingFix(memberIds);

    if (membersToFix.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No member IDs need normalization',
        fixed: [],
      });
    }

    const existingIds = new Set(
      (await prisma.familyMember.findMany({
        select: { id: true },
      })).map((m) => m.id)
    );

    const conflicts: string[] = [];
    for (const m of membersToFix) {
      if (existingIds.has(m.newId) && m.newId !== m.currentId) {
        const isAlsoBeingFixed = membersToFix.some(
          (other) => other.currentId === m.newId
        );
        if (!isAlsoBeingFixed) {
          conflicts.push(
            `${m.currentId} → ${m.newId} conflicts with existing member`
          );
        }
      }
    }

    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'ID conflicts detected - some target IDs already exist',
          conflicts,
          members: membersToFix,
        },
        { status: 409 }
      );
    }

    if (preview) {
      return NextResponse.json({
        success: true,
        preview: true,
        summary: {
          totalMembersToFix: membersToFix.length,
          totalReferencesToUpdate: membersToFix.reduce(
            (sum, m) => sum + m.referencesCount,
            0
          ),
        },
        members: membersToFix,
      });
    }

    const results: Array<{
      oldId: string;
      newId: string;
      firstName: string;
      referencesUpdated: number;
    }> = [];

    await prisma.$transaction(
      async (tx) => {
        for (const member of membersToFix) {
          const oldId = member.currentId;
          const newId = member.newId;

          await tx.familyMember.updateMany({
            where: { fatherId: oldId },
            data: { fatherId: newId },
          });

          await tx.memberPhoto.updateMany({
            where: { memberId: oldId },
            data: { memberId: newId },
          });

          await tx.user.updateMany({
            where: { linkedMemberId: oldId },
            data: { linkedMemberId: newId },
          });

          await tx.pendingMember.updateMany({
            where: { proposedFatherId: oldId },
            data: { proposedFatherId: newId },
          });

          await tx.familyJournal.updateMany({
            where: { primaryMemberId: oldId },
            data: { primaryMemberId: newId },
          });

          const journalsWithRelated = await tx.familyJournal.findMany({
            where: { relatedMemberIds: { not: null } },
            select: { id: true, relatedMemberIds: true },
          });
          for (const j of journalsWithRelated) {
            if (j.relatedMemberIds && j.relatedMemberIds.includes(oldId)) {
              const updated = j.relatedMemberIds.replace(
                new RegExp(oldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                newId
              );
              await tx.familyJournal.update({
                where: { id: j.id },
                data: { relatedMemberIds: updated },
              });
            }
          }

          await tx.duplicateFlag.updateMany({
            where: { sourceMemberId: oldId },
            data: { sourceMemberId: newId },
          });
          await tx.duplicateFlag.updateMany({
            where: { targetMemberId: oldId },
            data: { targetMemberId: newId },
          });

          await tx.changeHistory.updateMany({
            where: { memberId: oldId },
            data: { memberId: newId },
          });

          await tx.breastfeedingRelationship.updateMany({
            where: { childId: oldId },
            data: { childId: newId },
          });
          await tx.breastfeedingRelationship.updateMany({
            where: { nurseId: oldId },
            data: { nurseId: newId },
          });
          await tx.breastfeedingRelationship.updateMany({
            where: { milkFatherId: oldId },
            data: { milkFatherId: newId },
          });

          await tx.$executeRaw`UPDATE "FamilyMember" SET id = ${newId} WHERE id = ${oldId}`;

          results.push({
            oldId,
            newId,
            firstName: member.firstName,
            referencesUpdated: member.referencesCount,
          });
        }
      },
      { timeout: 60000 }
    );

    await logAuditToDb({
      action: 'NORMALIZE_MEMBER_IDS',
      severity: 'WARNING',
      userId: user.id,
      userName: user.nameArabic || user.nameEnglish || user.email,
      userRole: user.role,
      targetType: 'MEMBER',
      description: `Normalized ${results.length} member IDs to standard format`,
      details: {
        mappings: results.map((r) => ({
          oldId: r.oldId,
          newId: r.newId,
          firstName: r.firstName,
        })),
        totalReferencesUpdated: results.reduce(
          (sum, r) => sum + r.referencesUpdated,
          0
        ),
      },
      impactedIds: results.flatMap((r) => [r.oldId, r.newId]),
    });

    return NextResponse.json({
      success: true,
      message: `Successfully normalized ${results.length} member IDs`,
      summary: {
        totalFixed: results.length,
        totalReferencesUpdated: results.reduce(
          (sum, r) => sum + r.referencesUpdated,
          0
        ),
      },
      results,
    });
  } catch (error) {
    console.error('Error fixing member IDs:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? `Failed to fix member IDs: ${error.message}`
            : 'Failed to fix member IDs',
      },
      { status: 500 }
    );
  }
}
