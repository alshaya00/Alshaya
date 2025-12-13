import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/store';
import { getPermissionsForRole } from '@/lib/auth/permissions';

// Helper to get auth user from request
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

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    // Check permission
    const permissions = getPermissionsForRole(user.role);
    if (!permissions.approve_pending_members && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (status) where.reviewStatus = status;

    // Branch leaders can only see their branch's pending members
    if (user.role === 'BRANCH_LEADER' && user.assignedBranch) {
      where.branch = user.assignedBranch;
    }

    const pending = await prisma.pendingMember.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
    });

    return NextResponse.json({ pending });
  } catch (error) {
    console.error('Error fetching pending:', error);
    return NextResponse.json({ pending: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const pending = await prisma.pendingMember.create({
      data: {
        firstName: body.firstName,
        fatherName: body.fatherName,
        grandfatherName: body.grandfatherName,
        greatGrandfatherName: body.greatGrandfatherName,
        familyName: body.familyName || 'آل شايع',
        proposedFatherId: body.proposedFatherId,
        gender: body.gender,
        birthYear: body.birthYear,
        generation: body.generation || 1,
        branch: body.branch,
        fullNameAr: body.fullNameAr,
        fullNameEn: body.fullNameEn,
        phone: body.phone,
        city: body.city,
        status: body.status || 'Living',
        occupation: body.occupation,
        email: body.email,
        submittedVia: body.submittedVia,
      },
    });

    return NextResponse.json({ pending });
  } catch (error) {
    console.error('Error creating pending:', error);
    return NextResponse.json({ error: 'Failed to create pending member' }, { status: 500 });
  }
}
