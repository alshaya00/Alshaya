import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { getAllMembersFromDb } from '@/lib/db';

export async function GET(
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

    const isOwner = currentUser.linkedMemberId === memberId;
    const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN';

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden', errorAr: 'غير مسموح' },
        { status: 403 }
      );
    }

    const allMembers = await getAllMembersFromDb();
    const member = allMembers.find((m) => m.id === memberId);

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found', errorAr: 'العضو غير موجود' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      city: member.city,
      occupation: member.occupation,
      phone: member.phone,
      email: member.email,
    });
  } catch (error) {
    console.error('Error getting personal info:', error);
    return NextResponse.json(
      { error: 'Failed to get personal info', errorAr: 'فشل في جلب المعلومات الشخصية' },
      { status: 500 }
    );
  }
}
