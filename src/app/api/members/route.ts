import { NextRequest, NextResponse } from 'next/server';
import { getAllMembers, getMaleMembers, getMembersByGeneration, getMembersByBranch, FamilyMember, familyMembers } from '@/lib/data';

// Sanitize string input to prevent XSS attacks
function sanitizeString(input: string | null | undefined): string | null {
  if (!input) return null;
  // Remove HTML tags and script content
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

// Normalize gender input to handle case insensitivity
function normalizeGender(gender: string): 'Male' | 'Female' | null {
  const normalized = gender.toLowerCase();
  if (normalized === 'male') return 'Male';
  if (normalized === 'female') return 'Female';
  return null;
}

// GET /api/members - Get all members with optional filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const gender = searchParams.get('gender');
    const generation = searchParams.get('generation');
    const branch = searchParams.get('branch');
    const malesOnly = searchParams.get('males') === 'true';
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');

    let members: FamilyMember[] = getAllMembers();

    if (malesOnly) {
      members = getMaleMembers();
    }

    if (gender) {
      const normalizedGender = normalizeGender(gender);
      if (normalizedGender) {
        members = members.filter((m) => m.gender === normalizedGender);
      }
    }

    if (generation) {
      members = getMembersByGeneration(parseInt(generation));
    }

    if (branch) {
      members = getMembersByBranch(branch);
    }

    if (status) {
      members = members.filter((m) => m.status === status);
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
    return NextResponse.json(
      { success: false, error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

// POST /api/members - Create a new member
export async function POST(request: NextRequest) {
  try {
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

    // Check for duplicate ID
    if (body.id && familyMembers.some(m => m.id === body.id)) {
      return NextResponse.json(
        { success: false, error: 'Member with this ID already exists' },
        { status: 409 }
      );
    }

    // Generate ID if not provided
    const maxId = Math.max(...familyMembers.map(m => parseInt(m.id.slice(1))));
    const id = body.id || `P${String(maxId + 1).padStart(3, '0')}`;

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
    };

    // In real implementation with Prisma:
    // const newMember = await prisma.familyMember.create({ data: newMember });

    return NextResponse.json({
      success: true,
      data: newMember,
      message: 'Member created successfully'
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create member' },
      { status: 500 }
    );
  }
}
