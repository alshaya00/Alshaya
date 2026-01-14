import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixIdConsistency() {
  console.log('🔧 Fixing ID consistency...\n');
  
  // Find all numeric-only IDs
  const members = await prisma.familyMember.findMany({
    where: { deletedAt: null }
  });
  
  const numericIds = members.filter(m => /^[0-9]+$/.test(m.id));
  console.log(`Found ${numericIds.length} members with numeric-only IDs:`);
  numericIds.forEach(m => console.log(`  - ${m.id}: ${m.firstName}`));
  
  if (numericIds.length === 0) {
    console.log('✅ All IDs are already in P-prefix format');
    await prisma.$disconnect();
    return;
  }
  
  // Create ID mapping
  const idMapping: Record<string, string> = {};
  for (const m of numericIds) {
    idMapping[m.id] = `P${m.id}`;
  }
  
  console.log('\n📋 ID Mapping:');
  Object.entries(idMapping).forEach(([old, newId]) => {
    console.log(`  ${old} → ${newId}`);
  });
  
  console.log('\n📝 Processing updates...');
  
  for (const member of numericIds) {
    const oldId = member.id;
    const newId = idMapping[oldId];
    
    // Update primary key directly using raw SQL
    await prisma.$executeRawUnsafe(`
      UPDATE "FamilyMember" SET id = $1 WHERE id = $2
    `, newId, oldId);
    
    // Update all fatherId references in FamilyMember
    await prisma.$executeRawUnsafe(`
      UPDATE "FamilyMember" SET "fatherId" = $1 WHERE "fatherId" = $2
    `, newId, oldId);
    
    // Update lineagePath (JSON array of ancestor IDs)
    await prisma.$executeRawUnsafe(`
      UPDATE "FamilyMember" 
      SET "lineagePath" = REPLACE("lineagePath", '"' || $1 || '"', '"' || $2 || '"')
      WHERE "lineagePath" LIKE '%"' || $1 || '"%'
    `, oldId, newId);
    
    // Update PendingMember proposedFatherId references if any
    await prisma.$executeRawUnsafe(`
      UPDATE "PendingMember" SET "proposedFatherId" = $1 WHERE "proposedFatherId" = $2
    `, newId, oldId);
    
    console.log(`  ✅ ${oldId} → ${newId}`);
  }
  
  console.log('\n✅ All IDs converted to P-prefix format');
  
  // Verify
  const remaining = await prisma.familyMember.findMany({
    where: { 
      deletedAt: null,
      id: { not: { startsWith: 'P' } }
    }
  });
  
  if (remaining.length > 0) {
    console.log(`⚠️ Still ${remaining.length} members without P prefix`);
  } else {
    console.log('✅ Verified: All members have P-prefix IDs');
  }
  
  await prisma.$disconnect();
}

fixIdConsistency().catch(e => {
  console.error('Error:', e);
  prisma.$disconnect();
  process.exit(1);
});
