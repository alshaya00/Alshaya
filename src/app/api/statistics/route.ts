import { NextResponse } from 'next/server';
import { getStatistics } from '@/lib/data';

export async function GET() {
  const stats = getStatistics();
  return NextResponse.json(stats);
}
