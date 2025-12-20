import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

// Default feature flags
const defaultFlags = {
  // Core Pages
  familyTree: true,
  registry: true,
  journals: true,
  gallery: true,
  gatherings: true,
  dashboard: true,
  search: true,
  branches: true,

  // Data Management
  quickAdd: true,
  importData: true,
  exportData: true,
  treeEditor: true,
  duplicates: true,
  changeHistory: true,

  // User Features
  registration: true,
  invitations: true,
  accessRequests: true,
  profiles: true,

  // Special Features
  breastfeeding: true,
  branchEntries: true,
  onboarding: true,

  // Admin Features
  imageModeration: true,
  broadcasts: true,
  reports: true,
  audit: true,
  apiServices: true,
};

export async function GET(request: NextRequest) {
  try {
    // For reading, allow public access (features should be checked by all users)
    // But we still try to get the stored flags from DB
    let flags = { ...defaultFlags };

    try {
      const dbFlags = await prisma.featureFlag.findUnique({
        where: { id: 'default' },
      });

      if (dbFlags) {
        // Extract only the flag fields (not id, updatedAt, updatedBy)
        const { id, updatedAt, updatedBy, ...flagValues } = dbFlags;
        flags = { ...defaultFlags, ...flagValues };
      }
    } catch (dbError) {
      console.warn('Database not available, using default flags:', dbError);
    }

    return NextResponse.json({ flags, success: true });
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    return NextResponse.json(
      { flags: defaultFlags, success: true },
      { status: 200 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // SECURITY: Require SUPER_ADMIN or ADMIN authentication for modifying flags
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

    const body = await request.json();

    // Validate the body - only accept known feature keys
    const validKeys = Object.keys(defaultFlags);
    const updates: Record<string, boolean> = {};

    for (const [key, value] of Object.entries(body)) {
      if (validKeys.includes(key) && typeof value === 'boolean') {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, message: 'No valid updates provided', messageAr: 'لا توجد تحديثات صالحة' },
        { status: 400 }
      );
    }

    try {
      // Upsert the feature flags in the database
      const updatedFlags = await prisma.featureFlag.upsert({
        where: { id: 'default' },
        update: {
          ...updates,
          updatedBy: user.id,
        },
        create: {
          id: 'default',
          ...defaultFlags,
          ...updates,
          updatedBy: user.id,
        },
      });

      // Extract only the flag fields
      const { id, updatedAt, updatedBy, ...flagValues } = updatedFlags;

      return NextResponse.json({
        flags: flagValues,
        success: true,
        message: 'Feature flags updated successfully',
        messageAr: 'تم تحديث إعدادات الميزات بنجاح',
      });
    } catch (dbError) {
      console.error('Database error updating flags:', dbError);
      // Return success with the requested updates (client-side will use localStorage)
      return NextResponse.json({
        flags: { ...defaultFlags, ...updates },
        success: true,
        fallback: true,
        message: 'Saved locally (database unavailable)',
        messageAr: 'تم الحفظ محلياً (قاعدة البيانات غير متاحة)',
      });
    }
  } catch (error) {
    console.error('Error updating feature flags:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update feature flags', messageAr: 'فشل في تحديث إعدادات الميزات' },
      { status: 500 }
    );
  }
}
