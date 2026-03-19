import { google } from 'googleapis';
import { prisma } from '@/lib/prisma';
import type { SheetsExportResult, BackupProvider } from '../types';

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
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
      ],
    });
    const token = await auth.getAccessToken();
    if (token) return token;
  }

  throw new Error('Google credentials not configured. Set GOOGLE_ACCESS_TOKEN or GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY.');
}

async function getGoogleSheetsClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.sheets({ version: 'v4', auth: oauth2Client });
}

async function getGoogleDriveClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

const SPREADSHEET_NAME = 'Al-Shaya Living Registry Snapshot';
const MAX_SNAPSHOTS = 30;

async function findOrCreateSpreadsheet(): Promise<{ spreadsheetId: string; isNew: boolean }> {
  const drive = await getGoogleDriveClient();

  const response = await drive.files.list({
    q: `name='${SPREADSHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
    fields: 'files(id, name)',
  });

  if (response.data.files && response.data.files.length > 0) {
    return { spreadsheetId: response.data.files[0].id!, isNew: false };
  }

  const sheets = await getGoogleSheetsClient();

  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: SPREADSHEET_NAME,
      },
      sheets: [
        {
          properties: {
            title: 'Current',
            index: 0,
          },
        },
      ],
    },
  });

  return { spreadsheetId: spreadsheet.data.spreadsheetId!, isNew: true };
}

async function getLivingMembers() {
  const members = await prisma.familyMember.findMany({
    where: {
      deletedAt: null,
      status: { not: 'Deceased' },
    },
    orderBy: [
      { generation: 'asc' },
      { branch: 'asc' },
      { firstName: 'asc' },
    ],
    select: {
      id: true,
      firstName: true,
      fullNameAr: true,
      fullNameEn: true,
      lineagePath: true,
      branch: true,
      generation: true,
      gender: true,
      birthYear: true,
      city: true,
      phone: true,
      email: true,
      status: true,
      occupation: true,
      updatedAt: true,
    },
  });

  return members;
}

function formatMembersForSheet(members: Awaited<ReturnType<typeof getLivingMembers>>): string[][] {
  const headers = [
    'ID',
    'الاسم الكامل (Arabic)',
    'Full Name (English)',
    'Lineage Path',
    'Branch',
    'Generation',
    'Gender',
    'Birth Year',
    'City',
    'Phone',
    'Email',
    'Status',
    'Occupation',
    'Last Updated',
  ];

  const rows = members.map(m => [
    m.id,
    m.fullNameAr || m.firstName || '',
    m.fullNameEn || '',
    m.lineagePath || '',
    m.branch || '',
    String(m.generation || ''),
    m.gender || '',
    m.birthYear ? String(m.birthYear) : '',
    m.city || '',
    m.phone || '',
    m.email || '',
    m.status || 'Living',
    m.occupation || '',
    m.updatedAt ? m.updatedAt.toISOString().split('T')[0] : '',
  ]);

  return [headers, ...rows];
}

export async function exportLivingRegistryToSheets(): Promise<SheetsExportResult> {
  try {
    const sheets = await getGoogleSheetsClient();
    const { spreadsheetId, isNew } = await findOrCreateSpreadsheet();

    const members = await getLivingMembers();
    const data = formatMembersForSheet(members);

    const today = new Date().toISOString().split('T')[0];
    const snapshotSheetTitle = today;

    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties',
    });

    const existingSheets = spreadsheet.data.sheets || [];
    const sheetTitles = existingSheets.map(s => s.properties?.title).filter(Boolean);

    const existingSnapshotSheet = existingSheets.find(s => s.properties?.title === snapshotSheetTitle);

    if (existingSnapshotSheet) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `'${snapshotSheetTitle}'!A:Z`,
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${snapshotSheetTitle}'!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: data,
        },
      });
    } else {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: snapshotSheetTitle,
                  index: 1,
                },
              },
            },
          ],
        },
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${snapshotSheetTitle}'!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: data,
        },
      });
    }

    const currentSheet = existingSheets.find(s => s.properties?.title === 'Current');
    if (currentSheet) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: "'Current'!A:Z",
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "'Current'!A1",
        valueInputOption: 'RAW',
        requestBody: {
          values: data,
        },
      });
    }

    const updatedSpreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties',
    });

    const updatedSheets = updatedSpreadsheet.data.sheets || [];
    const allSnapshotTitles = updatedSheets
      .map(s => s.properties?.title)
      .filter(title => title && title !== 'Current' && /^\d{4}-\d{2}-\d{2}$/.test(title))
      .sort()
      .reverse();

    if (allSnapshotTitles.length > MAX_SNAPSHOTS) {
      const sheetsToDelete = allSnapshotTitles.slice(MAX_SNAPSHOTS);

      for (const sheetTitle of sheetsToDelete) {
        const sheetToDelete = updatedSheets.find(s => s.properties?.title === sheetTitle);
        if (sheetToDelete?.properties?.sheetId) {
          try {
            await sheets.spreadsheets.batchUpdate({
              spreadsheetId,
              requestBody: {
                requests: [
                  {
                    deleteSheet: {
                      sheetId: sheetToDelete.properties.sheetId,
                    },
                  },
                ],
              },
            });
            console.log(`Deleted old snapshot sheet: ${sheetTitle}`);
          } catch (error) {
            console.error(`Failed to delete old snapshot sheet ${sheetTitle}:`, error);
          }
        }
      }
    }

    return {
      success: true,
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      sheetTitle: snapshotSheetTitle,
      memberCount: members.length,
    };

  } catch (error) {
    console.error('Error exporting to Google Sheets:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function isGoogleSheetsConnected(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}

export async function getSpreadsheetInfo(): Promise<{
  connected: boolean;
  spreadsheetUrl?: string;
  lastSnapshot?: string;
  totalSnapshots?: number;
}> {
  try {
    const drive = await getGoogleDriveClient();

    const response = await drive.files.list({
      q: `name='${SPREADSHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
      fields: 'files(id, name, modifiedTime)',
    });

    if (!response.data.files || response.data.files.length === 0) {
      return { connected: true };
    }

    const spreadsheetId = response.data.files[0].id!;
    const sheets = await getGoogleSheetsClient();

    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties.title',
    });

    const snapshotSheets = (spreadsheet.data.sheets || [])
      .map(s => s.properties?.title)
      .filter(title => title && title !== 'Current' && /^\d{4}-\d{2}-\d{2}$/.test(title))
      .sort()
      .reverse();

    return {
      connected: true,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      lastSnapshot: snapshotSheets[0] || undefined,
      totalSnapshots: snapshotSheets.length,
    };
  } catch {
    return { connected: false };
  }
}
