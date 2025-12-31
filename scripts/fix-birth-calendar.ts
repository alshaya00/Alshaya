import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixBirthCalendar() {
  console.log('🔄 Detecting and fixing birthCalendar values...\n');

  const membersToFix = await prisma.familyMember.findMany({
    where: {
      deletedAt: null,
      birthYear: { not: null },
    },
    select: {
      id: true,
      firstName: true,
      birthYear: true,
      birthCalendar: true,
    },
  });

  console.log(`📋 Found ${membersToFix.length} members with birth years\n`);

  const fixes: { id: string; name: string; birthYear: number; oldCalendar: string | null; newCalendar: string }[] = [];

  for (const member of membersToFix) {
    if (!member.birthYear) continue;

    let detectedCalendar: 'HIJRI' | 'GREGORIAN';
    
    if (member.birthYear < 1500) {
      detectedCalendar = 'HIJRI';
    } else if (member.birthYear >= 1900) {
      detectedCalendar = 'GREGORIAN';
    } else {
      detectedCalendar = 'HIJRI';
    }

    if (member.birthCalendar !== detectedCalendar) {
      fixes.push({
        id: member.id,
        name: member.firstName,
        birthYear: member.birthYear,
        oldCalendar: member.birthCalendar,
        newCalendar: detectedCalendar,
      });
    }
  }

  if (fixes.length === 0) {
    console.log('✅ All birthCalendar values are correct. No fixes needed.');
    return;
  }

  console.log(`📝 Found ${fixes.length} members needing calendar fix:\n`);
  
  const hijriFixes = fixes.filter(f => f.newCalendar === 'HIJRI');
  const gregorianFixes = fixes.filter(f => f.newCalendar === 'GREGORIAN');
  
  console.log(`   Hijri corrections: ${hijriFixes.length}`);
  console.log(`   Gregorian corrections: ${gregorianFixes.length}\n`);

  for (const fix of fixes.slice(0, 20)) {
    console.log(`   ${fix.id}: ${fix.name} (${fix.birthYear}) - ${fix.oldCalendar || 'NULL'} → ${fix.newCalendar}`);
  }
  if (fixes.length > 20) {
    console.log(`   ... and ${fixes.length - 20} more`);
  }

  console.log('\n🔄 Applying fixes...\n');

  let updated = 0;
  for (const fix of fixes) {
    await prisma.familyMember.update({
      where: { id: fix.id },
      data: { birthCalendar: fix.newCalendar },
    });
    updated++;
  }

  await prisma.auditLog.create({
    data: {
      action: 'BIRTH_CALENDAR_FIX',
      targetType: 'SYSTEM',
      targetId: 'BATCH',
      description: `Auto-detected and fixed birthCalendar for ${updated} members`,
      details: JSON.stringify({
        hijriFixes: hijriFixes.length,
        gregorianFixes: gregorianFixes.length,
        samples: fixes.slice(0, 10),
      }),
      userId: 'SYSTEM',
      userName: 'Birth Calendar Fix Script',
    },
  });

  console.log(`✅ Successfully updated ${updated} members!`);
}

fixBirthCalendar()
  .catch((error) => {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
