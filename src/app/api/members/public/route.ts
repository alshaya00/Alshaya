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
    const includePending = searchParams.get('includePending') === 'true';

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
        gender: true,
        sonsCount: true,
        daughtersCount: true,
        familyName: true,
        status: true,
      },
      orderBy: { id: 'asc' },
      take: limit,
    });

    const approvedMembersWithFlag = members.map(m => ({ ...m, isPending: false }));

    let pendingMembersWithFlag: typeof approvedMembersWithFlag = [];
    if (includePending) {
      const pendingMembers = await prisma.pendingMember.findMany({
        where: {
          reviewStatus: 'PENDING',
          gender: 'Male',
        },
        select: {
          id: true,
          firstName: true,
          fullNameAr: true,
          fullNameEn: true,
          generation: true,
          branch: true,
          proposedFatherId: true,
          fatherName: true,
          grandfatherName: true,
          gender: true,
          familyName: true,
          status: true,
        },
        orderBy: { submittedAt: 'desc' },
      });

      pendingMembersWithFlag = pendingMembers.map(pm => ({
        id: `pending_${pm.id}`,
        pendingId: pm.id,
        firstName: pm.firstName,
        fullNameAr: pm.fullNameAr,
        fullNameEn: pm.fullNameEn,
        generation: pm.generation,
        branch: pm.branch,
        fatherId: pm.proposedFatherId,
        fatherName: pm.fatherName,
        grandfatherName: pm.grandfatherName,
        gender: pm.gender,
        sonsCount: 0,
        daughtersCount: 0,
        familyName: pm.familyName,
        status: pm.status,
        isPending: true,
      }));
    }

    const allMembers = [...approvedMembersWithFlag, ...pendingMembersWithFlag];

    let filteredMembers = allMembers;
    if (query) {
      const normalizedQuery = normalizeArabicSearch(query);
      const queryParts = normalizedQuery.split(' ').filter(p => p.length > 0);
      
      filteredMembers = allMembers.filter(member => {
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
