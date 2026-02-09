import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeMemberId } from '@/lib/utils';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import crypto from 'crypto';

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
    const branch = searchParams.get('branch') || '';
    const generation = searchParams.get('generation') || '';
    const status = searchParams.get('status') || '';
    const filter = searchParams.get('filter') || 'unlinked';

    const linkedMemberIds = await prisma.user.findMany({
      where: { linkedMemberId: { not: null } },
      select: { linkedMemberId: true },
    });
    const linkedMemberIdSet = new Set(linkedMemberIds.map(u => u.linkedMemberId));

    const whereClause: Record<string, unknown> = {
      deletedAt: null,
    };

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { fullNameAr: { contains: search, mode: 'insensitive' } },
        { fullNameEn: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (branch) {
      whereClause.lineageBranchName = branch;
    }

    if (generation) {
      whereClause.generation = parseInt(generation, 10);
    }

    if (status) {
      whereClause.status = status;
    }

    const allMembers = await prisma.familyMember.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        fatherName: true,
        grandfatherName: true,
        fullNameAr: true,
        fullNameEn: true,
        gender: true,
        generation: true,
        branch: true,
        lineageBranchName: true,
        phone: true,
        email: true,
        status: true,
        city: true,
        photoUrl: true,
      },
      orderBy: [
        { generation: 'asc' },
        { firstName: 'asc' },
      ],
    });

    const membersWithLinkStatus = allMembers.map(member => ({
      ...member,
      isLinked: linkedMemberIdSet.has(member.id),
    }));

    let filteredMembers = membersWithLinkStatus;
    if (filter === 'unlinked') {
      filteredMembers = membersWithLinkStatus.filter(m => !m.isLinked);
    } else if (filter === 'linked') {
      filteredMembers = membersWithLinkStatus.filter(m => m.isLinked);
    }

    // Stats should reflect GLOBAL totals (not filtered results) for consistency
    // Get global counts regardless of current filters
    const globalTotalCount = await prisma.familyMember.count({
      where: { deletedAt: null }
    });
    
    const globalLinkedCount = linkedMemberIdSet.size;
    const globalUnlinkedCount = globalTotalCount - globalLinkedCount;
    
    // Global contact info counts (for unlinked members only)
    const globalWithContactInfo = await prisma.familyMember.count({
      where: {
        deletedAt: null,
        id: { notIn: Array.from(linkedMemberIdSet) as string[] },
        OR: [
          { phone: { not: null } },
          { email: { not: null } }
        ]
      }
    });
    
    // Current filtered results count
    const filteredCount = filteredMembers.length;
    const filteredWithPhone = filteredMembers.filter(m => m.phone).length;
    const filteredWithEmail = filteredMembers.filter(m => m.email).length;

    const branches = await prisma.familyMember.findMany({
      where: { deletedAt: null, lineageBranchName: { not: null } },
      select: { lineageBranchName: true },
      distinct: ['lineageBranchName'],
      orderBy: { lineageBranchName: 'asc' },
    });

    const generations = await prisma.familyMember.findMany({
      where: { deletedAt: null },
      select: { generation: true },
      distinct: ['generation'],
      orderBy: { generation: 'asc' },
    });

    return NextResponse.json({
      success: true,
      members: filteredMembers,
      stats: {
        // Global stats (always consistent regardless of filters)
        total: globalTotalCount,
        linked: globalLinkedCount,
        unlinked: globalUnlinkedCount,
        withContact: globalWithContactInfo, // Unlinked members with phone/email
        // Filtered results stats
        filtered: filteredCount,
        filteredWithPhone: filteredWithPhone,
        filteredWithEmail: filteredWithEmail,
      },
      filters: {
        branches: branches.map(b => b.lineageBranchName).filter(Boolean),
        generations: generations.map(g => g.generation).filter(g => g !== null).sort((a, b) => (a ?? 0) - (b ?? 0)),
      },
    });
  } catch (error) {
    console.error('Error fetching unlinked members:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch members', messageAr: 'فشل في جلب الأعضاء' },
      { status: 500 }
    );
  }
}

function generateInvitationCode(): string {
  return crypto.randomBytes(6).toString('hex').toUpperCase();
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

    const permissions = getPermissionsForRole(user.role);
    if (!permissions.invite_users && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const body = await request.json();
    if (body.memberId) body.memberId = normalizeMemberId(body.memberId) || body.memberId;
    const { memberId, sendVia } = body;

    if (!memberId) {
      return NextResponse.json(
        { success: false, message: 'Member ID required', messageAr: 'معرف العضو مطلوب' },
        { status: 400 }
      );
    }

    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        firstName: true,
        fullNameAr: true,
        phone: true,
        email: true,
      },
    });

    if (!member) {
      return NextResponse.json(
        { success: false, message: 'Member not found', messageAr: 'العضو غير موجود' },
        { status: 404 }
      );
    }

    if (sendVia === 'phone' && !member.phone) {
      return NextResponse.json(
        { success: false, message: 'Member has no phone', messageAr: 'العضو ليس لديه رقم هاتف' },
        { status: 400 }
      );
    }

    if (sendVia === 'email' && !member.email) {
      return NextResponse.json(
        { success: false, message: 'Member has no email', messageAr: 'العضو ليس لديه بريد إلكتروني' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: { linkedMemberId: memberId },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Member already linked', messageAr: 'العضو مرتبط بالفعل بحساب' },
        { status: 400 }
      );
    }

    const expirationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    let attempts = 0;
    const maxAttempts = 3;
    let invitation = null;

    while (attempts < maxAttempts) {
      try {
        const code = generateInvitationCode();
        
        invitation = await prisma.invitationCode.create({
          data: {
            code,
            linkedMemberId: memberId,
            linkedMemberName: member.fullNameAr || member.firstName,
            maxUses: 1,
            expiresAt: expirationDate,
            createdById: user.id,
            createdByName: user.nameArabic || user.nameEnglish || user.email,
            note: `دعوة مرسلة عبر ${sendVia === 'phone' ? 'الجوال' : 'البريد الإلكتروني'}`,
            status: 'ACTIVE',
          },
        });
        break;
      } catch (error: unknown) {
        const prismaError = error as { code?: string };
        if (prismaError.code === 'P2002') {
          attempts++;
          if (attempts >= maxAttempts) {
            throw new Error('Failed to generate unique invitation code after multiple attempts');
          }
          continue;
        }
        throw error;
      }
    }

    if (!invitation) {
      return NextResponse.json(
        { success: false, message: 'Failed to create invitation', messageAr: 'فشل في إنشاء الدعوة' },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://alshaya-family.replit.app';
    const inviteLink = `${baseUrl}/register?code=${invitation.code}`;

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        code: invitation.code,
        link: inviteLink,
        expiresAt: invitation.expiresAt,
      },
      member: {
        id: member.id,
        name: member.fullNameAr || member.firstName,
        phone: member.phone,
        email: member.email,
      },
      message: 'Invitation created successfully',
      messageAr: 'تم إنشاء رمز الدعوة بنجاح',
    });
  } catch (error) {
    console.error('Error creating invitation for unlinked member:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create invitation', messageAr: 'فشل في إنشاء الدعوة' },
      { status: 500 }
    );
  }
}
