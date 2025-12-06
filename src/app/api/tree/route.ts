import { NextResponse } from 'next/server';
import { buildFamilyTree } from '@/lib/data';

export async function GET() {
  const tree = buildFamilyTree();
  return NextResponse.json(tree);
}
