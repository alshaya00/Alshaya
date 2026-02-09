import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMemberByIdFromDb } from '@/lib/db';
import { isMale, isFemale } from '@/lib/utils';
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const relationships = await prisma.breastfeedingRelationship.findMany({
      include: {
        child: true,
        nurse: true,
        milkFather: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: relationships,
    });
  } catch (error) {
    console.error('Failed to fetch breastfeeding relationships:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch breastfeeding relationships' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      childId,
      nurseId,
      externalNurseName,
      milkFatherId,
      externalMilkFatherName,
      notes,
      breastfeedingYear,
    } = body;

    if (!childId) {
      return NextResponse.json(
        { success: false, error: 'childId is required' },
        { status: 400 }
      );
    }

    if (!nurseId && !externalNurseName) {
      return NextResponse.json(
        { success: false, error: 'Either nurseId or externalNurseName is required' },
        { status: 400 }
      );
    }

    const child = await getMemberByIdFromDb(childId);
    if (!child) {
      return NextResponse.json(
        { success: false, error: 'Child member not found' },
        { status: 404 }
      );
    }

    if (nurseId) {
      const nurse = await getMemberByIdFromDb(nurseId);
      if (!nurse) {
        return NextResponse.json(
          { success: false, error: 'Nurse member not found' },
          { status: 404 }
        );
      }
      if (!isFemale(nurse.gender)) {
        return NextResponse.json(
          { success: false, error: 'Nurse (milk mother) should be female' },
          { status: 400 }
        );
      }
    }

    if (milkFatherId) {
      const milkFather = await getMemberByIdFromDb(milkFatherId);
      if (!milkFather) {
        return NextResponse.json(
          { success: false, error: 'Milk father member not found' },
          { status: 404 }
        );
      }
      if (!isMale(milkFather.gender)) {
        return NextResponse.json(
          { success: false, error: 'Milk father should be male' },
          { status: 400 }
        );
      }
    }

    const existingRelationship = await prisma.breastfeedingRelationship.findFirst({
      where: {
        childId,
        OR: [
          { nurseId: nurseId || undefined },
          { externalNurseName: externalNurseName || undefined },
        ],
      },
    });

    if (existingRelationship) {
      return NextResponse.json(
        { success: false, error: 'This breastfeeding relationship already exists' },
        { status: 400 }
      );
    }

    const relationship = await prisma.breastfeedingRelationship.create({
      data: {
        childId,
        nurseId: nurseId || null,
        externalNurseName: externalNurseName || null,
        milkFatherId: milkFatherId || null,
        externalMilkFatherName: externalMilkFatherName || null,
        notes: notes || null,
        breastfeedingYear: breastfeedingYear || null,
      },
      include: {
        child: true,
        nurse: true,
        milkFather: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: relationship,
      message: 'Breastfeeding relationship created successfully',
    });
  } catch (error) {
    console.error('Failed to create breastfeeding relationship:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create breastfeeding relationship' },
      { status: 500 }
    );
  }
}
