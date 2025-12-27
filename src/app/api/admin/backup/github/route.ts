import { NextRequest, NextResponse } from 'next/server';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { 
  exportBackupToGitHub, 
  getGitHubBackupInfo,
  isGitHubConnected 
} from '@/lib/github-backup';
import { prisma } from '@/lib/prisma';
import { sendBackupNotification } from '@/lib/backup-notifications';

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

    const connected = await isGitHubConnected();
    
    if (!connected) {
      return NextResponse.json({
        success: true,
        connected: false,
        message: 'GitHub not connected',
        messageAr: 'GitHub غير متصل',
      });
    }

    const info = await getGitHubBackupInfo();

    return NextResponse.json({
      success: true,
      connected: true,
      repoUrl: info.repoUrl,
      lastBackup: info.lastBackup,
      backupCount: info.backupCount,
    });
  } catch (error) {
    console.error('Error checking GitHub status:', error);
    return NextResponse.json({
      success: false,
      connected: false,
      message: 'Failed to check GitHub status',
      messageAr: 'فشل التحقق من حالة GitHub',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
        { success: false, message: 'Only super admin can trigger backups', messageAr: 'المدير العام فقط' },
        { status: 403 }
      );
    }

    const connected = await isGitHubConnected();
    if (!connected) {
      return NextResponse.json({
        success: false,
        message: 'GitHub not connected. Please connect GitHub first.',
        messageAr: 'GitHub غير متصل. يرجى الاتصال أولاً.',
      }, { status: 400 });
    }

    const result = await exportBackupToGitHub();

    if (!result.success) {
      await prisma.auditLog.create({
        data: {
          action: 'GITHUB_BACKUP_FAILED',
          entityType: 'BACKUP',
          entityId: 'github',
          userId: user.id,
          details: { error: result.error },
        },
      });

      sendBackupNotification({
        success: false,
        destination: 'GitHub',
        error: result.error,
      }).catch(console.error);

      return NextResponse.json({
        success: false,
        message: `GitHub backup failed: ${result.error}`,
        messageAr: `فشل النسخ الاحتياطي: ${result.error}`,
      }, { status: 500 });
    }

    await prisma.auditLog.create({
      data: {
        action: 'GITHUB_BACKUP_SUCCESS',
        entityType: 'BACKUP',
        entityId: 'github',
        userId: user.id,
        details: {
          memberCount: result.memberCount,
          commitSha: result.commitSha,
          repoUrl: result.repoUrl,
        },
      },
    });

    sendBackupNotification({
      success: true,
      destination: 'GitHub',
      memberCount: result.memberCount,
      url: result.repoUrl,
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      message: `Successfully backed up ${result.memberCount} members to GitHub`,
      messageAr: `تم نسخ ${result.memberCount} عضو إلى GitHub بنجاح`,
      data: {
        commitSha: result.commitSha,
        repoUrl: result.repoUrl,
        memberCount: result.memberCount,
      },
    });
  } catch (error) {
    console.error('Error backing up to GitHub:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to backup to GitHub',
      messageAr: 'فشل النسخ الاحتياطي إلى GitHub',
    }, { status: 500 });
  }
}
