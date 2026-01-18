import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { logAuditToDb } from '@/lib/db-audit';
import { normalizePhoneNumber } from '@/lib/phone-utils';

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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const where = type ? { type } : {};

    const [items, total] = await Promise.all([
      prisma.blocklist.findMany({
        where,
        orderBy: { blockedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.blocklist.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching blocklist:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch blocklist', messageAr: 'فشل في جلب القائمة السوداء' },
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

    const permissions = getPermissionsForRole(user.role);
    if (!permissions.manage_users && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, value, reason } = body;

    if (!type || !value) {
      return NextResponse.json(
        { success: false, message: 'Type and value are required', messageAr: 'النوع والقيمة مطلوبان' },
        { status: 400 }
      );
    }

    if (!['PHONE', 'EMAIL'].includes(type)) {
      return NextResponse.json(
        { success: false, message: 'Invalid type', messageAr: 'نوع غير صالح' },
        { status: 400 }
      );
    }

    let normalizedValue = value;
    if (type === 'PHONE') {
      normalizedValue = normalizePhoneNumber(value) || value;
    } else if (type === 'EMAIL') {
      normalizedValue = value.toLowerCase();
    }

    const existing = await prisma.blocklist.findUnique({
      where: {
        type_value: {
          type,
          value: normalizedValue,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Already blocked', messageAr: 'موجود بالفعل في القائمة السوداء' },
        { status: 400 }
      );
    }

    const item = await prisma.blocklist.create({
      data: {
        type,
        value: normalizedValue,
        reason: reason || null,
        blockedBy: user.id,
        blockedByName: user.nameArabic,
      },
    });

    await logAuditToDb({
      action: 'BLOCKLIST_ADD',
      severity: 'WARNING',
      userId: user.id,
      userName: user.nameArabic,
      userRole: user.role,
      targetType: 'BLOCKLIST',
      targetId: item.id,
      targetName: normalizedValue,
      description: `تم إضافة ${type === 'PHONE' ? 'رقم جوال' : 'بريد إلكتروني'} للقائمة السوداء: ${normalizedValue}`,
      details: {
        type,
        value: normalizedValue,
        reason,
      },
    });

    return NextResponse.json({
      success: true,
      item,
      message: 'Added to blocklist',
      messageAr: 'تم الإضافة للقائمة السوداء',
    });
  } catch (error) {
    console.error('Error adding to blocklist:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to add to blocklist', messageAr: 'فشل في الإضافة للقائمة السوداء' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID is required', messageAr: 'المعرف مطلوب' },
        { status: 400 }
      );
    }

    const item = await prisma.blocklist.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json(
        { success: false, message: 'Not found', messageAr: 'غير موجود' },
        { status: 404 }
      );
    }

    await prisma.blocklist.delete({
      where: { id },
    });

    await logAuditToDb({
      action: 'BLOCKLIST_REMOVE',
      severity: 'WARNING',
      userId: user.id,
      userName: user.nameArabic,
      userRole: user.role,
      targetType: 'BLOCKLIST',
      targetId: id,
      targetName: item.value,
      description: `تم إزالة ${item.type === 'PHONE' ? 'رقم جوال' : 'بريد إلكتروني'} من القائمة السوداء: ${item.value}`,
      previousState: item,
    });

    return NextResponse.json({
      success: true,
      message: 'Removed from blocklist',
      messageAr: 'تم الإزالة من القائمة السوداء',
    });
  } catch (error) {
    console.error('Error removing from blocklist:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to remove from blocklist', messageAr: 'فشل في الإزالة من القائمة السوداء' },
      { status: 500 }
    );
  }
}
