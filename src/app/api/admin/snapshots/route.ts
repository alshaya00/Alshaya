import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const snapshots = await prisma.snapshot.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ snapshots });
  } catch (error) {
    console.error('Error fetching snapshots:', error);
    return NextResponse.json({ snapshots: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Get all members for the snapshot
    const members = await prisma.familyMember.findMany();

    const snapshot = await prisma.snapshot.create({
      data: {
        name: body.name,
        description: body.description,
        treeData: JSON.stringify(members),
        memberCount: members.length,
        createdBy: body.createdBy || 'admin',
        createdByName: body.createdByName || 'المدير',
        snapshotType: body.snapshotType || 'MANUAL',
      },
    });

    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error('Error creating snapshot:', error);
    return NextResponse.json({ error: 'Failed to create snapshot' }, { status: 500 });
  }
}
