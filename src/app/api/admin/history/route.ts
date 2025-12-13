import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const memberId = searchParams.get('memberId');
    const changeType = searchParams.get('changeType');

    const where: Record<string, unknown> = {};
    if (memberId) where.memberId = memberId;
    if (changeType) where.changeType = changeType;

    const changes = await prisma.changeHistory.findMany({
      where,
      orderBy: { changedAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        member: {
          select: {
            firstName: true,
            fullNameAr: true,
          },
        },
      },
    });

    const total = await prisma.changeHistory.count({ where });

    return NextResponse.json({
      changes: changes.map((c: typeof changes[number]) => ({
        ...c,
        memberName: c.member?.fullNameAr || c.member?.firstName,
      })),
      total,
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json({ changes: [], total: 0 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const change = await prisma.changeHistory.create({
      data: {
        memberId: body.memberId,
        fieldName: body.fieldName,
        oldValue: body.oldValue,
        newValue: body.newValue,
        changeType: body.changeType,
        changedBy: body.changedBy || 'admin',
        changedByName: body.changedByName || 'المدير',
        batchId: body.batchId,
        reason: body.reason,
        fullSnapshot: body.fullSnapshot,
      },
    });

    return NextResponse.json({ change });
  } catch (error) {
    console.error('Error creating history:', error);
    return NextResponse.json({ error: 'Failed to create history' }, { status: 500 });
  }
}
