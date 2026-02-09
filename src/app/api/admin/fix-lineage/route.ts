import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { generateFullNamesFromLineage, getAncestorNamesFromLineage } from '@/lib/member-registry';
import { logAuditAsync } from '@/lib/audit';
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
    if (!user || (user.role !== 'admin' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
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
        fatherName: true,
        grandfatherName: true,
        greatGrandfatherName: true,
      },
      orderBy: { generation: 'asc' },
    });

    const issues: Array<{
      id: string;
      firstName: string;
      generation: number;
      currentFullNameAr: string | null;
      currentFullNameEn: string | null;
      issueType: 'arabic_in_english' | 'incomplete_lineage' | 'missing_ancestor_names' | 'multiple';
      expectedAncestors: number;
      actualAncestors: number;
      missingFields?: string[];
    }> = [];

    for (const member of members) {
      const hasArabicInEnglish = hasArabicChars(member.fullNameEn);
      const actualAncestors = countAncestorsInLineage(member.fullNameAr);
      const expectedAncestors = member.generation > 1 ? member.generation - 1 : 0;
      const hasIncompleteLineage = actualAncestors < expectedAncestors && member.fatherId;
      
      const missingFields: string[] = [];
      if (member.generation > 1 && member.fatherId && !member.fatherName) {
        missingFields.push('fatherName');
      }
      if (member.generation > 2 && member.fatherId && !member.grandfatherName) {
        missingFields.push('grandfatherName');
      }
      if (member.generation > 3 && member.fatherId && !member.greatGrandfatherName) {
        missingFields.push('greatGrandfatherName');
      }
      const hasMissingAncestorNames = missingFields.length > 0;

      if (hasArabicInEnglish || hasIncompleteLineage || hasMissingAncestorNames) {
        const issueCount = [hasArabicInEnglish, hasIncompleteLineage, hasMissingAncestorNames].filter(Boolean).length;
        issues.push({
          id: member.id,
          firstName: member.firstName,
          generation: member.generation,
          currentFullNameAr: member.fullNameAr,
          currentFullNameEn: member.fullNameEn,
          issueType: issueCount > 1 
            ? 'multiple' 
            : hasArabicInEnglish 
              ? 'arabic_in_english' 
              : hasIncompleteLineage
                ? 'incomplete_lineage'
                : 'missing_ancestor_names',
          expectedAncestors,
          actualAncestors,
          missingFields: missingFields.length > 0 ? missingFields : undefined,
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalMembers: members.length,
      issuesCount: issues.length,
      issues: issues.slice(0, 100),
      summary: {
        arabicInEnglish: issues.filter(i => i.issueType === 'arabic_in_english' || i.issueType === 'multiple').length,
        incompleteLineage: issues.filter(i => i.issueType === 'incomplete_lineage' || i.issueType === 'multiple').length,
        missingAncestorNames: issues.filter(i => i.issueType === 'missing_ancestor_names' || i.issueType === 'multiple').length,
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
    if (!user || (user.role !== 'admin' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
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
          fatherName: true,
          grandfatherName: true,
          greatGrandfatherName: true,
        },
        orderBy: { generation: 'asc' },
      });

      membersToFix = membersToFix.filter(m => {
        const hasArabicInEnglish = hasArabicChars(m.fullNameEn);
        const actualAncestors = countAncestorsInLineage(m.fullNameAr);
        const expectedAncestors = m.generation > 1 ? m.generation - 1 : 0;
        const hasIncompleteLineage = actualAncestors < expectedAncestors && m.fatherId;
        const hasMissingAncestorNames = 
          (m.generation > 3 && m.fatherId && !m.greatGrandfatherName) ||
          (m.generation > 2 && m.fatherId && !m.grandfatherName) ||
          (m.generation > 1 && m.fatherId && !m.fatherName);
        return hasArabicInEnglish || hasIncompleteLineage || hasMissingAncestorNames;
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
          fatherName: true,
          grandfatherName: true,
          greatGrandfatherName: true,
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
      ancestorNamesUpdated: {
        fatherName?: { old: string | null; new: string | null };
        grandfatherName?: { old: string | null; new: string | null };
        greatGrandfatherName?: { old: string | null; new: string | null };
      };
      changed: boolean;
    }> = [];

    for (const member of membersToFix) {
      // Generate names for all members, including root members without fatherId
      const newNames = await generateFullNamesFromLineage(member.id, {
        firstName: member.firstName,
        gender: (member.gender as 'Male' | 'Female') || 'Male',
        fatherId: member.fatherId,
      });

      // Get ancestor names from lineage
      const ancestorNames = await getAncestorNamesFromLineage(member.fatherId);

      const arChanged = newNames.fullNameAr !== member.fullNameAr;
      const enChanged = newNames.fullNameEn !== member.fullNameEn;
      const fatherNameChanged = ancestorNames.fatherName && ancestorNames.fatherName !== member.fatherName;
      const grandfatherNameChanged = ancestorNames.grandfatherName && ancestorNames.grandfatherName !== member.grandfatherName;
      const greatGrandfatherNameChanged = ancestorNames.greatGrandfatherName && ancestorNames.greatGrandfatherName !== member.greatGrandfatherName;
      
      const anyChanged = arChanged || enChanged || fatherNameChanged || grandfatherNameChanged || greatGrandfatherNameChanged;

      if (anyChanged) {
        const ancestorNamesUpdated: {
          fatherName?: { old: string | null; new: string | null };
          grandfatherName?: { old: string | null; new: string | null };
          greatGrandfatherName?: { old: string | null; new: string | null };
        } = {};
        
        if (fatherNameChanged) {
          ancestorNamesUpdated.fatherName = { old: member.fatherName, new: ancestorNames.fatherName };
        }
        if (grandfatherNameChanged) {
          ancestorNamesUpdated.grandfatherName = { old: member.grandfatherName, new: ancestorNames.grandfatherName };
        }
        if (greatGrandfatherNameChanged) {
          ancestorNamesUpdated.greatGrandfatherName = { old: member.greatGrandfatherName, new: ancestorNames.greatGrandfatherName };
        }

        results.push({
          id: member.id,
          firstName: member.firstName,
          oldFullNameAr: member.fullNameAr,
          newFullNameAr: newNames.fullNameAr,
          oldFullNameEn: member.fullNameEn,
          newFullNameEn: newNames.fullNameEn,
          ancestorNamesUpdated,
          changed: true,
        });

        if (!preview) {
          const updateData: Record<string, string> = {
            fullNameAr: newNames.fullNameAr,
            fullNameEn: newNames.fullNameEn,
          };
          
          if (ancestorNames.fatherName) {
            updateData.fatherName = ancestorNames.fatherName;
          }
          if (ancestorNames.grandfatherName) {
            updateData.grandfatherName = ancestorNames.grandfatherName;
          }
          if (ancestorNames.greatGrandfatherName) {
            updateData.greatGrandfatherName = ancestorNames.greatGrandfatherName;
          }

          await prisma.familyMember.update({
            where: { id: member.id },
            data: updateData,
          });
        }
      }
    }

    if (!preview && results.length > 0) {
      await logAuditAsync({
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
