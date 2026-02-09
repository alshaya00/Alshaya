import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById, logActivity } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
export const dynamic = "force-dynamic";

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

    const permissions = getPermissionsForRole(user.role);
    if (!permissions.manage_users && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const categories = await prisma.creditsCategory.findMany({
      orderBy: { sortOrder: 'asc' },
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

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { nameAr, nameEn, descriptionAr, descriptionEn, category, icon, imageUrl, sortOrder, isActive } = body;

    if (!nameAr || !descriptionAr) {
      return NextResponse.json(
        { success: false, message: 'nameAr and descriptionAr are required', messageAr: 'الاسم العربي والوصف العربي مطلوبة' },
        { status: 400 }
      );
    }

    const newCategory = await prisma.creditsCategory.create({
      data: {
        nameAr,
        nameEn: nameEn || null,
        descriptionAr,
        descriptionEn: descriptionEn || null,
        category: category || 'عام',
        icon: icon || 'BookOpen',
        imageUrl: imageUrl || null,
        sortOrder: sortOrder ?? 0,
        isActive: isActive ?? true,
        createdBy: user.id,
      },
    });

    await logActivity({
      userId: user.id,
      userEmail: user.email,
      userName: user.nameArabic,
      action: 'CREATE_CREDITS_CATEGORY',
      category: 'ADMIN',
      targetType: 'CREDITS_CATEGORY',
      targetId: newCategory.id,
      targetName: nameAr,
      details: { nameAr, category },
    });

    return NextResponse.json({
      success: true,
      category: newCategory,
      message: 'Credits category created successfully',
      messageAr: 'تم إنشاء فئة الشكر والتقدير بنجاح',
    });
  } catch (error) {
    console.error('Error creating credits category:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create credits category', messageAr: 'فشل في إنشاء فئة الشكر والتقدير' },
      { status: 500 }
    );
  }
}
