import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromCookie } from '@/lib/auth';
import { safeJsonParseArray } from '@/lib/utils/safe-json';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromCookie();
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك بالوصول' },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { action, reviewNotes } = body;

    const existing = await prisma.familyJournal.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'القصة غير موجودة' },
        { status: 404 }
      );
    }

    let updateData: Record<string, unknown> = {
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
      reviewNotes: reviewNotes || null
    };

    if (action === 'approve') {
      updateData.status = 'PUBLISHED';
      updateData.reviewStatus = 'APPROVED';
    } else if (action === 'reject') {
      updateData.reviewStatus = 'REJECTED';
    } else {
      return NextResponse.json(
        { success: false, error: 'إجراء غير صالح' },
        { status: 400 }
      );
    }

    const journal = await prisma.familyJournal.update({
      where: { id },
      data: updateData
    });

    const message = action === 'approve' 
      ? 'تمت الموافقة على القصة ونشرها بنجاح' 
      : 'تم رفض القصة';

    return NextResponse.json({
      success: true,
      data: {
        ...journal,
        tags: safeJsonParseArray<string>(journal.tags),
        relatedMemberIds: safeJsonParseArray<string>(journal.relatedMemberIds)
      },
      message
    });
  } catch (error) {
    console.error('Error updating journal status:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في تحديث حالة القصة' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromCookie();
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك بالوصول' },
        { status: 403 }
      );
    }

    const { id } = params;

    const existing = await prisma.familyJournal.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'القصة غير موجودة' },
        { status: 404 }
      );
    }

    await prisma.familyJournal.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'تم حذف القصة بنجاح'
    });
  } catch (error) {
    console.error('Error deleting journal:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في حذف القصة' },
      { status: 500 }
    );
  }
}
