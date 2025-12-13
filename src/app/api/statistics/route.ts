import { NextResponse } from 'next/server';
import { getStatisticsFromDb } from '@/lib/db';

export async function GET() {
  try {
    const stats = await getStatisticsFromDb();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
