import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
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
    const body = await request.json();

    const duplicate = await prisma.duplicateFlag.create({
      data: {
        sourceMemberId: body.sourceMemberId,
        targetMemberId: body.targetMemberId,
        matchScore: body.matchScore,
        matchReasons: JSON.stringify(body.matchReasons || []),
        detectedBy: body.detectedBy || 'SYSTEM',
      },
    });

    return NextResponse.json({ duplicate });
  } catch (error) {
    console.error('Error creating duplicate flag:', error);
    return NextResponse.json({ error: 'Failed to create duplicate flag' }, { status: 500 });
  }
}
