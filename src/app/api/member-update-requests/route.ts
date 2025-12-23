import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById, logActivity } from '@/lib/auth/store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { getMemberByIdFromDb } from '@/lib/db';

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

// Sanitize string input
function sanitizeString(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
}

// Allowed fields for member updates
const ALLOWED_UPDATE_FIELDS = [
  'birthYear',
  'deathYear',
  'phone',
  'email',
  'city',
  'photoUrl',
  'biography',
  'occupation',
  'status', // Living/Deceased
];

// GET /api/member-update-requests - List update requests
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const permissions = getPermissionsForRole(user.role);
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'PENDING';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Regular users can only see their own requests
    // Admins/editors with approve_pending_members permission can see all
    const where: Record<string, string> = { status };
    if (!permissions.approve_pending_members) {
      where.submittedById = user.id;
    }

    try {
      const [requests, total] = await Promise.all([
        prisma.memberUpdateRequest.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.memberUpdateRequest.count({ where }),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          requests,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (dbError) {
      console.log('Database query failed:', dbError);
      return NextResponse.json({
        success: true,
        data: {
          requests: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        },
      });
    }
  } catch (error) {
    console.error('Error fetching update requests:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch requests', messageAr: 'فشل في تحميل الطلبات' },
      { status: 500 }
    );
  }
}

// POST /api/member-update-requests - Submit a new update request
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { memberId, proposedChanges, photoData, message } = body;

    if (!memberId || !proposedChanges || typeof proposedChanges !== 'object') {
      return NextResponse.json(
        {
          success: false,
          message: 'Member ID and proposed changes are required',
          messageAr: 'معرف العضو والتغييرات المقترحة مطلوبة',
        },
        { status: 400 }
      );
    }

    // Verify member exists
    const member = await getMemberByIdFromDb(memberId);
    if (!member) {
      return NextResponse.json(
        { success: false, message: 'Member not found', messageAr: 'العضو غير موجود' },
        { status: 404 }
      );
    }

    // Filter to only allowed fields
    const filteredChanges: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(proposedChanges)) {
      if (ALLOWED_UPDATE_FIELDS.includes(field)) {
        filteredChanges[field] = typeof value === 'string' ? sanitizeString(value) : value;
      }
    }

    if (Object.keys(filteredChanges).length === 0 && !photoData) {
      return NextResponse.json(
        {
          success: false,
          message: 'No valid changes proposed',
          messageAr: 'لا توجد تغييرات صالحة',
          allowedFields: ALLOWED_UPDATE_FIELDS,
        },
        { status: 400 }
      );
    }

    // Get client info
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    try {
      // Create the update request
      const updateRequest = await prisma.memberUpdateRequest.create({
        data: {
          memberId,
          memberName: member.fullNameAr || member.firstName,
          submittedById: user.id,
          submittedByName: user.nameArabic,
          submittedByEmail: user.email,
          proposedChanges: JSON.stringify(filteredChanges),
          proposedPhotoData: photoData || null,
          status: 'PENDING',
          ipAddress,
        },
      });

      // Log activity
      await logActivity({
        userId: user.id,
        userEmail: user.email,
        userName: user.nameArabic,
        action: 'SUBMIT_UPDATE_REQUEST',
        category: 'MEMBER',
        targetType: 'FAMILY_MEMBER',
        targetId: memberId,
        targetName: member.fullNameAr || member.firstName,
        details: {
          requestId: updateRequest.id,
          proposedFields: Object.keys(filteredChanges),
          message,
        },
        ipAddress,
        success: true,
      });

      return NextResponse.json({
        success: true,
        message: 'Update request submitted successfully. It will be reviewed by an administrator.',
        messageAr: 'تم تقديم طلب التحديث بنجاح. سيتم مراجعته من قبل المشرف.',
        data: {
          id: updateRequest.id,
          status: updateRequest.status,
        },
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { success: false, message: 'Failed to submit request', messageAr: 'فشل في تقديم الطلب' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error creating update request:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to submit request', messageAr: 'فشل في تقديم الطلب' },
      { status: 500 }
    );
  }
}
