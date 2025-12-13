import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/store';

// Helper to get auth user from request
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

// Helper to get client IP
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

// GET /api/search/history - Get search history for user
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const searchType = searchParams.get('type');
    const sessionId = searchParams.get('sessionId');

    // Build query conditions
    const where: Record<string, unknown> = {};

    if (user) {
      where.userId = user.id;
    } else if (sessionId) {
      where.sessionId = sessionId;
    } else {
      // Return empty for unauthenticated requests without session
      return NextResponse.json({
        success: true,
        history: [],
        message: 'Authentication or sessionId required',
      });
    }

    if (searchType) {
      where.searchType = searchType;
    }

    const history = await prisma.searchHistory.findMany({
      where,
      orderBy: { searchedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        query: true,
        searchType: true,
        filters: true,
        resultsCount: true,
        searchedAt: true,
      },
    });

    // Get unique recent queries (deduplicated)
    const uniqueQueries = Array.from(
      new Map(history.map(h => [h.query.toLowerCase(), h])).values()
    ).slice(0, limit);

    return NextResponse.json({
      success: true,
      history: uniqueQueries,
      total: history.length,
    });
  } catch (error) {
    console.error('Error fetching search history:', error);
    // Return empty array on error for graceful degradation
    return NextResponse.json({
      success: true,
      history: [],
      message: 'Search history unavailable',
    });
  }
}

// POST /api/search/history - Record a search
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user = await getAuthUser(request);

    // Validate required fields
    if (!body.query || typeof body.query !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Query is required' },
        { status: 400 }
      );
    }

    // Don't record very short queries
    if (body.query.trim().length < 2) {
      return NextResponse.json({
        success: true,
        message: 'Query too short to record',
      });
    }

    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || undefined;

    // Record the search
    const searchRecord = await prisma.searchHistory.create({
      data: {
        userId: user?.id || null,
        sessionId: body.sessionId || null,
        query: body.query.trim().substring(0, 200), // Limit query length
        searchType: body.searchType || 'member',
        filters: body.filters ? JSON.stringify(body.filters) : null,
        resultsCount: body.resultsCount || 0,
        clickedResultId: body.clickedResultId || null,
        ipAddress,
        userAgent,
      },
    });

    return NextResponse.json({
      success: true,
      id: searchRecord.id,
      message: 'Search recorded',
    });
  } catch (error) {
    console.error('Error recording search:', error);
    // Don't fail the request if search recording fails
    return NextResponse.json({
      success: true,
      message: 'Search recording skipped',
    });
  }
}

// DELETE /api/search/history - Clear search history
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const sessionId = searchParams.get('sessionId');

    if (!user && !sessionId) {
      return NextResponse.json(
        { success: false, message: 'Authentication or sessionId required' },
        { status: 401 }
      );
    }

    if (id) {
      // Delete specific entry
      await prisma.searchHistory.deleteMany({
        where: {
          id,
          ...(user ? { userId: user.id } : { sessionId }),
        },
      });
      return NextResponse.json({
        success: true,
        message: 'Search entry deleted',
      });
    } else {
      // Clear all history for user/session
      const result = await prisma.searchHistory.deleteMany({
        where: user ? { userId: user.id } : { sessionId },
      });
      return NextResponse.json({
        success: true,
        message: 'Search history cleared',
        deletedCount: result.count,
      });
    }
  } catch (error) {
    console.error('Error clearing search history:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to clear search history' },
      { status: 500 }
    );
  }
}
