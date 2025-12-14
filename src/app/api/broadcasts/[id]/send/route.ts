import { NextRequest, NextResponse } from 'next/server';
import { broadcastService } from '@/lib/services/broadcast';

// POST /api/broadcasts/[id]/send - Send a broadcast
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const result = await broadcastService.sendBroadcast(id);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result,
        message: `Broadcast sent successfully to ${result.sentCount} recipients`,
      });
    } else {
      return NextResponse.json({
        success: false,
        data: result,
        error: result.errors?.join(', ') || 'Failed to send broadcast',
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error sending broadcast:', error);
    const errorMsg = error instanceof Error ? error.message : 'Failed to send broadcast';
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
