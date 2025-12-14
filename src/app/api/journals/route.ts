import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safeJsonParseArray } from '@/lib/utils/safe-json';
import { sanitizeString } from '@/lib/sanitize';

// GET /api/journals - Get all journals with filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const featured = searchParams.get('featured');
    const generation = searchParams.get('generation');
    const memberId = searchParams.get('memberId');
    const search = searchParams.get('search');
    const era = searchParams.get('era');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build the where clause
    const where: Record<string, unknown> = {};

    // Only show published journals by default (unless admin)
    if (status) {
      where.status = status;
    } else {
      where.status = 'PUBLISHED';
    }

    if (category) {
      where.category = category;
    }

    if (featured === 'true') {
      where.isFeatured = true;
    }

    if (generation) {
      where.generation = parseInt(generation);
    }

    if (era) {
      where.era = era;
    }

    // Build OR conditions - combine memberId and search filters properly
    if (search) {
      const searchTerm = search.toLowerCase();
      // If memberId filter exists, we need AND logic: (member matches) AND (search matches)
      // If no memberId, just use OR for search fields
      if (memberId) {
        // Member filter already in AND, add search as separate AND condition
        where.AND = [
          {
            OR: [
              { primaryMemberId: memberId },
              { relatedMemberIds: { contains: memberId } }
            ]
          },
          {
            OR: [
              { titleAr: { contains: searchTerm } },
              { titleEn: { contains: searchTerm } },
              { contentAr: { contains: searchTerm } },
              { excerpt: { contains: searchTerm } },
              { narrator: { contains: searchTerm } },
              { locationAr: { contains: searchTerm } }
            ]
          }
        ];
      } else {
        where.OR = [
          { titleAr: { contains: searchTerm } },
          { titleEn: { contains: searchTerm } },
          { contentAr: { contains: searchTerm } },
          { excerpt: { contains: searchTerm } },
          { narrator: { contains: searchTerm } },
          { locationAr: { contains: searchTerm } }
        ];
      }
    } else if (memberId) {
      // Only memberId filter, no search
      where.OR = [
        { primaryMemberId: memberId },
        { relatedMemberIds: { contains: memberId } }
      ];
    }

    // Get total count
    const total = await prisma.familyJournal.count({ where });

    // Get paginated journals
    const journals = await prisma.familyJournal.findMany({
      where,
      include: {
        mediaItems: {
          orderBy: { displayOrder: 'asc' },
          take: 5 // Limit media for list view
        }
      },
      orderBy: [
        { isFeatured: 'desc' },
        { displayOrder: 'asc' },
        { createdAt: 'desc' }
      ],
      skip: (page - 1) * limit,
      take: limit
    });

    // Parse JSON fields safely
    const parsedJournals = journals.map((journal: typeof journals[0]) => ({
      ...journal,
      tags: safeJsonParseArray<string>(journal.tags),
      relatedMemberIds: safeJsonParseArray<string>(journal.relatedMemberIds)
    }));

    return NextResponse.json({
      success: true,
      data: parsedJournals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching journals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch journals' },
      { status: 500 }
    );
  }
}

// POST /api/journals - Create a new journal entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const titleAr = sanitizeString(body.titleAr);
    const contentAr = body.contentAr; // Don't sanitize content to allow formatting

    if (!titleAr) {
      return NextResponse.json(
        { success: false, error: 'العنوان بالعربية مطلوب' },
        { status: 400 }
      );
    }

    if (!contentAr) {
      return NextResponse.json(
        { success: false, error: 'المحتوى مطلوب' },
        { status: 400 }
      );
    }

    // Create journal entry
    const journal = await prisma.familyJournal.create({
      data: {
        titleAr,
        titleEn: sanitizeString(body.titleEn),
        contentAr,
        contentEn: body.contentEn || null,
        excerpt: sanitizeString(body.excerpt) || contentAr.substring(0, 200),
        category: body.category || 'ORAL_HISTORY',
        tags: body.tags ? JSON.stringify(body.tags) : null,
        era: sanitizeString(body.era),
        yearFrom: body.yearFrom ? parseInt(body.yearFrom) : null,
        yearTo: body.yearTo ? parseInt(body.yearTo) : null,
        dateDescription: sanitizeString(body.dateDescription),
        location: sanitizeString(body.location),
        locationAr: sanitizeString(body.locationAr),
        primaryMemberId: body.primaryMemberId || null,
        relatedMemberIds: body.relatedMemberIds ? JSON.stringify(body.relatedMemberIds) : null,
        generation: body.generation ? parseInt(body.generation) : null,
        coverImageUrl: body.coverImageUrl || null,
        narrator: sanitizeString(body.narrator),
        narratorId: body.narratorId || null,
        source: sanitizeString(body.source),
        status: body.status || 'DRAFT',
        isFeatured: body.isFeatured || false,
        displayOrder: body.displayOrder || 0,
        authorId: body.authorId || null,
        authorName: sanitizeString(body.authorName) || 'مجهول',
        reviewStatus: 'PENDING'
      },
      include: {
        mediaItems: true
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        ...journal,
        tags: safeJsonParseArray<string>(journal.tags),
        relatedMemberIds: safeJsonParseArray<string>(journal.relatedMemberIds)
      },
      message: 'تم إنشاء القصة بنجاح'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating journal:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في إنشاء القصة' },
      { status: 500 }
    );
  }
}
