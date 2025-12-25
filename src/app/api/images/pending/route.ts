import { NextRequest, NextResponse } from 'next/server';
import { getPendingImages, getImageStats, type PendingImage } from '@/lib/db/images';
import { findSessionByToken, findUserById } from '@/lib/auth/store';
import { logger } from '@/lib/logging';

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

export async function GET(request: NextRequest) {
  try {
    // Authentication required - only admins can view pending images
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only ADMIN and SUPER_ADMIN can view pending images (for moderation)
    if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      logger.security('Unauthorized pending images access attempt', 'medium', {
        userId: user.id,
        userRole: user.role,
      });
      return NextResponse.json(
        { success: false, error: 'Admin access required for image moderation' },
        { status: 403 }
      );
    }

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
    const result = await getPendingImages({
      status: status || undefined,
      category: category || undefined,
      memberId: memberId || undefined,
      limit,
      offset,
    });

    // Get stats if requested
    let stats = null;
    if (includeStats) {
      stats = await getImageStats();
    }

    // Don't include full image data in list response (for performance)
    const imagesWithoutData = result.images.map(img => ({
      ...img,
      imageData: img.thumbnailData || img.imageData.substring(0, 100) + '...', // Use thumbnail or truncate
      thumbnailData: undefined,
    }));

    logger.debug('Pending images fetched', {
      userId: user.id,
      count: result.images.length,
      total: result.total,
    });

    return NextResponse.json({
      success: true,
      images: imagesWithoutData,
      total: result.total,
      limit,
      offset,
      hasMore: offset + result.images.length < result.total,
      ...(stats && { stats }),
    });

  } catch (error) {
    logger.error('Error fetching pending images:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pending images' },
      { status: 500 }
    );
  }
}
