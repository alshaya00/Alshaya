import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById, logActivity } from '@/lib/auth/store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { randomUUID } from 'crypto';

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

// GET /api/admin/pending/[id] - Get a specific pending member
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

// POST /api/admin/pending/[id] - Approve or reject a pending member
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
    const { action, reviewNote } = body;

    if (!action || !['approve', 'reject'].includes(action)) {
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

    if (pending.reviewStatus !== 'PENDING') {
      return NextResponse.json(
        { success: false, message: 'Already processed', messageAr: 'تمت المعالجة مسبقاً' },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    if (action === 'approve') {
      // Generate a unique ID for the new member
      const newId = `P${randomUUID().slice(0, 8).toUpperCase()}`;

      const newMember = await prisma.familyMember.create({
        data: {
          id: newId,
          firstName: pending.firstName,
          fatherName: pending.fatherName,
          grandfatherName: pending.grandfatherName,
          greatGrandfatherName: pending.greatGrandfatherName,
          familyName: pending.familyName,
          fatherId: pending.proposedFatherId,
          gender: pending.gender as 'Male' | 'Female',
          birthYear: pending.birthYear,
          generation: pending.generation,
          branch: pending.branch,
          fullNameAr: pending.fullNameAr,
          fullNameEn: pending.fullNameEn,
          phone: pending.phone,
          city: pending.city,
          status: pending.status,
          occupation: pending.occupation,
          email: pending.email,
          sonsCount: 0,
          daughtersCount: 0,
        },
      });

      // Update pending status
      await prisma.pendingMember.update({
        where: { id: params.id },
        data: {
          reviewStatus: 'APPROVED',
          reviewedBy: user.id,
          reviewedAt: new Date(),
          reviewNote,
          approvedMemberId: newId,
        },
      });

      // Log activity
      await logActivity({
        userId: user.id,
        userEmail: user.email,
        userName: user.nameArabic,
        action: 'PENDING_MEMBER_APPROVED',
        category: 'MEMBER',
        targetType: 'PENDING_MEMBER',
        targetId: params.id,
        targetName: pending.fullNameAr || pending.firstName,
        details: { newMemberId: newId },
        ipAddress,
        userAgent,
        success: true,
      });

      return NextResponse.json({
        success: true,
        message: 'Pending member approved and added to family tree',
        messageAr: 'تمت الموافقة على العضو المعلق وإضافته لشجرة العائلة',
        member: newMember,
      });
    }

    if (action === 'reject') {
      await prisma.pendingMember.update({
        where: { id: params.id },
        data: {
          reviewStatus: 'REJECTED',
          reviewedBy: user.id,
          reviewedAt: new Date(),
          reviewNote,
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

      return NextResponse.json({
        success: true,
        message: 'Pending member rejected',
        messageAr: 'تم رفض العضو المعلق',
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

// PUT /api/admin/pending/[id] - Approve, reject, or reset a pending member (alias for POST)
export async function PUT(
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
    const { action, notes } = body;

    const pending = await prisma.pendingMember.findUnique({
      where: { id: params.id },
    });

    if (!pending) {
      return NextResponse.json(
        { success: false, message: 'Pending member not found', messageAr: 'العضو المعلق غير موجود' },
        { status: 404 }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    if (action === 'reset') {
      // Reset status back to pending
      await prisma.pendingMember.update({
        where: { id: params.id },
        data: {
          reviewStatus: 'PENDING',
          reviewedBy: null,
          reviewedAt: null,
          reviewNotes: null,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Status reset to pending',
        messageAr: 'تمت إعادة الحالة إلى الانتظار',
      });
    }

    if (action === 'approve') {
      if (pending.reviewStatus !== 'PENDING') {
        return NextResponse.json(
          { success: false, message: 'Already processed', messageAr: 'تمت المعالجة مسبقاً' },
          { status: 400 }
        );
      }

      const newId = `P${randomUUID().slice(0, 8).toUpperCase()}`;

      const newMember = await prisma.familyMember.create({
        data: {
          id: newId,
          firstName: pending.firstName,
          fatherName: pending.fatherName,
          grandfatherName: pending.grandfatherName,
          greatGrandfatherName: pending.greatGrandfatherName,
          familyName: pending.familyName,
          fatherId: pending.proposedFatherId,
          gender: pending.gender as 'Male' | 'Female',
          birthYear: pending.birthYear,
          generation: pending.generation,
          branch: pending.branch,
          fullNameAr: pending.fullNameAr,
          fullNameEn: pending.fullNameEn,
          phone: pending.phone,
          city: pending.city,
          status: pending.status,
          occupation: pending.occupation,
          email: pending.email,
          sonsCount: 0,
          daughtersCount: 0,
        },
      });

      await prisma.pendingMember.update({
        where: { id: params.id },
        data: {
          reviewStatus: 'APPROVED',
          reviewedBy: user.id,
          reviewedAt: new Date(),
          reviewNotes: notes,
          approvedMemberId: newId,
        },
      });

      await logActivity({
        userId: user.id,
        userEmail: user.email,
        userName: user.nameArabic,
        action: 'PENDING_MEMBER_APPROVED',
        category: 'MEMBER',
        targetType: 'PENDING_MEMBER',
        targetId: params.id,
        targetName: pending.fullNameAr || pending.firstName,
        details: { newMemberId: newId },
        ipAddress,
        userAgent,
        success: true,
      });

      return NextResponse.json({
        success: true,
        message: 'Approved',
        messageAr: 'تمت الموافقة',
        member: newMember,
      });
    }

    if (action === 'reject') {
      if (pending.reviewStatus !== 'PENDING') {
        return NextResponse.json(
          { success: false, message: 'Already processed', messageAr: 'تمت المعالجة مسبقاً' },
          { status: 400 }
        );
      }

      await prisma.pendingMember.update({
        where: { id: params.id },
        data: {
          reviewStatus: 'REJECTED',
          reviewedBy: user.id,
          reviewedAt: new Date(),
          reviewNotes: notes,
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
        details: { reason: notes },
        ipAddress,
        userAgent,
        success: true,
      });

      return NextResponse.json({
        success: true,
        message: 'Rejected',
        messageAr: 'تم الرفض',
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

// PATCH /api/admin/pending/[id] - Update a pending member's data
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
    if (!permissions.approve_pending_members && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { firstName, birthYear, city, phone, occupation } = body;

    const pending = await prisma.pendingMember.findUnique({
      where: { id: params.id },
    });

    if (!pending) {
      return NextResponse.json(
        { success: false, message: 'Pending member not found', messageAr: 'العضو المعلق غير موجود' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (birthYear !== undefined) updateData.birthYear = birthYear;
    if (city !== undefined) updateData.city = city;
    if (phone !== undefined) updateData.phone = phone;
    if (occupation !== undefined) updateData.occupation = occupation;

    // Update full name if firstName changed
    if (firstName && pending.fatherName) {
      const connector = pending.gender === 'Female' ? 'بنت' : 'بن';
      updateData.fullNameAr = `${firstName} ${connector} ${pending.fatherName} آل شايع`;
    }

    const updated = await prisma.pendingMember.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'Pending member updated',
      messageAr: 'تم تحديث العضو المعلق',
      pending: updated,
    });
  } catch (error) {
    console.error('Error updating pending member:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update pending member' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/pending/[id] - Delete a pending member
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
