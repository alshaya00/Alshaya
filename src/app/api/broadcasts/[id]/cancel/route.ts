import { NextRequest, NextResponse } from 'next/server';
import { broadcastService } from '@/lib/services/broadcast';

// POST /api/broadcasts/[id]/cancel - Cancel a scheduled broadcast
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const broadcast = await broadcastService.cancelBroadcast(id);

    return NextResponse.json({
      success: true,
      data: broadcast,
      message: 'Broadcast cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling broadcast:', error);
    const errorMsg = error instanceof Error ? error.message : 'Failed to cancel broadcast';
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 400 }
    );
  }
}
