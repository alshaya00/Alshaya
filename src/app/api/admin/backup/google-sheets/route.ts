import { NextRequest, NextResponse } from 'next/server';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { exportLivingRegistryToSheets, isGoogleSheetsConnected, getSpreadsheetInfo } from '@/lib/google-sheets-export';
import { logAuditToDb } from '@/lib/db-audit';
import { sendBackupNotification } from '@/lib/backup-notifications';
export const dynamic = "force-dynamic";

async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) return null;
  
  const session = await findSessionByToken(token);
  if (!session || new Date(session.expiresAt) < new Date()) return null;
  
  return await findUserById(session.userId);
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const permissions = getPermissionsForRole(user.role);
    if (!permissions.create_snapshot && !permissions.export_data) {
      return NextResponse.json(
        { success: false, message: 'Permission denied' },
        { status: 403 }
      );
    }

    const connected = await isGoogleSheetsConnected();
    
    if (!connected) {
      return NextResponse.json({
        success: true,
        connected: false,
        message: 'Google Sheets not connected',
        messageAr: 'Google Sheets غير متصل',
      });
    }

    const info = await getSpreadsheetInfo();

    return NextResponse.json({
      success: true,
      ...info,
    });

  } catch (error) {
    console.error('Error checking Google Sheets status:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const permissions = getPermissionsForRole(user.role);
    if (!permissions.create_snapshot && !permissions.export_data) {
      return NextResponse.json(
        { success: false, message: 'Permission denied' },
        { status: 403 }
      );
    }

    const connected = await isGoogleSheetsConnected();
    
    if (!connected) {
      return NextResponse.json(
        { success: false, message: 'Google Sheets not connected', messageAr: 'Google Sheets غير متصل' },
        { status: 400 }
      );
    }

    const result = await exportLivingRegistryToSheets();

    if (result.success) {
      try {
        await logAuditToDb({
          action: 'GOOGLE_SHEETS_EXPORT',
          severity: 'INFO',
          userId: user.id,
          userName: user.email,
          userRole: user.role,
          targetType: 'BACKUP',
          targetId: result.spreadsheetId || '',
          targetName: 'Living Registry Snapshot',
          description: `تم تصدير سجل الأحياء إلى Google Sheets: ${result.memberCount} عضو`,
          details: {
            spreadsheetId: result.spreadsheetId,
            sheetTitle: result.sheetTitle,
            memberCount: result.memberCount,
            spreadsheetUrl: result.spreadsheetUrl,
          },
          success: true,
        });
      } catch (auditError) {
        console.error('Audit logging failed:', auditError);
      }

      sendBackupNotification({
        success: true,
        destination: 'Google Sheets',
        memberCount: result.memberCount,
        url: result.spreadsheetUrl,
      }).catch(console.error);

      return NextResponse.json({
        success: true,
        message: 'Living registry exported to Google Sheets successfully',
        messageAr: 'تم تصدير سجل الأحياء إلى Google Sheets بنجاح',
        spreadsheetId: result.spreadsheetId,
        spreadsheetUrl: result.spreadsheetUrl,
        sheetTitle: result.sheetTitle,
        memberCount: result.memberCount,
      });
    } else {
      try {
        await logAuditToDb({
          action: 'GOOGLE_SHEETS_EXPORT_FAILED',
          severity: 'ERROR',
          userId: user.id,
          userName: user.email,
          userRole: user.role,
          targetType: 'BACKUP',
          description: `فشل تصدير سجل الأحياء إلى Google Sheets: ${result.error}`,
          details: {
            error: result.error,
          },
          success: false,
        });
      } catch (auditError) {
        console.error('Audit logging failed:', auditError);
      }

      sendBackupNotification({
        success: false,
        destination: 'Google Sheets',
        error: result.error,
      }).catch(console.error);

      return NextResponse.json(
        { success: false, message: result.error, messageAr: 'فشل التصدير' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error exporting to Google Sheets:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
