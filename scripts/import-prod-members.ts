import { prisma } from '../src/lib/prisma';
import * as fs from 'fs';

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
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

async function main() {
  const csvPath = './attached_assets/drizzle-data-2026-01-06T23_58_14.826Z_1767743913156.csv';
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  
  const header = parseCSVLine(lines[0]);
  console.log('Header columns:', header.length);
  console.log('Headers:', header);
  
  const members: any[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, any> = {};
    
    for (let j = 0; j < header.length; j++) {
      row[header[j]] = values[j] || null;
    }
    
    members.push({
      id: row.id,
      firstName: row.firstName || '',
      fatherName: row.fatherName || null,
      grandfatherName: row.grandfatherName || null,
      greatGrandfatherName: row.greatGrandfatherName || null,
      familyName: row.familyName || 'آل شايع',
      gender: row.gender || 'Male',
      birthYear: row.birthYear ? parseInt(row.birthYear) : null,
      deathYear: row.deathYear ? parseInt(row.deathYear) : null,
      sonsCount: row.sonsCount ? parseInt(row.sonsCount) : 0,
      daughtersCount: row.daughtersCount ? parseInt(row.daughtersCount) : 0,
      generation: row.generation ? parseInt(row.generation) : 1,
      branch: row.branch || null,
      fullNameAr: row.fullNameAr || null,
      fullNameEn: row.fullNameEn || null,
      lineageBranchId: row.lineageBranchId || null,
      lineageBranchName: row.lineageBranchName || null,
      subBranchId: row.subBranchId || null,
      subBranchName: row.subBranchName || null,
      lineagePath: row.lineagePath || null,
      phone: row.phone || null,
      city: row.city || null,
      status: row.status || 'Living',
      photoUrl: row.photoUrl || null,
      biography: row.biography || null,
      occupation: row.occupation || null,
      email: row.email || null,
      createdBy: row.createdBy || null,
      lastModifiedBy: row.lastModifiedBy || null,
      version: row.version ? parseInt(row.version) : 1,
      birthCalendar: row.birthCalendar || 'GREGORIAN',
      deathCalendar: row.deathCalendar || 'GREGORIAN',
      _fatherId: row.fatherId || null,
    });
  }
  
  console.log('Parsed', members.length, 'members');
  console.log('Sample member:', JSON.stringify(members[0], null, 2));
  
  console.log('Inserting members...');
  let inserted = 0;
  for (const m of members) {
    const { _fatherId, ...data } = m;
    try {
      await prisma.familyMember.create({ data });
      inserted++;
    } catch (e: any) {
      console.error('Error inserting', m.id, ':', e.message);
    }
  }
  console.log('Inserted', inserted, 'members');
  
  console.log('Updating father references...');
  let updated = 0;
  for (const m of members) {
    if (m._fatherId) {
      try {
        await prisma.familyMember.update({
          where: { id: m.id },
          data: { fatherId: m._fatherId }
        });
        updated++;
      } catch (e: any) {
        console.error('Error updating fatherId for', m.id, ':', e.message);
      }
    }
  }
  console.log('Updated', updated, 'father references');
  
  const count = await prisma.familyMember.count();
  console.log('Total members in DB:', count);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
