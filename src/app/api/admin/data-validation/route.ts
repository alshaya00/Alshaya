import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { 
  validateMemberData, 
  getSuggestedCorrection, 
  normalizeToGregorian,
  ValidationIssue 
} from '@/lib/utils/calendar-utils';

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

export interface MemberValidationResult {
  id: string;
  firstName: string;
  fullNameAr: string;
  generation: number;
  birthYear: number | null;
  birthCalendar: string;
  deathYear: number | null;
  deathCalendar: string | null;
  gender: string;
  issues: ValidationIssue[];
  suggestedFix: {
    suggestedYear: number;
    suggestedCalendar: string;
    explanation: string;
    explanationAr: string;
  } | null;
  calculatedAge: number | null;
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin user
    const user = await getAuthAdmin(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Admin access required', messageAr: 'يتطلب صلاحيات المدير' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const fix = searchParams.get('fix') === 'true';
    const memberId = searchParams.get('id');

    // Get all members or specific member
    const members = await prisma.familyMember.findMany({
      where: memberId ? { id: memberId } : undefined,
      orderBy: [
        { generation: 'asc' },
        { firstName: 'asc' }
      ]
    });

    const currentYear = new Date().getFullYear();
    const results: MemberValidationResult[] = [];
    
    for (const member of members) {
      const issues = validateMemberData({
        id: member.id,
        firstName: member.firstName,
        birthYear: member.birthYear,
        birthCalendar: member.birthCalendar || 'GREGORIAN',
        deathYear: member.deathYear,
        deathCalendar: member.deathCalendar || 'GREGORIAN',
        generation: member.generation,
        gender: member.gender
      });

      // Get suggested fix if there are issues
      let suggestedFix = null;
      if (member.birthYear && issues.some(i => i.severity === 'error')) {
        suggestedFix = getSuggestedCorrection(
          member.birthYear, 
          member.birthCalendar || 'GREGORIAN'
        );
      }

      // Calculate current age based on stored calendar type
      let calculatedAge: number | null = null;
      if (member.birthYear) {
        const gregorianBirth = normalizeToGregorian(
          member.birthYear, 
          member.birthCalendar || 'GREGORIAN'
        );
        if (gregorianBirth) {
          calculatedAge = currentYear - gregorianBirth;
        }
      }

      if (issues.length > 0 || type === 'all') {
        results.push({
          id: member.id,
          firstName: member.firstName,
          fullNameAr: member.fullNameAr || member.firstName,
          generation: member.generation,
          birthYear: member.birthYear,
          birthCalendar: member.birthCalendar || 'GREGORIAN',
          deathYear: member.deathYear,
          deathCalendar: member.deathCalendar || null,
          gender: member.gender,
          issues,
          suggestedFix,
          calculatedAge
        });
      }
    }

    // Filter by type if specified
    let filteredResults = results;
    if (type === 'errors') {
      filteredResults = results.filter(r => r.issues.some(i => i.severity === 'error'));
    } else if (type === 'warnings') {
      filteredResults = results.filter(r => r.issues.some(i => i.severity === 'warning'));
    } else if (type === 'age') {
      filteredResults = results.filter(r => 
        r.issues.some(i => i.field === 'birthYear' || i.field === 'generation')
      );
    }

    // Summary statistics
    const summary = {
      totalMembers: members.length,
      membersWithIssues: results.filter(r => r.issues.length > 0).length,
      totalErrors: results.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'error').length, 0),
      totalWarnings: results.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'warning').length, 0),
      fixableBirthYears: results.filter(r => r.suggestedFix !== null).length
    };

    return NextResponse.json({
      success: true,
      summary,
      results: type === 'all' ? filteredResults.filter(r => r.issues.length > 0) : filteredResults
    });

  } catch (error) {
    console.error('Data validation error:', error);
    return NextResponse.json(
      { success: false, error: 'فشل التحقق من البيانات' },
      { status: 500 }
    );
  }
}

// POST endpoint to fix detected issues
export async function POST(request: NextRequest) {
  try {
    // Authenticate admin user
    const user = await getAuthAdmin(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Admin access required', messageAr: 'يتطلب صلاحيات المدير' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { memberId, newBirthCalendar } = body;

    if (!memberId || !newBirthCalendar) {
      return NextResponse.json(
        { success: false, error: 'Missing memberId or newBirthCalendar' },
        { status: 400 }
      );
    }

    // Get current member data
    const member = await prisma.familyMember.findUnique({
      where: { id: memberId }
    });

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'العضو غير موجود' },
        { status: 404 }
      );
    }

    // Update the calendar type
    const updated = await prisma.familyMember.update({
      where: { id: memberId },
      data: { birthCalendar: newBirthCalendar }
    });

    // Log the change with admin username
    await prisma.auditLog.create({
      data: {
        action: 'CALENDAR_FIX',
        entityType: 'MEMBER',
        entityId: memberId,
        details: `Fixed birth calendar from ${member.birthCalendar || 'GREGORIAN'} to ${newBirthCalendar}`,
        performedBy: user.username || user.email || 'ADMIN',
        performedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: `تم تحديث نوع التقويم لـ ${member.firstName}`,
      updated: {
        id: updated.id,
        firstName: updated.firstName,
        birthYear: updated.birthYear,
        birthCalendar: updated.birthCalendar
      }
    });

  } catch (error) {
    console.error('Fix calendar error:', error);
    return NextResponse.json(
      { success: false, error: 'فشل تحديث التقويم' },
      { status: 500 }
    );
  }
}
