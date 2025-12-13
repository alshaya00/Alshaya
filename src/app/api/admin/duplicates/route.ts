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

    // Check permission - duplicates management requires admin level access
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const duplicates = await prisma.duplicateFlag.findMany({
      where,
      orderBy: { detectedAt: 'desc' },
      include: {
        sourceMember: {
          select: {
            id: true,
            firstName: true,
            fullNameAr: true,
          },
        },
        targetMember: {
          select: {
            id: true,
            firstName: true,
            fullNameAr: true,
          },
        },
      },
    });

    return NextResponse.json({ duplicates });
  } catch (error) {
    console.error('Error fetching duplicates:', error);
    return NextResponse.json({ duplicates: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    // Check permission - duplicates management requires admin level access
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const body = await request.json();

    const duplicate = await prisma.duplicateFlag.create({
      data: {
        sourceMemberId: body.sourceMemberId,
        targetMemberId: body.targetMemberId,
        matchScore: body.matchScore,
        matchReasons: JSON.stringify(body.matchReasons || []),
        detectedBy: user.id,
      },
    });

    return NextResponse.json({ duplicate });
  } catch (error) {
    console.error('Error creating duplicate flag:', error);
    return NextResponse.json({ error: 'Failed to create duplicate flag' }, { status: 500 });
  }
}
