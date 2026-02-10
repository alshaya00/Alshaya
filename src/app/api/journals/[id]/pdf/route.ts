import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const journal = await prisma.familyJournal.findUnique({
      where: { id },
      select: { pdfData: true, pdfFileName: true }
    });

    if (!journal) {
      return NextResponse.json(
        { success: false, error: 'القصة غير موجودة' },
        { status: 404 }
      );
    }

    if (!journal.pdfData) {
      return NextResponse.json(
        { success: false, error: 'لا يوجد ملف PDF مرفق' },
        { status: 404 }
      );
    }

    const pdfBuffer = Buffer.from(journal.pdfData, 'base64');
    const fileName = journal.pdfFileName || 'journal.pdf';

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error serving PDF:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في تحميل ملف PDF' },
      { status: 500 }
    );
  }
}
