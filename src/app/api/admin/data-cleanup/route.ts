import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';

async function getAuthAdmin(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) return null;

  const session = await findSessionByToken(token);
  if (!session) return null;

  const user = await findUserById(session.userId);
  if (!user || user.status !== 'ACTIVE') return null;

  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') return null;

  return user;
}

interface MemberWithFather {
  id: string;
  firstName: string;
  fullNameAr: string | null;
  fullNameEn: string | null;
  generation: number;
  branch: string | null;
  fatherId: string | null;
  father: {
    id: string;
    firstName: string;
    fullNameAr: string | null;
  } | null;
}

interface DuplicateGroup {
  fullName: string;
  members: {
    id: string;
    firstName: string;
    fullNameAr: string | null;
    fullNameEn: string | null;
    generation: number;
    branch: string | null;
    fatherId: string | null;
    fatherName: string | null;
  }[];
  issues: {
    type: 'different_fathers' | 'generation_gap';
    severity: 'error' | 'warning';
    description: string;
    descriptionAr: string;
  }[];
}

interface VerifiedPair {
  member1Id: string;
  member2Id: string;
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const user = await getAuthAdmin(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Admin access required', messageAr: 'يتطلب صلاحيات المدير' },
        { status: 403 }
      );
    }

    const members = await prisma.familyMember.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        fullNameAr: true,
        fullNameEn: true,
        generation: true,
        branch: true,
        fatherId: true,
        father: {
          select: {
            id: true,
            firstName: true,
            fullNameAr: true,
          }
        }
      },
      orderBy: [
        { fullNameAr: 'asc' },
        { generation: 'asc' }
      ]
    }) as MemberWithFather[];

    const resolvedFlags = await prisma.duplicateFlag.findMany({
      where: {
        status: 'VERIFIED_DIFFERENT',
      },
      select: {
        sourceMemberId: true,
        targetMemberId: true,
      }
    });

    const verifiedPairs = new Set<string>();
    resolvedFlags.forEach(flag => {
      verifiedPairs.add(`${flag.sourceMemberId}:${flag.targetMemberId}`);
      verifiedPairs.add(`${flag.targetMemberId}:${flag.sourceMemberId}`);
    });

    const nameGroups = new Map<string, MemberWithFather[]>();
    
    for (const member of members) {
      const nameKey = (member.fullNameAr || member.firstName).trim().toLowerCase();
      if (!nameGroups.has(nameKey)) {
        nameGroups.set(nameKey, []);
      }
      nameGroups.get(nameKey)!.push(member);
    }

    const duplicateGroups: DuplicateGroup[] = [];
    
    for (const [nameKey, groupMembers] of nameGroups) {
      if (groupMembers.length < 2) continue;
      
      const issues: DuplicateGroup['issues'] = [];
      let hasPotentialIssue = false;
      
      const fatherIds = new Set<string>();
      const generations = new Set<number>();
      
      for (const member of groupMembers) {
        if (member.fatherId) {
          fatherIds.add(member.fatherId);
        }
        generations.add(member.generation);
      }
      
      if (fatherIds.size > 1) {
        let allVerified = true;
        for (let i = 0; i < groupMembers.length; i++) {
          for (let j = i + 1; j < groupMembers.length; j++) {
            const pairKey = `${groupMembers[i].id}:${groupMembers[j].id}`;
            if (!verifiedPairs.has(pairKey)) {
              allVerified = false;
              break;
            }
          }
          if (!allVerified) break;
        }
        
        if (!allVerified) {
          hasPotentialIssue = true;
          issues.push({
            type: 'different_fathers',
            severity: 'error',
            description: `Members have ${fatherIds.size} different fathers`,
            descriptionAr: `الأعضاء لديهم ${fatherIds.size} آباء مختلفين`
          });
        }
      }
      
      const genArray = Array.from(generations);
      const maxGen = Math.max(...genArray);
      const minGen = Math.min(...genArray);
      const genGap = maxGen - minGen;
      
      if (genGap >= 2) {
        let allVerified = true;
        for (let i = 0; i < groupMembers.length; i++) {
          for (let j = i + 1; j < groupMembers.length; j++) {
            if (Math.abs(groupMembers[i].generation - groupMembers[j].generation) >= 2) {
              const pairKey = `${groupMembers[i].id}:${groupMembers[j].id}`;
              if (!verifiedPairs.has(pairKey)) {
                allVerified = false;
                break;
              }
            }
          }
          if (!allVerified) break;
        }
        
        if (!allVerified) {
          hasPotentialIssue = true;
          issues.push({
            type: 'generation_gap',
            severity: 'warning',
            description: `Generation gap of ${genGap} (Gen ${minGen} to ${maxGen})`,
            descriptionAr: `فجوة أجيال ${genGap} (الجيل ${minGen} إلى ${maxGen})`
          });
        }
      }
      
      if (hasPotentialIssue && issues.length > 0) {
        duplicateGroups.push({
          fullName: groupMembers[0].fullNameAr || groupMembers[0].firstName,
          members: groupMembers.map(m => ({
            id: m.id,
            firstName: m.firstName,
            fullNameAr: m.fullNameAr,
            fullNameEn: m.fullNameEn,
            generation: m.generation,
            branch: m.branch,
            fatherId: m.fatherId,
            fatherName: m.father?.fullNameAr || m.father?.firstName || null
          })),
          issues
        });
      }
    }

    const summary = {
      totalGroups: duplicateGroups.length,
      totalMembers: duplicateGroups.reduce((sum, g) => sum + g.members.length, 0),
      differentFathersCount: duplicateGroups.filter(g => g.issues.some(i => i.type === 'different_fathers')).length,
      generationGapCount: duplicateGroups.filter(g => g.issues.some(i => i.type === 'generation_gap')).length,
      verifiedPairsCount: resolvedFlags.length
    };

    return NextResponse.json({
      success: true,
      summary,
      groups: duplicateGroups
    });

  } catch (error) {
    console.error('Data cleanup scan error:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في فحص البيانات' },
      { status: 500 }
    );
  }
}
