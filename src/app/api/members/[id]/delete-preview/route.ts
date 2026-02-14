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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const permissions = getPermissionsForRole(user.role);
    if (!permissions.edit_member) {
      return NextResponse.json({ success: false, message: 'No permission' }, { status: 403 });
    }

    const idVariants = getMemberIdVariants(params.id);

    const member = await prisma.familyMember.findFirst({
      where: { id: { in: idVariants } },
      select: {
        id: true,
        firstName: true,
        fullNameAr: true,
        deletedAt: true,
      },
    });

    if (!member) {
      return NextResponse.json({ success: false, message: 'Member not found' }, { status: 404 });
    }

    if (member.deletedAt) {
      return NextResponse.json({ success: false, message: 'Member already deleted' }, { status: 400 });
    }

    const memberIdVariants = getMemberIdVariants(member.id);

    const [children, photos, journals, linkedUsers, breastfeeding, pendingFlags, pendingMembers] = await Promise.all([
      prisma.familyMember.findMany({
        where: {
          fatherId: { in: memberIdVariants },
          deletedAt: null,
        },
        select: {
          id: true,
          firstName: true,
          fullNameAr: true,
        },
      }),
      prisma.memberPhoto.count({
        where: {
          memberId: { in: memberIdVariants },
        },
      }),
      prisma.familyJournal.findMany({
        where: {
          OR: [
            { primaryMemberId: { in: memberIdVariants } },
            { narratorId: { in: memberIdVariants } },
          ],
        },
        select: {
          id: true,
          titleAr: true,
        },
      }),
      prisma.user.findMany({
        where: {
          linkedMemberId: { in: memberIdVariants },
        },
        select: {
          id: true,
          email: true,
          nameArabic: true,
        },
      }),
      prisma.breastfeedingRelationship.count({
        where: {
          OR: [
            { childId: { in: memberIdVariants } },
            { nurseId: { in: memberIdVariants } },
            { milkFatherId: { in: memberIdVariants } },
          ],
        },
      }),
      prisma.duplicateFlag.findMany({
        where: {
          status: 'PENDING',
          OR: [
            { sourceMemberId: { in: memberIdVariants } },
            { targetMemberId: { in: memberIdVariants } },
          ],
        },
        select: { id: true, sourceMemberId: true, targetMemberId: true },
      }),
      prisma.pendingMember.count({
        where: {
          proposedFatherId: { in: memberIdVariants },
          reviewStatus: 'PENDING',
        },
      }),
    ]);

    let journalsWithRelated = journals.length;
    const relatedOrConditions = memberIdVariants.map(v => ({ relatedMemberIds: { contains: v } }));
    const journalsWithRelatedIds = await prisma.familyJournal.findMany({
      where: {
        OR: relatedOrConditions,
      },
      select: { id: true },
    });
    journalsWithRelated += journalsWithRelatedIds.length;

    const childrenNames = children.map(c => c.fullNameAr || c.firstName);
    const linkedUserEmails = linkedUsers.map(u => u.email);
    const linkedUserNames = linkedUsers.map(u => u.nameArabic);
    const pendingFlagIds = pendingFlags.map(f => f.id);

    return NextResponse.json({
      success: true,
      memberId: member.id,
      memberName: member.fullNameAr || member.firstName,
      impacts: {
        children: {
          count: children.length,
          names: childrenNames,
        },
        photos: {
          count: photos,
        },
        journals: {
          count: journalsWithRelated,
        },
        breastfeeding: {
          count: breastfeeding,
        },
        linkedUsers: {
          count: linkedUsers.length,
          emails: linkedUserEmails,
          names: linkedUserNames,
        },
        pendingFlags: {
          count: pendingFlags.length,
          ids: pendingFlagIds,
        },
        pendingMembers: {
          count: pendingMembers,
        },
      },
      blockers: {
        hasLinkedUser: linkedUsers.length > 0,
        hasPendingFlags: pendingFlags.length > 0,
      },
    });
  } catch (error) {
    console.error('Error getting delete preview:', error);
    return NextResponse.json({ success: false, message: 'Failed to get delete preview' }, { status: 500 });
  }
}
