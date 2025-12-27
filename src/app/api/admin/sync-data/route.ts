import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = getPermissionsForRole(user.role);
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const devCount = 424;
    const currentCount = await prisma.familyMember.count({ where: { deletedAt: null } });
    
    return NextResponse.json({
      status: 'info',
      message: 'Use POST to sync data',
      currentMembers: currentCount,
      expectedMembers: devCount,
      needsSync: currentCount < devCount,
      syncEndpoint: 'POST /api/admin/sync-data with body: { confirm: true }'
    });
  } catch (error) {
    console.error('Sync status error:', error);
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    if (!body.confirm) {
      return NextResponse.json({ 
        error: 'Must confirm sync',
        usage: 'POST with body: { "confirm": true }'
      }, { status: 400 });
    }

    const fs = await import('fs');
    const path = await import('path');
    
    // Try multiple locations for the export file
    const possiblePaths = [
      path.join(process.cwd(), 'data', 'family-members-export.json'),
      path.join(process.cwd(), 'public', 'data', 'family-members-export.json'),
    ];
    
    let exportPath = '';
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        exportPath = p;
        break;
      }
    }
    
    if (!exportPath) {
      return NextResponse.json({ 
        error: 'Export file not found in any location',
        checkedPaths: possiblePaths
      }, { status: 404 });
    }

    const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));
    const members = exportData.members;
    
    const currentCount = await prisma.familyMember.count({ where: { deletedAt: null } });
    
    if (currentCount >= members.length) {
      return NextResponse.json({
        status: 'skipped',
        message: 'Database already has enough members',
        currentCount,
        exportCount: members.length
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.familyMember.deleteMany({});

      const sortedMembers = [...members].sort((a: any, b: any) => {
        if (a.generation !== b.generation) return a.generation - b.generation;
        return a.id.localeCompare(b.id);
      });

      const BATCH_SIZE = 50;
      for (let i = 0; i < sortedMembers.length; i += BATCH_SIZE) {
        const batch = sortedMembers.slice(i, i + BATCH_SIZE);
        await tx.familyMember.createMany({
          data: batch.map((m: any) => ({
            id: m.id,
            firstName: m.firstName,
            fatherName: m.fatherName,
            grandfatherName: m.grandfatherName,
            greatGrandfatherName: m.greatGrandfatherName,
            familyName: m.familyName,
            fatherId: m.fatherId,
            gender: m.gender,
            birthYear: m.birthYear,
            deathYear: m.deathYear,
            sonsCount: m.sonsCount,
            daughtersCount: m.daughtersCount,
            generation: m.generation,
            branch: m.branch,
            fullNameAr: m.fullNameAr,
            fullNameEn: m.fullNameEn,
            lineageBranchId: m.lineageBranchId,
            lineageBranchName: m.lineageBranchName,
            subBranchId: m.subBranchId,
            subBranchName: m.subBranchName,
            lineagePath: m.lineagePath,
            phone: m.phone,
            city: m.city,
            status: m.status,
            photoUrl: m.photoUrl,
            biography: m.biography,
            occupation: m.occupation,
            email: m.email,
          })),
          skipDuplicates: true,
        });
      }
    }, { timeout: 120000 });

    const newCount = await prisma.familyMember.count({ where: { deletedAt: null } });

    return NextResponse.json({
      status: 'success',
      message: 'Data synced successfully',
      previousCount: currentCount,
      newCount,
      expectedCount: members.length
    });

  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json({ 
      error: 'Sync failed',
      details: error.message 
    }, { status: 500 });
  }
}
