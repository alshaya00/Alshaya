import { NextRequest, NextResponse } from 'next/server';
import { findPotentialDuplicates, checkBranchDuplicate, FuzzyMatchInput } from '@/lib/fuzzy-matcher';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
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

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const body = await request.json();
    if (body.fatherId) body.fatherId = normalizeMemberId(body.fatherId) || body.fatherId;
    const { firstName, fatherName, grandfatherName, fatherId, birthYear, gender, checkType } = body;

    if (!firstName) {
      return NextResponse.json(
        { success: false, message: 'First name is required', messageAr: 'الاسم الأول مطلوب' },
        { status: 400 }
      );
    }

    const input: FuzzyMatchInput = {
      firstName,
      fatherName,
      grandfatherName,
      fatherId,
      birthYear: birthYear ? parseInt(birthYear) : undefined,
      gender,
    };

    let result;

    if (checkType === 'branch' && fatherId) {
      result = await checkBranchDuplicate(firstName, fatherId);
    } else {
      result = await findPotentialDuplicates(input, {
        threshold: 70,
        limit: 10,
      });
    }

    const candidatesForResponse = result.candidates.map(c => ({
      id: c.member.id,
      firstName: c.member.firstName,
      fatherName: c.member.fatherName,
      fullNameAr: c.member.fullNameAr,
      fullNameEn: c.member.fullNameEn,
      birthYear: c.member.birthYear,
      gender: c.member.gender,
      generation: c.member.generation,
      branch: c.member.branch,
      similarityScore: c.similarityScore,
      matchReasons: c.matchReasons,
      matchReasonsAr: c.matchReasonsAr,
    }));

    return NextResponse.json({
      success: true,
      hasMatches: result.hasMatches,
      isDuplicate: result.isDuplicate,
      highestScore: result.highestScore,
      candidates: candidatesForResponse,
    });
  } catch (error) {
    console.error('Error checking duplicates:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to check duplicates', messageAr: 'فشل في التحقق من التكرارات' },
      { status: 500 }
    );
  }
}
