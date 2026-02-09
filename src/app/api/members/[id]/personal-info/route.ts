import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { getAllMembersFromDb } from '@/lib/db';
import { normalizeMemberId } from '@/lib/utils';
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
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', errorAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const memberId = normalizeMemberId(params.id) || params.id;

    const normalizedLinkedId = normalizeMemberId(user.linkedMemberId);
    const isOwner = normalizedLinkedId === memberId || user.linkedMemberId === memberId;
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

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
