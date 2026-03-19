import { NextRequest } from 'next/server';
import type { FamilyMember } from '@/lib/types';
import { prisma } from '@/lib/prisma';
import { getMemberByIdFromDb, getChildrenFromDb, getAllMembersFromDb, updateMemberInDb, deleteMemberFromDb } from '@/lib/db';
import { randomUUID } from 'crypto';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { logAuditToDb } from '@/lib/db-audit';
import { generateFullNamesFromLineage, getAncestorNamesFromLineage } from '@/lib/member-registry';
import { isMale, normalizeMemberId, getMemberIdVariants } from '@/lib/utils';
import { normalizeCityWithCorrection } from '@/lib/matching/arabic-utils';
import { getAuthUser } from '@/lib/api-auth';
import { apiSuccess, apiError, apiNotFound, apiForbidden, apiServerError } from '@/lib/api-response';
export const dynamic = "force-dynamic";

async function recordChangeHistory(
  memberId: string,
  oldMember: FamilyMember,
  newData: Partial<FamilyMember>,
  changedBy: string = 'system',
  changedByName: string = 'النظام',
  existingBatchId?: string
): Promise<string> {
  const batchId = existingBatchId || randomUUID();
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

  return batchId;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error: authError } = await getAuthUser(request);
    if (authError) return authError;

    const permissions = getPermissionsForRole(user!.role);
    if (!permissions.view_member_profiles) {
      return apiForbidden('No permission to view members', 'لا تملك صلاحية عرض الأعضاء');
    }

    const idVariants = getMemberIdVariants(params.id);
    let member: FamilyMember | null = null;
    for (const variant of idVariants) {
      member = await getMemberByIdFromDb(variant);
      if (member) break;
    }

    if (!member) {
      return apiNotFound('Member not found', 'العضو غير موجود');
    }

    const children = await getChildrenFromDb(member.id);

    return apiSuccess({
      ...member,
      children,
    });
  } catch (error) {
    return apiServerError(error);
  }
}

