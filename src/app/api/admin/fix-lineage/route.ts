import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { generateFullNamesFromLineage } from '@/lib/member-registry';
import { createAuditLog } from '@/lib/audit';

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

function hasArabicChars(str: string | null): boolean {
  if (!str) return false;
  return /[\u0600-\u06FF]/.test(str);
}

function countAncestorsInLineage(fullNameAr: string | null): number {
  if (!fullNameAr) return 0;
  const binCount = (fullNameAr.match(/\sبن\s/g) || []).length;
  const bintCount = (fullNameAr.match(/\sبنت\s/g) || []).length;
  return binCount + bintCount;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const members = await prisma.familyMember.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        firstName: true,
        gender: true,
        fatherId: true,
        generation: true,
        fullNameAr: true,
        fullNameEn: true,
      },
      orderBy: { generation: 'asc' },
    });

    const issues: Array<{
      id: string;
      firstName: string;
      generation: number;
      currentFullNameAr: string | null;
      currentFullNameEn: string | null;
      issueType: 'arabic_in_english' | 'incomplete_lineage' | 'both';
      expectedAncestors: number;
      actualAncestors: number;
    }> = [];

    for (const member of members) {
      const hasArabicInEnglish = hasArabicChars(member.fullNameEn);
      const actualAncestors = countAncestorsInLineage(member.fullNameAr);
      const expectedAncestors = member.generation > 1 ? member.generation - 1 : 0;
      const hasIncompleteLineage = actualAncestors < expectedAncestors && member.fatherId;

      if (hasArabicInEnglish || hasIncompleteLineage) {
        issues.push({
          id: member.id,
          firstName: member.firstName,
          generation: member.generation,
          currentFullNameAr: member.fullNameAr,
          currentFullNameEn: member.fullNameEn,
          issueType: hasArabicInEnglish && hasIncompleteLineage 
            ? 'both' 
            : hasArabicInEnglish 
              ? 'arabic_in_english' 
              : 'incomplete_lineage',
          expectedAncestors,
          actualAncestors,
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalMembers: members.length,
      issuesCount: issues.length,
      issues: issues.slice(0, 100),
      summary: {
        arabicInEnglish: issues.filter(i => i.issueType === 'arabic_in_english' || i.issueType === 'both').length,
        incompleteLineage: issues.filter(i => i.issueType === 'incomplete_lineage' || i.issueType === 'both').length,
      },
      message: `Found ${issues.length} members with name issues`,
      messageAr: `تم العثور على ${issues.length} عضو لديهم مشاكل في الأسماء`,
    });
  } catch (error) {
    console.error('Error checking lineage:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to check lineage', messageAr: 'فشل في فحص سلسلة النسب' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { memberIds, preview = true, fixAll = false } = body;

    let membersToFix;

    if (fixAll) {
      membersToFix = await prisma.familyMember.findMany({
        where: { 
          deletedAt: null,
        },
        select: {
          id: true,
          firstName: true,
          gender: true,
          fatherId: true,
          generation: true,
          fullNameAr: true,
          fullNameEn: true,
        },
        orderBy: { generation: 'asc' },
      });

      membersToFix = membersToFix.filter(m => {
        const hasArabicInEnglish = hasArabicChars(m.fullNameEn);
        const actualAncestors = countAncestorsInLineage(m.fullNameAr);
        const expectedAncestors = m.generation > 1 ? m.generation - 1 : 0;
        const hasIncompleteLineage = actualAncestors < expectedAncestors && m.fatherId;
        return hasArabicInEnglish || hasIncompleteLineage;
      });
    } else if (memberIds && Array.isArray(memberIds)) {
      membersToFix = await prisma.familyMember.findMany({
        where: { 
          id: { in: memberIds },
          deletedAt: null,
        },
        select: {
          id: true,
          firstName: true,
          gender: true,
          fatherId: true,
          generation: true,
          fullNameAr: true,
          fullNameEn: true,
        },
        orderBy: { generation: 'asc' },
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'No members specified', messageAr: 'لم يتم تحديد أعضاء' },
        { status: 400 }
      );
    }

    const results: Array<{
      id: string;
      firstName: string;
      oldFullNameAr: string | null;
      newFullNameAr: string;
      oldFullNameEn: string | null;
      newFullNameEn: string;
      changed: boolean;
    }> = [];

    for (const member of membersToFix) {
      // Generate names for all members, including root members without fatherId
      const newNames = await generateFullNamesFromLineage(member.id, {
        firstName: member.firstName,
        gender: (member.gender as 'Male' | 'Female') || 'Male',
        fatherId: member.fatherId,
      });

      const arChanged = newNames.fullNameAr !== member.fullNameAr;
      const enChanged = newNames.fullNameEn !== member.fullNameEn;

      if (arChanged || enChanged) {
        results.push({
          id: member.id,
          firstName: member.firstName,
          oldFullNameAr: member.fullNameAr,
          newFullNameAr: newNames.fullNameAr,
          oldFullNameEn: member.fullNameEn,
          newFullNameEn: newNames.fullNameEn,
          changed: true,
        });

        if (!preview) {
          await prisma.familyMember.update({
            where: { id: member.id },
            data: {
              fullNameAr: newNames.fullNameAr,
              fullNameEn: newNames.fullNameEn,
            },
          });
        }
      }
    }

    if (!preview && results.length > 0) {
      await createAuditLog({
        action: 'FIX_LINEAGE_NAMES',
        targetType: 'MEMBER',
        targetId: 'BULK',
        userId: user.id,
        details: {
          fixedCount: results.length,
          memberIds: results.map(r => r.id),
        },
      });
    }

    return NextResponse.json({
      success: true,
      preview,
      totalChecked: membersToFix.length,
      changedCount: results.length,
      results: results.slice(0, 50),
      message: preview 
        ? `Preview: ${results.length} members would be updated`
        : `Updated ${results.length} members`,
      messageAr: preview 
        ? `معاينة: سيتم تحديث ${results.length} عضو`
        : `تم تحديث ${results.length} عضو`,
    });
  } catch (error) {
    console.error('Error fixing lineage:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fix lineage', messageAr: 'فشل في إصلاح سلسلة النسب' },
      { status: 500 }
    );
  }
}
