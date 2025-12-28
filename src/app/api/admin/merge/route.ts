import { NextRequest, NextResponse } from 'next/server';
import { generateMergePreview, mergeMemberProfiles } from '@/lib/merge-service';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';

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

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const permissions = getPermissionsForRole(user.role);
    if (!permissions.edit_members && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, sourceId, targetId, keepSourceFields, reason } = body;

    if (!sourceId || !targetId) {
      return NextResponse.json(
        { success: false, message: 'Source and target IDs are required', messageAr: 'معرف المصدر والهدف مطلوبان' },
        { status: 400 }
      );
    }

    if (sourceId === targetId) {
      return NextResponse.json(
        { success: false, message: 'Cannot merge a member with itself', messageAr: 'لا يمكن دمج العضو مع نفسه' },
        { status: 400 }
      );
    }

    if (action === 'preview') {
      const preview = await generateMergePreview(sourceId, targetId);

      if (!preview) {
        return NextResponse.json(
          { success: false, message: 'One or both members not found', messageAr: 'لم يتم العثور على أحد الأعضاء أو كلاهما' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        preview: {
          source: {
            id: preview.source.id,
            firstName: preview.source.firstName,
            fullNameAr: preview.source.fullNameAr,
            fullNameEn: preview.source.fullNameEn,
            generation: preview.source.generation,
            branch: preview.source.branch,
            birthYear: preview.source.birthYear,
            gender: preview.source.gender,
          },
          target: {
            id: preview.target.id,
            firstName: preview.target.firstName,
            fullNameAr: preview.target.fullNameAr,
            fullNameEn: preview.target.fullNameEn,
            generation: preview.target.generation,
            branch: preview.target.branch,
            birthYear: preview.target.birthYear,
            gender: preview.target.gender,
          },
          conflicts: preview.conflicts,
          impactedChildren: preview.impactedChildren,
          impactedPhotos: preview.impactedPhotos,
          impactedJournals: preview.impactedJournals,
          warnings: preview.warnings,
          warningsAr: preview.warningsAr,
        },
      });
    }

    if (action === 'merge') {
      const result = await mergeMemberProfiles(sourceId, targetId, {
        keepSourceFields: keepSourceFields || [],
        performedBy: user.id,
        reason: reason || 'Duplicate profile merge',
      });

      return NextResponse.json(result);
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action. Use "preview" or "merge"', messageAr: 'إجراء غير صالح. استخدم "preview" أو "merge"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in merge API:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process merge request', messageAr: 'فشل في معالجة طلب الدمج' },
      { status: 500 }
    );
  }
}
