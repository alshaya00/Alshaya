import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
export const dynamic = "force-dynamic";

async function getAdminUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;
  const session = await findSessionByToken(token);
  if (!session) return null;
  const user = await findUserById(session.userId);
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) return null;
  return user;
}

function countAncestorsInName(fullNameAr: string | null): number {
  if (!fullNameAr) return 0;
  const binCount = (fullNameAr.match(/\sبن\s/g) || []).length;
  const bintCount = (fullNameAr.match(/\sبنت\s/g) || []).length;
  return binCount + bintCount;
}

function getStandardId(id: string): string | null {
  const match = id.match(/^[Pp]?0*(\d+)$/);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  if (isNaN(num) || num <= 0) return null;
  return `P${String(num).padStart(4, '0')}`;
}

function hasArabicChars(str: string | null): boolean {
  if (!str) return false;
  return /[\u0600-\u06FF]/.test(str);
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAdminUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch all active members
    const members = await prisma.familyMember.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        firstName: true,
        generation: true,
        fullNameAr: true,
        fullNameEn: true,
        fatherId: true,
        fatherName: true,
        grandfatherName: true,
        greatGrandfatherName: true,
      },
    });

    const issues = {
      idFormat: [] as Array<{
        id: string;
        expectedId: string;
        numericValue: number;
      }>,
      arabicNames: [] as Array<{
        id: string;
        firstName: string;
        generation: number;
        currentFullNameAr: string | null;
        expectedAncestorCount: number;
        actualAncestorCount: number;
      }>,
      englishNames: [] as Array<{
        id: string;
        firstName: string;
        currentFullNameEn: string | null;
        issueType: 'arabic_chars' | 'missing';
      }>,
      missingAncestors: [] as Array<{
        id: string;
        firstName: string;
        generation: number;
        missingFields: string[];
      }>,
    };

    // Scan each member for issues
    for (const member of members) {
      // 1. Check ID Format Issues
      const standardId = getStandardId(member.id);
      if (standardId && standardId !== member.id) {
        const numMatch = member.id.match(/(\d+)/);
        const numericValue = numMatch ? parseInt(numMatch[1], 10) : 0;
        issues.idFormat.push({
          id: member.id,
          expectedId: standardId,
          numericValue,
        });
      }

      // 2. Check Arabic Name Issues
      const isArabicNameMissing = !member.fullNameAr || member.fullNameAr.trim() === '';
      const expectedAncestorCount = member.generation > 1 && member.fatherId ? member.generation - 1 : 0;
      const actualAncestorCount = countAncestorsInName(member.fullNameAr);
      const isArabicNameIncomplete =
        !isArabicNameMissing && expectedAncestorCount > 0 && actualAncestorCount < expectedAncestorCount && member.fatherId;

      if (isArabicNameMissing || isArabicNameIncomplete) {
        issues.arabicNames.push({
          id: member.id,
          firstName: member.firstName,
          generation: member.generation,
          currentFullNameAr: member.fullNameAr || null,
          expectedAncestorCount,
          actualAncestorCount,
        });
      }

      // 3. Check English Name Issues
      const isEnglishNameMissing = !member.fullNameEn || member.fullNameEn.trim() === '';
      const hasArabicInEnglish = hasArabicChars(member.fullNameEn);

      if (isEnglishNameMissing || hasArabicInEnglish) {
        issues.englishNames.push({
          id: member.id,
          firstName: member.firstName,
          currentFullNameEn: member.fullNameEn || null,
          issueType: isEnglishNameMissing ? 'missing' : 'arabic_chars',
        });
      }

      // 4. Check Missing Ancestor Fields
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

      if (missingFields.length > 0) {
        issues.missingAncestors.push({
          id: member.id,
          firstName: member.firstName,
          generation: member.generation,
          missingFields,
        });
      }
    }

    // Calculate summary statistics
    const summary = {
      idFormatIssues: issues.idFormat.length,
      arabicNameIssues: issues.arabicNames.length,
      englishNameIssues: issues.englishNames.length,
      missingAncestorFields: issues.missingAncestors.length,
      totalIssues:
        issues.idFormat.length +
        issues.arabicNames.length +
        issues.englishNames.length +
        issues.missingAncestors.length,
    };

    return NextResponse.json({
      success: true,
      totalMembers: members.length,
      summary,
      issues,
    });
  } catch (error) {
    console.error('Error scanning data quality:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to scan data quality' },
      { status: 500 }
    );
  }
}
