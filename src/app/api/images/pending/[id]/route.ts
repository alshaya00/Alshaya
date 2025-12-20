import { NextRequest, NextResponse } from 'next/server';
import {
  getPendingImageById,
  approvePendingImage,
  rejectPendingImage,
  deletePendingImage
} from '@/lib/db/images';

// GET - Get a specific pending image
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const pendingImage = await getPendingImageById(id);

    if (!pendingImage) {
      return NextResponse.json(
        { error: 'Pending image not found', errorAr: 'الصورة المعلقة غير موجودة' },
        { status: 404 }
      );
    }

    return NextResponse.json({ pendingImage });

  } catch (error) {
    console.error('Error fetching pending image:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending image' },
      { status: 500 }
    );
  }
}

// PATCH - Approve or reject a pending image
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const { action, reviewedBy, reviewedByName, reviewNotes } = body;

    // Validate required fields
    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"', errorAr: 'إجراء غير صالح' },
        { status: 400 }
      );
    }

    if (!reviewedBy || !reviewedByName) {
      return NextResponse.json(
        { error: 'Reviewer information is required', errorAr: 'معلومات المراجع مطلوبة' },
        { status: 400 }
      );
    }

    // Check if pending image exists
    const pendingImage = await getPendingImageById(id);
    if (!pendingImage) {
      return NextResponse.json(
        { error: 'Pending image not found', errorAr: 'الصورة المعلقة غير موجودة' },
        { status: 404 }
      );
    }

    // Check if already reviewed
    if (pendingImage.reviewStatus !== 'PENDING') {
      return NextResponse.json(
        { error: 'This image has already been reviewed', errorAr: 'تمت مراجعة هذه الصورة بالفعل' },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      const photo = await approvePendingImage(id, reviewedBy, reviewedByName, reviewNotes);

      if (!photo) {
        return NextResponse.json(
          { error: 'Failed to approve image', errorAr: 'فشل في الموافقة على الصورة' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Image approved successfully',
        messageAr: 'تمت الموافقة على الصورة بنجاح',
        photo: {
          id: photo.id,
          category: photo.category,
          title: photo.title,
          memberId: photo.memberId,
          isFamilyAlbum: photo.isFamilyAlbum,
        },
      });

    } else {
      // Reject
      if (!reviewNotes) {
        return NextResponse.json(
          { error: 'Review notes are required when rejecting', errorAr: 'ملاحظات المراجعة مطلوبة عند الرفض' },
          { status: 400 }
        );
      }

      const rejected = await rejectPendingImage(id, reviewedBy, reviewedByName, reviewNotes);

      if (!rejected) {
        return NextResponse.json(
          { error: 'Failed to reject image', errorAr: 'فشل في رفض الصورة' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Image rejected',
        messageAr: 'تم رفض الصورة',
        pendingImage: {
          id: rejected.id,
          reviewStatus: rejected.reviewStatus,
          reviewNotes: rejected.reviewNotes,
        },
      });
    }

  } catch (error) {
    console.error('Error reviewing pending image:', error);
    return NextResponse.json(
      { error: 'Failed to review image' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a pending image
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if exists
    const pendingImage = await getPendingImageById(id);
    if (!pendingImage) {
      return NextResponse.json(
        { error: 'Pending image not found', errorAr: 'الصورة المعلقة غير موجودة' },
        { status: 404 }
      );
    }

    const deleted = await deletePendingImage(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete pending image', errorAr: 'فشل في حذف الصورة المعلقة' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Pending image deleted',
      messageAr: 'تم حذف الصورة المعلقة',
    });

  } catch (error) {
    console.error('Error deleting pending image:', error);
    return NextResponse.json(
      { error: 'Failed to delete pending image' },
      { status: 500 }
    );
  }
}
