import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AncestorUpdate {
  memberId: string;
  memberName: string;
  oldValue: string | null;
  newValue: string;
}

async function fixGreatGrandfatherNames(): Promise<void> {
  console.log('🔍 Scanning for members with missing greatGrandfatherName...\n');

  const members = await prisma.familyMember.findMany({
    where: {
      deletedAt: null,
      fatherId: { not: null },
      OR: [
        { greatGrandfatherName: null },
        { greatGrandfatherName: '' },
      ],
    },
    select: {
      id: true,
      firstName: true,
      fatherId: true,
      greatGrandfatherName: true,
    },
    orderBy: { id: 'asc' },
  });

  console.log(`Found ${members.length} members with missing greatGrandfatherName\n`);

  const updates: AncestorUpdate[] = [];

  for (const member of members) {
    if (!member.fatherId) continue;

    const father = await prisma.familyMember.findUnique({
      where: { id: member.fatherId },
      select: { id: true, firstName: true, fatherId: true },
    });

    if (!father?.fatherId) continue;

    const grandfather = await prisma.familyMember.findUnique({
      where: { id: father.fatherId },
      select: { id: true, firstName: true, fatherId: true },
    });

    if (!grandfather?.fatherId) continue;

    const greatGrandfather = await prisma.familyMember.findUnique({
      where: { id: grandfather.fatherId },
      select: { id: true, firstName: true },
    });

    if (!greatGrandfather) continue;

    updates.push({
      memberId: member.id,
      memberName: member.firstName,
      oldValue: member.greatGrandfatherName,
      newValue: greatGrandfather.firstName,
    });
  }

  console.log(`📝 Will update ${updates.length} members:\n`);

  for (const update of updates.slice(0, 10)) {
    console.log(`  ${update.memberId} (${update.memberName}): "${update.oldValue || '-'}" → "${update.newValue}"`);
  }
  if (updates.length > 10) {
    console.log(`  ... and ${updates.length - 10} more\n`);
  }

  console.log('\n🔄 Executing updates...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const update of updates) {
    try {
      await prisma.familyMember.update({
        where: { id: update.memberId },
        data: { greatGrandfatherName: update.newValue },
      });
      successCount++;
    } catch (error) {
      console.error(`  ❌ Failed to update ${update.memberId}: ${error}`);
      errorCount++;
    }
  }

  console.log(`\n✅ Successfully updated: ${successCount}`);
  if (errorCount > 0) {
    console.log(`❌ Failed: ${errorCount}`);
  }

  console.log('\n🔍 Verifying fix...');
  
  const remaining = await prisma.familyMember.count({
    where: {
      deletedAt: null,
      fatherId: { not: null },
      OR: [
        { greatGrandfatherName: null },
        { greatGrandfatherName: '' },
      ],
    },
  });

  console.log(`📊 Members still with missing greatGrandfatherName: ${remaining}`);

  await prisma.$disconnect();
}

fixGreatGrandfatherNames()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
