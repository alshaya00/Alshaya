import { NextRequest, NextResponse } from 'next/server';
import { findSessionByToken, findUserById } from '@/lib/auth/store';
import { logger } from '@/lib/logging';
import { z } from 'zod';

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

// Strict schema for system config - only these fields are allowed
const systemConfigSchema = z.object({
  defaultLanguage: z.enum(['ar', 'en']).optional(),
  dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).optional(),
  treeDisplayMode: z.enum(['vertical', 'horizontal', 'radial']).optional(),
  showDeceasedMembers: z.boolean().optional(),
  minBirthYear: z.number().int().min(1800).max(1950).optional(),
  maxBirthYear: z.number().int().min(1950).max(new Date().getFullYear() + 1).optional(),
  requirePhone: z.boolean().optional(),
  requireEmail: z.boolean().optional(),
  allowDuplicateNames: z.boolean().optional(),
  sessionTimeout: z.number().int().min(15).max(1440).optional(), // 15 mins to 24 hours
  maxLoginAttempts: z.number().int().min(3).max(10).optional(),
  requireStrongAccessCode: z.boolean().optional(),
  enableBranchEntries: z.boolean().optional(),
  enablePublicRegistry: z.boolean().optional(),
  enableExport: z.boolean().optional(),
  enableImport: z.boolean().optional(),
  autoBackup: z.boolean().optional(),
  autoBackupInterval: z.number().int().min(1).max(168).optional(), // 1 to 168 hours (1 week)
}).strict(); // Reject any unknown keys

// In-memory config store (in production, use database or file)
let systemConfig: z.infer<typeof systemConfigSchema> & Record<string, unknown> = {
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

    return NextResponse.json({ success: true, config: systemConfig });
  } catch (error) {
    logger.error('Error fetching config:', error);
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
      logger.security('Non-super-admin attempted to update system config', 'high', {
        userId: user.id,
        userRole: user.role,
      });
      return NextResponse.json(
        { success: false, message: 'Super admin access required', messageAr: 'يتطلب صلاحيات المدير الأعلى' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate input using strict schema - rejects unknown keys
    const validation = systemConfigSchema.safeParse(body);
    if (!validation.success) {
      logger.warn('Invalid config update attempt', {
        userId: user.id,
        errors: validation.error.flatten().fieldErrors,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid configuration values',
          errorAr: 'قيم الإعدادات غير صالحة',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Only update validated fields
    const validatedData = validation.data;
    const previousConfig = { ...systemConfig };

    // Merge only the validated fields
    systemConfig = {
      ...systemConfig,
      ...validatedData,
    };

    logger.info('System config updated', {
      userId: user.id,
      changes: Object.keys(validatedData),
      previousValues: previousConfig,
      newValues: systemConfig,
    });

    return NextResponse.json({
      success: true,
      config: systemConfig,
      message: 'Configuration updated successfully',
      messageAr: 'تم تحديث الإعدادات بنجاح',
    });
  } catch (error) {
    logger.error('Error updating config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update config' },
      { status: 500 }
    );
  }
}
