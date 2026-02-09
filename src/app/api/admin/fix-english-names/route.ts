import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { transliterateName } from '@/lib/utils/transliteration';
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

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const membersWithMissingNames = await prisma.familyMember.findMany({
      where: {
        deletedAt: null,
        OR: [
          { fullNameEn: null },
          { fullNameEn: '' }
        ]
      },
      select: {
        id: true,
        fullNameAr: true,
        firstName: true,
        fatherName: true,
        grandfatherName: true,
        greatGrandfatherName: true,
        familyName: true
      }
    });

    const updates: { id: string; oldName: string | null; newName: string }[] = [];

    for (const member of membersWithMissingNames) {
      const transliteratedName = transliterateName(member.fullNameAr || '');
      
      if (transliteratedName && transliteratedName.trim()) {
        await prisma.familyMember.update({
          where: { id: member.id },
          data: { fullNameEn: transliteratedName }
        });
        
        updates.push({
          id: member.id,
          oldName: null,
          newName: transliteratedName
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updates.length} members with English names`,
      messageAr: `تم تحديث ${updates.length} عضو بأسماء إنجليزية`,
      updates
    });
  } catch (error) {
    console.error('Error fixing English names:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fix names', messageAr: 'فشل في إصلاح الأسماء' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const count = await prisma.familyMember.count({
      where: {
        deletedAt: null,
        OR: [
          { fullNameEn: null },
          { fullNameEn: '' }
        ]
      }
    });

    return NextResponse.json({
      success: true,
      count,
      message: `${count} members have missing English names`,
      messageAr: `${count} عضو بدون أسماء إنجليزية`
    });
  } catch (error) {
    console.error('Error checking English names:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to check names' },
      { status: 500 }
    );
  }
}
