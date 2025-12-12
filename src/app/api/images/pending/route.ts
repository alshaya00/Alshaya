import { NextRequest, NextResponse } from 'next/server';
import { getPendingImages, getImageStats, type PendingImage } from '@/lib/db/images';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status') as PendingImage['reviewStatus'] | null;
    const category = searchParams.get('category');
    const memberId = searchParams.get('memberId');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;
    const includeStats = searchParams.get('includeStats') === 'true';

    // Validate status
    if (status && !['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be PENDING, APPROVED, or REJECTED' },
        { status: 400 }
      );
    }

    // Get pending images
    const result = getPendingImages({
      status: status || undefined,
      category: category || undefined,
      memberId: memberId || undefined,
      limit,
      offset,
    });

    // Get stats if requested
    let stats = null;
    if (includeStats) {
      stats = getImageStats();
    }

    // Don't include full image data in list response (for performance)
    const imagesWithoutData = result.images.map(img => ({
      ...img,
      imageData: img.thumbnailData || img.imageData.substring(0, 100) + '...', // Use thumbnail or truncate
      thumbnailData: undefined,
    }));

    return NextResponse.json({
      images: imagesWithoutData,
      total: result.total,
      limit,
      offset,
      hasMore: offset + result.images.length < result.total,
      ...(stats && { stats }),
    });

  } catch (error) {
    console.error('Error fetching pending images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending images' },
      { status: 500 }
    );
  }
}
