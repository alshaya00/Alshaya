import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { calculateNameSimilarity, normalizeArabicName } from '@/lib/matching/arabic-utils';
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

interface SuggestedMember {
  id: string;
  firstName: string;
  fullNameAr: string | null;
  fullNameEn: string | null;
  fatherName: string | null;
  generation: number | null;
  branch: string | null;
  lineageBranchName: string | null;
  similarity: number;
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

    const permissions = getPermissionsForRole(user.role);
    if (!permissions.manage_users && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const includeSuggestions = searchParams.get('includeSuggestions') !== 'false';

    const whereClause: Record<string, unknown> = {
      linkedMemberId: null,
    };

    if (search) {
      whereClause.OR = [
        { nameArabic: { contains: search, mode: 'insensitive' } },
        { nameEnglish: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) {
        (whereClause.createdAt as Record<string, unknown>).gte = new Date(dateFrom);
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        (whereClause.createdAt as Record<string, unknown>).lte = toDate;
      }
    }

    const orderBy: Record<string, string> = {};
    if (sortBy === 'name') {
      orderBy.nameArabic = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    const orphanedUsers = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        nameArabic: true,
        nameEnglish: true,
        phone: true,
        phoneVerified: true,
        role: true,
        status: true,
        verificationStatus: true,
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy,
    });

    const totalUsers = await prisma.user.count();
    const orphanedCount = await prisma.user.count({
      where: { linkedMemberId: null },
    });
    const linkedCount = totalUsers - orphanedCount;

    let usersWithSuggestions = orphanedUsers.map(u => ({
      ...u,
      suggestedMembers: [] as SuggestedMember[],
    }));

    if (includeSuggestions && orphanedUsers.length > 0) {
      const allMembers = await prisma.familyMember.findMany({
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
          firstName: true,
          fullNameAr: true,
          fullNameEn: true,
          fatherName: true,
          generation: true,
          branch: true,
          lineageBranchName: true,
        },
      });

      const linkedMemberIds = await prisma.user.findMany({
        where: { linkedMemberId: { not: null } },
        select: { linkedMemberId: true },
      });
      const linkedMemberIdSet = new Set(linkedMemberIds.map(u => u.linkedMemberId));

      const availableMembers = allMembers.filter(m => !linkedMemberIdSet.has(m.id));

      usersWithSuggestions = orphanedUsers.map(orphanedUser => {
        const userName = orphanedUser.nameArabic || '';
        const normalizedUserName = normalizeArabicName(userName);

        if (!normalizedUserName) {
          return {
            ...orphanedUser,
            suggestedMembers: [],
          };
        }

        const userNameParts = normalizedUserName.split(' ').filter(Boolean);
        const userFirstName = userNameParts[0] || '';

        const memberMatches: SuggestedMember[] = [];

        for (const member of availableMembers) {
          const memberFirstName = member.firstName || '';
          const memberFullName = member.fullNameAr || memberFirstName;

          const firstNameSimilarity = calculateNameSimilarity(userFirstName, memberFirstName);
          const fullNameSimilarity = calculateNameSimilarity(userName, memberFullName);

          const bestSimilarity = Math.max(firstNameSimilarity, fullNameSimilarity);

          if (bestSimilarity >= 60) {
            memberMatches.push({
              id: member.id,
              firstName: member.firstName,
              fullNameAr: member.fullNameAr,
              fullNameEn: member.fullNameEn,
              fatherName: member.fatherName,
              generation: member.generation,
              branch: member.branch,
              lineageBranchName: member.lineageBranchName,
              similarity: bestSimilarity,
            });
          }
        }

        memberMatches.sort((a, b) => b.similarity - a.similarity);

        return {
          ...orphanedUser,
          suggestedMembers: memberMatches.slice(0, 5),
        };
      });
    }

    const percentage = totalUsers > 0 ? Math.round((orphanedCount / totalUsers) * 100) : 0;

    return NextResponse.json({
      success: true,
      users: usersWithSuggestions,
      stats: {
        total: totalUsers,
        orphaned: orphanedCount,
        linked: linkedCount,
        percentage,
      },
    });
  } catch (error) {
    console.error('Error fetching orphaned users:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch orphaned users', messageAr: 'فشل في جلب المستخدمين غير المرتبطين' },
      { status: 500 }
    );
  }
}
