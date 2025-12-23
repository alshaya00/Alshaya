import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sanitizeString } from '@/lib/sanitize';

// GET /api/gatherings - Get all gatherings with filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const upcoming = searchParams.get('upcoming');
    const past = searchParams.get('past');
    const userId = searchParams.get('userId');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build the where clause
    const where: Record<string, unknown> = {};
    const now = new Date();

    // Status filter
    if (status) {
      where.status = status;
    }

    // Type filter
    if (type) {
      where.type = type;
    }

    // Upcoming filter (future events)
    if (upcoming === 'true') {
      where.date = { gte: now };
    }

    // Past filter (completed events)
    if (past === 'true') {
      where.date = { lt: now };
    }

    // Search filter
    if (search) {
      const searchTerm = search.toLowerCase();
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { titleAr: { contains: searchTerm } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { descriptionAr: { contains: searchTerm } },
        { location: { contains: searchTerm, mode: 'insensitive' } },
        { locationAr: { contains: searchTerm } },
        { organizerName: { contains: searchTerm, mode: 'insensitive' } },
        { organizerNameAr: { contains: searchTerm } }
      ];
    }

    // Get total count
    const total = await prisma.gathering.count({ where });

    // Get paginated gatherings
    const gatherings = await prisma.gathering.findMany({
      where,
      include: {
        attendees: {
          select: {
            id: true,
            userId: true,
            rsvpStatus: true
          }
        }
      },
      orderBy: [
        { date: 'asc' }
      ],
      skip: (page - 1) * limit,
      take: limit
    });

    // Transform gatherings to include attendance stats
    const transformedGatherings = gatherings.map((gathering: typeof gatherings[0]) => {
      const attendees = gathering.attendees;
      const confirmed = attendees.filter((a: typeof attendees[0]) => a.rsvpStatus === 'YES').length;
      const maybe = attendees.filter((a: typeof attendees[0]) => a.rsvpStatus === 'MAYBE').length;
      const total = attendees.length;

      // Find user's RSVP if userId provided
      let userRsvp = null;
      if (userId) {
        const userAttendee = attendees.find((a: typeof attendees[0]) => a.userId === userId);
        if (userAttendee) {
          userRsvp = userAttendee.rsvpStatus.toLowerCase();
        }
      }

      const isPast = new Date(gathering.date) < now;

      return {
        id: gathering.id,
        title: gathering.title,
        titleAr: gathering.titleAr,
        description: gathering.description,
        descriptionAr: gathering.descriptionAr,
        date: gathering.date.toISOString().split('T')[0],
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
          total
        },
        userRsvp,
        isPast,
        status: gathering.status,
        isPublic: gathering.isPublic
      };
    });

    return NextResponse.json({
      success: true,
      data: transformedGatherings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching gatherings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch gatherings' },
      { status: 500 }
    );
  }
}

// POST /api/gatherings - Create a new gathering
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const title = sanitizeString(body.title);
    const titleAr = sanitizeString(body.titleAr);
    const date = body.date;

    if (!title && !titleAr) {
      return NextResponse.json(
        { success: false, error: 'العنوان مطلوب / Title is required' },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'التاريخ مطلوب / Date is required' },
        { status: 400 }
      );
    }

    // Create gathering
    const gathering = await prisma.gathering.create({
      data: {
        title: title || titleAr,
        titleAr: titleAr || title,
        description: body.description || null,
        descriptionAr: sanitizeString(body.descriptionAr) || null,
        date: new Date(date),
        endDate: body.endDate ? new Date(body.endDate) : null,
        time: body.time || null,
        location: body.location || null,
        locationAr: sanitizeString(body.locationAr) || null,
        locationUrl: body.locationUrl || null,
        type: body.type || 'gathering',
        coverImage: body.coverImage || null,
        organizerId: body.organizerId || null,
        organizerName: sanitizeString(body.organizerName) || 'Organizer',
        organizerNameAr: sanitizeString(body.organizerNameAr) || 'المنظم',
        status: body.status || 'UPCOMING',
        isPublic: body.isPublic !== false,
        createdBy: body.createdBy || null
      },
      include: {
        attendees: true
      }
    });

    return NextResponse.json({
      success: true,
      data: gathering,
      message: 'تم إنشاء اللقاء بنجاح'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating gathering:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في إنشاء اللقاء' },
      { status: 500 }
    );
  }
}
