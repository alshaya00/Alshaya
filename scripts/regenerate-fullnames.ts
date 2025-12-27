import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const arabicNameMappings: Record<string, string> = {
  'محمد': 'Mohammed',
  'أحمد': 'Ahmed',
  'احمد': 'Ahmed',
  'حياة': 'Hayat',
  'مساعد': 'Musaed',
  'فوزان': 'Fawzan',
  'عثمان': 'Othman',
  'شايع': 'Shaye',
  'البراء': 'Al-Bara',
  'يزيد': 'Yazid',
  'عبدالله': 'Abdullah',
  'عبد الله': 'Abdullah',
  'عبدالرحمن': 'Abdulrahman',
  'عبد الرحمن': 'Abdulrahman',
  'عبدالعزيز': 'Abdulaziz',
  'عبد العزيز': 'Abdulaziz',
  'عبدالملك': 'Abdulmalik',
  'عبد الملك': 'Abdulmalik',
  'عبدالكريم': 'Abdulkareem',
  'عبد الكريم': 'Abdulkareem',
  'عبدالرزاق': 'Abdulrazzaq',
  'عبد الرزاق': 'Abdulrazzaq',
  'عبداللطيف': 'Abdullatif',
  'عبد اللطيف': 'Abdullatif',
  'عبدالمحسن': 'Abdulmohsen',
  'عبد المحسن': 'Abdulmohsen',
  'عبدالإله': 'Abdulilah',
  'عبد الإله': 'Abdulilah',
  'عبدالاله': 'Abdulilah',
  'خالد': 'Khaled',
  'سعود': 'Saud',
  'فيصل': 'Faisal',
  'سلمان': 'Salman',
  'ناصر': 'Nasser',
  'سلطان': 'Sultan',
  'فهد': 'Fahd',
  'تركي': 'Turki',
  'بندر': 'Bandar',
  'نايف': 'Nayef',
  'متعب': 'Muteb',
  'مشعل': 'Mishal',
  'عمر': 'Omar',
  'علي': 'Ali',
  'حسن': 'Hassan',
  'حسين': 'Hussein',
  'إبراهيم': 'Ibrahim',
  'ابراهيم': 'Ibrahim',
  'يوسف': 'Youssef',
  'صالح': 'Saleh',
  'سعد': 'Saad',
  'زيد': 'Zaid',
  'خلف': 'Khalaf',
  'مبارك': 'Mubarak',
  'راشد': 'Rashed',
  'ماجد': 'Majed',
  'وليد': 'Waleed',
  'طلال': 'Talal',
  'عبدالواحد': 'Abdulwahed',
  'عبد الواحد': 'Abdulwahed',
  'حمد': 'Hamad',
  'منصور': 'Mansour',
  'عامر': 'Amer',
  'سامي': 'Sami',
  'ياسر': 'Yasser',
  'بدر': 'Badr',
  'نواف': 'Nawaf',
  'عادل': 'Adel',
  'فارس': 'Fares',
  'هاني': 'Hani',
  'كريم': 'Kareem',
  'جاسم': 'Jasim',
  'جابر': 'Jaber',
  'ثامر': 'Thamer',
  'غازي': 'Ghazi',
  'ماهر': 'Maher',
  'عيسى': 'Essa',
  'موسى': 'Musa',
  'داود': 'Dawood',
  'سليمان': 'Sulaiman',
  'يحيى': 'Yahya',
  'زكريا': 'Zakaria',
  'عزيز': 'Aziz',
  'مهند': 'Muhannad',
  'نورة': 'Noura',
  'فاطمة': 'Fatima',
  'عائشة': 'Aisha',
  'مريم': 'Maryam',
  'سارة': 'Sara',
  'هند': 'Hind',
  'ريم': 'Reem',
  'لطيفة': 'Latifa',
  'منيرة': 'Munira',
  'نوف': 'Nouf',
  'العنود': 'Alanoud',
  'الجوهرة': 'Aljawharah',
  'هيا': 'Haya',
  'دلال': 'Dalal',
  'أمل': 'Amal',
  'موضي': 'Moudhi',
  'حصة': 'Hessa',
  'بن': 'bin',
  'ابن': 'bin',
  'آل': 'Al',
  'ال': 'Al',
  'الشايع': 'Al-Shaye',
};

interface FamilyMember {
  id: string;
  firstName: string;
  fatherId: string | null;
  familyName: string | null;
  gender: string;
}

function transliterateName(arabicName: string): string {
  if (!arabicName) return '';
  
  let result = arabicName.trim();
  
  for (const [arabic, english] of Object.entries(arabicNameMappings)) {
    result = result.replace(new RegExp(arabic, 'g'), english);
  }
  
  result = result
    .replace(/\s+/g, ' ')
    .replace(/\s+bin\s+/gi, ' bin ')
    .replace(/^bin\s+/gi, 'bin ')
    .trim();
  
  return result;
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

function generateFullNameEn(
  member: FamilyMember,
  allMembers: FamilyMember[]
): string {
  const parts: string[] = [transliterateName(member.firstName)];
  let currentMember: FamilyMember | undefined = member;

  while (currentMember?.fatherId) {
    const father = allMembers.find(m => m.id === currentMember!.fatherId);
    if (father) {
      parts.push('bin ' + transliterateName(father.firstName));
      currentMember = father;
    } else {
      break;
    }
  }

  parts.push(transliterateName(member.familyName || 'آل شايع'));
  return parts.join(' ');
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
