import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { findSessionByToken, findUserById } from '@/lib/auth/store';

// Helper to get authenticated admin user from request
async function getAuthAdmin(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) return null;

  const session = await findSessionByToken(token);
  if (!session) return null;

  const user = await findUserById(session.userId);
  if (!user || user.status !== 'ACTIVE') return null;

  // Only allow SUPER_ADMIN and ADMIN
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') return null;

  return user;
}

// SECURITY: Generate cryptographically secure token
function generateSecureToken(length: number = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = randomBytes(length);
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars[bytes[i] % chars.length];
  }
  return token;
}

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require ADMIN authentication
    const user = await getAuthAdmin(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Admin access required', messageAr: 'يتطلب صلاحيات المدير' },
        { status: 403 }
      );
    }

    const links = await prisma.branchEntryLink.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, links });
  } catch (error) {
    console.error('Error fetching branch links:', error);
    return NextResponse.json({ success: false, links: [], error: 'Failed to fetch branch links' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require ADMIN authentication
    const user = await getAuthAdmin(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Admin access required', messageAr: 'يتطلب صلاحيات المدير' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.branchName || !body.branchHeadId || !body.branchHeadName) {
      return NextResponse.json(
        { success: false, error: 'branchName, branchHeadId, and branchHeadName are required' },
        { status: 400 }
      );
    }

    // SECURITY: Use cryptographically secure token generation
    const token = body.token || generateSecureToken(12);

    const link = await prisma.branchEntryLink.create({
      data: {
        token,
        branchName: body.branchName,
        branchHeadId: body.branchHeadId,
        branchHeadName: body.branchHeadName,
        isActive: body.isActive ?? true,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        maxUses: body.maxUses ?? null,
        createdBy: user.id,
      },
    });

    return NextResponse.json({ success: true, link });
  } catch (error) {
    console.error('Error creating branch link:', error);
    return NextResponse.json({ success: false, error: 'Failed to create branch link' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // SECURITY: Require ADMIN authentication
    const user = await getAuthAdmin(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Admin access required', messageAr: 'يتطلب صلاحيات المدير' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Link ID is required' },
        { status: 400 }
      );
    }

    await prisma.branchEntryLink.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Branch link deleted' });
  } catch (error) {
    console.error('Error deleting branch link:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete branch link' }, { status: 500 });
  }
}
