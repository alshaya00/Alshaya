const arabicNameMappings: Record<string, string> = {
  'محمد': 'Mohammed',
  'أحمد': 'Ahmed',
  'احمد': 'Ahmed',
  'حياة': 'Hayat',
  'مساعد': 'Musaed',
  'فوزان': 'Fawzan',
  'عثمان': 'Othman',
  'شايع': 'Shaye',
  'عبدالاله': 'Abdulilah',
  'البراء': 'Al-Bara',
  'وليد': 'Waleed',
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
  'عبدالمجيد': 'Abdulmajid',
  'عبد المجيد': 'Abdulmajid',
  'عبدالسلام': 'Abdulsalam',
  'عبد السلام': 'Abdulsalam',
  'عبدالجبار': 'Abduljabbar',
  'عبد الجبار': 'Abduljabbar',
  'عبدالحميد': 'Abdulhamid',
  'عبد الحميد': 'Abdulhamid',
  'عبدالقادر': 'Abdulqader',
  'عبد القادر': 'Abdulqader',
  'ريما': 'Reema',
  'ريم': 'Reem',
  'أضواء': 'Adhwa',
  'صبا': 'Saba',
  'فرح': 'Farah',
  'لمى': 'Lama',
  'ديمة': 'Deema',
  'تميم': 'Tamim',
  'عاصم': 'Asim',
  'مشاري': 'Mishari',
  'مصعب': 'Musab',
  'لين': 'Leen',
  'لينا': 'Lina',
  'جنى': 'Jana',
  'رزان': 'Razan',
  'غادة': 'Ghada',
  'أريج': 'Areej',
  'وجدان': 'Wijdan',
  'شوق': 'Shouq',
  'رغد': 'Raghad',
  'غلا': 'Ghala',
  'دانة': 'Dana',
  'لجين': 'Lujain',
  'رند': 'Rand',
  'شهد': 'Shahad',
  'نوره': 'Noura',
  'منال': 'Manal',
  'أسماء': 'Asma',
  'اسماء': 'Asma',
  'أروى': 'Arwa',
  'ألين': 'Aleen',
  'الين': 'Aleen',
  'أنس': 'Anas',
  'انس': 'Anas',
  'اسامه': 'Osama',
  'باسل': 'Basel',
  'بتال': 'Battal',
  'بسمة': 'Basma',
  'بشار': 'Bashar',
  'تالا': 'Tala',
  'تغريد': 'Taghreed',
  'تهاني': 'Tahani',
  'جدى': 'Juda',
  'جمانه': 'Jumana',
  'جميلة': 'Jamila',
  'جهاد': 'Jihad',
  'جواهر': 'Jawaher',
  'جود': 'Joud',
  'حسام': 'Hussam',
  'حنان': 'Hanan',
  'حور': 'Hour',
  'خلود': 'Khuloud',
  'دخيل': 'Dakheel',
  'ديم': 'Deem',
  'ديما': 'Deema',
  'رائد': 'Raed',
  'راكان': 'Rakan',
  'ربى': 'Ruba',
  'رفيف': 'Rafeef',
  'رنا': 'Rana',
  'رياض': 'Riyadh',
  'ريان': 'Rayan',
  'زياد': 'Ziad',
  'سفانة': 'Safana',
  'سلاف': 'Sulaf',
  'شروق': 'Shurouq',
  'شموخ': 'Shumukh',
  'صلاح': 'Salah',
  'عافت': 'Afat',
  'عبير': 'Abeer',
  'عزام': 'Azzam',
  'عمرو': 'Amr',
  'فاتن': 'Faten',
  'فواز': 'Fawaz',
  'فوزية': 'Fawzia',
  'في': 'Fi',
  'قتيبة': 'Qutaiba',
  'قماشة': 'Qumasha',
  'كندا': 'Kinda',
  'لبنى': 'Lubna',
  'لمياء': 'Lamya',
  'لولوة': 'Lulwa',
  'ليلى': 'Layla',
  'مؤيد': 'Muayad',
  'مازن': 'Mazen',
  'مدى': 'Mada',
  'مشاعل': 'Mashael',
  'معاذ': 'Muath',
  'منار': 'Manar',
  'منى': 'Muna',
  'مها': 'Maha',
  'نجد': 'Najd',
  'نجلاء': 'Najla',
  'هالة': 'Hala',
  'هنا': 'Hana',
  'وسمية': 'Wasmiya',
  'وفاء': 'Wafa',
  'ابو': 'Abu',
  'أبو': 'Abu',
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
  'بن': '',
  'ابن': '',
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
  
  // Clean up whitespace and remove any lingering "bin" references
  result = result
    .replace(/\s+/g, ' ')
    .replace(/\bbin\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  return result;
}

export function generateFullNameEn(
  firstName: string,
  fatherName?: string | null,
  grandfatherName?: string | null,
  familyName?: string | null
): string {
  // Format: FirstName Father Grandfather... FamilyName (no "bin")
  const nameParts: string[] = [];
  
  // Add first name
  if (firstName) {
    const transliterated = transliterateName(firstName);
    if (transliterated) nameParts.push(transliterated);
  }
  
  // Add father's name (without "bin")
  if (fatherName) {
    const transliterated = transliterateName(fatherName);
    if (transliterated) nameParts.push(transliterated);
  }
  
  // Add grandfather's name (without "bin")
  if (grandfatherName) {
    const transliterated = transliterateName(grandfatherName);
    if (transliterated) nameParts.push(transliterated);
  }
  
  // Add family name at the end
  if (familyName) {
    const transliterated = transliterateName(familyName);
    if (transliterated) nameParts.push(transliterated);
  }
  
  return nameParts
    .join(' ')
    .replace(/\s+/g, ' ')
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
