import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
// Using simulated versions locally instead of DB-reading versions
import { getMemberIdVariants } from '@/lib/utils';
import { transliterateName } from '@/lib/utils/transliteration';
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

interface DescendantChange {
  id: string;
  firstName: string;
  generation: number;
  relationship: string;
  changes: Record<string, { old: string | null; new: string | null }>;
}

function getRelationship(generationDiff: number, gender: string): string {
  const isFemale = gender?.toUpperCase() === 'FEMALE';
  if (generationDiff === 1) return isFemale ? 'ابنة' : 'ابن';
  if (generationDiff === 2) return isFemale ? 'حفيدة' : 'حفيد';
  if (generationDiff === 3) return isFemale ? 'حفيدة (الجيل الثالث)' : 'حفيد (الجيل الثالث)';
  return isFemale ? `حفيدة (الجيل ${generationDiff})` : `حفيد (الجيل ${generationDiff})`;
}

type NameOverride = Map<string, string>;

async function getSimulatedAncestorNames(
  fatherId: string | null,
  nameOverrides: NameOverride
): Promise<{ fatherName: string | null; grandfatherName: string | null; greatGrandfatherName: string | null }> {
  if (!fatherId) return { fatherName: null, grandfatherName: null, greatGrandfatherName: null };

  const ancestors: string[] = [];
  let currentId: string | null = fatherId;

  for (let i = 0; i < 3 && currentId; i++) {
    const overrideName = nameOverrides.get(currentId);
    if (overrideName !== undefined) {
      ancestors.push(overrideName);
      const variants = getMemberIdVariants(currentId);
      const ancestor = await prisma.familyMember.findFirst({
        where: { id: { in: variants } },
        select: { fatherId: true },
      });
      currentId = ancestor?.fatherId || null;
    } else {
      const variants = getMemberIdVariants(currentId);
      const ancestor = await prisma.familyMember.findFirst({
        where: { id: { in: variants } },
        select: { firstName: true, fatherId: true },
      });
      if (!ancestor) break;
      ancestors.push(ancestor.firstName);
      currentId = ancestor.fatherId;
    }
  }

  return {
    fatherName: ancestors[0] || null,
    grandfatherName: ancestors[1] || null,
    greatGrandfatherName: ancestors[2] || null,
  };
}

async function generateSimulatedFullNames(
  memberFirstName: string,
  memberGender: string,
  fatherId: string | null,
  nameOverrides: NameOverride
): Promise<{ fullNameAr: string; fullNameEn: string }> {
  const connector = memberGender?.toUpperCase() === 'FEMALE' ? 'بنت' : 'بن';
  const connectorEn = memberGender?.toUpperCase() === 'FEMALE' ? 'bint' : 'bin';

  const ancestorNames: string[] = [];
  let currentId: string | null = fatherId;

  for (let i = 0; i < 20 && currentId; i++) {
    const overrideName = nameOverrides.get(currentId);
    if (overrideName !== undefined) {
      ancestorNames.push(overrideName);
      const variants = getMemberIdVariants(currentId);
      const ancestor = await prisma.familyMember.findFirst({
        where: { id: { in: variants } },
        select: { fatherId: true },
      });
      currentId = ancestor?.fatherId || null;
    } else {
      const variants = getMemberIdVariants(currentId);
      const ancestor = await prisma.familyMember.findFirst({
        where: { id: { in: variants } },
        select: { firstName: true, fatherId: true },
      });
      if (!ancestor) break;
      ancestorNames.push(ancestor.firstName);
      currentId = ancestor.fatherId;
    }
  }

  const partsAr = [memberFirstName.trim()];
  for (const name of ancestorNames) {
    partsAr.push(`${connector} ${name.trim()}`);
  }
  partsAr.push('آل شايع');
  const fullNameAr = partsAr.join(' ').replace(/\s+/g, ' ').trim();

  const partsEn = [transliterateName(memberFirstName)];
  for (const name of ancestorNames) {
    partsEn.push(`${connectorEn} ${transliterateName(name)}`);
  }
  partsEn.push('Al Shaya');
  const fullNameEn = partsEn.join(' ').replace(/\s+/g, ' ').trim();

  return { fullNameAr, fullNameEn };
}

