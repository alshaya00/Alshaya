import { NextRequest, NextResponse } from 'next/server';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { 
  checkDataConsistency,
  validateGenerations,
  validateParentRelationships,
  validateOrphanedMembers,
  validateCircularAncestry,
  validateDeletedReferences,
  validateDuplicateMembers,
  validateChildrenCounts,
  validateLineageConsistency,
  validatePendingMembers,
  type DataConsistencyReport,
  type ValidationResult
} from '@/lib/data-integrity';

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

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const permissions = getPermissionsForRole(user.role);
    if (!permissions.view_audit_logs && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const checkType = searchParams.get('type') || 'full';

    let report: DataConsistencyReport | { validation: ValidationResult };

    switch (checkType) {
      case 'generations':
        report = { validation: await validateGenerations() };
        break;
      case 'parents':
        report = { validation: await validateParentRelationships() };
        break;
      case 'orphans':
        report = { validation: await validateOrphanedMembers() };
        break;
      case 'circular':
        report = { validation: await validateCircularAncestry() };
        break;
      case 'deleted-refs':
        report = { validation: await validateDeletedReferences() };
        break;
      case 'duplicates':
        report = { validation: await validateDuplicateMembers() };
        break;
      case 'children-counts':
        report = { validation: await validateChildrenCounts() };
        break;
      case 'lineage':
        report = { validation: await validateLineageConsistency() };
        break;
      case 'pending':
        report = { validation: await validatePendingMembers() };
        break;
      case 'full':
      default:
        report = await checkDataConsistency();
        break;
    }

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error running data validation:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to run data validation', 
        messageAr: 'فشل في تشغيل التحقق من البيانات' 
      },
      { status: 500 }
    );
  }
}
