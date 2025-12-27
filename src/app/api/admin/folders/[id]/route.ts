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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const folder = await prisma.albumFolder.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { photos: true, pendingPhotos: true },
        },
      },
    });

    if (!folder) {
      return NextResponse.json(
        { success: false, error: 'Folder not found', messageAr: 'المجلد غير موجود' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...folder,
        photoCount: folder._count.photos,
        pendingCount: folder._count.pendingPhotos,
      },
    });
  } catch (error) {
    console.error('Error fetching folder:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch folder' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const folder = await prisma.albumFolder.findUnique({
      where: { id: params.id },
    });

    if (!folder) {
      return NextResponse.json(
        { success: false, error: 'Folder not found', messageAr: 'المجلد غير موجود' },
        { status: 404 }
      );
    }

    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.nameAr !== undefined) updateData.nameAr = body.nameAr;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.descriptionAr !== undefined) updateData.descriptionAr = body.descriptionAr;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.icon !== undefined) updateData.icon = body.icon;
    if (body.displayOrder !== undefined) updateData.displayOrder = body.displayOrder;

    const updated = await prisma.albumFolder.update({
      where: { id: params.id },
      data: updateData,
    });

    await logAuditToDb({
      action: 'FOLDER_UPDATE',
      severity: 'INFO',
      userId: user.id,
      userName: user.email,
      userRole: user.role,
      targetType: 'FOLDER',
      targetId: folder.id,
      targetName: folder.nameAr,
      description: `تم تحديث مجلد الصور: ${folder.nameAr}`,
      previousState: folder as unknown as Record<string, unknown>,
      newState: updated as unknown as Record<string, unknown>,
      success: true,
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Folder updated successfully',
      messageAr: 'تم تحديث المجلد بنجاح',
    });
  } catch (error) {
    console.error('Error updating folder:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update folder' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const folder = await prisma.albumFolder.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { photos: true },
        },
      },
    });

    if (!folder) {
      return NextResponse.json(
        { success: false, error: 'Folder not found', messageAr: 'المجلد غير موجود' },
        { status: 404 }
      );
    }

    if (folder.isSystem) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete system folders', messageAr: 'لا يمكن حذف المجلدات الأساسية' },
        { status: 400 }
      );
    }

    if (folder._count.photos > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete folder with ${folder._count.photos} photos. Move photos first.`,
          messageAr: `لا يمكن حذف المجلد لأنه يحتوي على ${folder._count.photos} صورة. انقل الصور أولاً.`,
        },
        { status: 400 }
      );
    }

    await prisma.albumFolder.delete({
      where: { id: params.id },
    });

    await logAuditToDb({
      action: 'FOLDER_DELETE',
      severity: 'WARNING',
      userId: user.id,
      userName: user.email,
      userRole: user.role,
      targetType: 'FOLDER',
      targetId: folder.id,
      targetName: folder.nameAr,
      description: `تم حذف مجلد الصور: ${folder.nameAr}`,
      previousState: folder as unknown as Record<string, unknown>,
      success: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Folder deleted successfully',
      messageAr: 'تم حذف المجلد بنجاح',
    });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete folder' },
      { status: 500 }
    );
  }
}
