import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sanitizeString } from '@/lib/sanitize';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/gatherings/[id] - Get single gathering with full details
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const userId = request.nextUrl.searchParams.get('userId');

    const gathering = await prisma.gathering.findUnique({
      where: { id },
      include: {
        attendees: {
          include: {
            // Add any related data needed
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!gathering) {
      return NextResponse.json(
        { success: false, error: 'Gathering not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    const isPast = new Date(gathering.date) < now;

    // Calculate attendance stats
    type AttendeeType = typeof gathering.attendees[0];
    const confirmed = gathering.attendees.filter((a: AttendeeType) => a.rsvpStatus === 'YES').length;
    const maybe = gathering.attendees.filter((a: AttendeeType) => a.rsvpStatus === 'MAYBE').length;
    const declined = gathering.attendees.filter((a: AttendeeType) => a.rsvpStatus === 'NO').length;

    // Find user's RSVP if userId provided
    let userRsvp = null;
    if (userId) {
      const userAttendee = gathering.attendees.find((a: AttendeeType) => a.userId === userId);
      if (userAttendee) {
        userRsvp = userAttendee.rsvpStatus.toLowerCase();
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: gathering.id,
        title: gathering.title,
        titleAr: gathering.titleAr,
        description: gathering.description,
        descriptionAr: gathering.descriptionAr,
        date: gathering.date.toISOString().split('T')[0],
        endDate: gathering.endDate?.toISOString().split('T')[0] || null,
        time: gathering.time,
        location: gathering.location,
        locationAr: gathering.locationAr,
        locationUrl: gathering.locationUrl,
        type: gathering.type,
        coverImage: gathering.coverImage,
        organizer: {
          id: gathering.organizerId,
          name: gathering.organizerName,
          nameAr: gathering.organizerNameAr
        },
        attendees: {
          confirmed,
          maybe,
          declined,
          total: gathering.attendees.length,
          list: gathering.attendees.map((a: AttendeeType) => ({
            id: a.id,
            name: a.name,
            email: a.email,
            rsvpStatus: a.rsvpStatus,
            rsvpNote: a.rsvpNote,
            attended: a.attended
          }))
        },
        userRsvp,
        isPast,
        status: gathering.status,
        isPublic: gathering.isPublic,
        createdAt: gathering.createdAt,
        updatedAt: gathering.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching gathering:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch gathering' },
      { status: 500 }
    );
  }
}

// PUT /api/gatherings/[id] - Update gathering
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    // Check if gathering exists
    const existing = await prisma.gathering.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Gathering not found' },
        { status: 404 }
      );
    }

    // Update gathering
    const gathering = await prisma.gathering.update({
      where: { id },
      data: {
        title: body.title !== undefined ? sanitizeString(body.title) : undefined,
        titleAr: body.titleAr !== undefined ? sanitizeString(body.titleAr) : undefined,
        description: body.description !== undefined ? body.description : undefined,
        descriptionAr: body.descriptionAr !== undefined ? sanitizeString(body.descriptionAr) : undefined,
        date: body.date !== undefined ? new Date(body.date) : undefined,
        endDate: body.endDate !== undefined ? (body.endDate ? new Date(body.endDate) : null) : undefined,
        time: body.time !== undefined ? body.time : undefined,
        location: body.location !== undefined ? body.location : undefined,
        locationAr: body.locationAr !== undefined ? sanitizeString(body.locationAr) : undefined,
        locationUrl: body.locationUrl !== undefined ? body.locationUrl : undefined,
        type: body.type !== undefined ? body.type : undefined,
        coverImage: body.coverImage !== undefined ? body.coverImage : undefined,
        organizerName: body.organizerName !== undefined ? sanitizeString(body.organizerName) : undefined,
        organizerNameAr: body.organizerNameAr !== undefined ? sanitizeString(body.organizerNameAr) : undefined,
        status: body.status !== undefined ? body.status : undefined,
        isPublic: body.isPublic !== undefined ? body.isPublic : undefined
      },
      include: {
        attendees: true
      }
    });

    return NextResponse.json({
      success: true,
      data: gathering,
      message: 'تم تحديث اللقاء بنجاح'
    });
  } catch (error) {
    console.error('Error updating gathering:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update gathering' },
      { status: 500 }
    );
  }
}

// DELETE /api/gatherings/[id] - Delete gathering
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    // Check if gathering exists
    const existing = await prisma.gathering.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Gathering not found' },
        { status: 404 }
      );
    }

    // Delete gathering (attendees will be cascade deleted)
    await prisma.gathering.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'تم حذف اللقاء بنجاح'
    });
  } catch (error) {
    console.error('Error deleting gathering:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete gathering' },
      { status: 500 }
    );
  }
}

// POST /api/gatherings/[id] - RSVP to gathering
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const { userId, name, email, rsvpStatus, rsvpNote } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!rsvpStatus || !['YES', 'MAYBE', 'NO'].includes(rsvpStatus.toUpperCase())) {
      return NextResponse.json(
        { success: false, error: 'Valid RSVP status is required (YES, MAYBE, NO)' },
        { status: 400 }
      );
    }

    // Check if gathering exists
    const gathering = await prisma.gathering.findUnique({
      where: { id }
    });

    if (!gathering) {
      return NextResponse.json(
        { success: false, error: 'Gathering not found' },
        { status: 404 }
      );
    }

    // Upsert attendee record
    const attendee = await prisma.gatheringAttendee.upsert({
      where: {
        gatheringId_userId: userId ? { gatheringId: id, userId } : undefined
      },
      create: {
        gatheringId: id,
        userId: userId || null,
        name: sanitizeString(name),
        email: email || null,
        rsvpStatus: rsvpStatus.toUpperCase(),
        rsvpNote: rsvpNote ? sanitizeString(rsvpNote) : null,
        rsvpAt: new Date()
      },
      update: {
        rsvpStatus: rsvpStatus.toUpperCase(),
        rsvpNote: rsvpNote ? sanitizeString(rsvpNote) : null,
        rsvpAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      data: attendee,
      message: 'تم تسجيل حضورك بنجاح'
    });
  } catch (error) {
    console.error('Error RSVPing to gathering:', error);
    // Handle unique constraint error for non-user RSVPs
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      // Try to find and update by email if userId not provided
      return NextResponse.json(
        { success: false, error: 'Already RSVPed to this gathering' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to RSVP' },
      { status: 500 }
    );
  }
}
