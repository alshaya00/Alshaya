import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import crypto from 'crypto';

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

function generateInvitationCode(): string {
  return crypto.randomBytes(6).toString('hex').toUpperCase();
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const permissions = getPermissionsForRole(user.role);
    if (!permissions.invite_users && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const linkedMemberId = searchParams.get('linkedMemberId');

    const where: Record<string, unknown> = {};
    if (status && ['ACTIVE', 'USED', 'EXPIRED', 'REVOKED'].includes(status)) {
      where.status = status;
    }
    if (linkedMemberId) {
      where.linkedMemberId = linkedMemberId;
    }

    const invitations = await prisma.invitationCode.findMany({
      where,
      include: {
        redemptions: {
          select: {
            id: true,
            userId: true,
            userEmail: true,
            userName: true,
            redeemedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      invitations,
      count: invitations.length,
    });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch invitations', messageAr: 'فشل في جلب رموز الدعوة' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const permissions = getPermissionsForRole(user.role);
    if (!permissions.invite_users && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { linkedMemberId, linkedMemberName, expiresAt, maxUses, note } = body;

    const expirationDate = expiresAt 
      ? new Date(expiresAt)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    let attempts = 0;
    const maxAttempts = 3;
    let invitation = null;

    while (attempts < maxAttempts) {
      try {
        const code = generateInvitationCode();
        
        invitation = await prisma.invitationCode.create({
          data: {
            code,
            linkedMemberId: linkedMemberId || null,
            linkedMemberName: linkedMemberName || null,
            maxUses: maxUses || 1,
            expiresAt: expirationDate,
            createdById: user.id,
            createdByName: user.nameArabic || user.nameEnglish || user.email,
            note: note || null,
            status: 'ACTIVE',
          },
        });
        break;
      } catch (error: unknown) {
        const prismaError = error as { code?: string };
        if (prismaError.code === 'P2002') {
          attempts++;
          if (attempts >= maxAttempts) {
            throw new Error('Failed to generate unique invitation code after multiple attempts');
          }
          continue;
        }
        throw error;
      }
    }

    return NextResponse.json({
      success: true,
      invitation,
      message: 'Invitation code created successfully',
      messageAr: 'تم إنشاء رمز الدعوة بنجاح',
    });
  } catch (error) {
    console.error('Error creating invitation:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create invitation', messageAr: 'فشل في إنشاء رمز الدعوة' },
      { status: 500 }
    );
  }
}
