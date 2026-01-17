import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
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

interface MemberWithIncorrectConnector {
  id: string;
  firstName: string;
  gender: string;
  currentFullNameAr: string | null;
  expectedConnector: string;
  actualConnector: string;
}

interface ConnectorFixResult {
  memberId: string;
  memberName: string;
  oldFullNameAr: string;
  newFullNameAr: string;
}

function getConnectorFromFullName(fullNameAr: string | null): string | null {
  if (!fullNameAr) return null;
  if (fullNameAr.includes(' بنت ')) return 'بنت';
  if (fullNameAr.includes(' بن ')) return 'بن';
  return null;
}

async function getMembersWithIncorrectConnector(): Promise<MemberWithIncorrectConnector[]> {
  const members = await prisma.familyMember.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      firstName: true,
      gender: true,
      fullNameAr: true,
      fatherId: true,
    },
  });

  const incorrectMembers: MemberWithIncorrectConnector[] = [];

  for (const member of members) {
    if (!member.fullNameAr || !member.fatherId) continue;

    const expectedConnector = member.gender === 'Female' ? 'بنت' : 'بن';
    const actualConnector = getConnectorFromFullName(member.fullNameAr);

    if (actualConnector && actualConnector !== expectedConnector) {
      incorrectMembers.push({
        id: member.id,
        firstName: member.firstName,
        gender: member.gender,
        currentFullNameAr: member.fullNameAr,
        expectedConnector,
        actualConnector,
      });
    }
  }

  return incorrectMembers;
}

async function regenerateFullNameAr(memberId: string): Promise<string> {
  const member = await prisma.familyMember.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      firstName: true,
      gender: true,
      fatherId: true,
    },
  });

  if (!member) return '';

  const connector = member.gender === 'Female' ? 'بنت' : 'بن';
  const parts: string[] = [member.firstName];

  let currentId = member.fatherId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const ancestor = await prisma.familyMember.findUnique({
      where: { id: currentId },
      select: { id: true, firstName: true, fatherId: true },
    });

    if (!ancestor) break;

    parts.push(connector);
    parts.push(ancestor.firstName);
    currentId = ancestor.fatherId;
  }

  parts.push('آل شايع');
  return parts.join(' ').replace(/\s+/g, ' ').trim();
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
    if (!permissions.canManageAllMembers) {
      return NextResponse.json(
        { success: false, message: 'Permission denied', messageAr: 'غير مسموح' },
        { status: 403 }
      );
    }

    const incorrectMembers = await getMembersWithIncorrectConnector();

    return NextResponse.json({
      success: true,
      data: {
        count: incorrectMembers.length,
        members: incorrectMembers,
      },
      message: `Found ${incorrectMembers.length} members with incorrect lineage connectors`,
      messageAr: `تم العثور على ${incorrectMembers.length} عضو بموصل نسب خاطئ`,
    });
  } catch (error) {
    console.error('Error checking lineage connectors:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to check lineage connectors',
        messageAr: 'فشل في التحقق من موصلات النسب',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
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
    if (!permissions.canManageAllMembers) {
      return NextResponse.json(
        { success: false, message: 'Permission denied', messageAr: 'غير مسموح' },
        { status: 403 }
      );
    }

    const incorrectMembers = await getMembersWithIncorrectConnector();

    if (incorrectMembers.length === 0) {
      return NextResponse.json({
        success: true,
        data: { fixed: 0 },
        message: 'All members have correct lineage connectors',
        messageAr: 'جميع الأعضاء لديهم موصلات نسب صحيحة',
      });
    }

    const fixedResults: ConnectorFixResult[] = [];

    for (const member of incorrectMembers) {
      const newFullNameAr = await regenerateFullNameAr(member.id);

      await prisma.familyMember.update({
        where: { id: member.id },
        data: { fullNameAr: newFullNameAr },
      });

      fixedResults.push({
        memberId: member.id,
        memberName: member.firstName,
        oldFullNameAr: member.currentFullNameAr || '',
        newFullNameAr,
      });
    }

    await logAuditToDb({
      userId: user.id,
      action: 'FIX_LINEAGE_CONNECTORS',
      details: `Fixed lineage connectors for ${fixedResults.length} members: ${fixedResults.map(r => `${r.memberName} (${r.memberId})`).join(', ')}`,
      detailsAr: `تم إصلاح موصلات النسب لـ ${fixedResults.length} عضو`,
      entityType: 'MEMBER',
      entityId: 'BULK',
    });

    return NextResponse.json({
      success: true,
      data: {
        fixed: fixedResults.length,
        results: fixedResults,
      },
      message: `Fixed lineage connectors for ${fixedResults.length} members`,
      messageAr: `تم إصلاح موصلات النسب لـ ${fixedResults.length} عضو`,
    });
  } catch (error) {
    console.error('Error fixing lineage connectors:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fix lineage connectors',
        messageAr: 'فشل في إصلاح موصلات النسب',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
