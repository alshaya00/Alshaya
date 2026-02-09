import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { normalizeArabicName } from '@/lib/matching/arabic-utils';
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

export interface DataIssue {
  id: string;
  type: 'DUPLICATE' | 'ORPHANED' | 'MISSING_DATA' | 'INCONSISTENT' | 'PENDING_REVIEW';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  memberId: string;
  memberName: string;
  description: string;
  descriptionEn: string;
  details: Record<string, unknown>;
  suggestedAction?: string;
  relatedMemberId?: string;
  relatedMemberName?: string;
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const typeFilter = searchParams.get('type');

    const issues: DataIssue[] = [];

    const members = await prisma.familyMember.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        firstName: true,
        fullNameAr: true,
        fatherId: true,
        fatherName: true,
        gender: true,
        generation: true,
        branch: true,
        birthYear: true,
        birthCalendar: true,
        status: true,
        phone: true,
        email: true,
        city: true,
      },
      take: 2000,
    });

    const memberMap = new Map(members.map(m => [m.id, m]));

    const orphanedMembers = members.filter(m => {
      if (!m.fatherId) return m.generation > 1;
      return !memberMap.has(m.fatherId);
    });

    for (const member of orphanedMembers) {
      issues.push({
        id: `orphan-${member.id}`,
        type: 'ORPHANED',
        severity: 'HIGH',
        memberId: member.id,
        memberName: member.fullNameAr || member.firstName,
        description: `العضو ليس له أب مُعرّف رغم أنه ليس من الجيل الأول`,
        descriptionEn: 'Member has no defined father despite not being first generation',
        details: {
          generation: member.generation,
          fatherId: member.fatherId,
        },
        suggestedAction: 'SET_PARENT',
      });
    }

    const membersByFatherAndName = new Map<string, typeof members>();
    for (const member of members) {
      if (member.fatherId) {
        const normalizedName = normalizeArabicName(member.firstName);
        const key = `${member.fatherId}-${normalizedName}`;
        if (!membersByFatherAndName.has(key)) {
          membersByFatherAndName.set(key, []);
        }
        membersByFatherAndName.get(key)!.push(member);
      }
    }

    for (const [, group] of membersByFatherAndName) {
      if (group.length > 1) {
        const first = group[0];
        for (let i = 1; i < group.length; i++) {
          const duplicate = group[i];
          issues.push({
            id: `duplicate-${first.id}-${duplicate.id}`,
            type: 'DUPLICATE',
            severity: 'HIGH',
            memberId: duplicate.id,
            memberName: duplicate.fullNameAr || duplicate.firstName,
            description: `عضو مكرر محتمل: نفس الاسم والأب`,
            descriptionEn: 'Potential duplicate: same name and father',
            details: {
              firstName: duplicate.firstName,
              fatherId: duplicate.fatherId,
            },
            suggestedAction: 'MERGE',
            relatedMemberId: first.id,
            relatedMemberName: first.fullNameAr || first.firstName,
          });
        }
      }
    }

    for (const member of members) {
      const missingFields: string[] = [];
      if (!member.birthYear) missingFields.push('سنة الميلاد');
      if (!member.branch && member.generation > 2) missingFields.push('الفرع');
      if (!member.city) missingFields.push('المدينة');

      if (missingFields.length >= 2) {
        issues.push({
          id: `missing-${member.id}`,
          type: 'MISSING_DATA',
          severity: missingFields.length >= 3 ? 'MEDIUM' : 'LOW',
          memberId: member.id,
          memberName: member.fullNameAr || member.firstName,
          description: `بيانات ناقصة: ${missingFields.join('، ')}`,
          descriptionEn: `Missing data: ${missingFields.length} fields`,
          details: { missingFields },
          suggestedAction: 'EDIT',
        });
      }
    }

    for (const member of members) {
      if (member.fatherId && memberMap.has(member.fatherId)) {
        const father = memberMap.get(member.fatherId)!;
        if (member.generation !== father.generation + 1) {
          issues.push({
            id: `gen-${member.id}`,
            type: 'INCONSISTENT',
            severity: 'MEDIUM',
            memberId: member.id,
            memberName: member.fullNameAr || member.firstName,
            description: `جيل غير متسق: العضو في الجيل ${member.generation} لكن أبوه في الجيل ${father.generation}`,
            descriptionEn: `Generation inconsistency: member is gen ${member.generation} but father is gen ${father.generation}`,
            details: {
              memberGeneration: member.generation,
              fatherGeneration: father.generation,
              expectedGeneration: father.generation + 1,
            },
            suggestedAction: 'FIX_GENERATION',
            relatedMemberId: father.id,
            relatedMemberName: father.fullNameAr || father.firstName,
          });
        }
      }
    }

    const pendingMembers = await prisma.pendingMember.findMany({
      where: { reviewStatus: 'PENDING' },
      select: {
        id: true,
        firstName: true,
        fullNameAr: true,
      },
    });

    for (const pending of pendingMembers) {
      issues.push({
        id: `pending-${pending.id}`,
        type: 'PENDING_REVIEW',
        severity: 'MEDIUM',
        memberId: pending.id,
        memberName: pending.fullNameAr || pending.firstName,
        description: 'طلب عضوية بانتظار المراجعة',
        descriptionEn: 'Pending membership request awaiting review',
        details: {},
        suggestedAction: 'REVIEW',
      });
    }

    issues.sort((a, b) => {
      const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    const summary = {
      total: issues.length,
      byType: {
        DUPLICATE: issues.filter(i => i.type === 'DUPLICATE').length,
        ORPHANED: issues.filter(i => i.type === 'ORPHANED').length,
        MISSING_DATA: issues.filter(i => i.type === 'MISSING_DATA').length,
        INCONSISTENT: issues.filter(i => i.type === 'INCONSISTENT').length,
        PENDING_REVIEW: issues.filter(i => i.type === 'PENDING_REVIEW').length,
      },
      bySeverity: {
        HIGH: issues.filter(i => i.severity === 'HIGH').length,
        MEDIUM: issues.filter(i => i.severity === 'MEDIUM').length,
        LOW: issues.filter(i => i.severity === 'LOW').length,
      },
    };

    let filteredIssues = issues;
    if (typeFilter) {
      filteredIssues = issues.filter(i => i.type === typeFilter);
    }

    const start = (page - 1) * limit;
    const paginatedIssues = filteredIssues.slice(start, start + limit);

    return NextResponse.json({
      success: true,
      issues: paginatedIssues,
      summary,
      pagination: {
        page,
        limit,
        total: filteredIssues.length,
        totalPages: Math.ceil(filteredIssues.length / limit),
      },
    });
  } catch (error) {
    console.error('Error detecting data issues:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to detect data issues' },
      { status: 500 }
    );
  }
}
