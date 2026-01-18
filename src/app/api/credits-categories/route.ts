import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const categories = await prisma.creditsCategory.findMany({
      where: { isActive: true },
      orderBy: [
        { category: 'asc' },
        { sortOrder: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error('Error fetching credits categories:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch credits categories', messageAr: 'فشل في جلب فئات الشكر والتقدير' },
      { status: 500 }
    );
  }
}
