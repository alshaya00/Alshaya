import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
export const dynamic = "force-dynamic";

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const invitation = await prisma.invitationCode.findUnique({
      where: { id },
      include: {
        redemptions: {
          select: {
            id: true,
            userId: true,
            userEmail: true,
            userName: true,
            redeemedAt: true,
          },
          orderBy: { redeemedAt: 'desc' },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { success: false, message: 'Invitation not found', messageAr: 'رمز الدعوة غير موجود' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      invitation,
    });
  } catch (error) {
    console.error('Error fetching invitation:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch invitation', messageAr: 'فشل في جلب رمز الدعوة' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const invitation = await prisma.invitationCode.findUnique({
      where: { id },
    });

    if (!invitation) {
      return NextResponse.json(
        { success: false, message: 'Invitation not found', messageAr: 'رمز الدعوة غير موجود' },
        { status: 404 }
      );
    }

    if (invitation.status === 'REVOKED') {
      return NextResponse.json(
        { success: false, message: 'Invitation already revoked', messageAr: 'رمز الدعوة ملغى بالفعل' },
        { status: 400 }
      );
    }

    const updatedInvitation = await prisma.invitationCode.update({
      where: { id },
      data: { status: 'REVOKED' },
    });

    return NextResponse.json({
      success: true,
      invitation: updatedInvitation,
      message: 'Invitation revoked successfully',
      messageAr: 'تم إلغاء رمز الدعوة بنجاح',
    });
  } catch (error) {
    console.error('Error revoking invitation:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to revoke invitation', messageAr: 'فشل في إلغاء رمز الدعوة' },
      { status: 500 }
    );
  }
}
