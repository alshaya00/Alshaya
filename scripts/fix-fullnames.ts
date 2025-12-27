import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function transliterate(arabic: string): string {
  if (!arabic) return '';
  
  const commonNames: Record<string, string> = {
    'عبدالله': 'Abdullah',
    'عبد الله': 'Abdullah',
    'عبدالعزيز': 'Abdulaziz',
    'عبد العزيز': 'Abdulaziz',
    'عبدالرحمن': 'Abdulrahman',
    'عبد الرحمن': 'Abdulrahman',
    'عبدالكريم': 'Abdulkarim',
    'عبد الكريم': 'Abdulkarim',
    'عبدالملك': 'Abdulmalik',
    'عبد الملك': 'Abdulmalik',
    'عبدالمجيد': 'Abdulmajid',
    'عبد المجيد': 'Abdulmajid',
    'عبداللطيف': 'Abdullatif',
    'عبد اللطيف': 'Abdullatif',
    'عبدالمحسن': 'Abdulmohsen',
    'عبد المحسن': 'Abdulmohsen',
    'عبدالهادي': 'Abdulhadi',
    'عبد الهادي': 'Abdulhadi',
    'عبدالواحد': 'Abdulwahid',
    'عبد الواحد': 'Abdulwahid',
    'محمد': 'Mohammed',
    'أحمد': 'Ahmed',
    'احمد': 'Ahmed',
    'إبراهيم': 'Ibrahim',
    'ابراهيم': 'Ibrahim',
    'سليمان': 'Sulaiman',
    'سلمان': 'Salman',
    'ناصر': 'Nasser',
    'خالد': 'Khalid',
    'فهد': 'Fahd',
    'سعود': 'Saud',
    'سعد': 'Saad',
    'فيصل': 'Faisal',
    'تركي': 'Turki',
    'بندر': 'Bandar',
    'سلطان': 'Sultan',
    'نايف': 'Naif',
    'مشعل': 'Mishal',
    'متعب': 'Mutaib',
    'عمر': 'Omar',
    'علي': 'Ali',
    'حسن': 'Hassan',
    'حسين': 'Hussein',
    'يوسف': 'Youssef',
    'يعقوب': 'Yaqoub',
    'صالح': 'Saleh',
    'عثمان': 'Othman',
    'حمد': 'Hamad',
    'راشد': 'Rashid',
    'ماجد': 'Majid',
    'منصور': 'Mansour',
    'نواف': 'Nawaf',
    'فوزان': 'Fawzan',
    'مساعد': 'Musaad',
    'زيد': 'Zaid',
    'فهاد': 'Fahad',
    'بدر': 'Badr',
    'جمال': 'Jamal',
    'كمال': 'Kamal',
    'طلال': 'Talal',
    'نوره': 'Noura',
    'نورة': 'Noura',
    'سارة': 'Sarah',
    'فاطمة': 'Fatima',
    'عائشة': 'Aisha',
    'مريم': 'Mariam',
    'خديجة': 'Khadija',
    'زينب': 'Zainab',
    'هند': 'Hind',
    'ريم': 'Reem',
    'دانة': 'Dana',
    'لمى': 'Lama',
    'منيرة': 'Munira',
    'لطيفة': 'Latifa',
    'موضي': 'Moudhi',
    'جواهر': 'Jawahir',
    'العنود': 'Al-Anoud',
    'الجوهرة': 'Al-Jawhara',
    'خلود': 'Khulud',
    'هيا': 'Haya',
    'آل شايع': 'Al-Shaye',
    'ال شايع': 'Al-Shaye',
    'شايع': 'Shaye',
  };

  const trimmed = arabic.trim();
  if (commonNames[trimmed]) {
    return commonNames[trimmed];
  }

  const charMap: Record<string, string> = {
    'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'a',
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
    'ة': 'a', 'ء': '',
    'ؤ': 'o', 'ئ': 'e',
    'ً': '', 'ٌ': '', 'ٍ': '',
    'َ': '', 'ُ': '', 'ِ': '',
    'ّ': '', 'ْ': '',
    ' ': ' ', '-': '-',
  };

  let text = trimmed;
  
  if (text.startsWith('آل ') || text.startsWith('ال ')) {
    text = 'AL_PREFIX_PLACEHOLDER' + text.substring(3);
  } else if (text.startsWith('آل') || text.startsWith('ال')) {
    text = 'AL_PREFIX_PLACEHOLDER' + text.substring(2);
  }

  let result = '';
  for (const char of text) {
    if (charMap.hasOwnProperty(char)) {
      result += charMap[char];
    } else if (/[a-zA-Z0-9\s\-_.]/.test(char)) {
      result += char;
    }
  }

  result = result.replace('AL_PREFIX_PLACEHOLDER', 'Al-');
  
  result = result.replace(/\s+/g, ' ').trim();
  
  return result.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

interface Member {
  id: string;
  firstName: string;
  fatherId: string | null;
  familyName: string;
  gender: string;
}

async function fixFullNames() {
  console.log('=== Fix FullNames Script ===\n');
  console.log('Fetching all family members...');
  
  const members = await prisma.familyMember.findMany({
    select: {
      id: true,
      firstName: true,
      fatherId: true,
      familyName: true,
      gender: true,
      fullNameEn: true,
    },
  });

  console.log(`Found ${members.length} members.\n`);

  const memberMap = new Map<string, Member>();
  members.forEach(m => memberMap.set(m.id, m));

  function generateFullNameEn(member: Member): string {
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

    const connector = member.gender === 'Female' ? 'bint' : 'bin';
    
    const transliteratedParts = parts.map(transliterate);
    
    if (transliteratedParts.length > 2) {
      return transliteratedParts[0] + ' ' + connector + ' ' + 
             transliteratedParts.slice(1, -1).join(' ' + connector + ' ') + ' ' + 
             transliteratedParts[transliteratedParts.length - 1];
    }
    
    return transliteratedParts.join(' ');
  }

  let updated = 0;
  let hasArabicBefore = 0;
  let hasArabicAfter = 0;

  const arabicPattern = /[\u0600-\u06FF]/;

  console.log('Updating fullNameEn for all members...\n');

  for (const member of members) {
    const oldFullNameEn = member.fullNameEn || '';
    const newFullNameEn = generateFullNameEn(member);
    
    if (arabicPattern.test(oldFullNameEn)) {
      hasArabicBefore++;
    }
    
    if (arabicPattern.test(newFullNameEn)) {
      hasArabicAfter++;
      console.log(`Warning: Arabic still present in: ${newFullNameEn} (firstName: ${member.firstName})`);
    }
    
    await prisma.familyMember.update({
      where: { id: member.id },
      data: { fullNameEn: newFullNameEn },
    });
    updated++;
    
    if (updated % 100 === 0) {
      console.log(`Updated ${updated}/${members.length} members...`);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total members updated: ${updated}`);
  console.log(`Records with Arabic in fullNameEn before: ${hasArabicBefore}`);
  console.log(`Records with Arabic in fullNameEn after: ${hasArabicAfter}`);

  const samples = await prisma.familyMember.findMany({
    take: 5,
    orderBy: { generation: 'desc' },
    select: { 
      id: true,
      firstName: true, 
      fullNameAr: true, 
      fullNameEn: true, 
      generation: true 
    },
  });

  console.log('\n=== Sample Results ===');
  for (const sample of samples) {
    console.log(`\n[${sample.id}] ${sample.firstName} (Gen ${sample.generation}):`);
    console.log(`  Arabic: ${sample.fullNameAr}`);
    console.log(`  English: ${sample.fullNameEn}`);
  }
}

fixFullNames()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
