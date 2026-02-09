export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { logAuditToDb } from '@/lib/audit';

async function getAuthAdmin(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;
  const session = await findSessionByToken(token);
  if (!session) return null;
  const user = await findUserById(session.userId);
  if (!user || user.status !== 'ACTIVE') return null;
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') return null;
  return user;
}

function normalizeId(id: string): string {
  const match = id.match(/^P(\d+)$/);
  if (!match) return id;
  const num = parseInt(match[1], 10);
  return `P${num.toString().padStart(4, '0')}`;
}

function needsNormalization(id: string): boolean {
  return /^P\d+$/.test(id) && id.length < 5;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await getAuthAdmin(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const allMembers = await prisma.familyMember.findMany({
      select: { id: true },
    });

    const totalMembers = allMembers.length;
    const inconsistent = allMembers.filter((m) => needsNormalization(m.id));
    const inconsistentCount = inconsistent.length;
    const consistentCount = totalMembers - inconsistentCount;

    const inconsistentIds = inconsistent.map((m) => m.id);

    const [
      fatherIdCount,
      userLinkedCount,
      pendingFatherCount,
      changeHistoryCount,
      duplicateSourceCount,
      duplicateTargetCount,
      memberPhotoCount,
      pendingImageCount,
      invitationCodeCount,
      broadcastRecipientCount,
      gatheringAttendeeCount,
    ] = await Promise.all([
      prisma.familyMember.count({ where: { fatherId: { in: inconsistentIds } } }),
      prisma.user.count({ where: { linkedMemberId: { in: inconsistentIds } } }),
      prisma.pendingMember.count({ where: { proposedFatherId: { in: inconsistentIds } } }),
      prisma.changeHistory.count({ where: { memberId: { in: inconsistentIds } } }),
      prisma.duplicateFlag.count({ where: { sourceMemberId: { in: inconsistentIds } } }),
      prisma.duplicateFlag.count({ where: { targetMemberId: { in: inconsistentIds } } }),
      prisma.memberPhoto.count({ where: { memberId: { in: inconsistentIds } } }),
      prisma.pendingImage.count({ where: { memberId: { in: inconsistentIds } } }),
      prisma.invitationCode.count({ where: { linkedMemberId: { in: inconsistentIds } } }),
      prisma.broadcastRecipient.count({ where: { memberId: { in: inconsistentIds } } }),
      prisma.gatheringAttendee.count({ where: { memberId: { in: inconsistentIds } } }),
    ]);

    const affectedTables = {
      'FamilyMember.id': inconsistentCount,
      'FamilyMember.fatherId': fatherIdCount,
      'User.linkedMemberId': userLinkedCount,
      'PendingMember.proposedFatherId': pendingFatherCount,
      'ChangeHistory.memberId': changeHistoryCount,
      'DuplicateFlag.sourceMemberId': duplicateSourceCount,
      'DuplicateFlag.targetMemberId': duplicateTargetCount,
      'MemberPhoto.memberId': memberPhotoCount,
      'PendingImage.memberId': pendingImageCount,
      'InvitationCode.linkedMemberId': invitationCodeCount,
      'BroadcastRecipient.memberId': broadcastRecipientCount,
      'GatheringAttendee.memberId': gatheringAttendeeCount,
    };

    const preview = inconsistent.slice(0, 50).map((m) => ({
      oldId: m.id,
      newId: normalizeId(m.id),
    }));

    return NextResponse.json({
      success: true,
      totalMembers,
      inconsistentCount,
      consistentCount,
      affectedTables,
      preview,
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
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await getAuthAdmin(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    if (!body.execute) {
      return NextResponse.json(
        { success: false, message: 'Request body must include { execute: true }' },
        { status: 400 }
      );
    }

    const allMembers = await prisma.familyMember.findMany({
      select: { id: true },
    });

    const toNormalize = allMembers
      .filter((m) => needsNormalization(m.id))
      .map((m) => ({ oldId: m.id, newId: normalizeId(m.id) }));

    if (toNormalize.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No IDs need normalization',
        updated: 0,
      });
    }

    await prisma.$executeRawUnsafe(`SET session_replication_role = 'replica';`);

    try {
      for (const { oldId, newId } of toNormalize) {
        await prisma.$executeRawUnsafe(
          `UPDATE "FamilyMember" SET "fatherId" = $1 WHERE "fatherId" = $2`,
          newId, oldId
        );
        await prisma.$executeRawUnsafe(
          `UPDATE "User" SET "linkedMemberId" = $1 WHERE "linkedMemberId" = $2`,
          newId, oldId
        );
        await prisma.$executeRawUnsafe(
          `UPDATE "PendingMember" SET "proposedFatherId" = $1 WHERE "proposedFatherId" = $2`,
          newId, oldId
        );
        await prisma.$executeRawUnsafe(
          `UPDATE "ChangeHistory" SET "memberId" = $1 WHERE "memberId" = $2`,
          newId, oldId
        );
        await prisma.$executeRawUnsafe(
          `UPDATE "DuplicateFlag" SET "sourceMemberId" = $1 WHERE "sourceMemberId" = $2`,
          newId, oldId
        );
        await prisma.$executeRawUnsafe(
          `UPDATE "DuplicateFlag" SET "targetMemberId" = $1 WHERE "targetMemberId" = $2`,
          newId, oldId
        );
        await prisma.$executeRawUnsafe(
          `UPDATE "MemberPhoto" SET "memberId" = $1 WHERE "memberId" = $2`,
          newId, oldId
        );
        await prisma.$executeRawUnsafe(
          `UPDATE "PendingImage" SET "memberId" = $1 WHERE "memberId" = $2`,
          newId, oldId
        );
        await prisma.$executeRawUnsafe(
          `UPDATE "InvitationCode" SET "linkedMemberId" = $1 WHERE "linkedMemberId" = $2`,
          newId, oldId
        );
        await prisma.$executeRawUnsafe(
          `UPDATE "BroadcastRecipient" SET "memberId" = $1 WHERE "memberId" = $2`,
          newId, oldId
        );
        await prisma.$executeRawUnsafe(
          `UPDATE "GatheringAttendee" SET "memberId" = $1 WHERE "memberId" = $2`,
          newId, oldId
        );
        await prisma.$executeRawUnsafe(
          `UPDATE "FamilyMember" SET "id" = $1 WHERE "id" = $2`,
          newId, oldId
        );
      }
    } finally {
      await prisma.$executeRawUnsafe(`SET session_replication_role = 'DEFAULT';`);
    }

    await logAuditToDb({
      action: 'DATA_CLEANUP',
      severity: 'WARNING',
      userId: user.id,
      userName: user.nameArabic || user.nameEnglish || user.email,
      userRole: user.role,
      targetType: 'SYSTEM',
      description: `Normalized ${toNormalize.length} member IDs to standard P0000 format`,
      details: {
        normalizedCount: toNormalize.length,
        sample: toNormalize.slice(0, 10),
      },
      success: true,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully normalized ${toNormalize.length} member IDs`,
      updated: toNormalize.length,
      changes: toNormalize,
    });
  } catch (error) {
    console.error('Error normalizing IDs:', error);

    try {
      await prisma.$executeRawUnsafe(`SET session_replication_role = 'DEFAULT';`);
    } catch {
    }

    return NextResponse.json(
      { success: false, message: 'Failed to normalize member IDs', error: String(error) },
      { status: 500 }
    );
  }
}
