const fs = require('fs');
const path = require('path');

const ARABIC_TO_ENGLISH = {
  'حمد': 'Hamad',
  'ابراهيم': 'Ibrahim',
  'عبدالكريم': 'Abdulkareem',
  'فوزان': 'Fawzan',
  'محمد': 'Mohammed',
  'ناصر': 'Nasser',
  'عبدالمحسن': 'Abdulmohsen',
  'عبدالرحمن': 'Abdulrahman',
  'سعد': 'Saad',
  'فهد': 'Fahd',
  'خالد': 'Khaled',
  'شايع': 'Shaye',
  'وليد': 'Waleed',
  'عبدالعزيز': 'Abdulaziz',
  'فيصل': 'Faisal',
  'يزيد': 'Yazid',
  'عبدالله': 'Abdullah',
  'عبدالاله': 'Abdulilah',
  'البراء': 'Al-Bara',
  'أحمد': 'Ahmed',
  'احمد': 'Ahmed',
  'عثمان': 'Othman',
  'صالح': 'Saleh',
  'سليمان': 'Sulaiman',
  'عبدالعزيز': 'Abdulaziz',
  'عبدالملك': 'Abdulmalik',
  'سلطان': 'Sultan',
  'بندر': 'Bandar',
  'تركي': 'Turki',
  'سعود': 'Saud',
  'مشاري': 'Mishari',
  'مشعل': 'Mishal',
  'منصور': 'Mansour',
  'نايف': 'Nayef',
  'نواف': 'Nawaf',
  'فهاد': 'Fahad',
  'حسين': 'Hussein',
  'حسن': 'Hassan',
  'علي': 'Ali',
  'عمر': 'Omar',
  'رائد': 'Raed',
  'رياض': 'Riyadh',
  'زياد': 'Ziad',
  'ماجد': 'Majed',
  'مازن': 'Mazen',
  'طارق': 'Tariq',
  'عادل': 'Adel',
  'فارس': 'Fares',
  'راشد': 'Rashed',
  'سالم': 'Salem',
  'جاسم': 'Jasem',
  'جمال': 'Jamal',
  'حاتم': 'Hatem',
  'حامد': 'Hamed',
  'داود': 'Dawood',
  'هشام': 'Hesham',
  'وائل': 'Wael',
  'ياسر': 'Yaser',
  'يوسف': 'Youssef',
  'خليل': 'Khalil',
  'مبارك': 'Mubarak',
  'عياد': 'Ayad',
  'عبيد': 'Obeid',
  'عويد': 'Owaid',
  'هادي': 'Hadi',
  'ثاني': 'Thani',
  'ثامر': 'Thamer',
  'جابر': 'Jaber',
  'رشيد': 'Rasheed',
  'زكي': 'Zaki',
  'سامي': 'Sami',
  'شادي': 'Shadi',
  'ضاري': 'Dhari',
  'طلال': 'Talal',
  'عمار': 'Ammar',
  'غانم': 'Ghanem',
  'فاضل': 'Fadel',
  'قاسم': 'Qasem',
  'كمال': 'Kamal',
  'لطيف': 'Lateef',
  'محسن': 'Mohsen',
  'مروان': 'Marwan',
  'مصطفى': 'Mustafa',
  'معاذ': 'Muath',
  'نبيل': 'Nabil',
  'هاني': 'Hani',
  'يحيى': 'Yahya',
  'حور': 'Hour',
  'جود': 'Joud',
  'عبدالمجيد': 'Abdulmajid',
  'ألين': 'Aleen',
  'جنى': 'Jana',
  'رفيف': 'Rafif',
  'ديم': 'Deem',
  'لين': 'Leen',
  'قماشة': 'Qumasha',
  'فوزية': 'Fawziya',
  'منى': 'Muna',
  'عامر': 'Amer',
  'قتيبة': 'Qutaiba',
  'فواز': 'Fawwaz',
  'مصعب': 'Musab',
  'عاصم': 'Asem',
  'اسامه': 'Osama',
  'باسل': 'Basel',
  'حسام': 'Hussam',
  'انس': 'Anas',
  'أنس': 'Anas',
  'ربى': 'Ruba',
  'ديما': 'Dima',
  'الين': 'Aleen',
  'لبنى': 'Lubna',
  'لمى': 'Lama',
  'اسماء': 'Asma',
  'خلود': 'Khulood',
  'هالة': 'Hala',
  'هاله': 'Hala',
  'بشار': 'Bashar',
  'مساعد': 'Musaed',
  'بدر': 'Badr',
  'جهاد': 'Jihad',
  'صلاح': 'Salah',
  'عبدالسلام': 'Abdulsalam',
  'ريان': 'Rayan',
  'راكان': 'Rakan',
  'عافت': 'Afet',
  'حياة': 'Hayat',
  'حنان': 'Hanan',
  'هنا': 'Hana',
  'نجد': 'Najd',
  'بسمة': 'Basma',
  'كندا': 'Kinda',
  'تميم': 'Tameem',
  'مؤيد': 'Muayad',
  'عزام': 'Azzam',
  'بتال': 'Battal',
  'شروق': 'Shurouq',
  'تغريد': 'Taghreed',
  'أسماء': 'Asma',
  'أروى': 'Arwa',
  'مدى': 'Mada',
  'مشاعل': 'Mashael',
  'نجلاء': 'Najla',
  'جمانه': 'Jumana',
  'سفانة': 'Safana',
  'سلاف': 'Sulaf',
  'شموخ': 'Shumoukh',
  'أضواء': 'Adhwa',
  'صبا': 'Saba',
  'فرح': 'Farah',
  'ليلى': 'Laila',
  'منار': 'Manar',
  'تالا': 'Tala',
  'جدى': 'Judi',
  'ريما': 'Reema',
  'ديمة': 'Deema',
  'في': 'Fi',
  'عايش': 'Ayesh',
  'عايض': 'Aydh',
  'دخيل': 'Dakheel',
  'راجح': 'Rajeh',
  'حمود': 'Hammoud',
  'معيض': 'Muidh',
  'ضيف': 'Dhaif',
  'ضيف الله': 'Dhaifallah',
  'رجاء': 'Raja',
  'نورة': 'Noura',
  'فاطمة': 'Fatima',
  'عائشة': 'Aisha',
  'مريم': 'Maryam',
  'سارة': 'Sarah',
  'هيا': 'Haya',
  'لولوة': 'Lulwa',
  'منيرة': 'Munira',
  'لطيفة': 'Latifa',
  'موضي': 'Moudhi',
  'نوف': 'Nouf',
  'غادة': 'Ghada',
  'ريم': 'Reem',
  'دانة': 'Dana',
  'لينا': 'Lina',
  'هند': 'Hind',
  'جوهرة': 'Jawhara',
  'الجوهرة': 'Al-Jawhara',
  'شيخة': 'Sheikha',
  'حصة': 'Hessa',
  'العنود': 'Al-Anoud',
  'البندري': 'Al-Bandari',
  'بدور': 'Badour',
  'أميرة': 'Amira',
  'عزيزة': 'Aziza',
  'وفاء': 'Wafa',
  'سلمى': 'Salma',
  'مها': 'Maha',
  'أمل': 'Amal',
  'هدى': 'Huda',
  'ندى': 'Nada',
  'رنا': 'Rana',
  'سماح': 'Samah',
  'شيماء': 'Shaima',
  'رقية': 'Ruqayyah',
  'زينب': 'Zainab',
  'عبير': 'Abeer',
  'جميلة': 'Jamila',
  'خديجة': 'Khadija',
  'رحاب': 'Rehab',
  'سهام': 'Seham',
  'مي': 'Mai',
  'رهف': 'Rahaf',
  'شهد': 'Shahad',
  'ابتسام': 'Ibtisam',
  'جواهر': 'Jawaher',
  'عواطف': 'Awatif',
  'عبلة': 'Abla',
  'لمياء': 'Lamia',
  'غالية': 'Ghalia',
  'فاتن': 'Faten',
  'سلوى': 'Salwa',
  'نعيمة': 'Naima',
  'مضاوي': 'Mudhawi',
  'وضحى': 'Wadhha',
  'شريفة': 'Sharifa',
  'صيتة': 'Saita',
};

