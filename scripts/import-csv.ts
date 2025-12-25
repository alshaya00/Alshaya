import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const CSV_FILE_PATH = path.join(process.cwd(), 'attached_assets/Family_Tree_Ultimate_System_Registry_1766701120894.csv');
const BATCH_SIZE = 100;

const MIN_GENERATION = 1;
const MAX_GENERATION = 20;

interface FamilyMemberData {
  id: string;
  firstName: string;
  fatherName: string | null;
  grandfatherName: string | null;
  greatGrandfatherName: string | null;
  familyName: string;
  fatherId: string | null;
  gender: string;
  birthYear: number | null;
  sonsCount: number;
  daughtersCount: number;
  generation: number;
  branch: string | null;
  fullNameAr: string | null;
  fullNameEn: string | null;
  phone: string | null;
  city: string | null;
  status: string;
}

interface ValidationIssue {
  memberId: string;
  memberName?: string;
  issue: string;
  severity: 'error' | 'warning';
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
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

function parseRow(values: string[]): FamilyMemberData | null {
  const id = values[0]?.trim();
  const firstName = values[1]?.trim();
  
  if (!id || !firstName) {
    return null;
  }

  const birthYearStr = values[7]?.trim();
  const sonsStr = values[8]?.trim();
  const daughtersStr = values[9]?.trim();
  const generationStr = values[10]?.trim();

  const birthYear = birthYearStr ? parseInt(birthYearStr, 10) : null;
  const sonsCount = sonsStr ? parseInt(sonsStr, 10) : 0;
  const daughtersCount = daughtersStr ? parseInt(daughtersStr, 10) : 0;
  const generation = generationStr ? parseInt(generationStr, 10) : 1;

  const gender = values[6]?.trim() || 'Male';
  const status = values[18]?.trim() || 'Living';

  return {
    id,
    firstName,
    fatherName: values[2]?.trim() || null,
    grandfatherName: values[3]?.trim() || null,
    greatGrandfatherName: values[4]?.trim() || null,
    familyName: 'آل شايع',
    fatherId: values[5]?.trim() || null,
    gender: gender === 'Male' || gender === 'Female' ? gender : 'Male',
    birthYear: birthYear && !isNaN(birthYear) ? birthYear : null,
    sonsCount: isNaN(sonsCount) ? 0 : sonsCount,
    daughtersCount: isNaN(daughtersCount) ? 0 : daughtersCount,
    generation: isNaN(generation) || generation < 1 ? 1 : generation,
    branch: values[11]?.trim() || null,
    fullNameAr: values[12]?.trim() || null,
    fullNameEn: values[13]?.trim() || null,
    phone: values[16]?.trim() || null,
    city: values[17]?.trim() || null,
    status: status === 'Living' || status === 'Deceased' ? status : 'Living',
  };
}

async function runPostImportValidation(): Promise<ValidationIssue[]> {
  console.log('\n🔍 Running post-import data integrity validation...');
  const issues: ValidationIssue[] = [];

  const members = await prisma.familyMember.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      firstName: true,
      generation: true,
      fatherId: true,
    },
  });

  const memberIds = new Set(members.map(m => m.id));
  const memberMap = new Map(members.map(m => [m.id, m]));

  for (const member of members) {
    if (member.generation < MIN_GENERATION || member.generation > MAX_GENERATION) {
      issues.push({
        memberId: member.id,
        memberName: member.firstName,
        issue: `Invalid generation value: ${member.generation}. Must be between ${MIN_GENERATION} and ${MAX_GENERATION}.`,
        severity: 'error',
      });
    }

    if (member.fatherId && !memberIds.has(member.fatherId)) {
      issues.push({
        memberId: member.id,
        memberName: member.firstName,
        issue: `Father ID '${member.fatherId}' does not exist in the database.`,
        severity: 'error',
      });
    }

    if (member.fatherId) {
      const father = memberMap.get(member.fatherId);
      if (father && member.generation <= father.generation) {
        issues.push({
          memberId: member.id,
          memberName: member.firstName,
          issue: `Member's generation (${member.generation}) should be greater than father's generation (${father.generation}).`,
          severity: 'warning',
        });
      }
    }

    if (!member.fatherId && member.generation > 2) {
      issues.push({
        memberId: member.id,
        memberName: member.firstName,
        issue: `Member has no parent but is in generation ${member.generation}. Only generation 1-2 members should be roots.`,
        severity: 'warning',
      });
    }
  }

  return issues;
}

