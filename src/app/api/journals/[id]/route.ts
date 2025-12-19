import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safeJsonParseArray } from '@/lib/utils/safe-json';
import { sanitizeString } from '@/lib/sanitize';

// GET /api/journals/[id] - Get a single journal
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const journal = await prisma.familyJournal.findUnique({
      where: { id },
      include: {
        mediaItems: {
          orderBy: { displayOrder: 'asc' }
        }
      }
    });

    if (!journal) {
      return NextResponse.json(
        { success: false, error: 'القصة غير موجودة' },
        { status: 404 }
      );
    }

    // Increment view count
    await prisma.familyJournal.update({
      where: { id },
      data: { viewCount: { increment: 1 } }
    });

    // Parse JSON fields safely
    const parsedJournal = {
      ...journal,
      tags: safeJsonParseArray<string>(journal.tags),
      relatedMemberIds: safeJsonParseArray<string>(journal.relatedMemberIds)
    };

    return NextResponse.json({
      success: true,
      data: parsedJournal
    });
  } catch (error) {
    console.error('Error fetching journal:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في جلب القصة' },
      { status: 500 }
    );
  }
}

// PUT /api/journals/[id] - Update a journal
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // Check if journal exists
    const existing = await prisma.familyJournal.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'القصة غير موجودة' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (body.titleAr !== undefined) updateData.titleAr = sanitizeString(body.titleAr);
    if (body.titleEn !== undefined) updateData.titleEn = sanitizeString(body.titleEn);
    if (body.contentAr !== undefined) updateData.contentAr = body.contentAr;
    if (body.contentEn !== undefined) updateData.contentEn = body.contentEn;
    if (body.excerpt !== undefined) updateData.excerpt = sanitizeString(body.excerpt);
    if (body.category !== undefined) updateData.category = body.category;
    if (body.tags !== undefined) updateData.tags = JSON.stringify(body.tags);
    if (body.era !== undefined) updateData.era = sanitizeString(body.era);
    if (body.yearFrom !== undefined) updateData.yearFrom = body.yearFrom ? parseInt(body.yearFrom) : null;
    if (body.yearTo !== undefined) updateData.yearTo = body.yearTo ? parseInt(body.yearTo) : null;
    if (body.dateDescription !== undefined) updateData.dateDescription = sanitizeString(body.dateDescription);
    if (body.location !== undefined) updateData.location = sanitizeString(body.location);
    if (body.locationAr !== undefined) updateData.locationAr = sanitizeString(body.locationAr);
    if (body.primaryMemberId !== undefined) updateData.primaryMemberId = body.primaryMemberId;
    if (body.relatedMemberIds !== undefined) updateData.relatedMemberIds = JSON.stringify(body.relatedMemberIds);
    if (body.generation !== undefined) updateData.generation = body.generation ? parseInt(body.generation) : null;
    if (body.coverImageUrl !== undefined) updateData.coverImageUrl = body.coverImageUrl;
    if (body.narrator !== undefined) updateData.narrator = sanitizeString(body.narrator);
    if (body.narratorId !== undefined) updateData.narratorId = body.narratorId;
    if (body.source !== undefined) updateData.source = sanitizeString(body.source);
    if (body.status !== undefined) updateData.status = body.status;
    if (body.isFeatured !== undefined) updateData.isFeatured = body.isFeatured;
    if (body.displayOrder !== undefined) updateData.displayOrder = body.displayOrder;

    const journal = await prisma.familyJournal.update({
      where: { id },
      data: updateData,
      include: {
        mediaItems: {
          orderBy: { displayOrder: 'asc' }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        ...journal,
        tags: safeJsonParseArray<string>(journal.tags),
        relatedMemberIds: safeJsonParseArray<string>(journal.relatedMemberIds)
      },
      message: 'تم تحديث القصة بنجاح'
    });
  } catch (error) {
    console.error('Error updating journal:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في تحديث القصة' },
      { status: 500 }
    );
  }
}

// DELETE /api/journals/[id] - Delete a journal
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if journal exists
    const existing = await prisma.familyJournal.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'القصة غير موجودة' },
        { status: 404 }
      );
    }

    // Delete the journal (cascades to media items)
    await prisma.familyJournal.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'تم حذف القصة بنجاح'
    });
  } catch (error) {
    console.error('Error deleting journal:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في حذف القصة' },
      { status: 500 }
    );
  }
}
