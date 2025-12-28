import { NextRequest, NextResponse } from 'next/server';
import { checkBranchDuplicate } from '@/lib/fuzzy-matcher';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, fatherId } = body;

    if (!firstName || !fatherId) {
      return NextResponse.json({
        success: true,
        hasPotentialDuplicates: false,
        highestScore: 0,
        isDuplicate: false,
        candidates: [],
      });
    }

    const result = await checkBranchDuplicate(firstName, fatherId);

    const candidatesForResponse = result.candidates.map(c => ({
      id: c.member.id,
      firstName: c.member.firstName,
      fullNameAr: c.member.fullNameAr,
      fullNameEn: c.member.fullNameEn,
      similarityScore: c.similarityScore,
      matchReasons: c.matchReasons,
      matchReasonsAr: c.matchReasonsAr,
    }));

    return NextResponse.json({
      success: true,
      hasPotentialDuplicates: result.hasMatches,
      highestScore: result.highestScore,
      isDuplicate: result.isDuplicate,
      candidates: candidatesForResponse,
    });
  } catch (error) {
    console.error('Error checking duplicates:', error);
    return NextResponse.json({
      success: true,
      hasPotentialDuplicates: false,
      highestScore: 0,
      isDuplicate: false,
      candidates: [],
    });
  }
}
