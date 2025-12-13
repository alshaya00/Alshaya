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
    if (!permissions.view_audit_logs && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const memberId = searchParams.get('memberId');
    const changeType = searchParams.get('changeType');

    const where: Record<string, unknown> = {};
    if (memberId) where.memberId = memberId;
    if (changeType) where.changeType = changeType;

    const changes = await prisma.changeHistory.findMany({
      where,
      orderBy: { changedAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        member: {
          select: {
            firstName: true,
            fullNameAr: true,
          },
        },
      },
    });

    const total = await prisma.changeHistory.count({ where });

    return NextResponse.json({
      changes: changes.map((c: typeof changes[number]) => ({
        ...c,
        memberName: c.member?.fullNameAr || c.member?.firstName,
      })),
      total,
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json({ changes: [], total: 0 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    // Only admins can create history entries
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const body = await request.json();

    const change = await prisma.changeHistory.create({
      data: {
        memberId: body.memberId,
        fieldName: body.fieldName,
        oldValue: body.oldValue,
        newValue: body.newValue,
        changeType: body.changeType,
        changedBy: user.id,
        changedByName: user.nameArabic,
        batchId: body.batchId,
        reason: body.reason,
        fullSnapshot: body.fullSnapshot,
      },
    });

    return NextResponse.json({ change });
  } catch (error) {
    console.error('Error creating history:', error);
    return NextResponse.json({ error: 'Failed to create history' }, { status: 500 });
  }
}
