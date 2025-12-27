import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ExportedMember {
  id: string;
  firstName: string;
  fatherName: string | null;
  grandfatherName: string | null;
  greatGrandfatherName: string | null;
  familyName: string;
  fatherId: string | null;
  gender: string;
  birthYear: number | null;
  deathYear: number | null;
  sonsCount: number;
  daughtersCount: number;
  generation: number;
  branch: string | null;
  fullNameAr: string | null;
  fullNameEn: string | null;
  lineageBranchId: string | null;
  lineageBranchName: string | null;
  subBranchId: string | null;
  subBranchName: string | null;
  lineagePath: string | null;
  phone: string | null;
  city: string | null;
  status: string;
  photoUrl: string | null;
  biography: string | null;
  occupation: string | null;
  email: string | null;
}

interface ExportData {
  exportedAt: string;
  totalMembers: number;
  members: ExportedMember[];
}

async function syncToProduction() {
  console.log('🔄 Starting production database sync...');
  console.log(`📍 Using DATABASE_URL: ${process.env.DATABASE_URL?.substring(0, 30)}...`);

  const exportPath = path.join(process.cwd(), 'data', 'family-members-export.json');
  
  if (!fs.existsSync(exportPath)) {
    console.error('❌ Export file not found. Run: npx tsx scripts/export-members-json.ts first');
    process.exit(1);
  }

  const exportData: ExportData = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));
  console.log(`📂 Found export with ${exportData.totalMembers} members from ${exportData.exportedAt}`);

  const existingCount = await prisma.familyMember.count({ where: { deletedAt: null } });
  console.log(`📊 Current database has ${existingCount} active members`);

  if (existingCount >= exportData.totalMembers) {
    console.log('✅ Database already has same or more members. No sync needed.');
    await prisma.$disconnect();
    return;
  }

  console.log('\n⚠️  This will replace all family member data in the target database.');
  console.log(`   Source: ${exportData.totalMembers} members`);
  console.log(`   Target: ${existingCount} members`);
  
  const args = process.argv.slice(2);
  if (!args.includes('--confirm')) {
    console.log('\n🛑 Add --confirm flag to proceed with sync');
    await prisma.$disconnect();
    process.exit(0);
  }

  console.log('\n🚀 Starting sync...');

  await prisma.$transaction(async (tx) => {
    console.log('1️⃣ Clearing existing members (soft delete preserved)...');
    await tx.familyMember.deleteMany({});

    console.log('2️⃣ Inserting members in generation order...');
    
    const sortedMembers = [...exportData.members].sort((a, b) => {
      if (a.generation !== b.generation) return a.generation - b.generation;
      return a.id.localeCompare(b.id);
    });

    let inserted = 0;
    const BATCH_SIZE = 50;
    
    for (let i = 0; i < sortedMembers.length; i += BATCH_SIZE) {
      const batch = sortedMembers.slice(i, i + BATCH_SIZE);
      
      await tx.familyMember.createMany({
        data: batch.map(m => ({
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
      
      inserted += batch.length;
      console.log(`   Inserted ${inserted}/${sortedMembers.length} members...`);
    }

    console.log('3️⃣ Verifying sync...');
    const newCount = await tx.familyMember.count({ where: { deletedAt: null } });
    
    if (newCount !== exportData.totalMembers) {
      throw new Error(`Verification failed: expected ${exportData.totalMembers}, got ${newCount}`);
    }
    
    console.log(`✅ Verified: ${newCount} members in database`);
  }, {
    timeout: 120000,
  });

  console.log('\n🎉 Production sync complete!');
  await prisma.$disconnect();
}

syncToProduction()
  .catch(error => {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  });
