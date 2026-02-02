import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';

async function getAuthAdmin(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) return null;

  const session = await findSessionByToken(token);
  if (!session) return null;

  const user = await findUserById(session.userId);
  if (!user || user.status !== 'ACTIVE') return null;

  const role = user.role?.toUpperCase();
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') return null;

  return user;
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthAdmin(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Admin access required', messageAr: 'يتطلب صلاحيات المدير' },
        { status: 403 }
      );
    }

    const flags = await prisma.duplicateFlag.findMany({
      where: {
        status: 'VERIFIED_DIFFERENT'
      },
      select: {
        id: true,
        sourceMemberId: true,
        targetMemberId: true,
        status: true,
        resolution: true,
        resolvedAt: true,
        resolvedBy: true,
        sourceMember: {
          select: {
            id: true,
            firstName: true,
            fullNameAr: true
          }
        },
        targetMember: {
          select: {
            id: true,
            firstName: true,
            fullNameAr: true
          }
        }
      },
      orderBy: {
        resolvedAt: 'desc'
      }
    });

    const excludedPairs = flags.map(flag => ({
      member1Id: flag.sourceMemberId,
      member2Id: flag.targetMemberId,
      pairKey: [flag.sourceMemberId, flag.targetMemberId].sort().join('-'),
      member1Name: flag.sourceMember?.fullNameAr || flag.sourceMember?.firstName,
      member2Name: flag.targetMember?.fullNameAr || flag.targetMember?.firstName,
      resolution: flag.resolution,
      resolvedAt: flag.resolvedAt
    }));

    return NextResponse.json({
      success: true,
      count: excludedPairs.length,
      excludedPairs,
      message: `Found ${excludedPairs.length} verified different pairs`,
      messageAr: `تم العثور على ${excludedPairs.length} زوج مؤكد أنهم مختلفون`
    });

  } catch (error) {
    console.error('Error fetching duplicate flags:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في جلب بيانات التكرارات' },
      { status: 500 }
    );
  }
}
