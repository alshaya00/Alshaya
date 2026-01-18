import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface CSVRow {
  id: string;
  firstName: string;
  fatherName: string | null;
  grandfatherName: string | null;
  greatGrandfatherName: string | null;
  familyName: string;
  fatherId: string | null;
  gender: string;
  birthYear: number | null;
  deathYear: number | null;
  sonsCount: number;
  daughtersCount: number;
  generation: number;
  branch: string | null;
  fullNameAr: string | null;
  fullNameEn: string | null;
  phone: string | null;
  city: string | null;
  status: string;
  occupation: string | null;
  email: string | null;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizePhone(phone: string | null): string | null {
  if (!phone || phone === '' || phone === '-') return null;
  
  let normalized = phone.replace(/[^\d]/g, '');
  
  if (normalized.endsWith('.0')) {
    normalized = normalized.slice(0, -2);
  }
  normalized = normalized.replace(/\.0$/, '');
  normalized = normalized.split('.')[0];
  
  if (normalized.startsWith('966') && normalized.length === 12) {
    return '+' + normalized;
  }
  if (normalized.startsWith('05') && normalized.length === 10) {
    return '+966' + normalized.substring(1);
  }
  if (normalized.startsWith('5') && normalized.length === 9) {
    return '+966' + normalized;
  }
  if (normalized.length >= 9) {
    return '+966' + normalized.slice(-9);
  }
  
  return null;
}

function parseGender(gender: string): string {
  if (gender === 'ذكر' || gender.toLowerCase() === 'male') return 'MALE';
  if (gender === 'أنثى' || gender.toLowerCase() === 'female') return 'FEMALE';
  return 'MALE';
}

function parseStatus(status: string): string {
  if (status === 'متوفي' || status === 'متوفى') return 'Deceased';
  if (status === 'على قيد الحياة') return 'Living';
  return 'Living';
}

function parseNumber(value: string | null): number | null {
  if (!value || value === '' || value === '-') return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : Math.floor(num);
}

function cleanString(value: string | null): string | null {
  if (!value || value === '' || value === '-') return null;
  return value.trim();
}

async function main() {
  console.log('Starting CSV import...');
  
  const csvPath = path.join(process.cwd(), 'attached_assets', 'Alshaya_Family_Merged_2026_1768773183459.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found:', csvPath);
    process.exit(1);
  }
  
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  console.log(`Found ${lines.length - 1} records in CSV`);
  
  const headers = parseCSVLine(lines[0]);
  console.log('Headers:', headers);
  
  const rows: CSVRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 10) continue;
    
    const row: CSVRow = {
      id: values[0] || `P${i}`,
      firstName: values[1] || 'غير معروف',
      fatherName: cleanString(values[2]),
      grandfatherName: cleanString(values[3]),
      greatGrandfatherName: cleanString(values[4]),
      familyName: values[5] || 'آل شايع',
      fatherId: cleanString(values[6]),
      gender: parseGender(values[7] || 'ذكر'),
      birthYear: parseNumber(values[8]),
      deathYear: parseNumber(values[9]),
      sonsCount: parseNumber(values[10]) || 0,
      daughtersCount: parseNumber(values[11]) || 0,
      generation: parseNumber(values[12]) || 1,
      branch: cleanString(values[13]),
      fullNameAr: cleanString(values[14]),
      fullNameEn: cleanString(values[15]),
      phone: normalizePhone(values[16]),
      city: cleanString(values[17]),
      status: parseStatus(values[18] || 'على قيد الحياة'),
      occupation: cleanString(values[19]),
      email: cleanString(values[20]),
    };
    
    rows.push(row);
  }
  
  console.log(`Parsed ${rows.length} valid records`);
  
  const sortedRows = rows.sort((a, b) => a.generation - b.generation);
  
  console.log('Clearing old FamilyMember data...');
  
  await prisma.duplicateFlag.deleteMany({});
  await prisma.changeHistory.deleteMany({});
  await prisma.breastfeedingRelationship.deleteMany({});
  await prisma.memberPhoto.deleteMany({});
  
  await prisma.familyMember.deleteMany({});
  
  console.log('Importing new members...');
  
  let imported = 0;
  let errors = 0;
  
  for (const row of sortedRows) {
    try {
      await prisma.familyMember.create({
        data: {
          id: row.id,
          firstName: row.firstName,
          fatherName: row.fatherName,
          grandfatherName: row.grandfatherName,
          greatGrandfatherName: row.greatGrandfatherName,
          familyName: row.familyName,
          fatherId: row.fatherId,
          gender: row.gender,
          birthYear: row.birthYear,
          birthCalendar: 'HIJRI',
          deathYear: row.deathYear,
          deathCalendar: 'HIJRI',
          sonsCount: row.sonsCount,
          daughtersCount: row.daughtersCount,
          generation: row.generation,
          branch: row.branch,
          fullNameAr: row.fullNameAr,
          fullNameEn: row.fullNameEn,
          phone: row.phone,
          city: row.city,
          status: row.status,
          occupation: row.occupation,
          email: row.email,
        },
      });
      imported++;
      
      if (imported % 50 === 0) {
        console.log(`Imported ${imported}/${rows.length}...`);
      }
    } catch (error) {
      errors++;
      console.error(`Error importing ${row.id} (${row.firstName}):`, error);
    }
  }
  
  console.log(`\nImport complete!`);
  console.log(`Successfully imported: ${imported}`);
  console.log(`Errors: ${errors}`);
  
  const count = await prisma.familyMember.count();
  console.log(`Total members in database: ${count}`);
  
  const generationCounts = await prisma.familyMember.groupBy({
    by: ['generation'],
    _count: true,
    orderBy: { generation: 'asc' },
  });
  
  console.log('\nMembers by generation:');
  generationCounts.forEach(g => {
    console.log(`  Generation ${g.generation}: ${g._count} members`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
