import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const links = await prisma.branchEntryLink.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ links });
  } catch (error) {
    console.error('Error fetching branch links:', error);
    return NextResponse.json({ links: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Generate token if not provided
    const token = body.token || generateToken();

    const link = await prisma.branchEntryLink.create({
      data: {
        token,
        branchName: body.branchName,
        branchHeadId: body.branchHeadId,
        branchHeadName: body.branchHeadName,
        isActive: body.isActive ?? true,
        expiresAt: body.expiresAt,
        maxUses: body.maxUses,
        createdBy: body.createdBy || 'admin',
      },
    });

    return NextResponse.json({ link });
  } catch (error) {
    console.error('Error creating branch link:', error);
    return NextResponse.json({ error: 'Failed to create branch link' }, { status: 500 });
  }
}

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
