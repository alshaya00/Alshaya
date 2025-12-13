import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getMemberById, getChildren, familyMembers, updateMemberInMemory, deleteMemberFromMemory, FamilyMember } from '@/lib/data';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { findSessionByToken, findUserById } from '@/lib/auth/store';
import { getPermissionsForRole } from '@/lib/auth/permissions';

// Helper to get authenticated user from request
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

// Helper to record change history
async function recordChangeHistory(
  memberId: string,
  oldMember: FamilyMember,
  newData: Partial<FamilyMember>,
  changedBy: string = 'system',
  changedByName: string = 'النظام'
): Promise<void> {
  const batchId = randomUUID();
  const changedFields: { field: string; oldValue: string | null; newValue: string | null }[] = [];

  // Detect changed fields
  const fieldsToTrack: (keyof FamilyMember)[] = [
    'firstName', 'fatherName', 'grandfatherName', 'greatGrandfatherName',
    'familyName', 'fatherId', 'gender', 'birthYear', 'deathYear',
    'generation', 'branch', 'fullNameAr', 'fullNameEn', 'phone',
    'city', 'status', 'photoUrl', 'biography', 'occupation', 'email'
  ];

  for (const field of fieldsToTrack) {
    const oldValue = oldMember[field];
    const newValue = newData[field];

    // Only record if the field is in newData and the value changed
    if (newValue !== undefined && String(oldValue || '') !== String(newValue || '')) {
      changedFields.push({
        field,
        oldValue: oldValue !== null && oldValue !== undefined ? String(oldValue) : null,
        newValue: newValue !== null && newValue !== undefined ? String(newValue) : null,
      });
    }
  }

  // Record each field change
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

// GET /api/members/[id] - Get single member with children
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // SECURITY: Require authentication
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

    const member = getMemberById(params.id);

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Member not found' },
        { status: 404 }
      );
    }

    const children = getChildren(member.id);

    return NextResponse.json({
      success: true,
      data: {
        ...member,
        children,
      }
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { endpoint: 'members/[id]', operation: 'get' },
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch member' },
      { status: 500 }
    );
  }
}

// PUT /api/members/[id] - Update a member
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // SECURITY: Require authentication and edit permission
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

    const member = getMemberById(params.id);

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Member not found' },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Validate gender if provided
    if (body.gender && !['Male', 'Female'].includes(body.gender)) {
      return NextResponse.json(
        { success: false, error: 'Invalid gender value' },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (body.status && !['Living', 'Deceased'].includes(body.status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status value' },
        { status: 400 }
      );
    }

    // Validate fatherId doesn't create cycle
    if (body.fatherId) {
      const isDescendant = checkIsDescendant(body.fatherId, params.id);
      if (isDescendant) {
        return NextResponse.json(
          { success: false, error: 'Cannot set a descendant as parent (would create cycle)' },
          { status: 400 }
        );
      }

      // Validate father exists
      const father = getMemberById(body.fatherId);
      if (!father) {
        return NextResponse.json(
          { success: false, error: 'Father not found' },
          { status: 400 }
        );
      }

      // Validate father is male
      if (father.gender !== 'Male') {
        return NextResponse.json(
          { success: false, error: 'Father must be male' },
          { status: 400 }
        );
      }
    }

    // Create updated member data
    const updateData = {
      firstName: body.firstName,
      fatherName: body.fatherName,
      grandfatherName: body.grandfatherName,
      greatGrandfatherName: body.greatGrandfatherName,
      familyName: body.familyName,
      fatherId: body.fatherId,
      gender: body.gender,
      birthYear: body.birthYear,
      deathYear: body.deathYear,
      generation: body.generation,
      branch: body.branch,
      lineage: body.lineage,
      fullNameAr: body.fullNameAr,
      fullNameEn: body.fullNameEn,
      phone: body.phone,
      city: body.city,
      status: body.status,
      photoUrl: body.photoUrl,
      biography: body.biography,
      occupation: body.occupation,
      email: body.email,
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    });

    // Store original member data for change tracking
    const originalMember = { ...member };

    // Try to persist to database
    let updatedMember;
    try {
      updatedMember = await prisma.familyMember.update({
        where: { id: params.id },
        data: updateData
      });
    } catch (dbError) {
      // Fallback to in-memory update if database fails
      console.log('Database update failed, using in-memory fallback:', dbError);
      Sentry.captureException(dbError, {
        tags: { endpoint: 'members/[id]', operation: 'update', type: 'database_fallback' },
      });
      updatedMember = updateMemberInMemory(params.id, updateData);
      if (!updatedMember) {
        return NextResponse.json(
          { success: false, error: 'Failed to update member' },
          { status: 500 }
        );
      }
    }

    // Record change history (non-blocking)
    recordChangeHistory(
      params.id,
      originalMember,
      updateData,
      body.changedBy || 'system',
      body.changedByName || 'النظام'
    ).catch(err => console.log('Change history recording failed:', err));

    return NextResponse.json({
      success: true,
      data: updatedMember,
      message: 'Member updated successfully'
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { endpoint: 'members/[id]', operation: 'update' },
    });
    return NextResponse.json(
      { success: false, error: 'Failed to update member' },
      { status: 500 }
    );
  }
}

// DELETE /api/members/[id] - Delete a member
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // SECURITY: Require authentication and delete permission
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

    const member = getMemberById(params.id);

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Member not found' },
        { status: 404 }
      );
    }

    // Check if member has children
    const children = getChildren(params.id);
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

    // Try to delete from database
    try {
      await prisma.familyMember.delete({ where: { id: params.id } });
    } catch (dbError) {
      // Fallback to in-memory delete if database fails
      console.log('Database delete failed, using in-memory fallback:', dbError);
      Sentry.captureException(dbError, {
        tags: { endpoint: 'members/[id]', operation: 'delete', type: 'database_fallback' },
      });
      const deleted = deleteMemberFromMemory(params.id);
      if (!deleted) {
        return NextResponse.json(
          { success: false, error: 'Failed to delete member' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Member deleted successfully'
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { endpoint: 'members/[id]', operation: 'delete' },
    });
    return NextResponse.json(
      { success: false, error: 'Failed to delete member' },
      { status: 500 }
    );
  }
}

// Helper function to check if a member is a descendant
function checkIsDescendant(potentialDescendantId: string, ancestorId: string): boolean {
  const descendants = new Set<string>();
  const queue = [ancestorId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = familyMembers.filter(m => m.fatherId === currentId);

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
