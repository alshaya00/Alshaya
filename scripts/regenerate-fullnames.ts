import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface FamilyMember {
  id: string;
  firstName: string;
  fatherId: string | null;
  familyName: string | null;
  gender: string;
}

function generateFullNameAr(
  member: FamilyMember,
  allMembers: FamilyMember[]
): string {
  const parts: string[] = [member.firstName];
  let currentMember: FamilyMember | undefined = member;

  while (currentMember?.fatherId) {
    const father = allMembers.find(m => m.id === currentMember!.fatherId);
    if (father) {
      parts.push(father.firstName);
      currentMember = father;
    } else {
      break;
    }
  }

  parts.push(member.familyName || 'آل شايع');

  const connector = member.gender === 'Female' ? 'بنت' : 'بن';
  
  if (parts.length > 2) {
    return parts[0] + ' ' + connector + ' ' + parts.slice(1, -1).join(' ' + connector + ' ') + ' ' + parts[parts.length - 1];
  }
  return parts.join(' ');
}

function transliterate(arabic: string): string {
  const map: Record<string, string> = {
    'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'aa',
    'ب': 'b', 'ت': 't', 'ث': 'th',
    'ج': 'j', 'ح': 'h', 'خ': 'kh',
    'د': 'd', 'ذ': 'dh',
    'ر': 'r', 'ز': 'z',
    'س': 's', 'ش': 'sh',
    'ص': 's', 'ض': 'd',
    'ط': 't', 'ظ': 'dh',
    'ع': 'a', 'غ': 'gh',
    'ف': 'f', 'ق': 'q',
    'ك': 'k', 'ل': 'l',
    'م': 'm', 'ن': 'n',
    'ه': 'h', 'و': 'w',
    'ي': 'y', 'ى': 'a',
    'ة': 'h', 'ء': "'",
    ' ': ' ',
  };

  if (arabic.includes('آل')) {
    arabic = arabic.replace('آل', 'AAL_PLACEHOLDER');
  }

  let result = '';
  for (const char of arabic) {
    result += map[char] || char;
  }

  result = result.replace('AAL_PLACEHOLDER', 'Al-');
  return result.replace(/\b\w/g, c => c.toUpperCase());
}

function generateFullNameEn(
  member: FamilyMember,
  allMembers: FamilyMember[]
): string {
  const parts: string[] = [member.firstName];
  let currentMember: FamilyMember | undefined = member;

  while (currentMember?.fatherId) {
    const father = allMembers.find(m => m.id === currentMember!.fatherId);
    if (father) {
      parts.push(father.firstName);
      currentMember = father;
    } else {
      break;
    }
  }

  parts.push(member.familyName || 'آل شايع');
  return parts.map(transliterate).join(' ');
}

async function regenerateFullNames() {
  console.log('🔄 Regenerating full names for all family members...\n');

  const members = await prisma.familyMember.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      firstName: true,
      fatherId: true,
      familyName: true,
      gender: true,
      fullNameAr: true,
    },
  });

  console.log(`Found ${members.length} members to process.\n`);

  let updated = 0;
  let unchanged = 0;

  for (const member of members) {
    const newFullNameAr = generateFullNameAr(member, members);
    const newFullNameEn = generateFullNameEn(member, members);

    if (member.fullNameAr !== newFullNameAr) {
      await prisma.familyMember.update({
        where: { id: member.id },
        data: {
          fullNameAr: newFullNameAr,
          fullNameEn: newFullNameEn,
        },
      });
      
      console.log(`✅ ${member.id}: ${member.firstName}`);
      console.log(`   Old: ${member.fullNameAr}`);
      console.log(`   New: ${newFullNameAr}\n`);
      updated++;
    } else {
      unchanged++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Updated: ${updated} members`);
  console.log(`   Unchanged: ${unchanged} members`);
  console.log(`   Total: ${members.length} members`);
}

regenerateFullNames()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