async function collectDescendantPreviews(
  parentId: string,
  generationDiff: number,
  results: DescendantChange[],
  nameOverrides: NameOverride
): Promise<void> {
  const variants = getMemberIdVariants(parentId);
  const children = await prisma.familyMember.findMany({
    where: {
      fatherId: { in: variants },
      deletedAt: null,
    },
  });

  for (const child of children) {
    const ancestorNames = await getSimulatedAncestorNames(child.fatherId, nameOverrides);
    const fullNames = await generateSimulatedFullNames(
      child.firstName,
      child.gender,
      child.fatherId,
      nameOverrides
    );

    const changes: Record<string, { old: string | null; new: string | null }> = {};

    if (child.fullNameAr !== fullNames.fullNameAr) {
      changes.fullNameAr = { old: child.fullNameAr, new: fullNames.fullNameAr };
    }
    if (child.fullNameEn !== fullNames.fullNameEn) {
      changes.fullNameEn = { old: child.fullNameEn, new: fullNames.fullNameEn };
    }
    if (child.fatherName !== ancestorNames.fatherName) {
      changes.fatherName = { old: child.fatherName, new: ancestorNames.fatherName };
    }
    if (child.grandfatherName !== ancestorNames.grandfatherName) {
      changes.grandfatherName = { old: child.grandfatherName, new: ancestorNames.grandfatherName };
    }
    if (child.greatGrandfatherName !== ancestorNames.greatGrandfatherName) {
      changes.greatGrandfatherName = { old: child.greatGrandfatherName, new: ancestorNames.greatGrandfatherName };
    }

    if (Object.keys(changes).length > 0) {
      results.push({
        id: child.id,
        firstName: child.firstName,
        generation: child.generation,
        relationship: getRelationship(generationDiff, child.gender),
        changes,
      });
    }

    await collectDescendantPreviews(child.id, generationDiff + 1, results, nameOverrides);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const idVariants = getMemberIdVariants(params.id);
    const member = await prisma.familyMember.findFirst({
      where: { id: { in: idVariants }, deletedAt: null },
    });

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Member not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const newFirstName = body.firstName || member.firstName;
    const newGender = body.gender || member.gender;
    const newFatherId = body.fatherId !== undefined ? body.fatherId : member.fatherId;

    const nameOverrides: NameOverride = new Map();
    if (newFirstName !== member.firstName) {
      nameOverrides.set(member.id, newFirstName);
    }

    const fullNames = await generateSimulatedFullNames(
      newFirstName,
      newGender,
      newFatherId,
      nameOverrides
    );

    const ancestorNames = await getSimulatedAncestorNames(newFatherId, nameOverrides);

    const memberChanges: Record<string, { old: string | null; new: string | null }> = {};

    if (member.fullNameAr !== fullNames.fullNameAr) {
      memberChanges.fullNameAr = { old: member.fullNameAr, new: fullNames.fullNameAr };
    }
    if (member.fullNameEn !== fullNames.fullNameEn) {
      memberChanges.fullNameEn = { old: member.fullNameEn, new: fullNames.fullNameEn };
    }
    if (member.fatherName !== ancestorNames.fatherName) {
      memberChanges.fatherName = { old: member.fatherName, new: ancestorNames.fatherName };
    }
    if (member.grandfatherName !== ancestorNames.grandfatherName) {
      memberChanges.grandfatherName = { old: member.grandfatherName, new: ancestorNames.grandfatherName };
    }
    if (member.greatGrandfatherName !== ancestorNames.greatGrandfatherName) {
      memberChanges.greatGrandfatherName = { old: member.greatGrandfatherName, new: ancestorNames.greatGrandfatherName };
    }

    const affectedDescendants: DescendantChange[] = [];
    await collectDescendantPreviews(member.id, 1, affectedDescendants, nameOverrides);

    return NextResponse.json({
      success: true,
      preview: {
        member: {
          id: member.id,
          firstName: newFirstName,
          changes: memberChanges,
        },
        affectedDescendants,
        totalAffected: 1 + affectedDescendants.length,
      },
    });
  } catch (error) {
    console.error('Error generating name preview:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate preview' },
      { status: 500 }
    );
  }
}
