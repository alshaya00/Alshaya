import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function normalizeArabicSearch(text: string): string {
  return text
    .replace(/[أإآا]/g, 'ا')
    .replace(/[ىي]/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+بن\s+/g, ' ')
    .replace(/\s+بنت\s+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '500'), 1000);

    const members = await prisma.familyMember.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        fullNameAr: true,
        fullNameEn: true,
        generation: true,
        branch: true,
        fatherId: true,
        fatherName: true,
        grandfatherName: true,
      },
      orderBy: [
        { generation: 'asc' },
        { firstName: 'asc' },
      ],
      take: limit,
    });

    let filteredMembers = members;
    if (query) {
      const normalizedQuery = normalizeArabicSearch(query);
      const queryParts = normalizedQuery.split(' ').filter(p => p.length > 0);
      
      filteredMembers = members.filter(member => {
        const normalizedFirstName = normalizeArabicSearch(member.firstName || '');
        const normalizedFullNameAr = normalizeArabicSearch(member.fullNameAr || '');
        const normalizedFullNameEn = (member.fullNameEn || '').toLowerCase();
        const combinedName = `${normalizedFirstName} ${member.fatherName ? normalizeArabicSearch(member.fatherName) : ''} ${member.grandfatherName ? normalizeArabicSearch(member.grandfatherName) : ''}`;
        
        return queryParts.every(part => 
          normalizedFirstName.includes(part) ||
          normalizedFullNameAr.includes(part) ||
          normalizedFullNameEn.includes(part) ||
          combinedName.includes(part) ||
          member.id.toLowerCase().includes(part)
        );
      });
    }

    return NextResponse.json({
      success: true,
      data: filteredMembers,
      count: filteredMembers.length,
    });
  } catch (error) {
    console.error('Error fetching public members:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}
