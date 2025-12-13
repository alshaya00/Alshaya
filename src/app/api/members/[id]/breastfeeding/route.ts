import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMemberById, getChildren, getAllMembers } from '@/lib/data';
import { MilkFamily, MilkSibling } from '@/lib/types';

// GET /api/members/[id]/breastfeeding - Get breastfeeding relationships for a member
// Returns milk families with milk mother, milk father, and milk siblings
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const memberId = params.id;
    const member = getMemberById(memberId);

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Member not found' },
        { status: 404 }
      );
    }

    // Get all breastfeeding relationships where this member is the child
    const relationships = await prisma.breastfeedingRelationship.findMany({
      where: { childId: memberId },
      include: {
        child: true,
        nurse: true,
        milkFather: true,
      },
    });

    // Build milk families with milk siblings
    const milkFamilies: MilkFamily[] = [];

    for (const relationship of relationships) {
      // Get milk siblings (children of the nurse, excluding the current person)
      let milkSiblings: MilkSibling[] = [];

      if (relationship.nurseId) {
        // Get all children of the nurse from family tree
        const nurseChildren = getChildren(relationship.nurseId);

        milkSiblings = nurseChildren
          .filter(child => child.id !== memberId) // Exclude the current person
          .map(child => ({
            id: child.id,
            firstName: child.firstName,
            gender: child.gender as 'Male' | 'Female',
            fullNameAr: child.fullNameAr,
            relationshipType: 'milk_sibling' as const,
          }));

        // Also check if the nurse has breastfed other children (from breastfeeding records)
        const otherBreastfedChildren = await prisma.breastfeedingRelationship.findMany({
          where: {
            nurseId: relationship.nurseId,
            childId: { not: memberId },
          },
          include: {
            child: true,
          },
        });

        // Add these as milk siblings too (they're milk siblings through the same nurse)
        for (const record of otherBreastfedChildren) {
          if (record.child && !milkSiblings.find(s => s.id === record.childId)) {
            milkSiblings.push({
              id: record.child.id,
              firstName: record.child.firstName,
              gender: record.child.gender as 'Male' | 'Female',
              fullNameAr: record.child.fullNameAr,
              relationshipType: 'milk_sibling' as const,
            });
          }
        }
      }

      // Build the milk family object
      const milkFamily: MilkFamily = {
        relationship: {
          id: relationship.id,
          childId: relationship.childId,
          nurseId: relationship.nurseId,
          externalNurseName: relationship.externalNurseName,
          milkFatherId: relationship.milkFatherId,
          externalMilkFatherName: relationship.externalMilkFatherName,
          notes: relationship.notes,
          breastfeedingYear: relationship.breastfeedingYear,
          createdAt: relationship.createdAt,
          updatedAt: relationship.updatedAt,
          createdBy: relationship.createdBy,
        },
        milkMother: relationship.nurse
          ? {
              id: relationship.nurse.id,
              firstName: relationship.nurse.firstName,
              fatherName: relationship.nurse.fatherName,
              grandfatherName: relationship.nurse.grandfatherName,
              greatGrandfatherName: relationship.nurse.greatGrandfatherName,
              familyName: relationship.nurse.familyName,
              fatherId: relationship.nurse.fatherId,
              gender: relationship.nurse.gender as 'Male' | 'Female',
              birthYear: relationship.nurse.birthYear,
              sonsCount: relationship.nurse.sonsCount,
              daughtersCount: relationship.nurse.daughtersCount,
              generation: relationship.nurse.generation,
              branch: relationship.nurse.branch,
              fullNameAr: relationship.nurse.fullNameAr,
              fullNameEn: relationship.nurse.fullNameEn,
              phone: relationship.nurse.phone,
              city: relationship.nurse.city,
              status: relationship.nurse.status,
              photoUrl: relationship.nurse.photoUrl,
              biography: relationship.nurse.biography,
              occupation: relationship.nurse.occupation,
              email: relationship.nurse.email,
            }
          : relationship.externalNurseName
            ? { name: relationship.externalNurseName, isExternal: true as const }
            : null,
        milkFather: relationship.milkFather
          ? {
              id: relationship.milkFather.id,
              firstName: relationship.milkFather.firstName,
              fatherName: relationship.milkFather.fatherName,
              grandfatherName: relationship.milkFather.grandfatherName,
              greatGrandfatherName: relationship.milkFather.greatGrandfatherName,
              familyName: relationship.milkFather.familyName,
              fatherId: relationship.milkFather.fatherId,
              gender: relationship.milkFather.gender as 'Male' | 'Female',
              birthYear: relationship.milkFather.birthYear,
              sonsCount: relationship.milkFather.sonsCount,
              daughtersCount: relationship.milkFather.daughtersCount,
              generation: relationship.milkFather.generation,
              branch: relationship.milkFather.branch,
              fullNameAr: relationship.milkFather.fullNameAr,
              fullNameEn: relationship.milkFather.fullNameEn,
              phone: relationship.milkFather.phone,
              city: relationship.milkFather.city,
              status: relationship.milkFather.status,
              photoUrl: relationship.milkFather.photoUrl,
              biography: relationship.milkFather.biography,
              occupation: relationship.milkFather.occupation,
              email: relationship.milkFather.email,
            }
          : relationship.externalMilkFatherName
            ? { name: relationship.externalMilkFatherName, isExternal: true as const }
            : null,
        milkSiblings,
      };

      milkFamilies.push(milkFamily);
    }

    // Also get relationships where this member nursed others (if female)
    let nursedChildren: Array<{
      id: string;
      childId: string;
      child: {
        id: string;
        firstName: string;
        fullNameAr: string | null;
        gender: string;
      } | null;
    }> = [];

    if (member.gender === 'Female') {
      nursedChildren = await prisma.breastfeedingRelationship.findMany({
        where: { nurseId: memberId },
        include: {
          child: {
            select: {
              id: true,
              firstName: true,
              fullNameAr: true,
              gender: true,
            },
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        memberId,
        memberName: member.firstName,
        // Relationships where this person was breastfed (milk families)
        milkFamilies,
        // If this person is a nurse, who they breastfed
        nursedChildren: nursedChildren.map(nc => ({
          relationshipId: nc.id,
          child: nc.child,
        })),
      },
    });
  } catch (error) {
    console.error('Failed to fetch member breastfeeding relationships:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch breastfeeding relationships' },
      { status: 500 }
    );
  }
}
