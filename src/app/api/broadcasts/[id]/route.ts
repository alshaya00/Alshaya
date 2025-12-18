import { NextRequest, NextResponse } from 'next/server';
import { broadcastService } from '@/lib/services/broadcast';

// GET /api/broadcasts/[id] - Get a specific broadcast
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
    console.error('Error fetching broadcast:', error);
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
    const { id } = params;
    const body = await request.json();

    // Parse dates if provided
    const updateData: Record<string, unknown> = { ...body };
    if (body.meetingDate) updateData.meetingDate = new Date(body.meetingDate);
    if (body.rsvpDeadline) updateData.rsvpDeadline = new Date(body.rsvpDeadline);
    if (body.scheduledAt) updateData.scheduledAt = new Date(body.scheduledAt);

    const broadcast = await broadcastService.updateBroadcast(id, updateData);

    return NextResponse.json({
      success: true,
      data: broadcast,
      message: 'Broadcast updated successfully',
    });
  } catch (error) {
    console.error('Error updating broadcast:', error);
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
    const { id } = params;
    await broadcastService.deleteBroadcast(id);

    return NextResponse.json({
      success: true,
      message: 'Broadcast deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting broadcast:', error);
    const errorMsg = error instanceof Error ? error.message : 'Failed to delete broadcast';
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 400 }
    );
  }
}
