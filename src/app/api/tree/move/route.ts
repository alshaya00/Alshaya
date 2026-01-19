import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { getMemberByIdFromDb, getAllMembersFromDb, updateMemberInDb } from '@/lib/db';
import { randomUUID } from 'crypto';
import { isMale } from '@/lib/utils';

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

async function isDescendant(potentialDescendantId: string, ancestorId: string): Promise<boolean> {
  const allMembers = await getAllMembersFromDb();
  const visited = new Set<string>();
  const queue = [ancestorId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const children = allMembers.filter(m => m.fatherId === currentId);
    for (const child of children) {
      if (child.id === potentialDescendantId) {
        return true;
      }
      queue.push(child.id);
    }
  }

  return false;
}

async function calculateGeneration(parentId: string | null): Promise<number> {
  if (!parentId) return 1;

  const parent = await getMemberByIdFromDb(parentId);
  if (!parent) return 1;

  return (parent.generation || 1) + 1;
}

async function updateDescendantGenerations(
  tx: Prisma.TransactionClient,
  memberId: string,
  newGeneration: number
): Promise<number> {
  let updated = 0;
  const children = await tx.familyMember.findMany({
    where: { fatherId: memberId },
    select: { id: true },
  });

  for (const child of children) {
    await tx.familyMember.update({
      where: { id: child.id },
      data: { generation: newGeneration + 1 },
    });
    updated++;
    updated += await updateDescendantGenerations(tx, child.id, newGeneration + 1);
  }

  return updated;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN' && user.role !== 'BRANCH_LEADER') {
      return NextResponse.json(
        { success: false, message: 'No permission to move members' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { memberId, newParentId, updateGenerations = true } = body;

    if (!memberId) {
      return NextResponse.json(
        { success: false, message: 'memberId is required' },
        { status: 400 }
      );
    }

    const member = await getMemberByIdFromDb(memberId);
    if (!member) {
      return NextResponse.json(
        { success: false, message: 'Member not found' },
        { status: 404 }
      );
    }

    if (user.role === 'BRANCH_LEADER' && user.assignedBranch) {
      if (member.branch !== user.assignedBranch) {
        return NextResponse.json(
          { success: false, message: 'You can only move members in your branch' },
          { status: 403 }
        );
      }
    }

    if (newParentId) {
      const newParent = await getMemberByIdFromDb(newParentId);
      if (!newParent) {
        return NextResponse.json(
          { success: false, message: 'New parent not found' },
          { status: 404 }
        );
      }

      if (!isMale(newParent.gender)) {
        return NextResponse.json(
          { success: false, message: 'Parent must be male (father)' },
          { status: 400 }
        );
      }

      if (await isDescendant(newParentId, memberId)) {
        return NextResponse.json(
          { success: false, message: 'Cannot set a descendant as parent (would create cycle)' },
          { status: 400 }
        );
      }

      if (newParentId === memberId) {
        return NextResponse.json(
          { success: false, message: 'Cannot set self as parent' },
          { status: 400 }
        );
      }
    }

    const oldParentId = member.fatherId;
    const newGeneration = await calculateGeneration(newParentId);
    const batchId = randomUUID();

    try {
      const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.changeHistory.create({
          data: {
            memberId,
            fieldName: 'fatherId',
            oldValue: oldParentId || null,
            newValue: newParentId || null,
            changeType: 'PARENT_CHANGE',
            changedBy: user.id,
            changedByName: user.nameArabic,
            batchId,
            fullSnapshot: JSON.stringify(member),
            reason: `Moved via tree editor from ${oldParentId || 'root'} to ${newParentId || 'root'}`,
          },
        });

        const updateData: Record<string, unknown> = {
          fatherId: newParentId || null,
        };

        if (updateGenerations && newGeneration !== member.generation) {
          updateData.generation = newGeneration;

          await tx.changeHistory.create({
            data: {
              memberId,
              fieldName: 'generation',
              oldValue: String(member.generation || 1),
              newValue: String(newGeneration),
              changeType: 'UPDATE',
              changedBy: user.id,
              changedByName: user.nameArabic,
              batchId,
            },
          });
        }

        const updatedMember = await tx.familyMember.update({
          where: { id: memberId },
          data: updateData,
        });

        if (oldParentId) {
          const countField = member.gender?.toUpperCase() === 'MALE' ? 'sonsCount' : 'daughtersCount';
          await tx.familyMember.update({
            where: { id: oldParentId },
            data: {
              [countField]: { decrement: 1 },
            },
          }).catch(() => {});
        }

        if (newParentId) {
          const countField = member.gender?.toUpperCase() === 'MALE' ? 'sonsCount' : 'daughtersCount';
          await tx.familyMember.update({
            where: { id: newParentId },
            data: {
              [countField]: { increment: 1 },
            },
          }).catch(() => {});
        }

        let descendantsUpdated = 0;
        if (updateGenerations) {
          descendantsUpdated = await updateDescendantGenerations(tx, memberId, newGeneration);
        }

        return {
          member: updatedMember,
          descendantsUpdated,
        };
      });

      return NextResponse.json({
        success: true,
        message: 'Member moved successfully',
        messageAr: 'تم نقل العضو بنجاح',
        member: result.member,
        changes: {
          oldParentId,
          newParentId,
          oldGeneration: member.generation,
          newGeneration,
          descendantsUpdated: result.descendantsUpdated,
        },
        batchId,
      });
    } catch (dbError) {
      console.error('Database error during move:', dbError);

      const updated = await updateMemberInDb(memberId, {
        fatherId: newParentId || null,
        generation: newGeneration,
      });

      if (!updated) {
        return NextResponse.json(
          { success: false, message: 'Failed to move member' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Member moved successfully',
        member: updated,
      });
    }
  } catch (error) {
    console.error('Error moving member:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to move member' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Admin required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { moves } = body;

    if (!Array.isArray(moves) || moves.length === 0) {
      return NextResponse.json(
        { success: false, message: 'moves array is required' },
        { status: 400 }
      );
    }

    if (moves.length > 50) {
      return NextResponse.json(
        { success: false, message: 'Maximum 50 moves per batch' },
        { status: 400 }
      );
    }

    const batchId = randomUUID();
    const results: Array<{ memberId: string; success: boolean; error?: string }> = [];

    for (const move of moves) {
      const { memberId, newParentId } = move;

      if (!memberId) {
        results.push({ memberId: 'unknown', success: false, error: 'memberId is required' });
        continue;
      }

      const member = await getMemberByIdFromDb(memberId);
      if (!member) {
        results.push({ memberId, success: false, error: 'Member not found' });
        continue;
      }

      if (newParentId) {
        const newParent = await getMemberByIdFromDb(newParentId);
        if (!newParent) {
          results.push({ memberId, success: false, error: 'New parent not found' });
          continue;
        }

        if (!isMale(newParent.gender)) {
          results.push({ memberId, success: false, error: 'Parent must be male' });
          continue;
        }

        if (await isDescendant(newParentId, memberId)) {
          results.push({ memberId, success: false, error: 'Would create cycle' });
          continue;
        }
      }

      results.push({ memberId, success: true });
    }

    const validMoves = moves.filter((_, i) => results[i].success);

    if (validMoves.length > 0) {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        for (const move of validMoves) {
          const member = await getMemberByIdFromDb(move.memberId);
          if (!member) continue;
          
          const newGeneration = await calculateGeneration(move.newParentId);

          await tx.changeHistory.create({
            data: {
              memberId: move.memberId,
              fieldName: 'fatherId',
              oldValue: member.fatherId || null,
              newValue: move.newParentId || null,
              changeType: 'PARENT_CHANGE',
              changedBy: user.id,
              changedByName: user.nameArabic,
              batchId,
              reason: 'Batch move via tree editor',
            },
          });

          await tx.familyMember.update({
            where: { id: move.memberId },
            data: {
              fatherId: move.newParentId || null,
              generation: newGeneration,
            },
          });
        }
      });
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Batch move completed: ${successCount} succeeded, ${failCount} failed`,
      messageAr: `تمت العملية: ${successCount} نجحت، ${failCount} فشلت`,
      results,
      batchId,
    });
  } catch (error) {
    console.error('Error in batch move:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to execute batch move' },
      { status: 500 }
    );
  }
}
