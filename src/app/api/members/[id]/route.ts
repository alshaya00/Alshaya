import { NextRequest, NextResponse } from 'next/server';
import { getMemberById, getChildren, familyMembers } from '@/lib/data';

// GET /api/members/[id] - Get single member with children
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    // Create updated member
    const updatedMember = {
      ...member,
      ...body,
      id: params.id, // Prevent ID change
    };

    // In real implementation with Prisma:
    // const result = await prisma.familyMember.update({
    //   where: { id: params.id },
    //   data: updatedMember
    // });

    return NextResponse.json({
      success: true,
      data: updatedMember,
      message: 'Member updated successfully'
    });
  } catch (error) {
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

    // In real implementation with Prisma:
    // await prisma.familyMember.delete({ where: { id: params.id } });

    return NextResponse.json({
      success: true,
      message: 'Member deleted successfully'
    });
  } catch (error) {
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
