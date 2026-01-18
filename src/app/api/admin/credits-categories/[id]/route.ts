import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById, logActivity } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const permissions = getPermissionsForRole(user.role);
    if (!permissions.manage_users && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const category = await prisma.creditsCategory.findUnique({
      where: { id },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, message: 'Category not found', messageAr: 'الفئة غير موجودة' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      category,
    });
  } catch (error) {
    console.error('Error fetching credits category:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch credits category', messageAr: 'فشل في جلب فئة الشكر والتقدير' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    const existing = await prisma.creditsCategory.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Category not found', messageAr: 'الفئة غير موجودة' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { nameAr, nameEn, descriptionAr, descriptionEn, category, icon, imageUrl, sortOrder, isActive } = body;

    const updateData: Record<string, unknown> = {};
    if (nameAr !== undefined) updateData.nameAr = nameAr;
    if (nameEn !== undefined) updateData.nameEn = nameEn;
    if (descriptionAr !== undefined) updateData.descriptionAr = descriptionAr;
    if (descriptionEn !== undefined) updateData.descriptionEn = descriptionEn;
    if (category !== undefined) updateData.category = category;
    if (icon !== undefined) updateData.icon = icon;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedCategory = await prisma.creditsCategory.update({
      where: { id },
      data: updateData,
    });

    await logActivity({
      userId: user.id,
      userEmail: user.email,
      userName: user.nameArabic,
      action: 'UPDATE_CREDITS_CATEGORY',
      category: 'ADMIN',
      targetType: 'CREDITS_CATEGORY',
      targetId: id,
      targetName: updatedCategory.nameAr,
      details: { updates: updateData, previousState: existing },
    });

    return NextResponse.json({
      success: true,
      category: updatedCategory,
      message: 'Credits category updated successfully',
      messageAr: 'تم تحديث فئة الشكر والتقدير بنجاح',
    });
  } catch (error) {
    console.error('Error updating credits category:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update credits category', messageAr: 'فشل في تحديث فئة الشكر والتقدير' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    const existing = await prisma.creditsCategory.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Category not found', messageAr: 'الفئة غير موجودة' },
        { status: 404 }
      );
    }

    await prisma.creditsCategory.delete({
      where: { id },
    });

    await logActivity({
      userId: user.id,
      userEmail: user.email,
      userName: user.nameArabic,
      action: 'DELETE_CREDITS_CATEGORY',
      category: 'ADMIN',
      targetType: 'CREDITS_CATEGORY',
      targetId: id,
      targetName: existing.nameAr,
      details: { deletedCategory: existing },
    });

    return NextResponse.json({
      success: true,
      message: 'Credits category deleted successfully',
      messageAr: 'تم حذف فئة الشكر والتقدير بنجاح',
    });
  } catch (error) {
    console.error('Error deleting credits category:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete credits category', messageAr: 'فشل في حذف فئة الشكر والتقدير' },
      { status: 500 }
    );
  }
}
