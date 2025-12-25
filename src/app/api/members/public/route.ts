import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    const members = await prisma.familyMember.findMany({
      where: {
        deletedAt: null,
        OR: query ? [
          { firstName: { contains: query, mode: 'insensitive' } },
          { fullNameAr: { contains: query, mode: 'insensitive' } },
          { fullNameEn: { contains: query, mode: 'insensitive' } },
        ] : undefined,
      },
      select: {
        id: true,
        firstName: true,
        fullNameAr: true,
        fullNameEn: true,
        generation: true,
        branch: true,
        fatherId: true,
      },
      orderBy: [
        { generation: 'asc' },
        { firstName: 'asc' },
      ],
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: members,
      count: members.length,
    });
  } catch (error) {
    console.error('Error fetching public members:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}
