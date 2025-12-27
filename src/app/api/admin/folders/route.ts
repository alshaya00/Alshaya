import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { logAuditToDb } from '@/lib/db-audit';

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

    const folders = await prisma.albumFolder.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: {
          select: { photos: true, pendingPhotos: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: folders.map(f => ({
        ...f,
        photoCount: f._count.photos,
        pendingCount: f._count.pendingPhotos,
      })),
    });
  } catch (error) {
    console.error('Error fetching folders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch folders' },
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

    if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Admin access required', messageAr: 'يتطلب صلاحية المدير' },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (!body.nameAr) {
      return NextResponse.json(
        { success: false, error: 'Arabic name is required', messageAr: 'الاسم بالعربي مطلوب' },
        { status: 400 }
      );
    }

    const maxOrder = await prisma.albumFolder.aggregate({
      _max: { displayOrder: true },
    });

    const folder = await prisma.albumFolder.create({
      data: {
        name: body.name || body.nameAr,
        nameAr: body.nameAr,
        description: body.description || null,
        descriptionAr: body.descriptionAr || null,
        color: body.color || '#6366f1',
        icon: body.icon || null,
        isSystem: false,
        displayOrder: (maxOrder._max.displayOrder || 0) + 1,
        createdBy: user.id,
        createdByName: user.nameArabic || user.email,
      },
    });

    await logAuditToDb({
      action: 'FOLDER_CREATE',
      severity: 'INFO',
      userId: user.id,
      userName: user.email,
      userRole: user.role,
      targetType: 'FOLDER',
      targetId: folder.id,
      targetName: folder.nameAr,
      description: `تم إنشاء مجلد الصور: ${folder.nameAr}`,
      success: true,
    });

    return NextResponse.json({
      success: true,
      data: folder,
      message: 'Folder created successfully',
      messageAr: 'تم إنشاء المجلد بنجاح',
    });
  } catch (error) {
    console.error('Error creating folder:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create folder' },
      { status: 500 }
    );
  }
}
