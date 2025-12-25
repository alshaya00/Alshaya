import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById, logActivity } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { restoreFromBackup, BackupData, MemberBackup } from '@/lib/backup-service';

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

    const { searchParams } = new URL(request.url);
    const download = searchParams.get('download') === 'true';

    if (download) {
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
          format: 'AlShayeFamilyTree_Backup_v2',
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

    let membersToRestore: MemberBackup[];
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

    console.log(`Starting transactional restore of ${membersToRestore.length} members...`);

    const backupData: BackupData = {
      version: '2.0',
      createdAt: snapshot.createdAt.toISOString(),
      totalMembers: membersToRestore.length,
      members: membersToRestore,
      checksum: `snapshot_${snapshot.id}`,
    };

    const result = await restoreFromBackup(backupData, user.id, user.nameArabic);

    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

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
        preRestoreSnapshotId: result.preRestoreSnapshotId,
        membersExpected: result.expectedCount,
        membersRestored: result.restoredCount,
        success: result.success,
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
      ipAddress,
      userAgent,
      success: result.success,
    });

    if (!result.success) {
      console.error('Restore failed:', result.errors);
      return NextResponse.json({
        success: false,
        message: `Restore failed: ${result.errors.join(', ')}`,
        messageAr: `فشلت الاستعادة: ${result.errors.length} أخطاء`,
        details: {
          expectedCount: result.expectedCount,
          restoredCount: result.restoredCount,
          preRestoreSnapshotId: result.preRestoreSnapshotId,
          errors: result.errors,
        },
      }, { status: 500 });
    }

    console.log(`Successfully restored ${result.restoredCount} members`);

    return NextResponse.json({
      success: true,
      message: `Successfully restored ${result.restoredCount} members (verified)`,
      messageAr: `تم استعادة ${result.restoredCount} عضو بنجاح (تم التحقق)`,
      details: {
        restoredCount: result.restoredCount,
        expectedCount: result.expectedCount,
        preRestoreSnapshotId: result.preRestoreSnapshotId,
        verified: true,
      },
    });
  } catch (error) {
    console.error('Error in restore endpoint:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to restore snapshot',
        messageAr: 'فشلت استعادة النسخة الاحتياطية',
      },
      { status: 500 }
    );
  }
}

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
      action: 'CREATE_SNAPSHOT',
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
