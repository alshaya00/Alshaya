import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { logAuditToDb } from '@/lib/db-audit';
export const dynamic = "force-dynamic";

function normalizeOccupation(occ: string): string {
  let normalized = occ.trim().replace(/\s+/g, ' ');
  normalized = normalized.replace(/ه\b/g, 'ة');
  return normalized;
}

function getUniqueOccupations(occupations: string[]): Map<string, { canonical: string; count: number; variants: string[] }> {
  const occupationMap = new Map<string, { canonical: string; count: number; variants: Set<string> }>();

  for (const occ of occupations) {
    const normalized = normalizeOccupation(occ);
    
    if (!occupationMap.has(normalized)) {
      occupationMap.set(normalized, {
        canonical: normalized,
        count: 1,
        variants: new Set([occ])
      });
    } else {
      const entry = occupationMap.get(normalized)!;
      entry.count++;
      entry.variants.add(occ);
    }
  }

  // Convert to final format
  const result = new Map<string, { canonical: string; count: number; variants: string[] }>();
  occupationMap.forEach((value, key) => {
    result.set(key, {
      canonical: value.canonical,
      count: value.count,
      variants: Array.from(value.variants)
    });
  });

  return result;
}

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = getPermissionsForRole(user.role);
    if (!permissions.canManageMembers) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const members = await prisma.familyMember.findMany({
      where: { deletedAt: null },
      select: { id: true, occupation: true, firstName: true, fullNameAr: true }
    });

    const occupations = members.map(m => m.occupation).filter(Boolean) as string[];
    const uniqueOccupations = getUniqueOccupations(occupations);

    const occupationStats: {
      normalized: string;
      canonical: string;
      count: number;
      variants: string[];
      needsNormalization: boolean;
    }[] = [];

    for (const [normalized, data] of uniqueOccupations) {
      occupationStats.push({
        normalized,
        canonical: data.canonical,
        count: data.count,
        variants: data.variants,
        needsNormalization: data.variants.length > 1 || data.variants.some(v => v !== normalized)
      });
    }

    occupationStats.sort((a, b) => b.count - a.count);

    const duplicates = occupationStats.filter(o => o.needsNormalization);

    return NextResponse.json({
      success: true,
      totalMembers: members.length,
      totalWithOccupation: occupations.length,
      uniqueOccupations: occupationStats.length,
      duplicatesCount: duplicates.length,
      occupations: occupationStats,
      duplicates
    });
  } catch (error) {
    console.error('Error fetching occupation stats:', error);
    return NextResponse.json({ error: 'Failed to fetch occupation stats' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = getPermissionsForRole(user.role);
    if (!permissions.canManageMembers) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action, dryRun = true } = body;

    if (action !== 'normalize') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const members = await prisma.familyMember.findMany({
      where: { 
        deletedAt: null,
        occupation: { not: null }
      },
      select: { id: true, occupation: true, firstName: true, fullNameAr: true }
    });

    const changes: {
      memberId: string;
      memberName: string;
      oldOccupation: string;
      newOccupation: string;
    }[] = [];

    for (const member of members) {
      if (!member.occupation) continue;

      const normalized = normalizeOccupation(member.occupation);
      if (normalized !== member.occupation) {
        changes.push({
          memberId: member.id,
          memberName: member.fullNameAr || member.firstName,
          oldOccupation: member.occupation,
          newOccupation: normalized
        });
      }
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        changesCount: changes.length,
        changes: changes.slice(0, 100),
        message: `سيتم تحديث ${changes.length} سجل. أرسل dryRun: false للتنفيذ.`
      });
    }

    let updated = 0;
    for (const change of changes) {
      await prisma.familyMember.update({
        where: { id: change.memberId },
        data: { occupation: change.newOccupation }
      });
      updated++;
    }

    await logAuditToDb({
      action: 'OCCUPATION_CLEANUP',
      entity: 'MEMBER',
      entityId: 'BULK',
      userId: user.id,
      userName: user.nameArabic || user.nameEnglish || 'Unknown',
      oldValue: JSON.stringify({ count: changes.length }),
      newValue: JSON.stringify({ updated, samples: changes.slice(0, 10) }),
      details: `تم تنظيف ${updated} مهنة`
    });

    return NextResponse.json({
      success: true,
      dryRun: false,
      updated,
      message: `تم تحديث ${updated} سجل بنجاح`
    });
  } catch (error) {
    console.error('Error cleaning occupations:', error);
    return NextResponse.json({ error: 'Failed to clean occupations' }, { status: 500 });
  }
}
