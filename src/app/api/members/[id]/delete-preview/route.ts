import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
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

    const memberId = normalizeMemberId(params.id) || params.id;

    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
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

    const [children, photos, journals, linkedUsers] = await Promise.all([
      prisma.familyMember.findMany({
        where: {
          fatherId: memberId,
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
          memberId: memberId,
        },
      }),
      prisma.familyJournal.findMany({
        where: {
          OR: [
            { primaryMemberId: memberId },
            { narratorId: memberId },
          ],
        },
        select: {
          id: true,
          titleAr: true,
        },
      }),
      prisma.user.findMany({
        where: {
          linkedMemberId: memberId,
        },
        select: {
          id: true,
          email: true,
          nameArabic: true,
        },
      }),
    ]);

    let journalsWithRelated = journals.length;
    const journalsWithRelatedIds = await prisma.familyJournal.findMany({
      where: {
        relatedMemberIds: { contains: memberId },
      },
      select: { id: true },
    });
    journalsWithRelated += journalsWithRelatedIds.length;

    const childrenNames = children.map(c => c.fullNameAr || c.firstName);
    const linkedUserEmails = linkedUsers.map(u => u.email);

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
        linkedUsers: {
          count: linkedUsers.length,
          emails: linkedUserEmails,
        },
      },
    });
  } catch (error) {
    console.error('Error getting delete preview:', error);
    return NextResponse.json({ success: false, message: 'Failed to get delete preview' }, { status: 500 });
  }
}
