import { NextRequest, NextResponse } from 'next/server';
import { FamilyMember } from '@/lib/types';
import { getAllMembersFromDb, getNextIdFromDb, memberExistsInDb, createMemberInDb } from '@/lib/db';
import { sanitizeString } from '@/lib/sanitize';
import { findSessionByToken, findUserById } from '@/lib/auth/store';
import { getPermissionsForRole } from '@/lib/auth/permissions';

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

// Normalize gender input to handle case insensitivity
function normalizeGender(gender: string): 'Male' | 'Female' | null {
  const normalized = gender.toLowerCase();
  if (normalized === 'male') return 'Male';
  if (normalized === 'female') return 'Female';
  return null;
}

// GET /api/members - Get all members with optional filters
// PUBLIC: Allow read access for viewing the family tree
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const gender = searchParams.get('gender');
    const generation = searchParams.get('generation');
    const branch = searchParams.get('branch');
    const malesOnly = searchParams.get('males') === 'true';
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    // Validate pagination params
    const page = Math.max(1, parseInt(pageParam || '1') || 1);
    const limit = Math.min(500, Math.max(1, parseInt(limitParam || '100') || 100));

    // Get all members from database
    let members = await getAllMembersFromDb();

    if (malesOnly) {
      members = members.filter(m => m.gender === 'Male');
    }

    if (gender) {
      const normalizedGender = normalizeGender(gender);
      if (normalizedGender) {
        members = members.filter(m => m.gender === normalizedGender);
      }
    }

    if (generation) {
      const gen = parseInt(generation);
      if (!isNaN(gen)) {
        members = members.filter(m => m.generation === gen);
      }
    }

    if (branch) {
      members = members.filter(m => m.branch === branch);
    }

    if (status) {
      members = members.filter(m => m.status === status);
    }

    if (search) {
      const query = search.toLowerCase();
      members = members.filter(m =>
        m.firstName.toLowerCase().includes(query) ||
        m.fullNameAr?.toLowerCase().includes(query) ||
        m.id.toLowerCase().includes(query) ||
        m.city?.toLowerCase().includes(query) ||
        m.occupation?.toLowerCase().includes(query)
      );
    }

    // Pagination
    const total = members.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedMembers = members.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      data: paginatedMembers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

// POST /api/members - Create a new member
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require authentication and add_members permission
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const permissions = getPermissionsForRole(user.role);
    if (!permissions.add_member) {
      return NextResponse.json(
        { success: false, message: 'No permission to add members', messageAr: 'لا تملك صلاحية إضافة أعضاء' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Sanitize input fields to prevent XSS
    const sanitizedFirstName = sanitizeString(body.firstName);
    const sanitizedGender = body.gender ? normalizeGender(body.gender) : null;

    // Validate required fields
    if (!sanitizedFirstName) {
      return NextResponse.json(
        { success: false, error: 'firstName is required' },
        { status: 400 }
      );
    }

    if (!sanitizedGender) {
      return NextResponse.json(
        { success: false, error: 'Valid gender is required (Male or Female)' },
        { status: 400 }
      );
    }

    // Check for duplicate ID in database
    if (body.id) {
      const exists = await memberExistsInDb(body.id);
      if (exists) {
        return NextResponse.json(
          { success: false, error: 'Member with this ID already exists' },
          { status: 409 }
        );
      }
    }

    // Generate ID if not provided
    const id = body.id || await getNextIdFromDb();

    // Create member object with sanitized inputs
    const newMember: FamilyMember = {
      id,
      firstName: sanitizedFirstName,
      fatherName: sanitizeString(body.fatherName),
      grandfatherName: sanitizeString(body.grandfatherName),
      greatGrandfatherName: sanitizeString(body.greatGrandfatherName),
      familyName: sanitizeString(body.familyName) || 'آل شايع',
      fatherId: sanitizeString(body.fatherId),
      gender: sanitizedGender,
      birthYear: body.birthYear || null,
      sonsCount: body.sonsCount || 0,
      daughtersCount: body.daughtersCount || 0,
      generation: body.generation || 1,
      branch: sanitizeString(body.branch),
      fullNameAr: sanitizeString(body.fullNameAr),
      fullNameEn: sanitizeString(body.fullNameEn),
      phone: sanitizeString(body.phone),
      city: sanitizeString(body.city),
      status: body.status === 'Deceased' ? 'Deceased' : 'Living',
      photoUrl: sanitizeString(body.photoUrl),
      biography: sanitizeString(body.biography),
      occupation: sanitizeString(body.occupation),
      email: sanitizeString(body.email),
      createdBy: body.createdBy || 'system',
    };

    // Create in database
    const createdMember = await createMemberInDb(newMember);

    if (!createdMember) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create member in database'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: createdMember,
      message: 'Member created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating member:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create member' },
      { status: 500 }
    );
  }
}
