import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safeJsonParseArray } from '@/lib/utils/safe-json';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
export const dynamic = "force-dynamic";

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

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك بالوصول' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const reviewStatus = searchParams.get('reviewStatus');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (reviewStatus) {
      where.reviewStatus = reviewStatus;
    }

    if (search) {
      const searchTerm = search.toLowerCase();
      where.OR = [
        { titleAr: { contains: searchTerm } },
        { titleEn: { contains: searchTerm } },
        { authorName: { contains: searchTerm } },
        { narrator: { contains: searchTerm } }
      ];
    }

    const total = await prisma.familyJournal.count({ where });

    const journals = await prisma.familyJournal.findMany({
      where,
      orderBy: [
        { createdAt: 'desc' }
      ],
      skip: (page - 1) * limit,
      take: limit
    });

    const parsedJournals = journals.map((journal) => ({
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
    console.error('Error fetching journals for admin:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في جلب القصص' },
      { status: 500 }
    );
  }
}
