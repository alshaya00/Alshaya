import { NextRequest, NextResponse } from 'next/server';
import {
  getFamilyAlbumPhotos,
  getAllPhotos,
  getPhotoTimeline,
  getImageStats,
} from '@/lib/db/images';
import { prisma } from '@/lib/prisma';
export const dynamic = "force-dynamic";

// GET - Get family gallery or all photos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const view = searchParams.get('view'); // 'family', 'all', 'timeline', 'stats', 'folders'
    const category = searchParams.get('category');
    const folderId = searchParams.get('folderId');
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined;
    const uploadedBy = searchParams.get('uploadedBy');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

    // Folders list view (public, no auth required)
    if (view === 'folders') {
      const folders = await prisma.albumFolder.findMany({
        orderBy: { displayOrder: 'asc' },
        select: {
          id: true,
          name: true,
          nameAr: true,
          description: true,
          descriptionAr: true,
          color: true,
          icon: true,
          isSystem: true,
          displayOrder: true,
          _count: {
            select: { photos: true },
          },
        },
      });

      return NextResponse.json({
        folders: folders.map((f: typeof folders[number]) => ({
          ...f,
          photoCount: f._count.photos,
        })),
      });
    }

    // Stats view
    if (view === 'stats') {
      const stats = await getImageStats();
      return NextResponse.json({ stats });
    }

    // Timeline view
    if (view === 'timeline') {
      const timeline = await getPhotoTimeline({ limit: 3 });
      // Normalize timeline photos to include isVideo flag
      const normalizedTimeline = timeline.map(item => ({
        ...item,
        photos: item.photos.map(photo => {
          const isVideo = photo.imageData?.startsWith('data:video/') || false;
          return {
            ...photo,
            thumbnailData: photo.thumbnailData || (isVideo ? undefined : photo.imageData),
            imageData: isVideo ? photo.imageData : undefined,
            isVideo,
          };
        }),
      }));
      return NextResponse.json({ timeline: normalizedTimeline });
    }

    // Family album only
    if (view === 'family') {
      const result = await getFamilyAlbumPhotos({
        category: category || undefined,
        year,
        folderId: folderId || undefined,
        limit,
        offset,
      });

      const photosWithThumbnails = result.photos.map(photo => {
        const isVideo = photo.imageData?.startsWith('data:video/') || false;
        return {
          id: photo.id,
          thumbnailData: photo.thumbnailData || (isVideo ? undefined : photo.imageData),
          imageData: isVideo ? photo.imageData : undefined, // Include full data only for videos
          category: photo.category,
          title: photo.title,
          titleAr: photo.titleAr,
          caption: photo.caption,
          captionAr: photo.captionAr,
          year: photo.year,
          folderId: photo.folderId,
          uploadedByName: photo.uploadedByName,
          createdAt: photo.createdAt,
          isVideo,
        };
      });

      return NextResponse.json({
        photos: photosWithThumbnails,
        total: result.total,
        hasMore: offset + result.photos.length < result.total,
      });
    }

    // All photos (default)
    const result = await getAllPhotos({
      category: category || undefined,
      year,
      uploadedBy: uploadedBy || undefined,
      folderId: folderId || undefined,
      limit,
      offset,
    });

    const photosWithThumbnails = result.photos.map(photo => {
      const isVideo = photo.imageData?.startsWith('data:video/') || false;
      return {
        id: photo.id,
        thumbnailData: photo.thumbnailData || (isVideo ? undefined : photo.imageData),
        imageData: isVideo ? photo.imageData : undefined,
        category: photo.category,
        title: photo.title,
        titleAr: photo.titleAr,
        caption: photo.caption,
        captionAr: photo.captionAr,
        year: photo.year,
        memberId: photo.memberId,
        folderId: photo.folderId,
        isFamilyAlbum: photo.isFamilyAlbum,
        uploadedByName: photo.uploadedByName,
        createdAt: photo.createdAt,
        isVideo,
      };
    });

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
