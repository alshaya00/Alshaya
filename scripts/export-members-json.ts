import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function exportMembers() {
  console.log('📤 Exporting family members from database...');
  
  const members = await prisma.familyMember.findMany({
    where: { deletedAt: null },
    orderBy: [
      { generation: 'asc' },
      { id: 'asc' }
    ]
  });

  console.log(`Found ${members.length} active members`);

  const exportData = {
    exportedAt: new Date().toISOString(),
    totalMembers: members.length,
    members: members.map(m => ({
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
    }))
  };

  const outputPath = path.join(process.cwd(), 'data', 'family-members-export.json');
  
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2), 'utf-8');
  
  console.log(`✅ Exported ${members.length} members to ${outputPath}`);
  
  await prisma.$disconnect();
  return outputPath;
}

exportMembers()
  .then(path => {
    console.log(`\n🎉 Export complete: ${path}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Export failed:', error);
    process.exit(1);
  });
