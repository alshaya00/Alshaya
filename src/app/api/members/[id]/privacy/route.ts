import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { normalizeMemberId } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const memberId = normalizeMemberId(params.id) || params.id;
    
    const linkedUser = await prisma.user.findFirst({
      where: {
        OR: [
          { linkedMemberId: memberId },
          { linkedMemberId: params.id },
        ],
      },
      select: { hidePersonalInfo: true },
    });

    return NextResponse.json({
      hidePersonalInfo: linkedUser?.hidePersonalInfo || false,
    });
  } catch (error) {
    console.error('Error getting privacy setting:', error);
    return NextResponse.json(
      { error: 'Failed to get privacy setting' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', errorAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const session = await findSessionByToken(token);
    if (!session) {
      return NextResponse.json(
        { error: 'Invalid token', errorAr: 'رمز غير صالح' },
        { status: 401 }
      );
    }

    const currentUser = await findUserById(session.userId);
    if (!currentUser || currentUser.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'User not found', errorAr: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    const memberId = normalizeMemberId(params.id) || params.id;

    const normalizedLinkedId = normalizeMemberId(currentUser.linkedMemberId);
    const isOwner = normalizedLinkedId === memberId || currentUser.linkedMemberId === memberId;
    const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN';

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden', errorAr: 'غير مسموح' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { hidePersonalInfo } = body;

    const targetUser = await prisma.user.findFirst({
      where: {
        OR: [
          { linkedMemberId: memberId },
          { linkedMemberId: params.id },
        ],
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'No user linked to this member', errorAr: 'لا يوجد مستخدم مرتبط بهذا العضو' },
        { status: 404 }
      );
    }

    await prisma.user.update({
      where: { id: targetUser.id },
      data: { hidePersonalInfo: Boolean(hidePersonalInfo) },
    });

    return NextResponse.json({
      success: true,
      hidePersonalInfo: Boolean(hidePersonalInfo),
      message: hidePersonalInfo ? 'Privacy enabled' : 'Privacy disabled',
      messageAr: hidePersonalInfo ? 'تم إخفاء المعلومات الشخصية' : 'تم إظهار المعلومات الشخصية',
    });
  } catch (error) {
    console.error('Error updating privacy setting:', error);
    return NextResponse.json(
      { error: 'Failed to update privacy setting', errorAr: 'فشل في تحديث إعداد الخصوصية' },
      { status: 500 }
    );
  }
}
