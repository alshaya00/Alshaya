const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Read the seed.ts file directly
const seedPath = path.join(__dirname, '..', 'prisma', 'seed.ts');
const seedContent = fs.readFileSync(seedPath, 'utf8');

// Extract the array - find from 'familyMembers = [' to the ']'
const startMarker = 'const familyMembers = [';
const startIdx = seedContent.indexOf(startMarker);
if (startIdx === -1) {
  console.error('Could not find familyMembers in seed.ts');
  process.exit(1);
}

// Find matching bracket
let bracketCount = 0;
let started = false;
let endIdx = -1;

for (let i = startIdx + startMarker.length - 1; i < seedContent.length; i++) {
  if (seedContent[i] === '[') {
    bracketCount++;
    started = true;
  } else if (seedContent[i] === ']') {
    bracketCount--;
    if (started && bracketCount === 0) {
      endIdx = i + 1;
      break;
    }
  }
}

if (endIdx === -1) {
  console.error('Could not find end of familyMembers array');
  process.exit(1);
}

// Extract the array content
let arrayStr = seedContent.slice(startIdx + 'const familyMembers = '.length, endIdx);

// Clean up TypeScript syntax for JSON parsing
arrayStr = arrayStr
  .replace(/\/\/.*$/gm, '')  // Remove comments
  .replace(/([{,]\s*)(\w+):/g, '$1"$2":')  // Quote property names
  .replace(/'/g, '"')  // Single to double quotes
  .replace(/,\s*([}\]])/g, '$1')  // Remove trailing commas
  .replace(/\n\s*\n/g, '\n');  // Remove empty lines

let members;
try {
  members = JSON.parse(arrayStr);
  console.log('Found', members.length, 'members to seed');
} catch (e) {
  console.error('Parse error:', e.message);
  // Write debug file
  fs.writeFileSync('/tmp/debug-array.json', arrayStr);
  console.error('Wrote debug to /tmp/debug-array.json');
  process.exit(1);
}

const dbPath = path.join(__dirname, '..', 'prisma', 'family.db');
const db = new Database(dbPath);

const insert = db.prepare(`
  INSERT OR REPLACE INTO FamilyMember (
    id, firstName, fatherName, grandfatherName, greatGrandfatherName,
    familyName, fatherId, gender, birthYear, deathYear, sonsCount,
    daughtersCount, generation, branch, fullNameAr, fullNameEn,
    phone, city, status, photoUrl, biography, occupation, email
  ) VALUES (
    @id, @firstName, @fatherName, @grandfatherName, @greatGrandfatherName,
    @familyName, @fatherId, @gender, @birthYear, @deathYear, @sonsCount,
    @daughtersCount, @generation, @branch, @fullNameAr, @fullNameEn,
    @phone, @city, @status, @photoUrl, @biography, @occupation, @email
  )
`);

const insertMany = db.transaction((members) => {
  for (const m of members) {
    insert.run({
      id: m.id,
      firstName: m.firstName,
      fatherName: m.fatherName || null,
      grandfatherName: m.grandfatherName || null,
      greatGrandfatherName: m.greatGrandfatherName || null,
      familyName: m.familyName || 'آل شايع',
      fatherId: m.fatherId || null,
      gender: m.gender,
      birthYear: m.birthYear || null,
      deathYear: m.deathYear || null,
      sonsCount: m.sonsCount || 0,
      daughtersCount: m.daughtersCount || 0,
      generation: m.generation || 1,
      branch: m.branch || null,
      fullNameAr: m.fullNameAr || null,
      fullNameEn: m.fullNameEn || null,
      phone: m.phone || null,
      city: m.city || null,
      status: m.status || 'Alive',
      photoUrl: m.photoUrl || null,
      biography: m.biography || null,
      occupation: m.occupation || null,
      email: m.email || null
    });
  }
});

insertMany(members);

const count = db.prepare('SELECT COUNT(*) as count FROM FamilyMember').get();
console.log('Successfully seeded', count.count, 'members');

// Show sample
const sample = db.prepare('SELECT id, firstName, generation FROM FamilyMember ORDER BY id LIMIT 5').all();
console.log('Sample:', sample);

// Show max ID
const maxId = db.prepare('SELECT id FROM FamilyMember ORDER BY id DESC LIMIT 1').get();
console.log('Max ID:', maxId);

db.close();
