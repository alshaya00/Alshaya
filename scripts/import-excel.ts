import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Deleting old family data...');
  
  await prisma.changeHistory.deleteMany({});
  await prisma.duplicateFlag.deleteMany({});
  await prisma.memberPhoto.deleteMany({});
  await prisma.breastfeedingRelationship.deleteMany({});
  await prisma.familyMember.deleteMany({});
  
  console.log('✅ Old data deleted');
  
  console.log('📖 Reading Excel file...');
  const workbook = XLSX.readFile('attached_assets/Family_Tree_Ultimate_System_(1)_1766495709064.xlsx');
  const registry = workbook.Sheets['REGISTRY'];
  const rows = XLSX.utils.sheet_to_json(registry, { header: 1 }) as any[][];
  
  const headers = rows[0];
  const dataRows = rows.slice(1).filter(row => row[0] && String(row[0]).startsWith('P'));
  
  console.log(`📊 Found ${dataRows.length} members to import`);
  
  const members: any[] = [];
  
  for (const row of dataRows) {
    const id = String(row[0] || '').trim();
    if (!id) continue;
    
    const firstName = String(row[1] || '').trim();
    const fatherName = row[2] ? String(row[2]).trim() : null;
    const grandfatherName = row[3] ? String(row[3]).trim() : null;
    const greatGrandfatherName = row[4] ? String(row[4]).trim() : null;
    const fatherId = row[5] ? String(row[5]).trim() : null;
    const gender = String(row[6] || 'Male').trim() || 'Male';
    const birthYear = row[7] ? parseInt(String(row[7])) : null;
    const sonsCount = row[8] ? parseInt(String(row[8])) || 0 : 0;
    const daughtersCount = row[9] ? parseInt(String(row[9])) || 0 : 0;
    const generation = row[10] ? parseInt(String(row[10])) || 1 : 1;
    const branch = row[11] ? String(row[11]).trim() : null;
    const fullNameAr = row[12] ? String(row[12]).trim() : null;
    const fullNameEn = row[13] ? String(row[13]).trim() : null;
    const phone = row[16] ? String(row[16]).trim() : null;
    const city = row[17] ? String(row[17]).trim() : null;
    const status = row[18] ? String(row[18]).trim() : 'Living';
    
    members.push({
      id,
      firstName: firstName || 'غير معروف',
      fatherName: fatherName === '-' ? null : fatherName,
      grandfatherName: grandfatherName === '-' ? null : grandfatherName,
      greatGrandfatherName,
      fatherId: fatherId && fatherId.startsWith('P') ? fatherId : null,
      gender: gender || 'Male',
      birthYear: birthYear && !isNaN(birthYear) ? birthYear : null,
      sonsCount,
      daughtersCount,
      generation,
      branch,
      fullNameAr,
      fullNameEn,
      phone,
      city,
      status: status || 'Living',
      familyName: 'آل شايع',
    });
  }
  
  console.log('💾 Inserting members in batches...');
  
  const validFatherIds = new Set(members.map(m => m.id));
  
  for (const member of members) {
    if (member.fatherId && !validFatherIds.has(member.fatherId)) {
      member.fatherId = null;
    }
  }
  
  const membersWithoutFather = members.filter(m => !m.fatherId);
  const membersWithFather = members.filter(m => m.fatherId);
  
  console.log(`  - ${membersWithoutFather.length} root/orphan members`);
  console.log(`  - ${membersWithFather.length} members with fathers`);
  
  for (const member of membersWithoutFather) {
    try {
      await prisma.familyMember.create({ data: member });
    } catch (e: any) {
      console.error(`Error inserting ${member.id}: ${e.message}`);
    }
  }
  
  let remaining = [...membersWithFather];
  let attempts = 0;
  const maxAttempts = 20;
  
  while (remaining.length > 0 && attempts < maxAttempts) {
    attempts++;
    const inserted: string[] = [];
    const failed: any[] = [];
    
    for (const member of remaining) {
      try {
        await prisma.familyMember.create({ data: member });
        inserted.push(member.id);
      } catch (e: any) {
        if (e.code === 'P2003') {
          failed.push(member);
        } else {
          console.error(`Error inserting ${member.id}: ${e.message}`);
        }
      }
    }
    
    console.log(`  Pass ${attempts}: Inserted ${inserted.length}, remaining ${failed.length}`);
    remaining = failed;
  }
  
  if (remaining.length > 0) {
    console.log(`⚠️  ${remaining.length} members could not be inserted (missing fathers)`);
    for (const m of remaining) {
      m.fatherId = null;
      try {
        await prisma.familyMember.create({ data: m });
      } catch (e: any) {
        console.error(`Final error for ${m.id}: ${e.message}`);
      }
    }
  }
  
  const count = await prisma.familyMember.count();
  console.log(`\n✅ Import complete! Total members: ${count}`);
  
  const stats = await prisma.familyMember.groupBy({
    by: ['gender'],
    _count: true,
  });
  console.log('📊 Statistics:', stats);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
