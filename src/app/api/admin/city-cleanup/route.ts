import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { logAuditToDb } from '@/lib/db-audit';
import { normalizeCity, normalizeCityWithCorrection, getUniqueCities } from '@/lib/matching/arabic-utils';

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
      select: { id: true, city: true, firstName: true, fullNameAr: true }
    });

    const cities = members.map(m => m.city).filter(Boolean) as string[];
    const uniqueCities = getUniqueCities(cities);

    const cityStats: {
      normalized: string;
      canonical: string;
      correctedTo: string;
      count: number;
      variants: string[];
      needsCorrection: boolean;
    }[] = [];

    for (const [normalized, data] of uniqueCities) {
      const corrected = normalizeCityWithCorrection(data.canonical);
      cityStats.push({
        normalized,
        canonical: data.canonical,
        correctedTo: corrected,
        count: data.count,
        variants: data.variants,
        needsCorrection: corrected !== data.canonical && corrected !== normalized
      });
    }

    cityStats.sort((a, b) => b.count - a.count);

    const duplicates = cityStats.filter(c => c.variants.length > 1 || c.needsCorrection);

    return NextResponse.json({
      success: true,
      totalMembers: members.length,
      totalWithCity: cities.length,
      uniqueCities: cityStats.length,
      duplicatesCount: duplicates.length,
      cities: cityStats,
      duplicates
    });
  } catch (error) {
    console.error('Error fetching city stats:', error);
    return NextResponse.json({ error: 'Failed to fetch city stats' }, { status: 500 });
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
        city: { not: null }
      },
      select: { id: true, city: true, firstName: true, fullNameAr: true }
    });

    const changes: {
      memberId: string;
      memberName: string;
      oldCity: string;
      newCity: string;
    }[] = [];

    for (const member of members) {
      if (!member.city) continue;

      const normalized = normalizeCityWithCorrection(member.city);
      if (normalized !== member.city) {
        changes.push({
          memberId: member.id,
          memberName: member.fullNameAr || member.firstName,
          oldCity: member.city,
          newCity: normalized
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
        data: { city: change.newCity }
      });
      updated++;
    }

    await logAuditToDb({
      action: 'CITY_CLEANUP',
      entity: 'MEMBER',
      entityId: 'BULK',
      userId: user.id,
      userName: user.nameArabic || user.nameEnglish || 'Unknown',
      oldValue: JSON.stringify({ count: changes.length }),
      newValue: JSON.stringify({ updated, samples: changes.slice(0, 10) }),
      details: `تم تنظيف ${updated} مدينة`
    });

    return NextResponse.json({
      success: true,
      dryRun: false,
      updated,
      message: `تم تحديث ${updated} سجل بنجاح`
    });
  } catch (error) {
    console.error('Error cleaning cities:', error);
    return NextResponse.json({ error: 'Failed to clean cities' }, { status: 500 });
  }
}
