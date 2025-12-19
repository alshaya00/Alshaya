import { NextRequest, NextResponse } from 'next/server';
import { broadcastService } from '@/lib/services/broadcast';

// GET /api/broadcasts/[id]/recipients - Get recipients and RSVP summary
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const summary = await broadcastService.getRSVPSummary(id);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          yesCount: summary.yes.length,
          noCount: summary.no.length,
          maybeCount: summary.maybe.length,
          noResponseCount: summary.noResponse.length,
          totalCount: summary.yes.length + summary.no.length + summary.maybe.length + summary.noResponse.length,
        },
        recipients: {
          yes: summary.yes,
          no: summary.no,
          maybe: summary.maybe,
          noResponse: summary.noResponse,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching recipients:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recipients' },
      { status: 500 }
    );
  }
}
