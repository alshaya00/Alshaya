import { NextRequest, NextResponse } from 'next/server';
import { checkBranchDuplicate } from '@/lib/fuzzy-matcher';
import { checkRateLimit, getClientIp, createRateLimitResponse, RATE_LIMITS } from '@/lib/rate-limiter';
import { normalizeMemberId } from '@/lib/utils';
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(
      clientIp,
      'duplicate-check',
      RATE_LIMITS.DUPLICATE_CHECK.limit,
      RATE_LIMITS.DUPLICATE_CHECK.windowMs
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(createRateLimitResponse(rateLimitResult.resetAt), { status: 429 });
    }

    const body = await request.json();
    if (body.fatherId) body.fatherId = normalizeMemberId(body.fatherId) || body.fatherId;
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
