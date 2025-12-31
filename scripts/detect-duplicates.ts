import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function normalizeArabicName(name: string): string {
  return name
    .replace(/[\u064B-\u0652]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[a.length][b.length];
}

function calculateSimilarity(a: string, b: string): number {
  const distance = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - distance / maxLen;
}

interface DuplicateGroup {
  members: {
    id: string;
    firstName: string;
    fullNameAr: string | null;
    phone: string | null;
    email: string | null;
    generation: number;
  }[];
  matchReasons: string[];
  similarity: number;
}

async function detectDuplicates() {
  console.log('🔍 Scanning for duplicate members...\n');

  const members = await prisma.familyMember.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      firstName: true,
      fatherName: true,
      fullNameAr: true,
      phone: true,
      email: true,
      generation: true,
      fatherId: true,
    },
  });

  console.log(`📋 Analyzing ${members.length} members...\n`);

  const duplicateGroups: DuplicateGroup[] = [];
  const processed = new Set<string>();

  for (let i = 0; i < members.length; i++) {
    if (processed.has(members[i].id)) continue;

    const member = members[i];
    const group: DuplicateGroup = {
      members: [{
        id: member.id,
        firstName: member.firstName,
        fullNameAr: member.fullNameAr,
        phone: member.phone,
        email: member.email,
        generation: member.generation,
      }],
      matchReasons: [],
      similarity: 0,
    };

    for (let j = i + 1; j < members.length; j++) {
      if (processed.has(members[j].id)) continue;

      const other = members[j];
      const reasons: string[] = [];
      let score = 0;

      if (member.phone && other.phone && member.phone === other.phone) {
        reasons.push('تطابق رقم الهاتف');
        score += 0.5;
      }

      if (member.email && other.email && member.email.toLowerCase() === other.email.toLowerCase()) {
        reasons.push('تطابق البريد الإلكتروني');
        score += 0.4;
      }

      const name1 = normalizeArabicName(member.fullNameAr || member.firstName);
      const name2 = normalizeArabicName(other.fullNameAr || other.firstName);
      const nameSimilarity = calculateSimilarity(name1, name2);
      
      if (nameSimilarity >= 0.8) {
        reasons.push(`تشابه الاسم ${Math.round(nameSimilarity * 100)}%`);
        score += nameSimilarity * 0.3;
      }

      if (member.fatherId && other.fatherId && member.fatherId === other.fatherId) {
        if (normalizeArabicName(member.firstName) === normalizeArabicName(other.firstName)) {
          reasons.push('نفس الأب ونفس الاسم الأول');
          score += 0.3;
        }
      }

      if (score >= 0.5 || (reasons.length > 0 && nameSimilarity >= 0.9)) {
        group.members.push({
          id: other.id,
          firstName: other.firstName,
          fullNameAr: other.fullNameAr,
          phone: other.phone,
          email: other.email,
          generation: other.generation,
        });
        group.matchReasons = [...new Set([...group.matchReasons, ...reasons])];
        group.similarity = Math.max(group.similarity, score);
        processed.add(other.id);
      }
    }

    if (group.members.length > 1) {
      duplicateGroups.push(group);
      processed.add(member.id);
    }
  }

  console.log(`\n📊 Found ${duplicateGroups.length} potential duplicate groups:\n`);
  console.log('='.repeat(80));

  for (const group of duplicateGroups) {
    console.log(`\n🔴 Duplicate Group (Score: ${Math.round(group.similarity * 100)}%)`);
    console.log(`   Reasons: ${group.matchReasons.join(' | ')}`);
    console.log('   Members:');
    for (const m of group.members) {
      console.log(`     - [${m.id}] ${m.fullNameAr || m.firstName} (Gen ${m.generation})`);
      if (m.phone) console.log(`       📞 ${m.phone}`);
      if (m.email) console.log(`       ✉️  ${m.email}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n📈 Summary:`);
  console.log(`   Total duplicate groups: ${duplicateGroups.length}`);
  console.log(`   Total affected members: ${duplicateGroups.reduce((sum, g) => sum + g.members.length, 0)}`);

  const outputPath = '/tmp/duplicate-report.json';
  const report = {
    generatedAt: new Date().toISOString(),
    totalGroups: duplicateGroups.length,
    groups: duplicateGroups,
  };
  
  const fs = await import('fs');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Full report saved to: ${outputPath}`);
}

detectDuplicates()
  .catch((error) => {
    console.error('❌ Detection failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
