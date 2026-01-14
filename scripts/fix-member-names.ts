import { PrismaClient } from '@prisma/client';
import { transliterateName } from '../src/lib/utils/transliteration';

const prisma = new PrismaClient();

const MAX_GENERATION = 20;

async function generateFullNamesFromLineage(
  memberId: string,
  memberData: {
    firstName: string;
    gender: string;
    fatherId: string | null;
  }
): Promise<{ fullNameAr: string; fullNameEn: string }> {
  const connector = memberData.gender === 'Female' ? 'بنت' : 'بن';
  
  const ancestorNames: string[] = [];
  let currentFatherId: string | null = memberData.fatherId;
  
  for (let i = 0; i < MAX_GENERATION && currentFatherId; i++) {
    const ancestor = await prisma.familyMember.findUnique({
      where: { id: currentFatherId },
      select: { id: true, firstName: true, fatherId: true },
    });
    
    if (!ancestor) break;
    
    ancestorNames.push(ancestor.firstName);
    currentFatherId = ancestor.fatherId;
  }
  
  const partsAr: string[] = [memberData.firstName.trim()];
  for (const name of ancestorNames) {
    partsAr.push(`${connector} ${name.trim()}`);
  }
  partsAr.push('آل شايع');
  
  const fullNameAr = partsAr.join(' ').replace(/\s+/g, ' ').trim();
  
  const partsEn: string[] = [transliterateName(memberData.firstName)];
  for (const name of ancestorNames) {
    partsEn.push(`bin ${transliterateName(name)}`);
  }
  partsEn.push('Al Shaye');
  
  const fullNameEn = partsEn.join(' ').replace(/\s+/g, ' ').trim();
  
  return { fullNameAr, fullNameEn };
}

async function fixAllMemberNames() {
  console.log('🔧 Starting member name fix...\n');
  
  const members = await prisma.familyMember.findMany({
    where: { deletedAt: null },
    orderBy: { generation: 'asc' },
    select: {
      id: true,
      firstName: true,
      gender: true,
      fatherId: true,
      fullNameAr: true,
      fullNameEn: true,
      generation: true,
    },
  });
  
  console.log(`📊 Found ${members.length} members to process\n`);
  
  let updated = 0;
  let errors = 0;
  
  for (const member of members) {
    try {
      const newNames = await generateFullNamesFromLineage(member.id, {
        firstName: member.firstName,
        gender: member.gender,
        fatherId: member.fatherId,
      });
      
      const needsUpdate = 
        member.fullNameAr !== newNames.fullNameAr || 
        member.fullNameEn !== newNames.fullNameEn;
      
      if (needsUpdate) {
        await prisma.familyMember.update({
          where: { id: member.id },
          data: {
            fullNameAr: newNames.fullNameAr,
            fullNameEn: newNames.fullNameEn,
          },
        });
        
        console.log(`✅ ${member.id} (Gen ${member.generation}): ${member.firstName}`);
        console.log(`   AR: ${newNames.fullNameAr}`);
        console.log(`   EN: ${newNames.fullNameEn}\n`);
        updated++;
      }
    } catch (error) {
      console.error(`❌ Error updating ${member.id}:`, error);
      errors++;
    }
  }
  
  console.log('\n📈 Summary:');
  console.log(`   Total members: ${members.length}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   No changes needed: ${members.length - updated - errors}`);
}

async function main() {
  try {
    await fixAllMemberNames();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
