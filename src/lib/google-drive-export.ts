import { google } from 'googleapis';
import { createDailyCSVBackup, createFullBackup } from './backup-service';
import * as stream from 'stream';

interface ConnectionSettings {
  settings: {
    access_token?: string;
    expires_at?: string;
    oauth?: {
      credentials?: {
        access_token?: string;
      };
    };
  };
}

let connectionSettings: ConnectionSettings | null = null;

async function getAccessToken(): Promise<string> {
  if (connectionSettings?.settings?.expires_at && 
      new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    const token = connectionSettings.settings.access_token;
    if (token) return token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  if (!hostname) {
    throw new Error('REPLIT_CONNECTORS_HOSTNAME not found');
  }

  const response = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-drive',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  );
  
  const data = await response.json();
  connectionSettings = data.items?.[0] as ConnectionSettings;

  const accessToken = connectionSettings?.settings?.access_token || 
                      connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Drive not connected');
  }
  
  return accessToken;
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
