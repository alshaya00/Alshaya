import { NextRequest, NextResponse } from 'next/server';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { prisma } from '@/lib/prisma';
import { invalidateConfigCache } from '@/lib/settings';

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

const DEFAULT_CONFIG = {
  defaultLanguage: 'ar',
  dateFormat: 'DD/MM/YYYY',
  treeDisplayMode: 'vertical',
  showDeceasedMembers: true,
  minBirthYear: 1400,
  maxBirthYear: new Date().getFullYear(),
  requirePhone: false,
  requireEmail: false,
  allowDuplicateNames: true,
  sessionTimeout: 60,
  maxLoginAttempts: 20,
  requireStrongAccessCode: false,
  enableBranchEntries: true,
  enablePublicRegistry: true,
  enableExport: true,
  enableImport: true,
  autoBackup: true,
  autoBackupInterval: 24,
};

async function getOrCreateConfig() {
  let config = await prisma.systemConfig.findUnique({
    where: { id: 'default' }
  });

  if (!config) {
    config = await prisma.systemConfig.create({
      data: { id: 'default' }
    });
  }

  return config;
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
        { success: false, message: 'Admin access required', messageAr: 'يتطلب صلاحيات المدير' },
        { status: 403 }
      );
    }

    const config = await getOrCreateConfig();

    return NextResponse.json({ 
      config: {
        defaultLanguage: config.defaultLanguage,
        dateFormat: config.dateFormat,
        treeDisplayMode: config.treeDisplayMode,
        showDeceasedMembers: config.showDeceasedMembers,
        minBirthYear: config.minBirthYear,
        maxBirthYear: config.maxBirthYear,
        requirePhone: config.requirePhone,
        requireEmail: config.requireEmail,
        allowDuplicateNames: config.allowDuplicateNames,
        sessionTimeout: config.sessionTimeout,
        maxLoginAttempts: config.maxLoginAttempts,
        requireStrongAccessCode: config.requireStrongAccessCode,
        enableBranchEntries: config.enableBranchEntries,
        enablePublicRegistry: config.enablePublicRegistry,
        enableExport: config.enableExport,
        enableImport: config.enableImport,
        autoBackup: config.autoBackup,
        autoBackupInterval: config.autoBackupInterval,
      },
      success: true 
    });
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

    const updateData: Record<string, unknown> = {};
    
    if (body.defaultLanguage !== undefined) updateData.defaultLanguage = body.defaultLanguage;
    if (body.dateFormat !== undefined) updateData.dateFormat = body.dateFormat;
    if (body.treeDisplayMode !== undefined) updateData.treeDisplayMode = body.treeDisplayMode;
    if (body.showDeceasedMembers !== undefined) updateData.showDeceasedMembers = body.showDeceasedMembers;
    if (body.minBirthYear !== undefined) updateData.minBirthYear = Number(body.minBirthYear);
    if (body.maxBirthYear !== undefined) updateData.maxBirthYear = Number(body.maxBirthYear);
    if (body.requirePhone !== undefined) updateData.requirePhone = body.requirePhone;
    if (body.requireEmail !== undefined) updateData.requireEmail = body.requireEmail;
    if (body.allowDuplicateNames !== undefined) updateData.allowDuplicateNames = body.allowDuplicateNames;
    if (body.sessionTimeout !== undefined) updateData.sessionTimeout = Number(body.sessionTimeout);
    if (body.maxLoginAttempts !== undefined) updateData.maxLoginAttempts = Number(body.maxLoginAttempts);
    if (body.requireStrongAccessCode !== undefined) updateData.requireStrongAccessCode = body.requireStrongAccessCode;
    if (body.enableBranchEntries !== undefined) updateData.enableBranchEntries = body.enableBranchEntries;
    if (body.enablePublicRegistry !== undefined) updateData.enablePublicRegistry = body.enablePublicRegistry;
    if (body.enableExport !== undefined) updateData.enableExport = body.enableExport;
    if (body.enableImport !== undefined) updateData.enableImport = body.enableImport;
    if (body.autoBackup !== undefined) updateData.autoBackup = body.autoBackup;
    if (body.autoBackupInterval !== undefined) updateData.autoBackupInterval = Number(body.autoBackupInterval);

    const config = await prisma.systemConfig.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...updateData },
      update: updateData,
    });

    invalidateConfigCache();

    return NextResponse.json({ 
      config: {
        defaultLanguage: config.defaultLanguage,
        dateFormat: config.dateFormat,
        treeDisplayMode: config.treeDisplayMode,
        showDeceasedMembers: config.showDeceasedMembers,
        minBirthYear: config.minBirthYear,
        maxBirthYear: config.maxBirthYear,
        requirePhone: config.requirePhone,
        requireEmail: config.requireEmail,
        allowDuplicateNames: config.allowDuplicateNames,
        sessionTimeout: config.sessionTimeout,
        maxLoginAttempts: config.maxLoginAttempts,
        requireStrongAccessCode: config.requireStrongAccessCode,
        enableBranchEntries: config.enableBranchEntries,
        enablePublicRegistry: config.enablePublicRegistry,
        enableExport: config.enableExport,
        enableImport: config.enableImport,
        autoBackup: config.autoBackup,
        autoBackupInterval: config.autoBackupInterval,
      },
      success: true 
    });
  } catch (error) {
    console.error('Error updating config:', error);
    return NextResponse.json({ success: false, error: 'Failed to update config' }, { status: 500 });
  }
}
