import { NextRequest, NextResponse } from 'next/server';
import {
  getFamilyAlbumPhotos,
  getAllPhotos,
  getPhotoTimeline,
  getMemberPhotoById,
  updateMemberPhoto,
  deleteMemberPhoto,
  setProfilePhoto,
  getImageStats,
} from '@/lib/db/images';

// GET - Get family gallery or all photos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const view = searchParams.get('view'); // 'family', 'all', 'timeline', 'stats'
    const category = searchParams.get('category');
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined;
    const uploadedBy = searchParams.get('uploadedBy');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

    // Stats view
    if (view === 'stats') {
      const stats = getImageStats();
      return NextResponse.json({ stats });
    }

    // Timeline view
    if (view === 'timeline') {
      const timeline = getPhotoTimeline({ limit: 3 });
      return NextResponse.json({ timeline });
    }

    // Family album only
    if (view === 'family') {
      const result = getFamilyAlbumPhotos({
        category: category || undefined,
        year,
        limit,
        offset,
      });

      const photosWithThumbnails = result.photos.map(photo => ({
        id: photo.id,
        thumbnailData: photo.thumbnailData || photo.imageData,
        category: photo.category,
        title: photo.title,
        titleAr: photo.titleAr,
        caption: photo.caption,
        captionAr: photo.captionAr,
        year: photo.year,
        uploadedByName: photo.uploadedByName,
        createdAt: photo.createdAt,
      }));

      return NextResponse.json({
        photos: photosWithThumbnails,
        total: result.total,
        hasMore: offset + result.photos.length < result.total,
      });
    }

    // All photos (default)
    const result = getAllPhotos({
      category: category || undefined,
      year,
      uploadedBy: uploadedBy || undefined,
      limit,
      offset,
    });

    const photosWithThumbnails = result.photos.map(photo => ({
      id: photo.id,
      thumbnailData: photo.thumbnailData || photo.imageData,
      category: photo.category,
      title: photo.title,
      titleAr: photo.titleAr,
      caption: photo.caption,
      captionAr: photo.captionAr,
      year: photo.year,
      memberId: photo.memberId,
      isFamilyAlbum: photo.isFamilyAlbum,
      uploadedByName: photo.uploadedByName,
      createdAt: photo.createdAt,
    }));

    return NextResponse.json({
      photos: photosWithThumbnails,
      total: result.total,
      hasMore: offset + result.photos.length < result.total,
    });

  } catch (error) {
    console.error('Error fetching gallery:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gallery' },
      { status: 500 }
    );
  }
}
