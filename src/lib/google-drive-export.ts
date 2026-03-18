import { google } from 'googleapis';
import { createDailyCSVBackup, createFullBackup } from './backup-service';
import * as stream from 'stream';

async function getAccessToken(): Promise<string> {
  const accessToken = process.env.GOOGLE_ACCESS_TOKEN;
  if (accessToken) {
    return accessToken;
  }

  // Use service account credentials if available
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  if (clientEmail && privateKey) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
      scopes: [
        'https://www.googleapis.com/auth/drive',
      ],
    });
    const token = await auth.getAccessToken();
    if (token) return token;
  }

  throw new Error('Google credentials not configured. Set GOOGLE_ACCESS_TOKEN or GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY.');
}

async function getGoogleDriveClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

export async function findOrCreateBackupFolder(): Promise<string> {
  const drive = await getGoogleDriveClient();
  
  const folderName = 'AlShaya Family Backups';
  
  const response = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id!;
  }

  const folderMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };

  const folder = await drive.files.create({
    requestBody: folderMetadata,
    fields: 'id',
  });

  return folder.data.id!;
}

export interface DriveExportResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  memberCount?: number;
  webViewLink?: string;
  error?: string;
}

export async function exportCSVToGoogleDrive(): Promise<DriveExportResult> {
  try {
    const drive = await getGoogleDriveClient();
    const folderId = await findOrCreateBackupFolder();
    
    const { csv, memberCount, date } = await createDailyCSVBackup();
    const fileName = `Alshaya_family_${date}.csv`;

    const existingFiles = await drive.files.list({
      q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
      fields: 'files(id)',
    });

    if (existingFiles.data.files && existingFiles.data.files.length > 0) {
      const existingFileId = existingFiles.data.files[0].id!;
      
      const csvBuffer = Buffer.from(csv, 'utf-8');
      const bufferStream = new stream.PassThrough();
      bufferStream.end(csvBuffer);

      await drive.files.update({
        fileId: existingFileId,
        media: {
          mimeType: 'text/csv',
          body: bufferStream,
        },
      });

      const file = await drive.files.get({
        fileId: existingFileId,
        fields: 'id, name, webViewLink',
      });

      return {
        success: true,
        fileId: existingFileId,
        fileName,
        memberCount,
        webViewLink: file.data.webViewLink || undefined,
      };
    }

    const csvBuffer2 = Buffer.from(csv, 'utf-8');
    const bufferStream2 = new stream.PassThrough();
    bufferStream2.end(csvBuffer2);

    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: {
        mimeType: 'text/csv',
        body: bufferStream2,
      },
      fields: 'id, name, webViewLink',
    });

    return {
      success: true,
      fileId: file.data.id || undefined,
      fileName,
      memberCount,
      webViewLink: file.data.webViewLink || undefined,
    };

  } catch (error) {
    console.error('Error exporting to Google Drive:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function exportJSONBackupToGoogleDrive(): Promise<DriveExportResult> {
  try {
    const drive = await getGoogleDriveClient();
    const folderId = await findOrCreateBackupFolder();
    
    const backup = await createFullBackup();
    const date = new Date().toISOString().split('T')[0];
    const fileName = `Alshaya_family_backup_${date}.json`;

    const jsonContent = JSON.stringify(backup, null, 2);
    const jsonBuffer = Buffer.from(jsonContent, 'utf-8');
    const jsonStream = new stream.PassThrough();
    jsonStream.end(jsonBuffer);

    const existingFiles = await drive.files.list({
      q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
      fields: 'files(id)',
    });

    if (existingFiles.data.files && existingFiles.data.files.length > 0) {
      const existingFileId = existingFiles.data.files[0].id!;
      
      const updateStream = new stream.PassThrough();
      updateStream.end(jsonBuffer);
      
      await drive.files.update({
        fileId: existingFileId,
        media: {
          mimeType: 'application/json',
          body: updateStream,
        },
      });

      const file = await drive.files.get({
        fileId: existingFileId,
        fields: 'id, name, webViewLink',
      });

      return {
        success: true,
        fileId: existingFileId,
        fileName,
        memberCount: backup.totalMembers,
        webViewLink: file.data.webViewLink || undefined,
      };
    }

    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: {
        mimeType: 'application/json',
        body: jsonStream,
      },
      fields: 'id, name, webViewLink',
    });

    return {
      success: true,
      fileId: file.data.id || undefined,
      fileName,
      memberCount: backup.totalMembers,
      webViewLink: file.data.webViewLink || undefined,
    };

  } catch (error) {
    console.error('Error exporting JSON to Google Drive:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function listBackupFiles(): Promise<{ files: Array<{ id: string; name: string; modifiedTime: string; size: string }> }> {
  try {
    const drive = await getGoogleDriveClient();
    const folderId = await findOrCreateBackupFolder();

    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, modifiedTime, size)',
      orderBy: 'modifiedTime desc',
    });

    return {
      files: (response.data.files || []).map(f => ({
        id: f.id!,
        name: f.name!,
        modifiedTime: f.modifiedTime!,
        size: f.size || '0',
      })),
    };
  } catch (error) {
    console.error('Error listing backup files:', error);
    return { files: [] };
  }
}

export async function isGoogleDriveConnected(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}
