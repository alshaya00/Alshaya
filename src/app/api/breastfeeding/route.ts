import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMemberByIdFromDb } from '@/lib/db';

// GET /api/breastfeeding - Get all breastfeeding relationships
export async function GET(request: NextRequest) {
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

// POST /api/breastfeeding - Create a new breastfeeding relationship
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

    // Validate required fields
    if (!childId) {
      return NextResponse.json(
        { success: false, error: 'childId is required' },
        { status: 400 }
      );
    }

    // Must have either nurseId or externalNurseName
    if (!nurseId && !externalNurseName) {
      return NextResponse.json(
        { success: false, error: 'Either nurseId or externalNurseName is required' },
        { status: 400 }
      );
    }

    // Validate child exists
    const child = await getMemberByIdFromDb(childId);
    if (!child) {
      return NextResponse.json(
        { success: false, error: 'Child member not found' },
        { status: 404 }
      );
    }

    // Validate nurse exists if nurseId provided
    if (nurseId) {
      const nurse = await getMemberByIdFromDb(nurseId);
      if (!nurse) {
        return NextResponse.json(
          { success: false, error: 'Nurse member not found' },
          { status: 404 }
        );
      }
      // Nurse should typically be female
      if (nurse.gender !== 'Female') {
        return NextResponse.json(
          { success: false, error: 'Nurse (milk mother) should be female' },
          { status: 400 }
        );
      }
    }

    // Validate milk father exists if milkFatherId provided
    if (milkFatherId) {
      const milkFather = await getMemberByIdFromDb(milkFatherId);
      if (!milkFather) {
        return NextResponse.json(
          { success: false, error: 'Milk father member not found' },
          { status: 404 }
        );
      }
      if (milkFather.gender !== 'Male') {
        return NextResponse.json(
          { success: false, error: 'Milk father should be male' },
          { status: 400 }
        );
      }
    }

    // Check for duplicate relationship
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

    // Create the relationship
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
