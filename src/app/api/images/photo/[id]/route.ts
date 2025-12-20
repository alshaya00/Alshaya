import { NextRequest, NextResponse } from 'next/server';
import {
  getMemberPhotoById,
  updateMemberPhoto,
  deleteMemberPhoto,
  setProfilePhoto,
} from '@/lib/db/images';

// GET - Get a specific photo with full image data
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const photo = await getMemberPhotoById(id);

    if (!photo) {
      return NextResponse.json(
        { error: 'Photo not found', errorAr: 'الصورة غير موجودة' },
        { status: 404 }
      );
    }

    return NextResponse.json({ photo });

  } catch (error) {
    console.error('Error fetching photo:', error);
    return NextResponse.json(
      { error: 'Failed to fetch photo' },
      { status: 500 }
    );
  }
}

// PATCH - Update photo metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // Check if photo exists
    const existing = await getMemberPhotoById(id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Photo not found', errorAr: 'الصورة غير موجودة' },
        { status: 404 }
      );
    }

    const {
      category,
      title,
      titleAr,
      caption,
      captionAr,
      year,
      memberId,
      taggedMemberIds,
      isFamilyAlbum,
      isProfilePhoto,
      displayOrder,
      isPublic,
      setAsProfile, // Special action to set as profile photo
    } = body;

    // Validate category if provided
    if (category && !['profile', 'memory', 'document', 'historical'].includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category', errorAr: 'تصنيف غير صالح' },
        { status: 400 }
      );
    }

    // Validate year if provided
    if (year !== undefined) {
      const currentYear = new Date().getFullYear();
      if (year < 1800 || year > currentYear) {
        return NextResponse.json(
          { error: `Year must be between 1800 and ${currentYear}`, errorAr: 'السنة غير صالحة' },
          { status: 400 }
        );
      }
    }

    // If setting as profile photo
    if (setAsProfile && existing.memberId) {
      await setProfilePhoto(existing.memberId, id);
    }

    // Update the photo
    const updated = await updateMemberPhoto(id, {
      category,
      title,
      titleAr,
      caption,
      captionAr,
      year,
      memberId,
      taggedMemberIds,
      isFamilyAlbum,
      isProfilePhoto,
      displayOrder,
      isPublic,
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update photo', errorAr: 'فشل في تحديث الصورة' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Photo updated successfully',
      messageAr: 'تم تحديث الصورة بنجاح',
      photo: {
        id: updated.id,
        category: updated.category,
        title: updated.title,
        isProfilePhoto: updated.isProfilePhoto,
      },
    });

  } catch (error) {
    console.error('Error updating photo:', error);
    return NextResponse.json(
      { error: 'Failed to update photo' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a photo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if photo exists
    const existing = await getMemberPhotoById(id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Photo not found', errorAr: 'الصورة غير موجودة' },
        { status: 404 }
      );
    }

    const deleted = await deleteMemberPhoto(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete photo', errorAr: 'فشل في حذف الصورة' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Photo deleted successfully',
      messageAr: 'تم حذف الصورة بنجاح',
    });

  } catch (error) {
    console.error('Error deleting photo:', error);
    return NextResponse.json(
      { error: 'Failed to delete photo' },
      { status: 500 }
    );
  }
}
