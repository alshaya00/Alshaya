import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    ' ': ' ', 'آل': 'Al-',
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

interface Member {
  id: string;
  firstName: string;
  fatherId: string | null;
  familyName: string;
  gender: string;
}

async function updateFullNames() {
  console.log('Fetching all family members...');
  const members = await prisma.familyMember.findMany({
    select: {
      id: true,
      firstName: true,
      fatherId: true,
      familyName: true,
      gender: true,
    },
  });

  console.log(`Found ${members.length} members. Updating full names...`);

  const memberMap = new Map<string, Member>();
  members.forEach(m => memberMap.set(m.id, m));

  function generateFullName(member: Member): { fullNameAr: string; fullNameEn: string } {
    const parts: string[] = [member.firstName || ''];
    let currentMember: Member | undefined = member;

    while (currentMember?.fatherId) {
      const father = memberMap.get(currentMember.fatherId);
      if (father) {
        parts.push(father.firstName);
        currentMember = father;
      } else {
        break;
      }
    }

    parts.push(member.familyName || 'آل شايع');

    const connector = member.gender === 'Female' ? 'بنت' : 'بن';
    const fullNameAr = parts.length > 2
      ? parts[0] + ' ' + connector + ' ' + parts.slice(1, -1).join(' ' + connector + ' ') + ' ' + parts[parts.length - 1]
      : parts.join(' ');

    const fullNameEn = parts.map(transliterate).join(' ');

    return { fullNameAr, fullNameEn };
  }

  let updated = 0;
  for (const member of members) {
    const { fullNameAr, fullNameEn } = generateFullName(member);
    
    await prisma.familyMember.update({
      where: { id: member.id },
      data: { fullNameAr, fullNameEn },
    });
    updated++;
    
    if (updated % 50 === 0) {
      console.log(`Updated ${updated}/${members.length} members...`);
    }
  }

  console.log(`\nDone! Updated ${updated} members with full lineage names.`);
  
  const sample = await prisma.familyMember.findFirst({
    where: { generation: 7 },
    select: { firstName: true, fullNameAr: true, fullNameEn: true, generation: true },
  });
  
  if (sample) {
    console.log('\nSample (Generation 7):');
    console.log(`  Name: ${sample.firstName}`);
    console.log(`  Full Arabic: ${sample.fullNameAr}`);
    console.log(`  Full English: ${sample.fullNameEn}`);
  }
}

updateFullNames()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
