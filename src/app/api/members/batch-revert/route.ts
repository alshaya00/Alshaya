import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { logAuditToDb } from '@/lib/db-audit';
export const dynamic = "force-dynamic";

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

    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { batchId, preview } = body;

    if (!batchId) {
      return NextResponse.json(
        { success: false, message: 'batchId is required', messageAr: 'معرف الدفعة مطلوب' },
        { status: 400 }
      );
    }

    const changeRecords = await prisma.changeHistory.findMany({
      where: { batchId },
      orderBy: { changedAt: 'asc' },
    });

    if (changeRecords.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No changes found for this batch', messageAr: 'لا توجد تغييرات لهذه الدفعة' },
        { status: 404 }
      );
    }

    const grouped = new Map<string, typeof changeRecords>();
    for (const record of changeRecords) {
      const existing = grouped.get(record.memberId) || [];
      existing.push(record);
      grouped.set(record.memberId, existing);
    }

    const details: Array<{ memberId: string; firstName: string; fields: string[] }> = [];
    let totalFields = 0;

    for (const [memberId, records] of grouped) {
      const member = await prisma.familyMember.findUnique({
        where: { id: memberId },
        select: { firstName: true },
      });

      const fields = records.map(r => r.fieldName);
      totalFields += fields.length;

      details.push({
        memberId,
        firstName: member?.firstName || 'غير معروف',
        fields,
      });
    }

    if (preview) {
      return NextResponse.json({
        success: true,
        preview: true,
        revertedMembers: grouped.size,
        revertedFields: totalFields,
        details,
      });
    }

    for (const [memberId, records] of grouped) {
      const revertData: Record<string, unknown> = {};

      for (const record of records) {
        const numericFields = ['birthYear', 'deathYear', 'generation', 'sonsCount', 'daughtersCount'];
        if (numericFields.includes(record.fieldName)) {
          revertData[record.fieldName] = record.oldValue !== null ? parseInt(record.oldValue, 10) : null;
        } else {
          revertData[record.fieldName] = record.oldValue;
        }
      }

      try {
        await prisma.familyMember.update({
          where: { id: memberId },
          data: {
            ...revertData,
            version: { increment: 1 },
          },
        });

        const currentMember = await prisma.familyMember.findUnique({
          where: { id: memberId },
          select: { firstName: true, fullNameAr: true },
        });

        for (const record of records) {
          await prisma.changeHistory.create({
            data: {
              memberId,
              fieldName: record.fieldName,
              oldValue: record.newValue,
              newValue: record.oldValue,
              changeType: 'REVERT',
              changedBy: user.id,
              changedByName: user.nameArabic || user.email,
              reason: `تراجع دفعة: ${batchId}`,
            },
          });
        }

        await logAuditToDb({
          action: 'BATCH_REVERT',
          severity: 'WARNING',
          userId: user.id,
          userName: user.nameArabic || user.email,
          userRole: user.role,
          targetType: 'MEMBER',
          targetId: memberId,
          targetName: currentMember?.fullNameAr || currentMember?.firstName || memberId,
          description: `تراجع دفعة عن ${records.length} تغييرات للعضو`,
          details: {
            batchId,
            fields: records.map(r => r.fieldName),
          },
          success: true,
        });
      } catch (err) {
        console.error(`Failed to revert member ${memberId}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      revertedMembers: grouped.size,
      revertedFields: totalFields,
      details,
    });
  } catch (error) {
    console.error('Error in batch revert:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform batch revert' },
      { status: 500 }
    );
  }
}
