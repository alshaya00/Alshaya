import { NextResponse } from 'next/server';
import { buildFamilyTreeFromDb } from '@/lib/db';

export async function GET() {
  try {
    const tree = await buildFamilyTreeFromDb();
    return NextResponse.json(tree);
  } catch (error) {
    console.error('Error building family tree:', error);
    return NextResponse.json(
      { error: 'Failed to build family tree' },
      { status: 500 }
    );
  }
}
