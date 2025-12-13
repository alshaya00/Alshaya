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

    // Only admins can view snapshots
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const snapshots = await prisma.snapshot.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ snapshots });
  } catch (error) {
    console.error('Error fetching snapshots:', error);
    return NextResponse.json({ snapshots: [] });
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

    // Check permission
    const permissions = getPermissionsForRole(user.role);
    if (!permissions.create_snapshot && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Get all members for the snapshot
    const members = await prisma.familyMember.findMany();

    const snapshot = await prisma.snapshot.create({
      data: {
        name: body.name,
        description: body.description,
        treeData: JSON.stringify(members),
        memberCount: members.length,
        createdBy: user.id,
        createdByName: user.nameArabic,
        snapshotType: body.snapshotType || 'MANUAL',
      },
    });

    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error('Error creating snapshot:', error);
    return NextResponse.json({ error: 'Failed to create snapshot' }, { status: 500 });
  }
}
