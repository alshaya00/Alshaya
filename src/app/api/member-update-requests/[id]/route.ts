import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById, logActivity } from '@/lib/auth/store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { getMemberById } from '@/lib/data';

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

// GET /api/member-update-requests/[id] - Get a specific request
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

    try {
      const updateRequest = await prisma.memberUpdateRequest.findUnique({
        where: { id: params.id },
      });

      if (!updateRequest) {
        return NextResponse.json(
          { success: false, message: 'Request not found', messageAr: 'الطلب غير موجود' },
          { status: 404 }
        );
      }

      // Regular users can only view their own requests
      const permissions = getPermissionsForRole(user.role);
      if (!permissions.approve_pending_members && updateRequest.submittedById !== user.id) {
        return NextResponse.json(
          { success: false, message: 'Access denied', messageAr: 'الوصول مرفوض' },
          { status: 403 }
        );
      }

      // Get current member data for comparison
      const member = getMemberById(updateRequest.memberId);

      return NextResponse.json({
        success: true,
        data: {
          request: {
            ...updateRequest,
            proposedChanges: JSON.parse(updateRequest.proposedChanges || '{}'),
          },
          currentMember: member,
        },
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch request', messageAr: 'فشل في تحميل الطلب' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching request:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch request', messageAr: 'فشل في تحميل الطلب' },
      { status: 500 }
    );
  }
}

// PATCH /api/member-update-requests/[id] - Approve or reject a request
export async function PATCH(
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
    if (!permissions.approve_pending_members) {
      return NextResponse.json(
        { success: false, message: 'No permission to review requests', messageAr: 'لا تملك صلاحية مراجعة الطلبات' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, reviewNotes, approvedFields } = body;

    if (!['APPROVE', 'REJECT', 'PARTIAL_APPROVE'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Invalid action', messageAr: 'إجراء غير صالح' },
        { status: 400 }
      );
    }

    try {
      const updateRequest = await prisma.memberUpdateRequest.findUnique({
        where: { id: params.id },
      });

      if (!updateRequest) {
        return NextResponse.json(
          { success: false, message: 'Request not found', messageAr: 'الطلب غير موجود' },
          { status: 404 }
        );
      }

      if (updateRequest.status !== 'PENDING') {
        return NextResponse.json(
          { success: false, message: 'Request already processed', messageAr: 'تمت معالجة الطلب مسبقاً' },
          { status: 400 }
        );
      }

      const proposedChanges = JSON.parse(updateRequest.proposedChanges || '{}');
      const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';

      // Determine status and which fields to apply
      let newStatus: string;
      let fieldsToApply: Record<string, unknown> = {};

      if (action === 'APPROVE') {
        newStatus = 'APPROVED';
        fieldsToApply = proposedChanges;
        if (updateRequest.proposedPhotoData) {
          fieldsToApply.photoUrl = updateRequest.proposedPhotoData;
        }
      } else if (action === 'PARTIAL_APPROVE') {
        newStatus = 'PARTIALLY_APPROVED';
        // Only apply approved fields
        if (approvedFields && Array.isArray(approvedFields)) {
          for (const field of approvedFields) {
            if (proposedChanges[field] !== undefined) {
              fieldsToApply[field] = proposedChanges[field];
            }
          }
          // Include photo if explicitly approved
          if (approvedFields.includes('photoUrl') && updateRequest.proposedPhotoData) {
            fieldsToApply.photoUrl = updateRequest.proposedPhotoData;
          }
        }
      } else {
        newStatus = 'REJECTED';
      }

      // Apply changes to member if approved
      if (Object.keys(fieldsToApply).length > 0) {
        await prisma.familyMember.update({
          where: { id: updateRequest.memberId },
          data: fieldsToApply as Record<string, string | number | null>,
        });
      }

      // Update the request status
      const updatedRequest = await prisma.memberUpdateRequest.update({
        where: { id: params.id },
        data: {
          status: newStatus,
          reviewedById: user.id,
          reviewedByName: user.nameArabic,
          reviewedAt: new Date(),
          reviewNotes: reviewNotes || null,
          approvedFields: approvedFields ? JSON.stringify(approvedFields) : null,
        },
      });

      // Log activity
      await logActivity({
        userId: user.id,
        userEmail: user.email,
        userName: user.nameArabic,
        action: `${action}_UPDATE_REQUEST`,
        category: 'ADMIN',
        targetType: 'MEMBER_UPDATE_REQUEST',
        targetId: params.id,
        targetName: updateRequest.memberName,
        details: {
          memberId: updateRequest.memberId,
          action,
          approvedFields,
          reviewNotes,
        },
        ipAddress,
        success: true,
      });

      const messages: Record<string, { en: string; ar: string }> = {
        APPROVED: {
          en: 'Request approved and changes applied',
          ar: 'تمت الموافقة على الطلب وتطبيق التغييرات',
        },
        PARTIALLY_APPROVED: {
          en: 'Request partially approved',
          ar: 'تمت الموافقة الجزئية على الطلب',
        },
        REJECTED: {
          en: 'Request rejected',
          ar: 'تم رفض الطلب',
        },
      };

      return NextResponse.json({
        success: true,
        message: messages[newStatus].en,
        messageAr: messages[newStatus].ar,
        data: {
          id: updatedRequest.id,
          status: updatedRequest.status,
          appliedFields: Object.keys(fieldsToApply),
        },
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { success: false, message: 'Failed to process request', messageAr: 'فشل في معالجة الطلب' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process request', messageAr: 'فشل في معالجة الطلب' },
      { status: 500 }
    );
  }
}

// DELETE /api/member-update-requests/[id] - Cancel a pending request (by submitter)
export async function DELETE(
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

    try {
      const updateRequest = await prisma.memberUpdateRequest.findUnique({
        where: { id: params.id },
      });

      if (!updateRequest) {
        return NextResponse.json(
          { success: false, message: 'Request not found', messageAr: 'الطلب غير موجود' },
          { status: 404 }
        );
      }

      // Only submitter or admin can cancel
      const permissions = getPermissionsForRole(user.role);
      if (updateRequest.submittedById !== user.id && !permissions.manage_users) {
        return NextResponse.json(
          { success: false, message: 'Access denied', messageAr: 'الوصول مرفوض' },
          { status: 403 }
        );
      }

      if (updateRequest.status !== 'PENDING') {
        return NextResponse.json(
          { success: false, message: 'Can only cancel pending requests', messageAr: 'يمكن إلغاء الطلبات المعلقة فقط' },
          { status: 400 }
        );
      }

      await prisma.memberUpdateRequest.delete({
        where: { id: params.id },
      });

      return NextResponse.json({
        success: true,
        message: 'Request cancelled',
        messageAr: 'تم إلغاء الطلب',
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { success: false, message: 'Failed to cancel request', messageAr: 'فشل في إلغاء الطلب' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error cancelling request:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to cancel request', messageAr: 'فشل في إلغاء الطلب' },
      { status: 500 }
    );
  }
}
