import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById, logActivity } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { logAuditToDb } from '@/lib/db-audit';
import { approvePendingMemberTransactional } from '@/lib/transactional-approval';

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

export async function GET(
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

    const permissions = getPermissionsForRole(user.role);
    if (!permissions.approve_pending_members && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const pending = await prisma.pendingMember.findUnique({
      where: { id: params.id },
    });

    if (!pending) {
      return NextResponse.json(
        { success: false, message: 'Pending member not found', messageAr: 'العضو المعلق غير موجود' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, pending });
  } catch (error) {
    console.error('Error fetching pending member:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch pending member' },
      { status: 500 }
    );
  }
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

    const permissions = getPermissionsForRole(user.role);
    if (!permissions.approve_pending_members && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, reviewNote, overrideDuplicateCheck } = body;

    if (!action || !['approve', 'reject', 'merge_update', 'restore'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Invalid action', messageAr: 'الإجراء غير صالح' },
        { status: 400 }
      );
    }

    const pending = await prisma.pendingMember.findUnique({
      where: { id: params.id },
    });

    if (!pending) {
      return NextResponse.json(
        { success: false, message: 'Pending member not found', messageAr: 'العضو المعلق غير موجود' },
        { status: 404 }
      );
    }

    // For restore action, member must be REJECTED
    if (action === 'restore') {
      if (pending.reviewStatus !== 'REJECTED') {
        return NextResponse.json(
          { success: false, message: 'Only rejected members can be restored', messageAr: 'يمكن استعادة الطلبات المرفوضة فقط' },
          { status: 400 }
        );
      }
    } else if (pending.reviewStatus !== 'PENDING') {
      // For other actions, member must be PENDING
      return NextResponse.json(
        { success: false, message: 'Already processed', messageAr: 'تمت المعالجة مسبقاً' },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    if (action === 'approve') {
      const result = await approvePendingMemberTransactional({
        pendingId: params.id,
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        reviewNote,
        overrideDuplicateCheck: overrideDuplicateCheck === true,
      });

      if (!result.success) {
        const isDuplicate = result.rollbackReason?.startsWith('DUPLICATE_FOUND:');
        let duplicateIds: string[] = [];
        
        if (isDuplicate && result.rollbackReason) {
          const idsMatch = result.rollbackReason.match(/DUPLICATE_FOUND: (.+)/);
          if (idsMatch) {
            duplicateIds = idsMatch[1].split(', ').filter(id => id.trim());
          }
        }
        
        return NextResponse.json(
          { 
            success: false, 
            message: result.message, 
            messageAr: result.messageAr,
            rollbackReason: result.rollbackReason,
            isDuplicate,
            duplicateIds,
          },
          { status: 400 }
        );
      }

      await logActivity({
        userId: user.id,
        userEmail: user.email,
        userName: user.nameArabic,
        action: 'PENDING_MEMBER_APPROVED',
        category: 'MEMBER',
        targetType: 'PENDING_MEMBER',
        targetId: params.id,
        targetName: result.member?.fullNameAr || pending.firstName,
        details: { 
          newMemberId: result.member?.id,
          transactional: true,
          validationIssues: result.validationIssues?.length || 0,
        },
        ipAddress,
        userAgent,
        success: true,
      });

      return NextResponse.json({
        success: true,
        message: result.message,
        messageAr: result.messageAr,
        member: result.member,
        validationIssues: result.validationIssues,
      });
    }

    if (action === 'reject') {
      await prisma.pendingMember.update({
        where: { id: params.id },
        data: {
          reviewStatus: 'REJECTED',
          reviewedBy: user.id,
          reviewedAt: new Date(),
          reviewNotes: reviewNote,
        },
      });

      await logActivity({
        userId: user.id,
        userEmail: user.email,
        userName: user.nameArabic,
        action: 'PENDING_MEMBER_REJECTED',
        category: 'MEMBER',
        targetType: 'PENDING_MEMBER',
        targetId: params.id,
        targetName: pending.fullNameAr || pending.firstName,
        details: { reason: reviewNote },
        ipAddress,
        userAgent,
        success: true,
      });

      try {
        await logAuditToDb({
          action: 'PENDING_REJECT',
          severity: 'WARNING',
          userId: user.id,
          userName: user.email,
          userRole: user.role,
          targetType: 'PENDING_MEMBER',
          targetId: params.id,
          targetName: pending.fullNameAr || pending.firstName,
          description: `تم رفض العضو المعلق: ${pending.firstName}`,
          details: { reason: reviewNote },
          previousState: pending as unknown as Record<string, unknown>,
          success: true,
        });
      } catch (auditError) {
        console.error('Audit logging failed:', auditError);
      }

      return NextResponse.json({
        success: true,
        message: 'Pending member rejected',
        messageAr: 'تم رفض العضو المعلق',
      });
    }

    if (action === 'restore') {
      await prisma.pendingMember.update({
        where: { id: params.id },
        data: {
          reviewStatus: 'PENDING',
          reviewedBy: null,
          reviewedAt: null,
          reviewNotes: null,
        },
      });

      await logActivity({
        userId: user.id,
        userEmail: user.email,
        userName: user.nameArabic,
        action: 'PENDING_MEMBER_RESTORED',
        category: 'MEMBER',
        targetType: 'PENDING_MEMBER',
        targetId: params.id,
        targetName: pending.fullNameAr || pending.firstName,
        details: { previousStatus: 'REJECTED' },
        ipAddress,
        userAgent,
        success: true,
      });

      try {
        await logAuditToDb({
          action: 'PENDING_RESTORE',
          severity: 'INFO',
          userId: user.id,
          userName: user.email,
          userRole: user.role,
          targetType: 'PENDING_MEMBER',
          targetId: params.id,
          targetName: pending.fullNameAr || pending.firstName,
          description: `تم استعادة العضو المعلق: ${pending.firstName}`,
          details: { previousStatus: 'REJECTED' },
          previousState: pending as unknown as Record<string, unknown>,
          success: true,
        });
      } catch (auditError) {
        console.error('Audit logging failed:', auditError);
      }

      return NextResponse.json({
        success: true,
        message: 'Pending member restored',
        messageAr: 'تم استعادة الطلب للمراجعة',
      });
    }

    if (action === 'merge_update') {
      const { targetMemberId } = body;
      
      if (!targetMemberId) {
        return NextResponse.json(
          { success: false, message: 'Target member ID required', messageAr: 'معرف العضو المستهدف مطلوب' },
          { status: 400 }
        );
      }

      const targetMember = await prisma.familyMember.findFirst({
        where: { id: targetMemberId, deletedAt: null },
      });

      if (!targetMember) {
        return NextResponse.json(
          { success: false, message: 'Target member not found', messageAr: 'العضو المستهدف غير موجود' },
          { status: 404 }
        );
      }

      const updateData: Record<string, unknown> = {};
      const updatedFields: string[] = [];

      if (pending.birthYear && !targetMember.birthYear) {
        updateData.birthYear = pending.birthYear;
        updatedFields.push('birthYear');
      }
      if (pending.birthCalendar && !targetMember.birthCalendar) {
        updateData.birthCalendar = pending.birthCalendar;
        updatedFields.push('birthCalendar');
      }
      if (pending.phone && !targetMember.phone) {
        updateData.phone = pending.phone;
        updatedFields.push('phone');
      }
      if (pending.email && !targetMember.email) {
        updateData.email = pending.email;
        updatedFields.push('email');
      }
      if (pending.city && !targetMember.city) {
        updateData.city = pending.city;
        updatedFields.push('city');
      }
      if (pending.occupation && !targetMember.occupation) {
        updateData.occupation = pending.occupation;
        updatedFields.push('occupation');
      }
      if (pending.biography && !targetMember.biography) {
        updateData.biography = pending.biography;
        updatedFields.push('biography');
      }

      if (Object.keys(updateData).length > 0) {
        updateData.updatedAt = new Date();
        updateData.lastModifiedBy = user.id;
        
        await prisma.familyMember.update({
          where: { id: targetMemberId },
          data: updateData,
        });
      }

      await prisma.pendingMember.update({
        where: { id: params.id },
        data: {
          reviewStatus: 'REJECTED',
          reviewedBy: user.id,
          reviewedAt: new Date(),
          reviewNotes: `تم دمج المعلومات مع العضو الموجود: ${targetMemberId}. الحقول المحدثة: ${updatedFields.join(', ') || 'لا يوجد'}`,
        },
      });

      await logActivity({
        userId: user.id,
        userEmail: user.email,
        userName: user.nameArabic,
        action: 'PENDING_MEMBER_MERGED',
        category: 'MEMBER',
        targetType: 'FAMILY_MEMBER',
        targetId: targetMemberId,
        targetName: targetMember.fullNameAr || targetMember.firstName,
        details: { 
          pendingId: params.id,
          pendingName: pending.firstName,
          updatedFields,
          mergedFrom: pending.firstName,
        },
        ipAddress,
        userAgent,
        success: true,
      });

      try {
        await logAuditToDb({
          action: 'PENDING_MERGE_UPDATE',
          severity: 'INFO',
          userId: user.id,
          userName: user.email,
          userRole: user.role,
          targetType: 'FAMILY_MEMBER',
          targetId: targetMemberId,
          targetName: targetMember.fullNameAr || targetMember.firstName,
          description: `تم دمج معلومات العضو المعلق "${pending.firstName}" مع العضو الموجود "${targetMember.firstName}"`,
          details: {
            pendingMemberId: params.id,
            pendingMemberName: pending.firstName,
            updatedFields,
            previousState: targetMember as unknown as Record<string, unknown>,
          },
          success: true,
        });
      } catch (auditError) {
        console.error('Audit logging failed:', auditError);
      }

      return NextResponse.json({
        success: true,
        message: 'Member info merged successfully',
        messageAr: `تم تحديث معلومات العضو الموجود بنجاح${updatedFields.length > 0 ? `. الحقول المحدثة: ${updatedFields.join('، ')}` : '. لم يتم تحديث أي حقول (جميع المعلومات موجودة مسبقاً)'}`,
        updatedFields,
        targetMemberId,
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action', messageAr: 'الإجراء غير صالح' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing pending member:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process pending member' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const submittedVia = searchParams.get('submittedVia');

    // Allow public deletion if submittedVia token is provided and matches the pending member
    if (submittedVia) {
      const pending = await prisma.pendingMember.findUnique({
        where: { id: params.id },
      });

      if (!pending) {
        return NextResponse.json(
          { success: false, message: 'Pending member not found', messageAr: 'العضو المعلق غير موجود' },
          { status: 404 }
        );
      }

      // Verify the token matches
      if (pending.submittedVia !== submittedVia) {
        return NextResponse.json(
          { success: false, message: 'Token mismatch', messageAr: 'رمز غير صحيح' },
          { status: 403 }
        );
      }

      // Only allow deletion of pending (not yet reviewed) members
      if (pending.reviewStatus !== 'PENDING') {
        return NextResponse.json(
          { success: false, message: 'Cannot delete reviewed member', messageAr: 'لا يمكن حذف عضو تمت مراجعته' },
          { status: 400 }
        );
      }

      await prisma.pendingMember.delete({
        where: { id: params.id },
      });

      return NextResponse.json({
        success: true,
        message: 'Pending member deleted',
        messageAr: 'تم حذف العضو المعلق',
      });
    }

    // Admin authentication required for deletion without token
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

    await prisma.pendingMember.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Pending member deleted',
      messageAr: 'تم حذف العضو المعلق',
    });
  } catch (error) {
    console.error('Error deleting pending member:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete pending member' },
      { status: 500 }
    );
  }
}
