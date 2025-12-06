import { NextRequest, NextResponse } from 'next/server';
import { getAllMembers, getMaleMembers, getMembersByGeneration, getMembersByBranch, FamilyMember, familyMembers } from '@/lib/data';

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
      members = members.filter((m) => m.gender === gender);
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

    // Validate required fields
    if (!body.firstName) {
      return NextResponse.json(
        { success: false, error: 'firstName is required' },
        { status: 400 }
      );
    }

    if (!body.gender || !['Male', 'Female'].includes(body.gender)) {
      return NextResponse.json(
        { success: false, error: 'Valid gender is required' },
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

    // Create member object
    const newMember: FamilyMember = {
      id,
      firstName: body.firstName,
      fatherName: body.fatherName || null,
      grandfatherName: body.grandfatherName || null,
      greatGrandfatherName: body.greatGrandfatherName || null,
      familyName: body.familyName || 'آل شايع',
      fatherId: body.fatherId || null,
      gender: body.gender,
      birthYear: body.birthYear || null,
      sonsCount: body.sonsCount || 0,
      daughtersCount: body.daughtersCount || 0,
      generation: body.generation || 1,
      branch: body.branch || null,
      fullNameAr: body.fullNameAr || null,
      fullNameEn: body.fullNameEn || null,
      phone: body.phone || null,
      city: body.city || null,
      status: body.status || 'Living',
      photoUrl: body.photoUrl || null,
      biography: body.biography || null,
      occupation: body.occupation || null,
      email: body.email || null,
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
