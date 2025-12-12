import { NextRequest, NextResponse } from 'next/server';
import { getMemberPhotos, getProfilePhoto, getPhotoTimeline, type MemberPhoto } from '@/lib/db/images';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const { searchParams } = new URL(request.url);

    const category = searchParams.get('category');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;
    const view = searchParams.get('view'); // 'timeline' or 'gallery' or 'profile'

    // If requesting profile photo only
    if (view === 'profile') {
      const profilePhoto = getProfilePhoto(memberId);
      return NextResponse.json({
        profilePhoto: profilePhoto ? {
          id: profilePhoto.id,
          imageData: profilePhoto.imageData,
          title: profilePhoto.title,
          titleAr: profilePhoto.titleAr,
        } : null,
      });
    }

    // If requesting timeline view
    if (view === 'timeline') {
      const timeline = getPhotoTimeline({ memberId, limit: 5 });
      return NextResponse.json({ timeline });
    }

    // Regular gallery view
    const result = getMemberPhotos(memberId, {
      category: category || undefined,
      limit,
      offset,
    });

    // Get profile photo
    const profilePhoto = getProfilePhoto(memberId);

    // Return photos without full image data in list (use thumbnails)
    const photosWithThumbnails = result.photos.map(photo => ({
      id: photo.id,
      thumbnailData: photo.thumbnailData || photo.imageData,
      category: photo.category,
      title: photo.title,
      titleAr: photo.titleAr,
      caption: photo.caption,
      captionAr: photo.captionAr,
      year: photo.year,
      isProfilePhoto: photo.isProfilePhoto,
      uploadedByName: photo.uploadedByName,
      createdAt: photo.createdAt,
    }));

    return NextResponse.json({
      photos: photosWithThumbnails,
      total: result.total,
      profilePhotoId: profilePhoto?.id || null,
      hasMore: offset !== undefined ? offset + result.photos.length < result.total : false,
    });

  } catch (error) {
    console.error('Error fetching member photos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch member photos' },
      { status: 500 }
    );
  }
}
