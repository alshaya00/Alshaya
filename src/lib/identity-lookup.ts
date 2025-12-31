import { prisma } from './prisma';
import { normalizePhone } from './phone-utils';

export interface IdentityMatch {
  id: string;
  firstName: string;
  fullNameAr: string | null;
  fullNameEn: string | null;
  phone: string | null;
  email: string | null;
  matchType: 'phone' | 'email' | 'both';
  confidence: number;
}

export interface IdentityLookupResult {
  found: boolean;
  matches: IdentityMatch[];
  exactMatch: IdentityMatch | null;
}

export async function lookupByPhone(phone: string): Promise<IdentityMatch[]> {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return [];

  const members = await prisma.familyMember.findMany({
    where: {
      deletedAt: null,
      phone: normalizedPhone,
    },
    select: {
      id: true,
      firstName: true,
      fullNameAr: true,
      fullNameEn: true,
      phone: true,
      email: true,
    },
  });

  return members.map((m) => ({
    ...m,
    matchType: 'phone' as const,
    confidence: 1.0,
  }));
}

export async function lookupByEmail(email: string): Promise<IdentityMatch[]> {
  const normalizedEmail = email.toLowerCase().trim();
  if (!normalizedEmail) return [];

  const members = await prisma.familyMember.findMany({
    where: {
      deletedAt: null,
      email: {
        equals: normalizedEmail,
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
      firstName: true,
      fullNameAr: true,
      fullNameEn: true,
      phone: true,
      email: true,
    },
  });

  return members.map((m) => ({
    ...m,
    matchType: 'email' as const,
    confidence: 1.0,
  }));
}

export async function lookupIdentity(
  phone?: string | null,
  email?: string | null
): Promise<IdentityLookupResult> {
  const matches: IdentityMatch[] = [];
  const seenIds = new Set<string>();

  if (phone) {
    const phoneMatches = await lookupByPhone(phone);
    for (const match of phoneMatches) {
      if (!seenIds.has(match.id)) {
        seenIds.add(match.id);
        matches.push(match);
      }
    }
  }

  if (email) {
    const emailMatches = await lookupByEmail(email);
    for (const match of emailMatches) {
      if (seenIds.has(match.id)) {
        const existing = matches.find((m) => m.id === match.id);
        if (existing) {
          existing.matchType = 'both';
          existing.confidence = 1.0;
        }
      } else {
        seenIds.add(match.id);
        matches.push(match);
      }
    }
  }

  const exactMatch = matches.find((m) => m.matchType === 'both') || 
                     (matches.length === 1 ? matches[0] : null);

  return {
    found: matches.length > 0,
    matches,
    exactMatch,
  };
}

export async function checkUserHasLinkedMember(userId: string): Promise<{
  hasLinkedMember: boolean;
  linkedMemberId: string | null;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { linkedMemberId: true },
  });

  return {
    hasLinkedMember: !!user?.linkedMemberId,
    linkedMemberId: user?.linkedMemberId || null,
  };
}

export async function linkUserToMember(
  userId: string,
  memberId: string
): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { linkedMemberId: memberId },
    });
    return true;
  } catch (error) {
    console.error('Failed to link user to member:', error);
    return false;
  }
}
