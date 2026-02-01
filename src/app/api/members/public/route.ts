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

/**
 * Extract the numeric part from a member ID for comparison
 * P0016, P016, P16, p0016, 0016, 16 all return 16
 */
function extractIdNumber(id: string): number | null {
  if (!id) return null;
  const cleaned = id.toLowerCase().replace(/^p/, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

/**
 * Check if a search query matches a member ID
 * Handles formats: P0016, P016, P16, p0016, 0016, 16
 */
function matchesMemberId(memberId: string, searchQuery: string): boolean {
  const memberNum = extractIdNumber(memberId);
  const searchNum = extractIdNumber(searchQuery);
  
  if (memberNum === null || searchNum === null) return false;
  return memberNum === searchNum;
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
      
      // Check if query looks like an ID (starts with 'p' or is numeric)
      const looksLikeId = /^p?\d+$/i.test(query.trim());
      
      filteredMembers = allMembers.filter(member => {
        const normalizedFirstName = normalizeArabicSearch(member.firstName || '');
        const normalizedFullNameAr = normalizeArabicSearch(member.fullNameAr || '');
        const normalizedFullNameEn = (member.fullNameEn || '').toLowerCase();
        const combinedName = `${normalizedFirstName} ${member.fatherName ? normalizeArabicSearch(member.fatherName) : ''} ${member.grandfatherName ? normalizeArabicSearch(member.grandfatherName) : ''}`;
        
        // For ID-like queries, use exact numeric matching (P0016, P016, P16, 16 all match)
        if (looksLikeId && matchesMemberId(member.id, query.trim())) {
          return true;
        }
        
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
