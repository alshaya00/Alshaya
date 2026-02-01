import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

function extractIdNumber(id: string): number | null {
  if (!id) return null;
  const cleaned = id.toLowerCase().replace(/^p/, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

function matchesMemberId(memberId: string, searchId: string): boolean {
  const memberNum = extractIdNumber(memberId);
  const searchNum = extractIdNumber(searchId);
  if (memberNum === null || searchNum === null) return false;
  return memberNum === searchNum;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const memberId = params.id;
    
    const users = await prisma.user.findMany({
      where: { linkedMemberId: { not: null } },
      select: { linkedMemberId: true, hidePersonalInfo: true },
    });
    const user = users.find(u => u.linkedMemberId && matchesMemberId(u.linkedMemberId, memberId));

    return NextResponse.json({
      hidePersonalInfo: user?.hidePersonalInfo || false,
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
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized', errorAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token', errorAr: 'رمز غير صالح' },
        { status: 401 }
      );
    }

    const memberId = params.id;
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { linkedMemberId: true, role: true },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found', errorAr: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    const isOwner = currentUser.linkedMemberId ? matchesMemberId(currentUser.linkedMemberId, memberId) : false;
    const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN';

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden', errorAr: 'غير مسموح' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { hidePersonalInfo } = body;

    const allLinkedUsers = await prisma.user.findMany({
      where: { linkedMemberId: { not: null } },
    });
    const targetUser = allLinkedUsers.find(u => u.linkedMemberId && matchesMemberId(u.linkedMemberId, memberId));

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
