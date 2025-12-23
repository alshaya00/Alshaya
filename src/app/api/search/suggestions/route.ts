import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAllMembersFromDb } from '@/lib/db';
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

// GET /api/search/suggestions - Get search suggestions based on query
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase() || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20);
    const includeHistory = searchParams.get('history') !== 'false';

    if (query.length < 1) {
      return NextResponse.json({
        success: true,
        suggestions: [],
        recentSearches: [],
      });
    }

    const suggestions: Array<{
      type: 'member' | 'branch' | 'city' | 'history';
      value: string;
      label: string;
      labelAr?: string;
      id?: string;
    }> = [];

    // Get member name suggestions from database
    const members = await getAllMembersFromDb();
    const matchingMembers = members
      .filter(m =>
        m.firstName.toLowerCase().includes(query) ||
        m.fullNameAr?.toLowerCase().includes(query) ||
        m.id.toLowerCase().includes(query)
      )
      .slice(0, limit);

    for (const member of matchingMembers) {
      suggestions.push({
        type: 'member',
        value: member.firstName,
        label: `${member.firstName} - ${member.fullNameAr || ''}`,
        labelAr: member.fullNameAr || member.firstName,
        id: member.id,
      });
    }

    // Get unique branches
    const branches = [...new Set(members.map(m => m.branch).filter(Boolean))];
    const matchingBranches = branches
      .filter(b => b?.toLowerCase().includes(query))
      .slice(0, 3);

    for (const branch of matchingBranches) {
      suggestions.push({
        type: 'branch',
        value: branch!,
        label: `Branch: ${branch}`,
        labelAr: `الفرع: ${branch}`,
      });
    }

    // Get unique cities
    const cities = [...new Set(members.map(m => m.city).filter(Boolean))];
    const matchingCities = cities
      .filter(c => c?.toLowerCase().includes(query))
      .slice(0, 3);

    for (const city of matchingCities) {
      suggestions.push({
        type: 'city',
        value: city!,
        label: `City: ${city}`,
        labelAr: `المدينة: ${city}`,
      });
    }

    // Get recent search history if authenticated
    let recentSearches: string[] = [];
    if (includeHistory) {
      try {
        const user = await getAuthUser(request);
        const sessionId = searchParams.get('sessionId');

        if (user || sessionId) {
          const history = await prisma.searchHistory.findMany({
            where: {
              ...(user ? { userId: user.id } : { sessionId }),
              query: { contains: query },
            },
            orderBy: { searchedAt: 'desc' },
            take: 5,
            select: { query: true },
          });

          // Deduplicate
          recentSearches = Array.from(new Set(history.map((h: { query: string }) => h.query)));

          // Add history suggestions
          for (const historyQuery of recentSearches) {
            if (!suggestions.some(s => s.value.toLowerCase() === historyQuery.toLowerCase())) {
              suggestions.push({
                type: 'history',
                value: historyQuery,
                label: historyQuery,
              });
            }
          }
        }
      } catch {
        // Ignore history errors
      }
    }

    // Limit total suggestions
    const limitedSuggestions = suggestions.slice(0, limit);

    return NextResponse.json({
      success: true,
      suggestions: limitedSuggestions,
      recentSearches,
    });
  } catch (error) {
    console.error('Error getting suggestions:', error);
    return NextResponse.json({
      success: true,
      suggestions: [],
      recentSearches: [],
    });
  }
}
