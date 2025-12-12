import { NextRequest, NextResponse } from 'next/server';

// In-memory config store (in production, use database or file)
let systemConfig = {
  defaultLanguage: 'ar',
  dateFormat: 'DD/MM/YYYY',
  treeDisplayMode: 'vertical',
  showDeceasedMembers: true,
  minBirthYear: 1900,
  maxBirthYear: new Date().getFullYear(),
  requirePhone: false,
  requireEmail: false,
  allowDuplicateNames: true,
  sessionTimeout: 60,
  maxLoginAttempts: 5,
  requireStrongAccessCode: false,
  enableBranchEntries: true,
  enablePublicRegistry: true,
  enableExport: true,
  enableImport: true,
  autoBackup: true,
  autoBackupInterval: 24,
};

export async function GET() {
  try {
    return NextResponse.json({ config: systemConfig });
  } catch (error) {
    console.error('Error fetching config:', error);
    return NextResponse.json({ config: systemConfig });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Update config
    systemConfig = {
      ...systemConfig,
      ...body,
    };

    return NextResponse.json({ config: systemConfig, success: true });
  } catch (error) {
    console.error('Error updating config:', error);
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
}
