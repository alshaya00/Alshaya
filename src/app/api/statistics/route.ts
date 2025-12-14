import { NextResponse } from 'next/server';
import { getStatisticsFromDb } from '@/lib/db';
import { familyInfo } from '@/config/constants';

export async function GET() {
  try {
    const stats = await getStatisticsFromDb();

    // Calculate years of history
    const currentYear = new Date().getFullYear();
    const yearsOfHistory = currentYear - familyInfo.foundingYear;

    return NextResponse.json({
      ...stats,
      yearsOfHistory,
      foundingYear: familyInfo.foundingYear,
      familyName: {
        ar: familyInfo.nameAr,
        en: familyInfo.nameEn,
      },
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
