import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { pendingMemberSchema, formatZodErrors } from '@/lib/validations';
import { logger } from '@/lib/logging';
import { sanitizeString } from '@/lib/sanitize';
import { checkRateLimit, RATE_LIMITS } from '@/lib/middleware/rateLimit';

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

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    // Check permission
    const permissions = getPermissionsForRole(user.role);
    if (!permissions.approve_pending_members && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (status) where.reviewStatus = status;

    // Branch leaders can only see their branch's pending members
    if (user.role === 'BRANCH_LEADER' && user.assignedBranch) {
      where.branch = user.assignedBranch;
    }

    const pending = await prisma.pendingMember.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
    });

    return NextResponse.json({ pending });
  } catch (error) {
    logger.error('Error fetching pending members:', error);
    return NextResponse.json({ pending: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP for public submissions
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateCheck = checkRateLimit(`pending-member:${ip}`, {
      ...RATE_LIMITS.dataTransfer,
      maxRequests: 10, // 10 submissions per hour per IP
      windowMs: 60 * 60 * 1000,
    });

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many submissions. Please try again later.',
          errorAr: 'عدد كبير جداً من الطلبات. يرجى المحاولة لاحقاً.',
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(rateCheck.resetIn / 1000)),
          },
        }
      );
    }

    const body = await request.json();

    // Validate input using Zod schema
    const validation = pendingMemberSchema.safeParse(body);
    if (!validation.success) {
      logger.warn('Pending member validation failed', {
        errors: validation.error.flatten().fieldErrors,
        ip,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          errorAr: 'فشل التحقق من البيانات',
          details: formatZodErrors(validation.error),
        },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    // Sanitize string fields to prevent XSS
    const pending = await prisma.pendingMember.create({
      data: {
        firstName: sanitizeString(validatedData.firstName),
        fatherName: validatedData.fatherName ? sanitizeString(validatedData.fatherName) : null,
        grandfatherName: validatedData.grandfatherName ? sanitizeString(validatedData.grandfatherName) : null,
        greatGrandfatherName: validatedData.greatGrandfatherName ? sanitizeString(validatedData.greatGrandfatherName) : null,
        familyName: sanitizeString(validatedData.familyName),
        proposedFatherId: validatedData.proposedFatherId || null,
        gender: validatedData.gender,
        birthYear: validatedData.birthYear || null,
        generation: validatedData.generation,
        branch: validatedData.branch ? sanitizeString(validatedData.branch) : null,
        fullNameAr: validatedData.fullNameAr ? sanitizeString(validatedData.fullNameAr) : null,
        fullNameEn: validatedData.fullNameEn ? sanitizeString(validatedData.fullNameEn) : null,
        phone: validatedData.phone || null,
        city: validatedData.city ? sanitizeString(validatedData.city) : null,
        status: validatedData.status,
        occupation: validatedData.occupation ? sanitizeString(validatedData.occupation) : null,
        email: validatedData.email || null,
        submittedVia: validatedData.submittedVia ? sanitizeString(validatedData.submittedVia) : null,
      },
    });

    logger.info('Pending member created', {
      pendingId: pending.id,
      firstName: pending.firstName,
      ip,
    });

    return NextResponse.json({
      success: true,
      pending,
    });
  } catch (error) {
    logger.error('Error creating pending member:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create pending member',
        errorAr: 'فشل في إنشاء طلب العضوية المعلق',
      },
      { status: 500 }
    );
  }
}