function transliterateToEnglish(arabicName) {
  if (!arabicName) return '';
  
  const normalized = arabicName.trim();
  if (ARABIC_TO_ENGLISH[normalized]) {
    return ARABIC_TO_ENGLISH[normalized];
  }
  
  for (const [ar, en] of Object.entries(ARABIC_TO_ENGLISH)) {
    if (normalized.includes(ar)) {
      return en;
    }
  }
  
  console.warn(`No transliteration found for: ${normalized}`);
  return normalized;
}

function parseCSV(csvContent) {
  const lines = csvContent.split('\n');
  const headers = lines[0].replace(/^\uFEFF/, '').split(',');
  
  const members = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const member = {};
    headers.forEach((header, idx) => {
      member[header.trim()] = values[idx] || '';
    });
    members.push(member);
  }
  
  return members;
}

function buildMemberMap(members) {
  const map = new Map();
  members.forEach(m => {
    const id = m['الرقم'];
    if (id) map.set(id, m);
  });
  return map;
}

function getFullLineage(memberId, memberMap, maxDepth = 10) {
  const lineage = [];
  let currentId = memberId;
  let depth = 0;
  
  while (currentId && depth < maxDepth) {
    const member = memberMap.get(currentId);
    if (!member) break;
    
    lineage.push(member['الاسم الأول']);
    currentId = member['رقم الأب'];
    depth++;
  }
  
  return lineage;
}

