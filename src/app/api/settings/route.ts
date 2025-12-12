import { NextRequest, NextResponse } from 'next/server';
import {
  findSessionByToken,
  findUserById,
  getSiteSettings,
  updateSiteSettings,
  getPrivacySettings,
  updatePrivacySettings,
  getPermissionMatrix,
  updatePermissionMatrix,
  logActivity,
} from '@/lib/auth/store';
import { getPermissionsForRole, validatePermissionMatrix } from '@/lib/auth/permissions';
import { PermissionMatrix } from '@/lib/auth/types';

// Helper to get auth user from request
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

// GET /api/settings - Get settings (public site settings, restricted privacy/permissions)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'site';

    // Site settings can be partially public
    if (type === 'site') {
      const settings = await getSiteSettings();
      return NextResponse.json({
        success: true,
        settings: {
          familyNameArabic: settings.familyNameArabic,
          familyNameEnglish: settings.familyNameEnglish,
          taglineArabic: settings.taglineArabic,
          taglineEnglish: settings.taglineEnglish,
          defaultLanguage: settings.defaultLanguage,
          allowSelfRegistration: settings.allowSelfRegistration,
          allowGuestPreview: settings.allowGuestPreview,
        },
      });
    }

    // Privacy and permissions require auth
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    if (type === 'privacy') {
      const permissions = getPermissionsForRole(user.role);
      if (!permissions.manage_privacy_settings && user.role !== 'SUPER_ADMIN') {
        // Return limited privacy info for regular users
        const privacy = await getPrivacySettings();
        return NextResponse.json({
          success: true,
          settings: {
            showOccupation: privacy.showOccupation,
            showCity: privacy.showCity,
            showBiography: privacy.showBiography,
          },
        });
      }

      const privacy = await getPrivacySettings();
      return NextResponse.json({ success: true, settings: privacy });
    }

    if (type === 'permissions') {
      const permissions = getPermissionsForRole(user.role);
      if (!permissions.manage_permission_matrix) {
        return NextResponse.json(
          { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
          { status: 403 }
        );
      }

      const matrix = await getPermissionMatrix();
      return NextResponse.json({ success: true, permissions: matrix });
    }

    if (type === 'full') {
      // Full settings require super admin
      if (user.role !== 'SUPER_ADMIN') {
        return NextResponse.json(
          { success: false, message: 'Super admin required', messageAr: 'مطلوب صلاحية المدير العام' },
          { status: 403 }
        );
      }

      const [site, privacy, permissionMatrix] = await Promise.all([
        getSiteSettings(),
        getPrivacySettings(),
        getPermissionMatrix(),
      ]);

      return NextResponse.json({
        success: true,
        site,
        privacy,
        permissions: permissionMatrix,
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid settings type', messageAr: 'نوع الإعدادات غير صالح' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get settings', messageAr: 'فشل جلب الإعدادات' },
      { status: 500 }
    );
  }
}

// PATCH /api/settings - Update settings
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json(
        { success: false, message: 'Type and data are required', messageAr: 'النوع والبيانات مطلوبة' },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    if (type === 'site') {
      const permissions = getPermissionsForRole(user.role);
      if (!permissions.manage_site_settings) {
        return NextResponse.json(
          { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
          { status: 403 }
        );
      }

      const previousSettings = await getSiteSettings();
      const updated = await updateSiteSettings(data);

      await logActivity({
        userId: user.id,
        userEmail: user.email,
        userName: user.nameArabic,
        action: 'UPDATE_SETTINGS',
        category: 'SETTINGS',
        targetType: 'SITE_SETTINGS',
        details: { previous: previousSettings, updated: data },
        ipAddress,
        userAgent,
        success: true,
      });

      return NextResponse.json({
        success: true,
        message: 'Site settings updated',
        messageAr: 'تم تحديث إعدادات الموقع',
        settings: updated,
      });
    }

    if (type === 'privacy') {
      const permissions = getPermissionsForRole(user.role);
      if (!permissions.manage_privacy_settings) {
        return NextResponse.json(
          { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
          { status: 403 }
        );
      }

      const previousSettings = await getPrivacySettings();
      const updated = await updatePrivacySettings(data);

      await logActivity({
        userId: user.id,
        userEmail: user.email,
        userName: user.nameArabic,
        action: 'UPDATE_PRIVACY',
        category: 'SETTINGS',
        targetType: 'PRIVACY_SETTINGS',
        details: { previous: previousSettings, updated: data },
        ipAddress,
        userAgent,
        success: true,
      });

      return NextResponse.json({
        success: true,
        message: 'Privacy settings updated',
        messageAr: 'تم تحديث إعدادات الخصوصية',
        settings: updated,
      });
    }

    if (type === 'permissions') {
      const permissions = getPermissionsForRole(user.role);
      if (!permissions.manage_permission_matrix) {
        return NextResponse.json(
          { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
          { status: 403 }
        );
      }

      // Validate the permission matrix
      const validation = validatePermissionMatrix(data);
      if (!validation.valid) {
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid permission matrix',
            messageAr: 'مصفوفة الصلاحيات غير صالحة',
            errors: validation.errors,
          },
          { status: 400 }
        );
      }

      const previousMatrix = await getPermissionMatrix();
      const updated = await updatePermissionMatrix(data as PermissionMatrix);

      await logActivity({
        userId: user.id,
        userEmail: user.email,
        userName: user.nameArabic,
        action: 'UPDATE_PERMISSIONS',
        category: 'SETTINGS',
        targetType: 'PERMISSION_MATRIX',
        details: { changesCount: Object.keys(data).length },
        ipAddress,
        userAgent,
        success: true,
      });

      return NextResponse.json({
        success: true,
        message: 'Permission matrix updated',
        messageAr: 'تم تحديث مصفوفة الصلاحيات',
        permissions: updated,
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid settings type', messageAr: 'نوع الإعدادات غير صالح' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update settings', messageAr: 'فشل تحديث الإعدادات' },
      { status: 500 }
    );
  }
}
