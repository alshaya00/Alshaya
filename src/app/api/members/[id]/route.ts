import { NextRequest, NextResponse } from 'next/server';
import type { FamilyMember } from '@/lib/types';
import { prisma } from '@/lib/prisma';
import { getMemberByIdFromDb, getChildrenFromDb, getAllMembersFromDb, updateMemberInDb, deleteMemberFromDb } from '@/lib/db';
import { randomUUID } from 'crypto';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { logAuditToDb } from '@/lib/db-audit';
import { generateFullNamesFromLineage } from '@/lib/member-registry';
import { isMale, normalizeMemberId } from '@/lib/utils';
import { normalizeCityWithCorrection } from '@/lib/matching/arabic-utils';
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

async function recordChangeHistory(
  memberId: string,
  oldMember: FamilyMember,
  newData: Partial<FamilyMember>,
  changedBy: string = 'system',
  changedByName: string = 'النظام'
): Promise<void> {
  const batchId = randomUUID();
  const changedFields: { field: string; oldValue: string | null; newValue: string | null }[] = [];

  const fieldsToTrack: (keyof FamilyMember)[] = [
    'firstName', 'fatherName', 'grandfatherName', 'greatGrandfatherName',
    'familyName', 'fatherId', 'gender', 'birthYear', 'deathYear',
    'generation', 'branch', 'fullNameAr', 'fullNameEn', 'phone',
    'city', 'status', 'photoUrl', 'biography', 'occupation', 'email'
  ];

  for (const field of fieldsToTrack) {
    const oldValue = oldMember[field];
    const newValue = newData[field];

    if (newValue !== undefined && String(oldValue || '') !== String(newValue || '')) {
      changedFields.push({
        field,
        oldValue: oldValue !== null && oldValue !== undefined ? String(oldValue) : null,
        newValue: newValue !== null && newValue !== undefined ? String(newValue) : null,
      });
    }
  }

  for (const change of changedFields) {
    try {
      await prisma.changeHistory.create({
        data: {
          memberId,
          fieldName: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
          changeType: 'UPDATE',
          changedBy,
          changedByName,
          batchId,
          fullSnapshot: JSON.stringify(oldMember),
        },
      });
    } catch (err) {
      console.log('Failed to record change history:', err);
    }
  }
}

export async function GET(
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

    const permissions = getPermissionsForRole(user.role);
    if (!permissions.view_member_profiles) {
      return NextResponse.json(
        { success: false, message: 'No permission to view members', messageAr: 'لا تملك صلاحية عرض الأعضاء' },
        { status: 403 }
      );
    }

    const id = normalizeMemberId(params.id) || params.id;
    const member = await getMemberByIdFromDb(id);

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Member not found' },
        { status: 404 }
      );
    }

    const children = await getChildrenFromDb(member.id);

    return NextResponse.json({
      success: true,
      data: {
        ...member,
        children,
      }
    });
  } catch (error) {
    console.error('Error fetching member:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch member' },
      { status: 500 }
    );
  }
}

