import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { logAuditToDb } from '@/lib/db-audit';

async function getAuthAdmin(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) return null;

  const session = await findSessionByToken(token);
  if (!session) return null;

  const user = await findUserById(session.userId);
  if (!user || user.status !== 'ACTIVE') return null;

  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') return null;

  return user;
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthAdmin(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Admin access required', messageAr: 'يتطلب صلاحيات المدير' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { member1Id, member2Id, action, reason } = body;

    if (!member1Id || !member2Id) {
      return NextResponse.json(
        { success: false, error: 'Missing member IDs', errorAr: 'معرفات الأعضاء مطلوبة' },
        { status: 400 }
      );
    }

    if (action !== 'mark_not_duplicate' && action !== 'revert') {
      return NextResponse.json(
        { success: false, error: 'Invalid action', errorAr: 'إجراء غير صالح' },
        { status: 400 }
      );
    }

    const [member1, member2] = await Promise.all([
      prisma.familyMember.findUnique({
        where: { id: member1Id },
        select: { id: true, firstName: true, fullNameAr: true }
      }),
      prisma.familyMember.findUnique({
        where: { id: member2Id },
        select: { id: true, firstName: true, fullNameAr: true }
      })
    ]);

    if (!member1 || !member2) {
      return NextResponse.json(
        { success: false, error: 'One or both members not found', errorAr: 'أحد الأعضاء أو كلاهما غير موجود' },
        { status: 404 }
      );
    }

    const sortedIds = [member1Id, member2Id].sort();
    const sourceId = sortedIds[0];
    const targetId = sortedIds[1];

    const existingFlag = await prisma.duplicateFlag.findUnique({
      where: {
        sourceMemberId_targetMemberId: {
          sourceMemberId: sourceId,
          targetMemberId: targetId
        }
      }
    });

    if (action === 'mark_not_duplicate') {
      const previousState = existingFlag ? {
        status: existingFlag.status,
        resolution: existingFlag.resolution,
        resolvedBy: existingFlag.resolvedBy,
        resolvedAt: existingFlag.resolvedAt?.toISOString()
      } : null;

      const result = await prisma.duplicateFlag.upsert({
        where: {
          sourceMemberId_targetMemberId: {
            sourceMemberId: sourceId,
            targetMemberId: targetId
          }
        },
        create: {
          sourceMemberId: sourceId,
          targetMemberId: targetId,
          matchScore: 0,
          matchReasons: 'Manual verification - marked as not duplicate',
          status: 'VERIFIED_DIFFERENT',
          resolution: reason || 'Verified as different people by admin',
          resolvedBy: user.id,
          resolvedAt: new Date(),
          detectedBy: 'ADMIN'
        },
        update: {
          status: 'VERIFIED_DIFFERENT',
          resolution: reason || 'Verified as different people by admin',
          resolvedBy: user.id,
          resolvedAt: new Date()
        }
      });

      await logAuditToDb({
        action: 'DATA_CLEANUP',
        severity: 'INFO',
        userId: user.id,
        userName: user.nameArabic || user.email,
        userRole: user.role,
        targetType: 'DUPLICATE_FLAG',
        targetId: result.id,
        targetName: `${member1.fullNameAr || member1.firstName} / ${member2.fullNameAr || member2.firstName}`,
        description: `تم تأكيد أن العضوين مختلفان: ${member1.fullNameAr} و ${member2.fullNameAr}`,
        previousState: previousState || undefined,
        newState: {
          status: 'VERIFIED_DIFFERENT',
          resolution: reason || 'Verified as different people by admin',
          resolvedBy: user.id,
          resolvedAt: new Date().toISOString()
        },
        details: {
          member1Id,
          member2Id,
          member1Name: member1.fullNameAr || member1.firstName,
          member2Name: member2.fullNameAr || member2.firstName,
          reason
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Members marked as verified different people',
        messageAr: 'تم تأكيد أن الأعضاء أشخاص مختلفون',
        flagId: result.id
      });

    } else if (action === 'revert') {
      if (!existingFlag) {
        return NextResponse.json(
          { success: false, error: 'No existing flag to revert', errorAr: 'لا يوجد علامة للتراجع عنها' },
          { status: 404 }
        );
      }

      const previousState = {
        status: existingFlag.status,
        resolution: existingFlag.resolution,
        resolvedBy: existingFlag.resolvedBy,
        resolvedAt: existingFlag.resolvedAt?.toISOString()
      };

      await prisma.duplicateFlag.delete({
        where: {
          sourceMemberId_targetMemberId: {
            sourceMemberId: sourceId,
            targetMemberId: targetId
          }
        }
      });

      await logAuditToDb({
        action: 'DATA_CLEANUP_REVERT',
        severity: 'WARNING',
        userId: user.id,
        userName: user.nameArabic || user.email,
        userRole: user.role,
        targetType: 'DUPLICATE_FLAG',
        targetId: existingFlag.id,
        targetName: `${member1.fullNameAr || member1.firstName} / ${member2.fullNameAr || member2.firstName}`,
        description: `تم التراجع عن تأكيد اختلاف العضوين: ${member1.fullNameAr} و ${member2.fullNameAr}`,
        previousState,
        newState: null,
        details: {
          member1Id,
          member2Id,
          member1Name: member1.fullNameAr || member1.firstName,
          member2Name: member2.fullNameAr || member2.firstName
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Verification reverted',
        messageAr: 'تم التراجع عن التأكيد'
      });
    }

  } catch (error) {
    console.error('Data cleanup resolve error:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في حفظ التغييرات' },
      { status: 500 }
    );
  }
}
