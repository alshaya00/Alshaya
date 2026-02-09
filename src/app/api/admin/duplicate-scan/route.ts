import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
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

function normalizeArabicName(name: string): string {
  if (!name) return '';
  return name
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ء/g, '')
    .replace(/ـ/g, '')
    .replace(/عبد\s+ال/g, 'عبدال')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeArabicName(str1);
  const s2 = normalizeArabicName(str2);
  if (s1 === s2) return 100;
  if (!s1 || !s2) return 0;
  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  return Math.round(((maxLength - distance) / maxLength) * 100);
}

interface MemberData {
  id: string;
  firstName: string;
  fullNameAr: string | null;
  fullNameEn: string | null;
  fatherId: string | null;
  gender: string;
  generation: number;
  branch: string | null;
  birthYear: number | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  status: string;
  photoUrl: string | null;
  occupation: string | null;
  biography: string | null;
}

interface DuplicatePair {
  memberA: MemberData;
  memberB: MemberData;
  score: number;
  level: 'EXACT' | 'SUSPICIOUS' | 'POTENTIAL';
  reasons: string[];
  reasonsAr: string[];
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

    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const members = await prisma.familyMember.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        firstName: true,
        fullNameAr: true,
        fullNameEn: true,
        fatherId: true,
        gender: true,
        generation: true,
        branch: true,
        birthYear: true,
        phone: true,
        email: true,
        city: true,
        status: true,
        photoUrl: true,
        occupation: true,
        biography: true,
      },
    });

    const verifiedDifferent = await prisma.duplicateFlag.findMany({
      where: {
        status: { in: ['NOT_DUPLICATE', 'VERIFIED_DIFFERENT'] },
      },
      select: {
        sourceMemberId: true,
        targetMemberId: true,
      },
    });

    const excludedPairs = new Set<string>();
    for (const vd of verifiedDifferent) {
      excludedPairs.add(`${vd.sourceMemberId}:${vd.targetMemberId}`);
      excludedPairs.add(`${vd.targetMemberId}:${vd.sourceMemberId}`);
    }

    const duplicates: DuplicatePair[] = [];
    const seenPairs = new Set<string>();

    const byFather = new Map<string, MemberData[]>();
    for (const m of members) {
      if (m.fatherId) {
        if (!byFather.has(m.fatherId)) byFather.set(m.fatherId, []);
        byFather.get(m.fatherId)!.push(m);
      }
    }

    for (const [, siblings] of byFather) {
      for (let i = 0; i < siblings.length; i++) {
        for (let j = i + 1; j < siblings.length; j++) {
          const a = siblings[i];
          const b = siblings[j];

          const pairKey = [a.id, b.id].sort().join(':');
          if (seenPairs.has(pairKey) || excludedPairs.has(`${a.id}:${b.id}`)) continue;

          const normalA = normalizeArabicName(a.firstName);
          const normalB = normalizeArabicName(b.firstName);
          const similarity = calculateSimilarity(a.firstName, b.firstName);

          if (normalA === normalB && a.gender === b.gender) {
            seenPairs.add(pairKey);
            duplicates.push({
              memberA: a,
              memberB: b,
              score: 100,
              level: 'EXACT',
              reasons: ['Same first name', 'Same father', 'Same gender'],
              reasonsAr: ['نفس الاسم الأول', 'نفس الأب', 'نفس الجنس'],
            });
          } else if (similarity >= 85) {
            seenPairs.add(pairKey);
            duplicates.push({
              memberA: a,
              memberB: b,
              score: similarity,
              level: 'SUSPICIOUS',
              reasons: [`Similar first name (${similarity}%)`, 'Same father'],
              reasonsAr: [`اسم أول مشابه (${similarity}%)`, 'نفس الأب'],
            });
          }
        }
      }
    }

    const byNormalizedName = new Map<string, MemberData[]>();
    for (const m of members) {
      const key = normalizeArabicName(m.firstName);
      if (!key) continue;
      if (!byNormalizedName.has(key)) byNormalizedName.set(key, []);
      byNormalizedName.get(key)!.push(m);
    }

    for (const [, group] of byNormalizedName) {
      if (group.length < 2) continue;
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const a = group[i];
          const b = group[j];

          if (a.fatherId && b.fatherId && a.fatherId === b.fatherId) continue;

          const pairKey = [a.id, b.id].sort().join(':');
          if (seenPairs.has(pairKey) || excludedPairs.has(`${a.id}:${b.id}`)) continue;

          if (a.generation === b.generation && a.branch && b.branch && a.branch === b.branch) {
            seenPairs.add(pairKey);
            const score = 70;
            duplicates.push({
              memberA: a,
              memberB: b,
              score,
              level: 'POTENTIAL',
              reasons: ['Same first name', 'Same generation', 'Same branch', 'Different father'],
              reasonsAr: ['نفس الاسم الأول', 'نفس الجيل', 'نفس الفرع', 'أب مختلف'],
            });
          }
        }
      }
    }

    duplicates.sort((a, b) => b.score - a.score);

    const exact = duplicates.filter(d => d.level === 'EXACT');
    const suspicious = duplicates.filter(d => d.level === 'SUSPICIOUS');
    const potential = duplicates.filter(d => d.level === 'POTENTIAL');

    return NextResponse.json({
      success: true,
      stats: {
        total: duplicates.length,
        exact: exact.length,
        suspicious: suspicious.length,
        potential: potential.length,
        membersScanned: members.length,
      },
      duplicates: {
        exact,
        suspicious,
        potential,
      },
    });
  } catch (error) {
    console.error('Error in duplicate scan:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to scan for duplicates', messageAr: 'فشل في فحص التكرارات' },
      { status: 500 }
    );
  }
}
