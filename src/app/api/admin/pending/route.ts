import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (status) where.reviewStatus = status;

    const pending = await prisma.pendingMember.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
    });

    return NextResponse.json({ pending });
  } catch (error) {
    console.error('Error fetching pending:', error);
    return NextResponse.json({ pending: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const pending = await prisma.pendingMember.create({
      data: {
        firstName: body.firstName,
        fatherName: body.fatherName,
        grandfatherName: body.grandfatherName,
        greatGrandfatherName: body.greatGrandfatherName,
        familyName: body.familyName || 'آل شايع',
        proposedFatherId: body.proposedFatherId,
        gender: body.gender,
        birthYear: body.birthYear,
        generation: body.generation || 1,
        branch: body.branch,
        fullNameAr: body.fullNameAr,
        fullNameEn: body.fullNameEn,
        phone: body.phone,
        city: body.city,
        status: body.status || 'Living',
        occupation: body.occupation,
        email: body.email,
        submittedVia: body.submittedVia,
      },
    });

    return NextResponse.json({ pending });
  } catch (error) {
    console.error('Error creating pending:', error);
    return NextResponse.json({ error: 'Failed to create pending member' }, { status: 500 });
  }
}
