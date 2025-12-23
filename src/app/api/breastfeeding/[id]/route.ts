import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMemberByIdFromDb } from '@/lib/db';

// GET /api/breastfeeding/[id] - Get a single breastfeeding relationship
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const relationship = await prisma.breastfeedingRelationship.findUnique({
      where: { id: params.id },
      include: {
        child: true,
        nurse: true,
        milkFather: true,
      },
    });

    if (!relationship) {
      return NextResponse.json(
        { success: false, error: 'Breastfeeding relationship not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: relationship,
    });
  } catch (error) {
    console.error('Failed to fetch breastfeeding relationship:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch breastfeeding relationship' },
      { status: 500 }
    );
  }
}

// PUT /api/breastfeeding/[id] - Update a breastfeeding relationship
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existingRelationship = await prisma.breastfeedingRelationship.findUnique({
      where: { id: params.id },
    });

    if (!existingRelationship) {
      return NextResponse.json(
        { success: false, error: 'Breastfeeding relationship not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      nurseId,
      externalNurseName,
      milkFatherId,
      externalMilkFatherName,
      notes,
      breastfeedingYear,
    } = body;

    // Validate nurse exists if nurseId provided
    if (nurseId) {
      const nurse = await getMemberByIdFromDb(nurseId);
      if (!nurse) {
        return NextResponse.json(
          { success: false, error: 'Nurse member not found' },
          { status: 404 }
        );
      }
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

    const updatedRelationship = await prisma.breastfeedingRelationship.update({
      where: { id: params.id },
      data: {
        nurseId: nurseId !== undefined ? (nurseId || null) : existingRelationship.nurseId,
        externalNurseName: externalNurseName !== undefined ? (externalNurseName || null) : existingRelationship.externalNurseName,
        milkFatherId: milkFatherId !== undefined ? (milkFatherId || null) : existingRelationship.milkFatherId,
        externalMilkFatherName: externalMilkFatherName !== undefined ? (externalMilkFatherName || null) : existingRelationship.externalMilkFatherName,
        notes: notes !== undefined ? (notes || null) : existingRelationship.notes,
        breastfeedingYear: breastfeedingYear !== undefined ? (breastfeedingYear || null) : existingRelationship.breastfeedingYear,
      },
      include: {
        child: true,
        nurse: true,
        milkFather: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedRelationship,
      message: 'Breastfeeding relationship updated successfully',
    });
  } catch (error) {
    console.error('Failed to update breastfeeding relationship:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update breastfeeding relationship' },
      { status: 500 }
    );
  }
}

// DELETE /api/breastfeeding/[id] - Delete a breastfeeding relationship
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existingRelationship = await prisma.breastfeedingRelationship.findUnique({
      where: { id: params.id },
    });

    if (!existingRelationship) {
      return NextResponse.json(
        { success: false, error: 'Breastfeeding relationship not found' },
        { status: 404 }
      );
    }

    await prisma.breastfeedingRelationship.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Breastfeeding relationship deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete breastfeeding relationship:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete breastfeeding relationship' },
      { status: 500 }
    );
  }
}
