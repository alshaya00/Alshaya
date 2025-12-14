import { NextRequest, NextResponse } from 'next/server';
import { broadcastService, RSVPResponse } from '@/lib/services/broadcast';

// GET /api/broadcasts/[id]/rsvp - Handle RSVP via email link
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');
    const response = searchParams.get('response') as RSVPResponse | null;

    if (!email || !response) {
      return NextResponse.json(
        { success: false, error: 'Email and response are required' },
        { status: 400 }
      );
    }

    const validResponses: RSVPResponse[] = ['YES', 'NO', 'MAYBE'];
    if (!validResponses.includes(response)) {
      return NextResponse.json(
        { success: false, error: `Invalid response. Must be one of: ${validResponses.join(', ')}` },
        { status: 400 }
      );
    }

    await broadcastService.recordRSVP(id, email, response);

    // Return a nice HTML page for the user
    const responseLabels: Record<RSVPResponse, { ar: string; color: string }> = {
      YES: { ar: 'سأحضر', color: '#28a745' },
      NO: { ar: 'لن أحضر', color: '#dc3545' },
      MAYBE: { ar: 'ربما', color: '#ffc107' },
    };

    const label = responseLabels[response];
    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>تأكيد الحضور - شجرة عائلة آل شايع</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f5f5f5;
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          .card {
            background: white;
            border-radius: 12px;
            padding: 40px;
            max-width: 400px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .icon {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: ${label.color};
            color: white;
            font-size: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
          }
          h1 { color: #1E3A5F; margin: 0 0 10px; }
          p { color: #666; line-height: 1.6; }
          .response {
            font-size: 24px;
            color: ${label.color};
            font-weight: bold;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">${response === 'YES' ? '✓' : response === 'NO' ? '✗' : '?'}</div>
          <h1>تم تسجيل ردك</h1>
          <p class="response">${label.ar}</p>
          <p>شكراً لك على الرد. تم تسجيل حضورك بنجاح.</p>
          <p style="margin-top: 30px; font-size: 14px; color: #999;">
            شجرة عائلة آل شايع
          </p>
        </div>
      </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    console.error('Error recording RSVP:', error);
    const errorMsg = error instanceof Error ? error.message : 'Failed to record RSVP';
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 400 }
    );
  }
}

// POST /api/broadcasts/[id]/rsvp - Record RSVP via API
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    if (!body.email || !body.response) {
      return NextResponse.json(
        { success: false, error: 'Email and response are required' },
        { status: 400 }
      );
    }

    const validResponses: RSVPResponse[] = ['YES', 'NO', 'MAYBE'];
    if (!validResponses.includes(body.response)) {
      return NextResponse.json(
        { success: false, error: `Invalid response. Must be one of: ${validResponses.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await broadcastService.recordRSVP(
      id,
      body.email,
      body.response,
      body.note
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: 'RSVP recorded successfully',
    });
  } catch (error) {
    console.error('Error recording RSVP:', error);
    const errorMsg = error instanceof Error ? error.message : 'Failed to record RSVP';
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 400 }
    );
  }
}
