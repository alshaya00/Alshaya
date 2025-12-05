import { NextRequest, NextResponse } from 'next/server';
import { getAllMembers, getMaleMembers, getMembersByGeneration, getMembersByBranch, FamilyMember } from '@/lib/data';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const gender = searchParams.get('gender');
  const generation = searchParams.get('generation');
  const branch = searchParams.get('branch');
  const malesOnly = searchParams.get('males') === 'true';

  let members: FamilyMember[] = getAllMembers();

  if (malesOnly) {
    members = getMaleMembers();
  }

  if (gender) {
    members = members.filter((m) => m.gender === gender);
  }

  if (generation) {
    members = getMembersByGeneration(parseInt(generation));
  }

  if (branch) {
    members = getMembersByBranch(branch);
  }

  return NextResponse.json(members);
}
