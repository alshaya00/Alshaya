import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function ensureMembers() {
  console.log('🔄 Checking if member data sync is needed...');

  try {
    // Find the export file
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
      console.log('⚠️ No export file found, skipping sync');
      return;
    }

    const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));
    const expectedCount = exportData.totalMembers || exportData.members?.length || 0;

    if (expectedCount === 0) {
      console.log('⚠️ Export file has no members, skipping sync');
      return;
    }

    // Check current count
    const currentCount = await prisma.familyMember.count({ where: { deletedAt: null } });
    console.log(`📊 Current members: ${currentCount}, Expected: ${expectedCount}`);

    if (currentCount >= expectedCount) {
      console.log('✅ Database already has all members, no sync needed');
      return;
    }

    console.log(`🚀 Starting sync: ${currentCount} → ${expectedCount} members...`);

    const members = exportData.members;

    await prisma.$transaction(async (tx) => {
      // Clear existing members
      await tx.familyMember.deleteMany({});

      // Sort by generation for proper insertion order
      const sortedMembers = [...members].sort((a: any, b: any) => {
        if (a.generation !== b.generation) return a.generation - b.generation;
        return a.id.localeCompare(b.id);
      });

      // Insert in batches
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
        console.log(`   Inserted ${Math.min(i + BATCH_SIZE, sortedMembers.length)}/${sortedMembers.length}...`);
      }
    }, { timeout: 120000 });

    const newCount = await prisma.familyMember.count({ where: { deletedAt: null } });
    console.log(`✅ Sync complete! Now have ${newCount} members`);

  } catch (error) {
    console.error('❌ Member sync failed:', error);
    // Don't throw - let the app continue starting
  } finally {
    await prisma.$disconnect();
  }
}

ensureMembers();
