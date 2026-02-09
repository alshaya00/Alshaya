import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { normalizeMemberId } from '@/lib/utils';

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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const memberId = normalizeMemberId(params.id) || params.id;
    const body = await request.json();
    const { changeId, revertData, checkOnly } = body;

    if (checkOnly && changeId) {
      const originalChange = await prisma.changeHistory.findUnique({
        where: { id: changeId },
        select: {
          id: true,
          changedAt: true,
          fieldName: true,
          oldValue: true,
          newValue: true,
        },
      });

      if (!originalChange) {
        return NextResponse.json({
          success: false,
          message: 'Change not found',
          messageAr: 'التغيير غير موجود',
        }, { status: 404 });
      }

      const laterChanges = await prisma.changeHistory.findMany({
        where: {
          memberId,
          changedAt: { gt: originalChange.changedAt },
        },
        orderBy: { changedAt: 'desc' },
        select: {
          id: true,
          fieldName: true,
          oldValue: true,
          newValue: true,
          changedAt: true,
          changedByName: true,
        },
      });

      const affectedChanges = laterChanges.filter((change) => {
        if (change.fieldName === originalChange.fieldName) return true;
        
        const dependentFields: Record<string, string[]> = {
          fatherId: ['generation', 'branch', 'lineagePath', 'fatherName'],
          generation: ['lineagePath'],
          status: ['deathYear', 'deathCalendar'],
        };

        const affected = dependentFields[originalChange.fieldName] || [];
        return affected.includes(change.fieldName);
      });

      return NextResponse.json({
        success: true,
        hasConflicts: affectedChanges.length > 0,
        affectedChanges: affectedChanges.map((c) => ({
          id: c.id,
          fieldName: c.fieldName,
          oldValue: c.oldValue,
          newValue: c.newValue,
          changedAt: c.changedAt,
          changedByName: c.changedByName,
        })),
        originalChange: {
          fieldName: originalChange.fieldName,
          oldValue: originalChange.oldValue,
          newValue: originalChange.newValue,
        },
      });
    }

    if (!revertData) {
      return NextResponse.json({
        success: false,
        message: 'No revert data provided',
        messageAr: 'لا توجد بيانات للتراجع',
      }, { status: 400 });
    }

    const currentMember = await prisma.familyMember.findUnique({
      where: { id: memberId },
    });

    if (!currentMember) {
      return NextResponse.json({
        success: false,
        message: 'Member not found',
        messageAr: 'العضو غير موجود',
      }, { status: 404 });
    }

    const changedFields: string[] = [];
    const updateData: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(revertData)) {
      if (key in currentMember) {
        const currentValue = (currentMember as Record<string, unknown>)[key];
        if (currentValue !== value) {
          changedFields.push(key);
          updateData[key] = value;

          await prisma.changeHistory.create({
            data: {
              memberId,
              fieldName: key,
              oldValue: currentValue !== null && currentValue !== undefined ? String(currentValue) : null,
              newValue: value !== null && value !== undefined ? String(value) : null,
              changeType: 'REVERT',
              changedBy: user.id,
              changedByName: user.nameArabic || user.email,
              reason: `تراجع عن تغيير سابق${changeId ? ` (${changeId})` : ''}`,
            },
          });
        }
      }
    }

    if (changedFields.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No changes to revert',
        messageAr: 'لا توجد تغييرات للتراجع عنها',
      });
    }

    await prisma.familyMember.update({
      where: { id: memberId },
      data: {
        ...updateData,
        lastModifiedBy: user.id,
        version: { increment: 1 },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaAny = prisma as any;
    if (prismaAny.auditLog) {
      await prismaAny.auditLog.create({
        data: {
          action: 'MEMBER_UPDATE',
          severity: 'INFO',
          userId: user.id,
          userName: user.nameArabic || user.email,
          userRole: user.role,
          targetType: 'MEMBER',
          targetId: memberId,
          targetName: currentMember.fullNameAr || currentMember.firstName,
          description: `تراجع عن تغييرات: ${changedFields.join('، ')}`,
          details: JSON.stringify({ changedFields, revertedFrom: changeId }),
          previousState: JSON.stringify(currentMember),
          newState: JSON.stringify({ ...currentMember, ...updateData }),
          success: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Changes reverted successfully',
      messageAr: 'تم التراجع عن التغييرات بنجاح',
      revertedFields: changedFields,
    });
  } catch (error) {
    console.error('Error reverting changes:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to revert changes' },
      { status: 500 }
    );
  }
}
