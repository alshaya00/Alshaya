import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateNumericIds() {
  console.log('Starting ID format migration...');
  
  const allMembers = await prisma.familyMember.findMany({
    select: { id: true },
    orderBy: { id: 'asc' },
  });

  const numericIds: { id: string; num: number }[] = [];
  let maxPNum = 0;

  for (const member of allMembers) {
    const prefixMatch = member.id.match(/^P(\d+)$/i);
    if (prefixMatch) {
      const num = parseInt(prefixMatch[1], 10);
      if (num > maxPNum) maxPNum = num;
    } else {
      const num = parseInt(member.id, 10);
      if (!isNaN(num)) {
        numericIds.push({ id: member.id, num });
      }
    }
  }

  if (numericIds.length === 0) {
    console.log('No numeric IDs found. All IDs are already in P### format.');
    return;
  }

  console.log(`Found ${numericIds.length} numeric IDs to migrate.`);
  console.log(`Highest P### number: ${maxPNum}`);

  numericIds.sort((a, b) => a.num - b.num);

  const idMapping: { oldId: string; newId: string }[] = [];
  let nextNum = maxPNum + 1;

  for (const { id } of numericIds) {
    const newId = `P${String(nextNum).padStart(3, '0')}`;
    idMapping.push({ oldId: id, newId });
    nextNum++;
  }

  console.log('\nID Mapping:');
  idMapping.forEach(({ oldId, newId }) => {
    console.log(`  ${oldId} -> ${newId}`);
  });

  console.log('\nMigrating IDs...');

  for (const { oldId, newId } of idMapping) {
    await prisma.$executeRaw`UPDATE "FamilyMember" SET "id" = ${newId} WHERE "id" = ${oldId}`;
    
    await prisma.$executeRaw`UPDATE "FamilyMember" SET "fatherId" = ${newId} WHERE "fatherId" = ${oldId}`;
    
    console.log(`  Migrated ${oldId} -> ${newId}`);
  }

  console.log('\nID migration complete!');
  console.log(`Migrated ${idMapping.length} members.`);
}

async function main() {
  try {
    await migrateNumericIds();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
