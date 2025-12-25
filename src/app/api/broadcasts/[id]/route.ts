import { NextRequest, NextResponse } from 'next/server';
import { broadcastService } from '@/lib/services/broadcast';
import { findSessionByToken, findUserById } from '@/lib/auth/store';
import { hasPermission } from '@/lib/auth/permissions';
import { updateBroadcastSchema, formatZodErrors } from '@/lib/validations';
import { logger } from '@/lib/logging';
import { UserRole } from '@/lib/auth/types';

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

// GET /api/broadcasts/[id] - Get a specific broadcast
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication required for broadcast details
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check permission to view broadcasts
    if (!hasPermission(user.role as UserRole, 'view_members')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { id } = params;
    const broadcast = await broadcastService.getBroadcast(id);

    if (!broadcast) {
      return NextResponse.json(
        { success: false, error: 'Broadcast not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: broadcast,
    });
  } catch (error) {
    logger.error('Error fetching broadcast:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch broadcast' },
      { status: 500 }
    );
  }
}

// PUT /api/broadcasts/[id] - Update a broadcast
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication required
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only ADMIN and SUPER_ADMIN can update broadcasts
    if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to update broadcasts' },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await request.json();

    // Validate input
    const validation = updateBroadcastSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: formatZodErrors(validation.error),
        },
        { status: 400 }
      );
    }

    const updateData = validation.data;
    const broadcast = await broadcastService.updateBroadcast(id, updateData);

    logger.info('Broadcast updated', { broadcastId: id, userId: user.id });

    return NextResponse.json({
      success: true,
      data: broadcast,
      message: 'Broadcast updated successfully',
    });
  } catch (error) {
    logger.error('Error updating broadcast:', error);
    const errorMsg = error instanceof Error ? error.message : 'Failed to update broadcast';
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 400 }
    );
  }
}

// DELETE /api/broadcasts/[id] - Delete a broadcast
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication required
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only ADMIN and SUPER_ADMIN can delete broadcasts
    if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to delete broadcasts' },
        { status: 403 }
      );
    }

    const { id } = params;
    await broadcastService.deleteBroadcast(id);

    logger.info('Broadcast deleted', { broadcastId: id, userId: user.id });

    return NextResponse.json({
      success: true,
      message: 'Broadcast deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting broadcast:', error);
    const errorMsg = error instanceof Error ? error.message : 'Failed to delete broadcast';
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 400 }
    );
  }
}
