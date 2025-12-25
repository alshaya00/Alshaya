import { NextRequest, NextResponse } from 'next/server';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { 
  exportCSVToGoogleDrive, 
  exportJSONBackupToGoogleDrive, 
  listBackupFiles,
  isGoogleDriveConnected 
} from '@/lib/google-drive-export';

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

    const connected = await isGoogleDriveConnected();
    
    if (!connected) {
      return NextResponse.json({
        success: true,
        connected: false,
        files: [],
        message: 'Google Drive not connected',
        messageAr: 'Google Drive غير متصل',
      });
    }

    const { files } = await listBackupFiles();

    return NextResponse.json({
      success: true,
      connected: true,
      files,
    });
  } catch (error) {
    console.error('Error checking Google Drive status:', error);
    return NextResponse.json({
      success: false,
      connected: false,
      message: 'Failed to check Google Drive status',
      messageAr: 'فشل التحقق من حالة Google Drive',
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

    const connected = await isGoogleDriveConnected();
    if (!connected) {
      return NextResponse.json({
        success: false,
        message: 'Google Drive not connected. Please connect Google Drive first.',
        messageAr: 'Google Drive غير متصل. يرجى الاتصال أولاً.',
      }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const exportType = body.type || 'csv';

    let result;
    if (exportType === 'json') {
      result = await exportJSONBackupToGoogleDrive();
    } else {
      result = await exportCSVToGoogleDrive();
    }

    if (!result.success) {
      return NextResponse.json({
        success: false,
        message: `Export failed: ${result.error}`,
        messageAr: `فشل التصدير: ${result.error}`,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully exported ${result.memberCount} members to Google Drive`,
      messageAr: `تم تصدير ${result.memberCount} عضو إلى Google Drive بنجاح`,
      data: {
        fileId: result.fileId,
        fileName: result.fileName,
        memberCount: result.memberCount,
        webViewLink: result.webViewLink,
      },
    });
  } catch (error) {
    console.error('Error exporting to Google Drive:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to export to Google Drive',
      messageAr: 'فشل التصدير إلى Google Drive',
    }, { status: 500 });
  }
}
