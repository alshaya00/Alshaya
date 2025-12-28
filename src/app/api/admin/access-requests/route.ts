import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { findPotentialDuplicates } from '@/lib/fuzzy-matcher';

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
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (status && ['PENDING', 'APPROVED', 'REJECTED', 'MORE_INFO'].includes(status)) {
      where.status = status;
    }

    const accessRequests = await prisma.accessRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const requestsWithMember = await Promise.all(
      accessRequests.map(async (req) => {
        let relatedMember = null;
        let parentMember = null;
        let duplicateWarning = null;
        
        if (req.relatedMemberId) {
          relatedMember = await prisma.familyMember.findUnique({
            where: { id: req.relatedMemberId },
            select: {
              id: true,
              firstName: true,
              fatherName: true,
              fullNameAr: true,
              fullNameEn: true,
              generation: true,
              branch: true,
            },
          });
        }
        
        if (req.parentMemberId) {
          parentMember = await prisma.familyMember.findUnique({
            where: { id: req.parentMemberId },
            select: {
              id: true,
              firstName: true,
              fatherName: true,
              fullNameAr: true,
              fullNameEn: true,
              generation: true,
              branch: true,
            },
          });
        }
        
        if (req.status === 'PENDING' && req.fullName) {
          try {
            const nameParts = req.fullName.split(' ');
            const firstName = nameParts[0] || '';
            const fatherName = nameParts[1] || '';
            
            const duplicateCheck = await findPotentialDuplicates({
              firstName,
              fatherName,
              fatherId: req.parentMemberId || undefined,
              gender: req.gender || undefined,
            }, {
              threshold: 70,
              limit: 3,
            });
            
            if (duplicateCheck.hasMatches) {
              duplicateWarning = {
                hasPotentialDuplicates: true,
                highestScore: duplicateCheck.highestScore,
                isDuplicate: duplicateCheck.isDuplicate,
                candidates: duplicateCheck.candidates.map(c => ({
                  id: c.member.id,
                  firstName: c.member.firstName,
                  fullNameAr: c.member.fullNameAr,
                  fullNameEn: c.member.fullNameEn,
                  similarityScore: c.similarityScore,
                  matchReasons: c.matchReasons,
                  matchReasonsAr: c.matchReasonsAr,
                })),
              };
            }
          } catch (err) {
            console.error('Error checking duplicates for access request:', err);
          }
        }
        
        return {
          ...req,
          relatedMember,
          parentMember,
          duplicateWarning,
        };
      })
    );

    return NextResponse.json({
      success: true,
      accessRequests: requestsWithMember,
      count: requestsWithMember.length,
    });
  } catch (error) {
    console.error('Error fetching access requests:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch access requests', messageAr: 'فشل في جلب طلبات الانضمام' },
      { status: 500 }
    );
  }
}
