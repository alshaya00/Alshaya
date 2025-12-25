import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { createDailyCSVBackup } from '@/lib/backup-service';

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

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const { csv, memberCount, date } = await createDailyCSVBackup();
    
    const filename = `Alshaya_family_${date}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Member-Count': memberCount.toString(),
        'X-Export-Date': date,
      },
    });
  } catch (error) {
    console.error('Error exporting CSV:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to export CSV' },
      { status: 500 }
    );
  }
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

    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Only super admin can trigger exports', messageAr: 'المدير العام فقط' },
        { status: 403 }
      );
    }

    const { csv, memberCount, date } = await createDailyCSVBackup();

    await prisma.snapshot.create({
      data: {
        name: `CSV Export - ${date}`,
        description: `Daily CSV export with ${memberCount} members`,
        treeData: JSON.stringify({ type: 'csv_export', date, memberCount }),
        memberCount,
        createdBy: user.id,
        createdByName: user.nameArabic,
        snapshotType: 'AUTO_BACKUP',
      },
    });

    return NextResponse.json({
      success: true,
      message: `CSV export created with ${memberCount} members`,
      messageAr: `تم إنشاء ملف CSV يحتوي على ${memberCount} عضو`,
      data: {
        memberCount,
        date,
        csvSize: csv.length,
      },
    });
  } catch (error) {
    console.error('Error creating CSV export:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create CSV export' },
      { status: 500 }
    );
  }
}
