import { NextRequest, NextResponse } from 'next/server';
import { findSessionByToken, findUserById } from '@/lib/auth/store';

// Helper to get authenticated user from request
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

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require SUPER_ADMIN authentication
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required', messageAr: 'يتطلب صلاحيات المدير' },
        { status: 403 }
      );
    }

    return NextResponse.json({ config: systemConfig });
  } catch (error) {
    console.error('Error fetching config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch config' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // SECURITY: Require SUPER_ADMIN authentication
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Super admin access required', messageAr: 'يتطلب صلاحيات المدير الأعلى' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Update config
    systemConfig = {
      ...systemConfig,
      ...body,
    };

    return NextResponse.json({ config: systemConfig, success: true });
  } catch (error) {
    console.error('Error updating config:', error);
    return NextResponse.json({ success: false, error: 'Failed to update config' }, { status: 500 });
  }
}
