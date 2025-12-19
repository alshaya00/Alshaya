import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getAllMembersFromDb } from '@/lib/db';
import { findSessionByToken, findUserById } from '@/lib/auth/store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import {
  findMatches,
  validateInput,
  getMatchExplanation,
  NameInput,
  MatchResult,
} from '@/lib/matching';

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

/**
 * POST /api/members/match
 * Find matching fathers based on lineage names
 *
 * Request body:
 * {
 *   firstName: string;         // Name of person being added
 *   fatherName: string;        // Father's first name (required)
 *   grandfatherName?: string;  // Grandfather's first name
 *   greatGrandfatherName?: string; // Great-grandfather's first name
 * }
 *
 * Response:
 * {
 *   success: boolean;
 *   data: MatchResult;
 *   validationErrors?: string[];
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require authentication
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized',
          messageAr: 'غير مصرح'
        },
        { status: 401 }
      );
    }

    // Check permission - need at least add_member permission to use matching
    const permissions = getPermissionsForRole(user.role);
    if (!permissions.add_member && !permissions.view_member_profiles) {
      return NextResponse.json(
        {
          success: false,
          message: 'No permission to search members',
          messageAr: 'لا تملك صلاحية البحث عن الأعضاء'
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();

    const input: NameInput = {
      firstName: body.firstName?.trim() || '',
      fatherName: body.fatherName?.trim() || '',
      grandfatherName: body.grandfatherName?.trim() || undefined,
      greatGrandfatherName: body.greatGrandfatherName?.trim() || undefined,
    };

    // Validate input
    const validation = validateInput(input);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid input',
          messageAr: 'المدخلات غير صالحة',
          errors: validation.errors,
          errorsAr: validation.errorsAr,
        },
        { status: 400 }
      );
    }

    // Get all members from database
    const members = await getAllMembersFromDb();

    if (!members || members.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'No members found in database',
          messageAr: 'لم يتم العثور على أعضاء في قاعدة البيانات'
        },
        { status: 500 }
      );
    }

    // Run matching algorithm
    const matchResult = findMatches(input, members);

    // Add explanations for top matches
    const matchesWithExplanations = matchResult.allMatches.slice(0, 10).map(match => ({
      ...match,
      explanation: getMatchExplanation(match),
    }));

    // Build response
    const response = {
      success: true,
      data: {
        ...matchResult,
        // Replace allMatches with limited version with explanations
        allMatches: matchesWithExplanations,
        // Keep categorized matches but limit them
        exactMatches: matchResult.exactMatches.slice(0, 5),
        highMatches: matchResult.highMatches.slice(0, 5),
        mediumMatches: matchResult.mediumMatches.slice(0, 5),
        lowMatches: matchResult.lowMatches.slice(0, 3),
      },
      input, // Echo back input for debugging
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in name matching:', error);
    Sentry.captureException(error, {
      tags: { endpoint: 'members/match', operation: 'match' },
    });
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to perform matching',
        messageAr: 'فشل في إجراء المطابقة',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
