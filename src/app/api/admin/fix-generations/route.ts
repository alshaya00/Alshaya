import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';

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

interface MemberWithIncorrectGeneration {
  id: string;
  firstName: string;
  currentGeneration: number;
  expectedGeneration: number;
  fatherId: string | null;
  fatherName: string | null;
}

interface GenerationFixResult {
  memberId: string;
  memberName: string;
  oldGeneration: number;
  newGeneration: number;
}

async function getMembersWithIncorrectGeneration(): Promise<MemberWithIncorrectGeneration[]> {
  const members = await prisma.familyMember.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      firstName: true,
      generation: true,
      fatherId: true,
    },
  });

  const memberMap = new Map(members.map(m => [m.id, m]));
  const incorrectMembers: MemberWithIncorrectGeneration[] = [];

  function calculateCorrectGeneration(memberId: string, visited: Set<string> = new Set()): number {
    if (visited.has(memberId)) {
      return 1;
    }
    visited.add(memberId);

    const member = memberMap.get(memberId);
    if (!member) return 1;

    if (!member.fatherId) {
      return 1;
    }

    const father = memberMap.get(member.fatherId);
    if (!father) {
      return 1;
    }

    return calculateCorrectGeneration(member.fatherId, visited) + 1;
  }

  for (const member of members) {
    const expectedGeneration = calculateCorrectGeneration(member.id);
    
    if (member.generation !== expectedGeneration) {
      const father = member.fatherId ? memberMap.get(member.fatherId) : null;
      incorrectMembers.push({
        id: member.id,
        firstName: member.firstName,
        currentGeneration: member.generation,
        expectedGeneration,
        fatherId: member.fatherId,
        fatherName: father?.firstName || null,
      });
    }
  }

  return incorrectMembers;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized', messageAr: 'غير مصرح' }, { status: 401 });
    }

    const incorrectMembers = await getMembersWithIncorrectGeneration();

    return NextResponse.json({
      success: true,
      totalIncorrect: incorrectMembers.length,
      members: incorrectMembers,
    });
  } catch (error) {
    console.error('Error getting members with incorrect generation:', error);
    return NextResponse.json(
      { error: 'Failed to get members with incorrect generation' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized', messageAr: 'غير مصرح' }, { status: 401 });
    }

    const body = await request.json();
    const { memberIds, fixAll } = body as { memberIds?: string[]; fixAll?: boolean };

    const allMembers = await prisma.familyMember.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        firstName: true,
        generation: true,
        fatherId: true,
      },
    });

    const memberMap = new Map(allMembers.map(m => [m.id, m]));

    function calculateCorrectGeneration(memberId: string, visited: Set<string> = new Set()): number {
      if (visited.has(memberId)) {
        return 1;
      }
      visited.add(memberId);

      const member = memberMap.get(memberId);
      if (!member) return 1;

      if (!member.fatherId) {
        return 1;
      }

      const father = memberMap.get(member.fatherId);
      if (!father) {
        return 1;
      }

      return calculateCorrectGeneration(member.fatherId, visited) + 1;
    }

    let membersToFix: typeof allMembers = [];

    if (fixAll) {
      membersToFix = allMembers.filter(m => {
        const expected = calculateCorrectGeneration(m.id);
        return m.generation !== expected;
      });
    } else if (memberIds && memberIds.length > 0) {
      membersToFix = allMembers.filter(m => memberIds.includes(m.id));
    } else {
      return NextResponse.json(
        { error: 'Either memberIds or fixAll must be provided' },
        { status: 400 }
      );
    }

    const batchId = `gen-fix-${Date.now()}`;
    const fixResults: GenerationFixResult[] = [];

    for (const member of membersToFix) {
      const expectedGeneration = calculateCorrectGeneration(member.id);
      
      if (member.generation !== expectedGeneration) {
        await prisma.$transaction([
          prisma.familyMember.update({
            where: { id: member.id },
            data: { generation: expectedGeneration },
          }),
          prisma.changeHistory.create({
            data: {
              memberId: member.id,
              fieldName: 'generation',
              oldValue: String(member.generation),
              newValue: String(expectedGeneration),
              changeType: 'UPDATE',
              changedBy: session.userId,
              changedByName: session.nameArabic || session.email,
              batchId,
              reason: 'Auto-correction: generation recalculated based on parent chain',
            },
          }),
        ]);

        fixResults.push({
          memberId: member.id,
          memberName: member.firstName,
          oldGeneration: member.generation,
          newGeneration: expectedGeneration,
        });
      }
    }

    return NextResponse.json({
      success: true,
      fixedCount: fixResults.length,
      batchId,
      fixes: fixResults,
    });
  } catch (error) {
    console.error('Error fixing generations:', error);
    return NextResponse.json(
      { error: 'Failed to fix generations' },
      { status: 500 }
    );
  }
}
