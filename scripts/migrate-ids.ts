import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateIds() {
  console.log('🔄 Starting ID migration to P-prefixed format...\n');

  const numericIds = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "FamilyMember" WHERE id ~ '^[0-9]+$' ORDER BY CAST(id AS INTEGER)
  `;

  console.log(`📋 Found ${numericIds.length} members with numeric IDs\n`);

  if (numericIds.length === 0) {
    console.log('✅ All IDs are already P-prefixed. No migration needed.');
    return;
  }

  const idMapping: Record<string, string> = {};
  for (const { id } of numericIds) {
    const numericPart = parseInt(id, 10);
    const newId = `P${String(numericPart).padStart(4, '0')}`;
    idMapping[id] = newId;
  }

  console.log('📝 ID Mapping:');
  for (const [oldId, newId] of Object.entries(idMapping).slice(0, 10)) {
    console.log(`   ${oldId} → ${newId}`);
  }
  if (Object.keys(idMapping).length > 10) {
    console.log(`   ... and ${Object.keys(idMapping).length - 10} more`);
  }
  console.log('');

  const existingPrefixed = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "FamilyMember" WHERE id ~ '^P[0-9]+$'
  `;
  const existingPrefixedSet = new Set(existingPrefixed.map(r => r.id));

  const conflicts: string[] = [];
  for (const newId of Object.values(idMapping)) {
    if (existingPrefixedSet.has(newId)) {
      conflicts.push(newId);
    }
  }

  if (conflicts.length > 0) {
    console.log('⚠️  Conflicts detected! These new IDs already exist:');
    for (const conflict of conflicts) {
      console.log(`   ${conflict}`);
    }
    console.log('\n❌ Migration aborted. Please resolve conflicts first.');
    return;
  }

  console.log('🔄 Starting transactional migration...\n');

  await prisma.$transaction(async (tx) => {
    for (const [oldId, newId] of Object.entries(idMapping)) {
      console.log(`   Migrating ${oldId} → ${newId}`);

      await tx.$executeRaw`UPDATE "FamilyMember" SET "fatherId" = ${newId} WHERE "fatherId" = ${oldId}`;

      await tx.$executeRaw`UPDATE "PendingMember" SET "proposedFatherId" = ${newId} WHERE "proposedFatherId" = ${oldId}`;

      await tx.$executeRaw`UPDATE "MemberPhoto" SET "memberId" = ${newId} WHERE "memberId" = ${oldId}`;

      await tx.$executeRaw`UPDATE "MemberJournal" SET "memberId" = ${newId} WHERE "memberId" = ${oldId}`;

      await tx.$executeRaw`UPDATE "BreastfeedingRelation" SET "childId" = ${newId} WHERE "childId" = ${oldId}`;
      await tx.$executeRaw`UPDATE "BreastfeedingRelation" SET "nurseId" = ${newId} WHERE "nurseId" = ${oldId}`;

      await tx.$executeRaw`UPDATE "ChangeHistory" SET "memberId" = ${newId} WHERE "memberId" = ${oldId}`;

      await tx.$executeRaw`UPDATE "User" SET "linkedMemberId" = ${newId} WHERE "linkedMemberId" = ${oldId}`;

      await tx.$executeRaw`UPDATE "AccessRequest" SET "relatedMemberId" = ${newId} WHERE "relatedMemberId" = ${oldId}`;
      await tx.$executeRaw`UPDATE "AccessRequest" SET "approvedMemberId" = ${newId} WHERE "approvedMemberId" = ${oldId}`;

      await tx.$executeRaw`UPDATE "FamilyMember" SET id = ${newId} WHERE id = ${oldId}`;
    }

    await tx.auditLog.create({
      data: {
        action: 'ID_MIGRATION',
        targetType: 'SYSTEM',
        targetId: 'BATCH',
        description: `Migrated ${Object.keys(idMapping).length} numeric IDs to P-prefixed format`,
        details: JSON.stringify({ mapping: idMapping }),
        userId: 'SYSTEM',
        userName: 'ID Migration Script',
      },
    });
  });

  console.log(`\n✅ Successfully migrated ${Object.keys(idMapping).length} IDs!`);
  console.log('📋 Migration mapping saved to audit log.');
}

migrateIds()
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
