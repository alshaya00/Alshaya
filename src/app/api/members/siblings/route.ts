import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizeArabicName } from '@/lib/lineage-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    
    if (!memberId) {
      return NextResponse.json(
        { error: 'memberId is required' },
        { status: 400 }
      );
    }

    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
      select: { id: true, firstName: true, fatherId: true }
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    if (!member.fatherId) {
      return NextResponse.json({
        hasSiblings: false,
        count: 0,
        message: 'Member has no parent registered'
      });
    }

    const siblingCount = await prisma.familyMember.count({
      where: {
        fatherId: member.fatherId,
        id: { not: memberId },
        deletedAt: null
      }
    });

    return NextResponse.json({
      hasSiblings: siblingCount > 0,
      count: siblingCount
    });

  } catch (error) {
    console.error('Error fetching siblings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch siblings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberId, uncleName } = body;
    
    if (!memberId || !uncleName) {
      return NextResponse.json(
        { error: 'memberId and uncleName are required' },
        { status: 400 }
      );
    }

    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
      select: { id: true, firstName: true, fatherId: true }
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    if (!member.fatherId) {
      return NextResponse.json({
        valid: false,
        message: 'لا يمكن التحقق - الأب غير مسجل في النظام'
      });
    }

    const siblings = await prisma.familyMember.findMany({
      where: {
        fatherId: member.fatherId,
        id: { not: memberId },
        deletedAt: null
      },
      select: {
        id: true,
        firstName: true,
        fullNameAr: true,
        gender: true
      }
    });

    if (siblings.length === 0) {
      return NextResponse.json({
        valid: false,
        noSiblings: true,
        message: 'لا يوجد أعمام/عمات مسجلين'
      });
    }

    const normalizedInput = normalizeArabicName(uncleName.trim());
    
    const matchingSibling = siblings.find(s => {
      const normalizedFirst = normalizeArabicName(s.firstName);
      const normalizedFull = s.fullNameAr ? normalizeArabicName(s.fullNameAr) : '';
      
      return normalizedFirst === normalizedInput || 
             normalizedFirst.includes(normalizedInput) ||
             normalizedInput.includes(normalizedFirst) ||
             normalizedFull.includes(normalizedInput);
    });

    if (matchingSibling) {
      return NextResponse.json({
        valid: true,
        matchedSibling: {
          id: matchingSibling.id,
          firstName: matchingSibling.firstName,
          gender: matchingSibling.gender
        },
        message: 'تم التحقق بنجاح'
      });
    }

    return NextResponse.json({
      valid: false,
      message: 'اسم العم/العمة غير صحيح. تأكد من كتابة الاسم بشكل صحيح',
      siblingCount: siblings.length
    });

  } catch (error) {
    console.error('Error validating uncle name:', error);
    return NextResponse.json(
      { error: 'Failed to validate uncle name' },
      { status: 500 }
    );
  }
}