async function handleUpdate(
  request: NextRequest,
  params: { id: string }
) {
  try {
    const { user, error: authError } = await getAuthUser(request);
    if (authError) return authError;

    const permissions = getPermissionsForRole(user!.role);
    if (!permissions.edit_member) {
      return apiForbidden('No permission to edit members', 'لا تملك صلاحية تعديل الأعضاء');
    }

    const idVariants = getMemberIdVariants(params.id);
    let member: FamilyMember | null = null;
    for (const variant of idVariants) {
      member = await getMemberByIdFromDb(variant);
      if (member) break;
    }

    if (!member) {
      return apiNotFound('Member not found', 'العضو غير موجود');
    }

    const id = member.id;
    const body = await request.json();

    if (body.gender && !['Male', 'Female'].includes(body.gender)) {
      return apiError('Invalid gender value', 'قيمة الجنس غير صالحة', 400);
    }

    if (body.status && !['Living', 'Deceased'].includes(body.status)) {
      return apiError('Invalid status value', 'قيمة الحالة غير صالحة', 400);
    }

    if (body.fatherId) {
      const fatherVariants = getMemberIdVariants(body.fatherId);
      let resolvedFatherId = body.fatherId;
      let father = null;
      for (const variant of fatherVariants) {
        father = await getMemberByIdFromDb(variant);
        if (father) {
          resolvedFatherId = variant;
          break;
        }
      }
      body.fatherId = resolvedFatherId;
      const isDescendant = await checkIsDescendant(body.fatherId, id);
      if (isDescendant) {
        return apiError('Cannot set a descendant as parent (would create cycle)', 'لا يمكن تعيين أحد الأحفاد كأب (سيؤدي إلى حلقة)', 400);
      }
      if (!father) {
        return apiError('Father not found', 'الأب غير موجود', 400);
      }
      if (!isMale(father.gender)) {
        return apiError('Father must be male', 'يجب أن يكون الوالد ذكراً', 400);
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

        const ancestorNames = await getAncestorNamesFromLineage(newFatherId);
        updateData.fatherName = ancestorNames.fatherName;
        updateData.grandfatherName = ancestorNames.grandfatherName;
        updateData.greatGrandfatherName = ancestorNames.greatGrandfatherName;
      } catch (nameError) {
        console.error('Failed to regenerate full names:', nameError);
      }
    }

    const originalMember = { ...member };

    const updatedMember = await updateMemberInDb(id, updateData);
    
    if (!updatedMember) {
      return apiError('Failed to update member', 'فشل في تحديث بيانات العضو', 500);
    }

    let batchId: string | undefined;
    try {
      batchId = await recordChangeHistory(
        id,
        originalMember,
        updateData,
        body.changedBy || 'system',
        body.changedByName || 'النظام'
      );
    } catch (err) {
      console.log('Change history recording failed:', err);
    }

    let cascadedCount = 0;
    const firstNameChanged = updateData.firstName !== undefined && updateData.firstName !== member.firstName;
    if (firstNameChanged && batchId) {
      try {
        cascadedCount = await cascadeNameChangesToDescendants(
          id,
          batchId,
          body.changedBy || 'system',
          body.changedByName || 'النظام'
        );
      } catch (cascadeError) {
        console.error('Failed to cascade name changes:', cascadeError);
      }
    }

    try {
      await logAuditToDb({
        action: 'MEMBER_UPDATE',
        severity: 'INFO',
        userId: user!.id,
        userName: user!.email,
        userRole: user!.role,
        targetType: 'MEMBER',
        targetId: id,
        targetName: updatedMember.fullNameAr || updatedMember.firstName,
        description: `تم تحديث بيانات العضو: ${updatedMember.firstName}${cascadedCount > 0 ? ` (تم تحديث ${cascadedCount} من الأبناء والأحفاد)` : ''}`,
        previousState: originalMember as unknown as Record<string, unknown>,
        newState: updatedMember as unknown as Record<string, unknown>,
        success: true,
      });
    } catch (auditError) {
      console.error('Audit logging failed:', auditError);
    }

    return apiSuccess({
      ...updatedMember,
      cascadedCount,
      batchId,
    });
  } catch (error) {
    return apiServerError(error);
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
    const { user, error: authError } = await getAuthUser(request);
    if (authError) return authError;

    const permissions = getPermissionsForRole(user!.role);
    if (!permissions.delete_member) {
      return apiForbidden('No permission to delete members', 'لا تملك صلاحية حذف الأعضاء');
    }

    const idVariants = getMemberIdVariants(params.id);
    let member: FamilyMember | null = null;
    for (const variant of idVariants) {
      member = await getMemberByIdFromDb(variant);
      if (member) break;
    }

    if (!member) {
      return apiNotFound('Member not found', 'العضو غير موجود');
    }

    const id = member.id;
    const children = await getChildrenFromDb(member.id);
    if (children.length > 0) {
      return apiError(
        'Cannot delete member with children. Please reassign or delete children first.',
        'لا يمكن حذف عضو لديه أبناء. يرجى إعادة تعيين أو حذف الأبناء أولاً.',
        400
      );
    }

    const deleted = await deleteMemberFromDb(id);
    if (!deleted) {
      return apiError('Failed to delete member', 'فشل في حذف العضو', 500);
    }

    try {
      await logAuditToDb({
        action: 'MEMBER_DELETE',
        severity: 'WARNING',
        userId: user!.id,
        userName: user!.email,
        userRole: user!.role,
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

    return apiSuccess({ message: 'Member deleted successfully' });
  } catch (error) {
    return apiServerError(error);
  }
}

async function cascadeNameChangesToDescendants(
  parentId: string,
  batchId: string,
  changedBy: string,
  changedByName: string
): Promise<number> {
  let totalUpdated = 0;
  const memberIdVariants = getMemberIdVariants(parentId);

  const children = await prisma.familyMember.findMany({
    where: {
      fatherId: { in: memberIdVariants },
      deletedAt: null,
    },
  });

  for (const child of children) {
    const oldChild = { ...child } as unknown as FamilyMember;

    const ancestorNames = await getAncestorNamesFromLineage(child.fatherId);
    const fullNames = await generateFullNamesFromLineage(child.id, {
      firstName: child.firstName,
      gender: child.gender as 'Male' | 'Female',
      fatherId: child.fatherId,
    });

    const childUpdateData: Record<string, unknown> = {
      fatherName: ancestorNames.fatherName,
      grandfatherName: ancestorNames.grandfatherName,
      greatGrandfatherName: ancestorNames.greatGrandfatherName,
      fullNameAr: fullNames.fullNameAr,
      fullNameEn: fullNames.fullNameEn,
    };

    await prisma.familyMember.update({
      where: { id: child.id },
      data: {
        ...childUpdateData,
        version: { increment: 1 },
      },
    });

    await recordChangeHistory(
      child.id,
      oldChild,
      childUpdateData as Partial<FamilyMember>,
      changedBy,
      changedByName,
      batchId
    );

    totalUpdated++;

    const descendantCount = await cascadeNameChangesToDescendants(
      child.id,
      batchId,
      changedBy,
      changedByName
    );
    totalUpdated += descendantCount;
  }

  return totalUpdated;
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
