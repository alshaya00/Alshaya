import { NextRequest, NextResponse } from 'next/server';
import { getMemberById, getChildren } from '@/lib/data';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const member = getMemberById(params.id);

  if (!member) {
    return NextResponse.json(
      { error: 'Member not found' },
      { status: 404 }
    );
  }

  const children = getChildren(member.id);

  return NextResponse.json({
    ...member,
    children,
  });
}