function printValidationReport(issues: ValidationIssue[]) {
  console.log('\n📋 Data Integrity Validation Report');
  console.log('═'.repeat(50));

  if (issues.length === 0) {
    console.log('✅ No data integrity issues found!');
    return;
  }

  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');

  console.log(`Total issues: ${issues.length}`);
  console.log(`  ❌ Errors: ${errors.length}`);
  console.log(`  ⚠️  Warnings: ${warnings.length}`);

  if (errors.length > 0) {
    console.log('\n❌ ERRORS:');
    for (const error of errors.slice(0, 20)) {
      console.log(`  ${error.memberId} (${error.memberName}): ${error.issue}`);
    }
    if (errors.length > 20) {
      console.log(`  ... and ${errors.length - 20} more errors`);
    }
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    for (const warning of warnings.slice(0, 20)) {
      console.log(`  ${warning.memberId} (${warning.memberName}): ${warning.issue}`);
    }
    if (warnings.length > 20) {
      console.log(`  ... and ${warnings.length - 20} more warnings`);
    }
  }
}

async function importCSV() {
  console.log('📂 Reading CSV file...');
  
  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error(`❌ CSV file not found: ${CSV_FILE_PATH}`);
    process.exit(1);
  }

  const content = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    console.error('❌ CSV file is empty or has no data rows');
    process.exit(1);
  }

  console.log(`📊 Found ${lines.length - 1} data rows (excluding header)`);

  const members: FamilyMemberData[] = [];
  let skippedRows = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const member = parseRow(values);

    if (member) {
      members.push(member);
    } else {
      skippedRows++;
    }
  }

  console.log(`✅ Parsed ${members.length} valid members`);
  console.log(`⏭️  Skipped ${skippedRows} rows (empty firstName or ID)`);

  console.log('\n🗑️  Clearing existing FamilyMember data...');
  await prisma.familyMember.deleteMany();
  console.log('✅ Existing data cleared');

  console.log(`\n📤 Importing ${members.length} members in batches of ${BATCH_SIZE}...`);
  
  let importedCount = 0;
  const totalBatches = Math.ceil(members.length / BATCH_SIZE);

  for (let i = 0; i < members.length; i += BATCH_SIZE) {
    const batch = members.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

    try {
      await prisma.familyMember.createMany({
        data: batch,
        skipDuplicates: true,
      });
      importedCount += batch.length;
      console.log(`  Batch ${batchNumber}/${totalBatches}: ${batch.length} members`);
    } catch (error) {
      console.error(`  ❌ Batch ${batchNumber} failed:`, error);
    }
  }

  console.log('\n📊 Import Summary');
  console.log('═'.repeat(50));
  console.log(`Total imported: ${importedCount}`);

  const genderCounts = members.reduce((acc, m) => {
    acc[m.gender] = (acc[m.gender] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log(`\nGender distribution:`);
  Object.entries(genderCounts).forEach(([gender, count]) => {
    console.log(`  ${gender}: ${count}`);
  });

  const generationCounts = members.reduce((acc, m) => {
    acc[m.generation] = (acc[m.generation] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  console.log(`\nGeneration distribution:`);
  Object.entries(generationCounts)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .forEach(([gen, count]) => {
      console.log(`  Generation ${gen}: ${count}`);
    });

  const statusCounts = members.reduce((acc, m) => {
    acc[m.status] = (acc[m.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log(`\nStatus distribution:`);
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });

  console.log('\n✅ Import completed successfully!');

  const validationIssues = await runPostImportValidation();
  printValidationReport(validationIssues);

  if (validationIssues.filter(i => i.severity === 'error').length > 0) {
    console.log('\n⚠️  Import completed with data integrity errors. Please review and fix the issues above.');
  }
}

importCSV()
  .catch((error) => {
    console.error('❌ Import failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
