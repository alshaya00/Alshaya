import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { isMale } from '@/lib/utils';
import { normalizeCityWithCorrection } from '@/lib/matching/arabic-utils';

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
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const submittedVia = searchParams.get('submittedVia');

    // Public access allowed when filtering by submittedVia token
    // This allows the public branch entry page to fetch its own pending members
    if (submittedVia) {
      const pending = await prisma.pendingMember.findMany({
        where: {
          submittedVia,
          reviewStatus: 'PENDING',
        },
        orderBy: { submittedAt: 'desc' },
      });
      return NextResponse.json({ pending });
    }

    // Check authentication for admin access
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

    if (!body.firstName || !body.firstName.trim()) {
      return NextResponse.json(
        { success: false, message: 'First name is required', messageAr: 'الاسم الأول مطلوب' },
        { status: 400 }
      );
    }

    if (!body.gender || !['Male', 'Female', 'male', 'female', 'ذكر', 'أنثى'].includes(body.gender)) {
      return NextResponse.json(
        { success: false, message: 'Valid gender is required', messageAr: 'الجنس مطلوب' },
        { status: 400 }
      );
    }

    const normalizedGender = ['Male', 'male', 'ذكر'].includes(body.gender) ? 'Male' : 'Female';

    if (body.proposedFatherId) {
      const fatherExists = await prisma.familyMember.findUnique({
        where: { id: body.proposedFatherId }
      });
      if (!fatherExists) {
        return NextResponse.json(
          { success: false, message: 'Father not found', messageAr: 'الأب غير موجود' },
          { status: 400 }
        );
      }
      if (!isMale(fatherExists.gender)) {
        return NextResponse.json(
          { success: false, message: 'Father must be male', messageAr: 'يجب أن يكون الأب ذكراً' },
          { status: 400 }
        );
      }
    }

    const pending = await prisma.pendingMember.create({
      data: {
        firstName: body.firstName,
        fatherName: body.fatherName,
        grandfatherName: body.grandfatherName,
        greatGrandfatherName: body.greatGrandfatherName,
        familyName: body.familyName || 'آل شايع',
        proposedFatherId: body.proposedFatherId,
        gender: normalizedGender,
        birthYear: body.birthYear,
        generation: body.generation || 1,
        branch: body.branch,
        fullNameAr: body.fullNameAr,
        fullNameEn: body.fullNameEn,
        phone: body.phone,
        city: body.city ? normalizeCityWithCorrection(body.city) : body.city,
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
