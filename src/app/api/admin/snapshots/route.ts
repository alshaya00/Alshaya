import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
export const dynamic = "force-dynamic";

// Use dedicated Prisma client to avoid mock pattern
const prisma = new PrismaClient();

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

    // Get source member count before backup
    const expectedCount = await prisma.familyMember.count();

    // Get all members for the snapshot
    const members = await prisma.familyMember.findMany();
    const treeDataJson = JSON.stringify(members);
    const actualCount = members.length;

    // Verify backup integrity
    const verified = expectedCount === actualCount;

    // Calculate backup size
    const backupSize = Buffer.byteLength(treeDataJson, 'utf8');

    // Check for size anomaly - get last 5 backups for comparison
    const recentBackups = await prisma.snapshot.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { treeData: true },
    });

    let sizeWarning: string | null = null;
    let sizeWarningAr: string | null = null;

    if (recentBackups.length > 0) {
      const recentSizes = recentBackups.map(b => Buffer.byteLength(b.treeData, 'utf8'));
      const averageSize = recentSizes.reduce((a, b) => a + b, 0) / recentSizes.length;

      if (backupSize < averageSize * 0.5) {
        sizeWarning = 'Warning: backup size is significantly smaller than usual';
        sizeWarningAr = 'تحذير: حجم النسخة الاحتياطية أصغر بكثير من المعتاد';
      }
    }

    const snapshot = await prisma.snapshot.create({
      data: {
        name: body.name,
        description: body.description,
        treeData: treeDataJson,
        memberCount: actualCount,
        createdBy: user.id,
        createdByName: user.nameArabic,
        snapshotType: body.snapshotType || 'MANUAL',
      },
    });

    return NextResponse.json({
      snapshot,
      verified,
      expectedCount,
      actualCount,
      backupSize,
      ...(sizeWarning && { sizeWarning }),
      ...(sizeWarningAr && { sizeWarningAr }),
    });
  } catch (error) {
    console.error('Error creating snapshot:', error);
    return NextResponse.json({ error: 'Failed to create snapshot' }, { status: 500 });
  }
}
