import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { logAuditToDb } from '@/lib/db-audit';
import { normalizeMemberId } from '@/lib/utils';

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

async function resolveMergeChain(memberId: string, maxHops = 10): Promise<{resolvedId: string; resolvedMember: any; chain: string[]} | null> {
  let currentId = memberId;
  const chain: string[] = [currentId];

  for (let i = 0; i < maxHops; i++) {
    const activeMember = await prisma.familyMember.findFirst({
      where: { id: currentId, deletedAt: null },
    });
    if (activeMember) {
      return { resolvedId: currentId, resolvedMember: activeMember, chain };
    }

    const deletedMember = await prisma.familyMember.findFirst({
      where: { id: currentId, deletedAt: { not: null } },
    });

    if (!deletedMember?.deletedReason) return null;

    const match = deletedMember.deletedReason.match(/Merged into (P\d+)/);
    if (!match) return null;

    currentId = match[1];
    if (chain.includes(currentId)) return null;
    chain.push(currentId);
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAdminUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const checkId = normalizeMemberId(searchParams.get('check')) || searchParams.get('check');

    if (checkId) {
      const result = await resolveMergeChain(checkId);

      if (!result || result.resolvedId === checkId) {
        return NextResponse.json({ mergedInto: null });
      }

      return NextResponse.json({
        mergedInto: result.resolvedId,
        resolvedFather: result.resolvedMember,
        originalId: checkId,
        chain: result.chain,
      });
    }

    const pendingMembers = await prisma.pendingMember.findMany({
      where: { reviewStatus: 'PENDING', proposedFatherId: { not: null } },
    });

    const orphaned: Array<{
      pendingMember: typeof pendingMembers[0];
      originalFatherId: string;
      mergedIntoId: string | null;
      resolvedFather: unknown;
    }> = [];

    for (const pm of pendingMembers) {
      if (!pm.proposedFatherId) continue;

      const activeFather = await prisma.familyMember.findFirst({
        where: { id: pm.proposedFatherId, deletedAt: null },
      });

      if (activeFather) continue;

      const result = await resolveMergeChain(pm.proposedFatherId);

      orphaned.push({
        pendingMember: pm,
        originalFatherId: pm.proposedFatherId,
        mergedIntoId: result ? result.resolvedId : null,
        resolvedFather: result ? result.resolvedMember : null,
      });
    }

    return NextResponse.json({ orphaned, count: orphaned.length });
  } catch (error) {
    console.error('Error in fix-father GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAdminUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { pendingMemberId } = body;

    if (!pendingMemberId) {
      return NextResponse.json({ error: 'pendingMemberId is required' }, { status: 400 });
    }

    const pendingMember = await prisma.pendingMember.findUnique({
      where: { id: pendingMemberId },
    });

    if (!pendingMember) {
      return NextResponse.json({ error: 'Pending member not found' }, { status: 404 });
    }

    if (!pendingMember.proposedFatherId) {
      return NextResponse.json({ error: 'No proposedFatherId to fix' }, { status: 400 });
    }

    const result = await resolveMergeChain(pendingMember.proposedFatherId);

    if (!result || result.resolvedId === pendingMember.proposedFatherId) {
      return NextResponse.json({ error: 'Could not resolve merge chain for father' }, { status: 404 });
    }

    const updatedPending = await prisma.pendingMember.update({
      where: { id: pendingMemberId },
      data: { proposedFatherId: result.resolvedId },
    });

    await logAuditToDb({
      action: 'FIX_PENDING_FATHER',
      severity: 'INFO',
      userId: user.id,
      userName: user.nameArabic || user.email,
      userRole: user.role,
      targetType: 'PENDING_MEMBER',
      targetId: pendingMemberId,
      targetName: pendingMember.firstName,
      description: `Fixed proposedFatherId from ${pendingMember.proposedFatherId} to ${result.resolvedId} (merged member resolution, chain: ${result.chain.join(' → ')})`,
      previousState: { proposedFatherId: pendingMember.proposedFatherId },
      newState: { proposedFatherId: result.resolvedId },
    });

    return NextResponse.json({
      success: true,
      updatedPending,
      resolvedFather: result.resolvedMember,
      message: `Fixed: ${pendingMember.proposedFatherId} → ${result.resolvedId}`,
    });
  } catch (error) {
    console.error('Error in fix-father POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
