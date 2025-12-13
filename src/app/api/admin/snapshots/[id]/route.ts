import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById, logActivity } from '@/lib/auth/store';
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

// GET /api/admin/snapshots/[id] - Get a specific snapshot or download it
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const snapshot = await prisma.snapshot.findUnique({
      where: { id: params.id },
    });

    if (!snapshot) {
      return NextResponse.json(
        { success: false, message: 'Snapshot not found', messageAr: 'النسخة غير موجودة' },
        { status: 404 }
      );
    }

    // Check if download is requested
    const { searchParams } = new URL(request.url);
    const download = searchParams.get('download') === 'true';

    if (download) {
      // Parse the tree data for download
      let treeData;
      try {
        treeData = JSON.parse(snapshot.treeData);
      } catch {
        treeData = snapshot.treeData;
      }

      const downloadData = {
        snapshotId: snapshot.id,
        snapshotName: snapshot.name,
        snapshotType: snapshot.snapshotType,
        createdAt: snapshot.createdAt,
        createdBy: snapshot.createdByName,
        memberCount: snapshot.memberCount,
        description: snapshot.description,
        members: treeData,
        metadata: {
          exportedAt: new Date().toISOString(),
          exportedBy: user.nameArabic,
          format: 'AlShayeFamilyTree_Backup_v1',
        },
      };

      const filename = `backup_${snapshot.name || snapshot.id}_${new Date().toISOString().split('T')[0]}.json`;

      return new NextResponse(JSON.stringify(downloadData, null, 2), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        },
      });
    }

    return NextResponse.json({ success: true, snapshot });
  } catch (error) {
    console.error('Error fetching snapshot:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch snapshot' },
      { status: 500 }
    );
  }
}

// POST /api/admin/snapshots/[id] - Restore from a snapshot
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const permissions = getPermissionsForRole(user.role);
    if (!permissions.restore_snapshot && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'No permission to restore', messageAr: 'لا تملك صلاحية الاستعادة' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action !== 'restore') {
      return NextResponse.json(
        { success: false, message: 'Invalid action', messageAr: 'الإجراء غير صالح' },
        { status: 400 }
      );
    }

    const snapshot = await prisma.snapshot.findUnique({
      where: { id: params.id },
    });

    if (!snapshot) {
      return NextResponse.json(
        { success: false, message: 'Snapshot not found', messageAr: 'النسخة غير موجودة' },
        { status: 404 }
      );
    }

    // Parse the tree data
    let membersToRestore;
    try {
      membersToRestore = JSON.parse(snapshot.treeData);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid snapshot data', messageAr: 'بيانات النسخة غير صالحة' },
        { status: 400 }
      );
    }

    if (!Array.isArray(membersToRestore)) {
      return NextResponse.json(
        { success: false, message: 'Invalid snapshot format', messageAr: 'صيغة النسخة غير صالحة' },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Create a pre-restore backup
    const currentMembers = await prisma.familyMember.findMany();
    const preRestoreSnapshot = await prisma.snapshot.create({
      data: {
        name: `Pre-Restore Backup (before restoring ${snapshot.name || snapshot.id})`,
        description: `Automatic backup created before restoring snapshot ${snapshot.id}`,
        treeData: JSON.stringify(currentMembers),
        memberCount: currentMembers.length,
        createdBy: user.id,
        createdByName: user.nameArabic,
        snapshotType: 'PRE_RESTORE',
      },
    });

    // Delete all current members
    await prisma.familyMember.deleteMany({});

    // Restore members from snapshot
    let restoredCount = 0;
    const errors: string[] = [];

    for (const member of membersToRestore) {
      try {
        // Remove any fields that might cause issues
        const { createdAt, updatedAt, ...memberData } = member;

        await prisma.familyMember.create({
          data: {
            ...memberData,
            sonsCount: memberData.sonsCount || 0,
            daughtersCount: memberData.daughtersCount || 0,
          },
        });
        restoredCount++;
      } catch (err) {
        errors.push(`Failed to restore member ${member.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    // Log activity
    await logActivity({
      userId: user.id,
      userEmail: user.email,
      userName: user.nameArabic,
      action: 'RESTORE_SNAPSHOT',
      category: 'DATA',
      targetType: 'SNAPSHOT',
      targetId: params.id,
      targetName: snapshot.name || params.id,
      details: {
        snapshotId: params.id,
        preRestoreSnapshotId: preRestoreSnapshot.id,
        membersRestored: restoredCount,
        errors: errors.length,
      },
      ipAddress,
      userAgent,
      success: errors.length === 0,
    });

    return NextResponse.json({
      success: true,
      message: `Restored ${restoredCount} members from snapshot`,
      messageAr: `تم استعادة ${restoredCount} عضو من النسخة الاحتياطية`,
      details: {
        restoredCount,
        preRestoreSnapshotId: preRestoreSnapshot.id,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error('Error restoring snapshot:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to restore snapshot' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/snapshots/[id] - Delete a snapshot
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Only super admin can delete snapshots', messageAr: 'المدير العام فقط يمكنه حذف النسخ' },
        { status: 403 }
      );
    }

    const snapshot = await prisma.snapshot.findUnique({
      where: { id: params.id },
    });

    if (!snapshot) {
      return NextResponse.json(
        { success: false, message: 'Snapshot not found', messageAr: 'النسخة غير موجودة' },
        { status: 404 }
      );
    }

    await prisma.snapshot.delete({
      where: { id: params.id },
    });

    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logActivity({
      userId: user.id,
      userEmail: user.email,
      userName: user.nameArabic,
      action: 'CREATE_SNAPSHOT', // Using existing action type
      category: 'DATA',
      targetType: 'SNAPSHOT',
      targetId: params.id,
      targetName: snapshot.name || params.id,
      details: { action: 'DELETE' },
      ipAddress,
      userAgent,
      success: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Snapshot deleted',
      messageAr: 'تم حذف النسخة الاحتياطية',
    });
  } catch (error) {
    console.error('Error deleting snapshot:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete snapshot' },
      { status: 500 }
    );
  }
}