function isFemale(gender) {
  const g = (gender || '').toLowerCase().trim();
  return g === 'أنثى' || g === 'female';
}

function generateArabicFullName(lineage, gender) {
  if (lineage.length === 0) return '';
  
  if (lineage.length === 1) {
    return `${lineage[0]} آل شايع`;
  }
  
  const connector = isFemale(gender) ? 'بنت' : 'بن';
  const parts = [lineage[0]];
  
  for (let i = 1; i < lineage.length; i++) {
    parts.push(connector);
    parts.push(lineage[i]);
  }
  
  parts.push('آل شايع');
  return parts.join(' ');
}

function generateEnglishFullName(lineage, gender) {
  if (lineage.length === 0) return '';
  
  const englishNames = lineage.map(name => transliterateToEnglish(name));
  
  if (englishNames.length === 1) {
    return `${englishNames[0]} Al Shaye`;
  }
  
  const connector = isFemale(gender) ? 'bint' : 'bin';
  const parts = [englishNames[0]];
  
  for (let i = 1; i < englishNames.length; i++) {
    parts.push(connector);
    parts.push(englishNames[i]);
  }
  
  parts.push('Al Shaye');
  return parts.join(' ');
}

async function main() {
  const csvPath = 'attached_assets/Alshaya_Family_Merged_2026_1768841118043.csv';
  
  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found at:', csvPath);
    process.exit(1);
  }
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const members = parseCSV(csvContent);
  const memberMap = buildMemberMap(members);
  
  console.log(`Loaded ${members.length} members`);
  
  const results = [];
  const issues = [];
  
  for (const member of members) {
    const id = member['الرقم'];
    const firstName = member['الاسم الأول'];
    const fatherId = member['رقم الأب'];
    const gender = member['الجنس'];
    const oldArabicName = member['الاسم الكامل بالعربي'];
    const oldEnglishName = member['الاسم الكامل بالانجليزي'];
    
    const lineage = getFullLineage(id, memberMap);
    const newArabicName = generateArabicFullName(lineage, gender);
    const newEnglishName = generateEnglishFullName(lineage, gender);
    
    const arabicChanged = oldArabicName !== newArabicName;
    const englishChanged = oldEnglishName !== newEnglishName;
    
    if (arabicChanged || englishChanged) {
      issues.push({
        id,
        firstName,
        fatherId,
        oldArabic: oldArabicName,
        newArabic: newArabicName,
        oldEnglish: oldEnglishName,
        newEnglish: newEnglishName,
        arabicChanged,
        englishChanged,
      });
    }
    
    results.push({
      ...member,
      'الاسم الكامل بالعربي': newArabicName,
      'الاسم الكامل بالانجليزي': newEnglishName,
    });
  }
  
  console.log(`\nFound ${issues.length} members with name changes:\n`);
  
  issues.forEach(issue => {
    console.log(`${issue.id} (${issue.firstName}):`);
    if (issue.arabicChanged) {
      console.log(`  Arabic: "${issue.oldArabic}" → "${issue.newArabic}"`);
    }
    if (issue.englishChanged) {
      console.log(`  English: "${issue.oldEnglish}" → "${issue.newEnglish}"`);
    }
    console.log('');
  });
  
  const outputPath = 'attached_assets/Alshaya_Family_Regenerated.csv';
  const headers = Object.keys(results[0]);
  const csvOutput = [
    headers.join(','),
    ...results.map(r => headers.map(h => {
      const val = r[h] || '';
      if (val.includes(',') || val.includes('"')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(','))
  ].join('\n');
  
  fs.writeFileSync(outputPath, '\uFEFF' + csvOutput, 'utf-8');
  console.log(`\nOutput saved to: ${outputPath}`);
  
  const summaryPath = 'attached_assets/name_changes_summary.json';
  fs.writeFileSync(summaryPath, JSON.stringify(issues, null, 2), 'utf-8');
  console.log(`Summary saved to: ${summaryPath}`);
}

main().catch(console.error);
