import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const data = JSON.parse(fs.readFileSync('/home/runner/workspace/prisma/production-data.json', 'utf-8'));
  console.log(`Loaded ${data.length} members from JSON`);

  // Delete existing members
  await prisma.$executeRawUnsafe(`SET session_replication_role = 'replica'`);
  await prisma.$executeRawUnsafe(`DELETE FROM "FamilyMember"`);
  
  // Insert in batches of 50
  const batchSize = 50;
  let total = 0;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    for (const m of batch) {
      try {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "FamilyMember" ("id","firstName","fatherName","grandfatherName","greatGrandfatherName","familyName","fatherId","gender","birthYear","birthCalendar","deathYear","deathCalendar","sonsCount","daughtersCount","generation","branch","fullNameAr","fullNameEn","lineageBranchId","lineageBranchName","subBranchId","subBranchName","lineagePath","phone","city","status","photoUrl","biography","occupation","email","createdAt","updatedAt","createdBy","lastModifiedBy","version","deletedAt","deletedBy","deletedReason")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31::timestamp,$32::timestamp,$33,$34,$35,$36::timestamp,$37,$38)
           ON CONFLICT (id) DO NOTHING`,
          m.id, m.firstName, m.fatherName||null, m.grandfatherName||null, m.greatGrandfatherName||null,
          m.familyName||'آل شايع', m.fatherId||null, m.gender||'MALE',
          m.birthYear||null, m.birthCalendar||'HIJRI', m.deathYear||null, m.deathCalendar||'HIJRI',
          m.sonsCount||0, m.daughtersCount||0, m.generation||null,
          m.branch||null, m.fullNameAr||null, m.fullNameEn||null,
          m.lineageBranchId||null, m.lineageBranchName||null, m.subBranchId||null, m.subBranchName||null,
          m.lineagePath||null, m.phone||null, m.city||null, m.status||'Living',
          m.photoUrl||null, m.biography||null, m.occupation||null, m.email||null,
          m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
          m.updatedAt ? new Date(m.updatedAt).toISOString() : new Date().toISOString(),
          m.createdBy||null, m.lastModifiedBy||null, m.version||1,
          m.deletedAt ? new Date(m.deletedAt).toISOString() : null, m.deletedBy||null, m.deletedReason||null
        );
        total++;
      } catch(e: any) {
        console.error(`Error ${m.id}: ${e.message?.substring(0,100)}`);
      }
    }
    console.log(`Progress: ${Math.min(i + batchSize, data.length)}/${data.length}`);
  }
  
  await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin'`);
  
  const count = await prisma.familyMember.count();
  console.log(`\nTotal inserted: ${total}, DB count: ${count}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
