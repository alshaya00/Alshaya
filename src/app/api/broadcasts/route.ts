import { NextRequest, NextResponse } from 'next/server';
import { broadcastService, BroadcastType, BroadcastStatus, TargetAudience } from '@/lib/services/broadcast';
import { findSessionByToken, findUserById } from '@/lib/auth/store';

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

// GET /api/broadcasts - List all broadcasts
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require authentication
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required', messageAr: 'يتطلب تسجيل الدخول' },
        { status: 401 }
      );
    }

    // SECURITY: Only ADMIN and SUPER_ADMIN can list broadcasts
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required', messageAr: 'يتطلب صلاحيات المدير' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as BroadcastStatus | null;
    const type = searchParams.get('type') as BroadcastType | null;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { broadcasts, total } = await broadcastService.listBroadcasts({
      status: status || undefined,
      type: type || undefined,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: broadcasts,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + broadcasts.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching broadcasts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch broadcasts' },
      { status: 500 }
    );
  }
}

// POST /api/broadcasts - Create a new broadcast
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require authentication
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required', messageAr: 'يتطلب تسجيل الدخول' },
        { status: 401 }
      );
    }

    // SECURITY: Only ADMIN and SUPER_ADMIN can create broadcasts
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required', messageAr: 'يتطلب صلاحيات المدير' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.titleAr || !body.contentAr) {
      return NextResponse.json(
        { success: false, error: 'titleAr and contentAr are required' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes: BroadcastType[] = ['MEETING', 'ANNOUNCEMENT', 'REMINDER', 'UPDATE'];
    if (body.type && !validTypes.includes(body.type)) {
      return NextResponse.json(
        { success: false, error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate target audience
    const validAudiences: TargetAudience[] = ['ALL', 'BRANCH', 'GENERATION', 'CUSTOM'];
    if (body.targetAudience && !validAudiences.includes(body.targetAudience)) {
      return NextResponse.json(
        { success: false, error: `Invalid targetAudience. Must be one of: ${validAudiences.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate meeting-specific fields
    if (body.type === 'MEETING' && !body.meetingDate) {
      return NextResponse.json(
        { success: false, error: 'meetingDate is required for MEETING type broadcasts' },
        { status: 400 }
      );
    }

    // Parse dates
    const meetingDate = body.meetingDate ? new Date(body.meetingDate) : undefined;
    const rsvpDeadline = body.rsvpDeadline ? new Date(body.rsvpDeadline) : undefined;
    const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : undefined;

    // Use authenticated user info
    const createdBy = user.id;
    const createdByName = user.nameArabic || user.nameEnglish || user.email;

    const broadcast = await broadcastService.createBroadcast({
      titleAr: body.titleAr,
      titleEn: body.titleEn,
      contentAr: body.contentAr,
      contentEn: body.contentEn,
      type: body.type || 'ANNOUNCEMENT',
      meetingDate,
      meetingLocation: body.meetingLocation,
      meetingUrl: body.meetingUrl,
      rsvpRequired: body.rsvpRequired ?? false,
      rsvpDeadline,
      targetAudience: body.targetAudience || 'ALL',
      targetBranch: body.targetBranch,
      targetGeneration: body.targetGeneration,
      targetMemberIds: body.targetMemberIds,
      scheduledAt,
      createdBy,
      createdByName,
    });

    return NextResponse.json({
      success: true,
      data: broadcast,
      message: 'Broadcast created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating broadcast:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create broadcast' },
      { status: 500 }
    );
  }
}