async function handleUpdate(
  request: NextRequest,
  params: { id: string }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const permissions = getPermissionsForRole(user.role);
    if (!permissions.edit_member) {
      return NextResponse.json(
        { success: false, message: 'No permission to edit members', messageAr: 'لا تملك صلاحية تعديل الأعضاء' },
        { status: 403 }
      );
    }

    const id = normalizeMemberId(params.id) || params.id;
    const member = await getMemberByIdFromDb(id);

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Member not found' },
        { status: 404 }
      );
    }

    const body = await request.json();

    if (body.gender && !['Male', 'Female'].includes(body.gender)) {
      return NextResponse.json(
        { success: false, error: 'Invalid gender value' },
        { status: 400 }
      );
    }

    if (body.status && !['Living', 'Deceased'].includes(body.status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status value' },
        { status: 400 }
      );
    }

    if (body.fatherId) {
      const isDescendant = await checkIsDescendant(body.fatherId, id);
      if (isDescendant) {
        return NextResponse.json(
          { success: false, error: 'Cannot set a descendant as parent (would create cycle)' },
          { status: 400 }
        );
      }

      const father = await getMemberByIdFromDb(body.fatherId);
      if (!father) {
        return NextResponse.json(
          { success: false, error: 'Father not found' },
          { status: 400 }
        );
      }

      if (!isMale(father.gender)) {
        return NextResponse.json(
          { success: false, error: 'Father must be male', messageAr: 'يجب أن يكون الوالد ذكراً' },
          { status: 400 }
        );
      }
    }

    // Helper to convert numeric fields (empty strings become null)
    const toIntOrNull = (value: unknown): number | null => {
      if (value === null || value === undefined || value === '') return null;
      const num = typeof value === 'number' ? value : parseInt(String(value), 10);
      return isNaN(num) ? null : num;
    };

    const updateData: Record<string, unknown> = {
      firstName: body.firstName,
      fatherName: body.fatherName,
      grandfatherName: body.grandfatherName,
      greatGrandfatherName: body.greatGrandfatherName,
      familyName: body.familyName,
      fatherId: body.fatherId,
      gender: body.gender,
      birthYear: body.birthYear !== undefined ? toIntOrNull(body.birthYear) : undefined,
      deathYear: body.deathYear !== undefined ? toIntOrNull(body.deathYear) : undefined,
      generation: body.generation !== undefined ? toIntOrNull(body.generation) : undefined,
      branch: body.branch,
      fullNameAr: body.fullNameAr,
      fullNameEn: body.fullNameEn,
      phone: body.phone,
      city: body.city ? normalizeCityWithCorrection(body.city) : body.city,
      status: body.status,
      photoUrl: body.photoUrl,
      biography: body.biography,
      occupation: body.occupation,
      email: body.email,
    };

    // Remove undefined fields (fields not being updated)
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    // Auto-regenerate fullNameAr/fullNameEn when firstName, gender, or fatherId changes
    const nameAffectingFields = ['firstName', 'gender', 'fatherId'];
    const hasNameChanges = nameAffectingFields.some(field => 
      updateData[field] !== undefined && updateData[field] !== member[field as keyof typeof member]
    );
    
    if (hasNameChanges) {
      try {
        const newFirstName = (updateData.firstName as string) || member.firstName;
        const newGender = (updateData.gender as 'Male' | 'Female') || member.gender;
        const newFatherId = updateData.fatherId !== undefined ? (updateData.fatherId as string | null) : member.fatherId;
        
        const fullNames = await generateFullNamesFromLineage(id, {
          firstName: newFirstName,
          gender: newGender,
          fatherId: newFatherId,
        });
        
        updateData.fullNameAr = fullNames.fullNameAr;
        updateData.fullNameEn = fullNames.fullNameEn;
      } catch (nameError) {
        console.error('Failed to regenerate full names:', nameError);
      }
    }

    const originalMember = { ...member };

    const updatedMember = await updateMemberInDb(id, updateData);
    
    if (!updatedMember) {
      return NextResponse.json(
        { success: false, error: 'Failed to update member' },
        { status: 500 }
      );
    }

    recordChangeHistory(
      id,
      originalMember,
      updateData,
      body.changedBy || 'system',
      body.changedByName || 'النظام'
    ).catch(err => console.log('Change history recording failed:', err));

    try {
      await logAuditToDb({
        action: 'MEMBER_UPDATE',
        severity: 'INFO',
        userId: user.id,
        userName: user.email,
        userRole: user.role,
        targetType: 'MEMBER',
        targetId: id,
        targetName: updatedMember.fullNameAr || updatedMember.firstName,
        description: `تم تحديث بيانات العضو: ${updatedMember.firstName}`,
        previousState: originalMember as unknown as Record<string, unknown>,
        newState: updatedMember as unknown as Record<string, unknown>,
        success: true,
      });
    } catch (auditError) {
      console.error('Audit logging failed:', auditError);
    }

    return NextResponse.json({
      success: true,
      data: updatedMember,
      message: 'Member updated successfully'
    });
  } catch (error) {
    console.error('Error updating member:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update member';
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        message: errorMessage,
        messageAr: 'فشل في تحديث بيانات العضو'
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleUpdate(request, params);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleUpdate(request, params);
}

export async function DELETE(
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

    const permissions = getPermissionsForRole(user.role);
    if (!permissions.delete_member) {
      return NextResponse.json(
        { success: false, message: 'No permission to delete members', messageAr: 'لا تملك صلاحية حذف الأعضاء' },
        { status: 403 }
      );
    }

    const id = normalizeMemberId(params.id) || params.id;
    const member = await getMemberByIdFromDb(id);

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Member not found' },
        { status: 404 }
      );
    }

    const children = await getChildrenFromDb(id);
    if (children.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete member with children. Please reassign or delete children first.',
          childrenCount: children.length
        },
        { status: 400 }
      );
    }

    const deleted = await deleteMemberFromDb(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete member' },
        { status: 500 }
      );
    }

    try {
      await logAuditToDb({
        action: 'MEMBER_DELETE',
        severity: 'WARNING',
        userId: user.id,
        userName: user.email,
        userRole: user.role,
        targetType: 'MEMBER',
        targetId: id,
        targetName: member.fullNameAr || member.firstName,
        description: `تم حذف العضو: ${member.firstName}`,
        previousState: member as unknown as Record<string, unknown>,
        success: true,
      });
    } catch (auditError) {
      console.error('Audit logging failed:', auditError);
    }

    return NextResponse.json({
      success: true,
      message: 'Member deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting member:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete member' },
      { status: 500 }
    );
  }
}

async function checkIsDescendant(potentialDescendantId: string, ancestorId: string): Promise<boolean> {
  const allMembers = await getAllMembersFromDb();
  const descendants = new Set<string>();
  const queue = [ancestorId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = allMembers.filter(m => m.fatherId === currentId);

    for (const child of children) {
      if (child.id === potentialDescendantId) {
        return true;
      }
      descendants.add(child.id);
      queue.push(child.id);
    }
  }

  return false;
}
