const arabicNameMappings: Record<string, string> = {
  'محمد': 'Mohammed',
  'أحمد': 'Ahmed',
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
  'شايع': 'Shaye',
  'الشايع': 'Al-Shaye',
};

export function transliterateName(arabicName: string): string {
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

export function generateFullNameEn(
  firstName: string,
  fatherName?: string | null,
  grandfatherName?: string | null,
  familyName?: string | null
): string {
  const parts: string[] = [];
  
  if (firstName) {
    parts.push(transliterateName(firstName));
  }
  
  if (fatherName) {
    const transliterated = transliterateName(fatherName);
    if (!transliterated.toLowerCase().startsWith('bin ')) {
      parts.push('bin');
    }
    parts.push(transliterated);
  }
  
  if (grandfatherName) {
    const transliterated = transliterateName(grandfatherName);
    if (!transliterated.toLowerCase().startsWith('bin ')) {
      parts.push('bin');
    }
    parts.push(transliterated);
  }
  
  if (familyName) {
    parts.push(transliterateName(familyName));
  }
  
  return parts
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/bin\s+bin/gi, 'bin')
    .trim();
}

export function generateFullNameAr(
  firstName: string,
  fatherName?: string | null,
  grandfatherName?: string | null,
  familyName?: string | null
): string {
  const parts: string[] = [];
  
  if (firstName) parts.push(firstName.trim());
  if (fatherName) parts.push(`بن ${fatherName.trim()}`);
  if (grandfatherName) parts.push(`بن ${grandfatherName.trim()}`);
  if (familyName) parts.push(familyName.trim());
  
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}
