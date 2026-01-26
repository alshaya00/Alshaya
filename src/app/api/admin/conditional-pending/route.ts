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

interface PendingMemberWithChain {
  id: string;
  firstName: string;
  fatherName: string | null;
  grandfatherName: string | null;
  greatGrandfatherName: string | null;
  familyName: string;
  proposedFatherId: string | null;
  parentPendingId: string | null;
  gender: string;
  birthYear: number | null;
  generation: number;
  branch: string | null;
  fullNameAr: string | null;
  fullNameEn: string | null;
  phone: string | null;
  city: string | null;
  status: string;
  occupation: string | null;
  email: string | null;
  submittedVia: string | null;
  submittedAt: Date;
  reviewStatus: string;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  parentPending?: PendingMemberWithChain | null;
  childrenPending?: PendingMemberWithChain[];
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const permissions = getPermissionsForRole(user.role);
    if (!permissions.approve_pending_members && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const allPending = await prisma.pendingMember.findMany({
      where: {
        reviewStatus: 'PENDING',
      },
      orderBy: { submittedAt: 'desc' },
    });

    const conditionalPending = allPending.filter(
      (m) => m.parentPendingId !== null
    );

    const parentIds = new Set(conditionalPending.map((m) => m.parentPendingId).filter(Boolean));
    const childIds = new Set(conditionalPending.map((m) => m.id));

    const parentPendingMembers = allPending.filter((m) => parentIds.has(m.id));

    const pendingWithChains: PendingMemberWithChain[] = conditionalPending.map((child) => {
      const parent = allPending.find((p) => p.id === child.parentPendingId);
      const children = allPending.filter((c) => c.parentPendingId === child.id);
      
      return {
        ...child,
        parentPending: parent || null,
        childrenPending: children,
      };
    });

    const parentMembersWithChildren = parentPendingMembers.map((parent) => {
      const children = conditionalPending.filter((c) => c.parentPendingId === parent.id);
      const parentOfParent = parent.parentPendingId 
        ? allPending.find((p) => p.id === parent.parentPendingId) 
        : null;
      
      return {
        ...parent,
        parentPending: parentOfParent || null,
        childrenPending: children,
      };
    });

    const eligibleParents = allPending.filter(
      (m) => m.reviewStatus === 'PENDING' && m.gender === 'Male'
    );

    const stats = {
      totalConditional: conditionalPending.length,
      pendingParents: parentPendingMembers.length,
      childrenWaiting: conditionalPending.length,
      uniqueParents: parentIds.size,
    };

    return NextResponse.json({
      success: true,
      conditionalPending: pendingWithChains,
      parentMembers: parentMembersWithChildren,
      eligibleParents,
      allPending,
      stats,
    });
  } catch (error) {
    console.error('Error fetching conditional pending:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch conditional pending members' },
      { status: 500 }
    );
  }
}
