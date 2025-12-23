import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const DEFAULT_PERMISSIONS = {
  SUPER_ADMIN: ['*'],
  ADMIN: [
    'users:read', 'users:write', 'users:delete',
    'members:read', 'members:write', 'members:delete',
    'tree:read', 'tree:write',
    'settings:read', 'settings:write',
    'journal:read', 'journal:write', 'journal:delete',
    'backup:read', 'backup:write',
  ],
  BRANCH_LEADER: [
    'members:read', 'members:write',
    'tree:read',
    'journal:read', 'journal:write',
  ],
  MEMBER: [
    'members:read',
    'tree:read',
    'journal:read',
  ],
  PENDING: [],
};

const JOURNAL_CATEGORIES = [
  { key: 'biography', nameAr: 'سيرة ذاتية', nameEn: 'Biography', icon: 'user', color: '#3B82F6', displayOrder: 1 },
  { key: 'achievement', nameAr: 'إنجاز', nameEn: 'Achievement', icon: 'trophy', color: '#F59E0B', displayOrder: 2 },
  { key: 'memory', nameAr: 'ذكرى', nameEn: 'Memory', icon: 'heart', color: '#EC4899', displayOrder: 3 },
  { key: 'event', nameAr: 'حدث', nameEn: 'Event', icon: 'calendar', color: '#10B981', displayOrder: 4 },
  { key: 'obituary', nameAr: 'رثاء', nameEn: 'Obituary', icon: 'feather', color: '#6B7280', displayOrder: 5 },
  { key: 'story', nameAr: 'قصة', nameEn: 'Story', icon: 'book-open', color: '#8B5CF6', displayOrder: 6 },
];

async function main() {
  console.log('🌱 Starting production database seed...');
  console.log('📂 Loading real family data (389 members)...');

  const dataPath = path.join(__dirname, 'production-data.json');
  
  if (!fs.existsSync(dataPath)) {
    console.error('❌ production-data.json not found!');
    process.exit(1);
  }

  const familyMembers = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  console.log(`📊 Loaded ${familyMembers.length} family members`);

  console.log('🗑️  Clearing existing family members...');
  await prisma.familyMember.deleteMany({});

  console.log('👨‍👩‍👧‍👦 Inserting family members...');
  
  // Sort by generation to insert parents before children
  const sortedMembers = [...familyMembers].sort((a: { generation: number }, b: { generation: number }) => 
    (a.generation || 0) - (b.generation || 0)
  );
  
  for (const member of sortedMembers) {
    const { createdAt, updatedAt, ...memberData } = member;
    await prisma.familyMember.create({
      data: memberData,
    });
  }

  console.log('⚙️  Seeding site settings...');
  await prisma.siteSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      familyNameArabic: 'آل شايع',
      familyNameEnglish: 'Al-Shaye',
      taglineArabic: 'نحفظ إرثنا، نربط أجيالنا',
      taglineEnglish: 'Preserving Our Legacy, Connecting Generations',
      defaultLanguage: 'ar',
      allowSelfRegistration: true,
      requireApprovalForRegistration: true,
    },
  });

  console.log('🔒 Seeding privacy settings...');
  await prisma.privacySettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      showPhoneToRoles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      showEmailToRoles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      showBirthYearToRoles: JSON.stringify(['MEMBER', 'BRANCH_LEADER', 'ADMIN', 'SUPER_ADMIN']),
      showAgeForLiving: false,
      showOccupation: true,
      showCity: true,
      showBiography: true,
      showPhotosToRoles: JSON.stringify(['MEMBER', 'BRANCH_LEADER', 'ADMIN', 'SUPER_ADMIN']),
      showDeathYear: true,
      showFullDeathDate: false,
    },
  });

  console.log('🔐 Seeding permission matrix...');
  await prisma.permissionMatrix.upsert({
    where: { id: 'default' },
    update: { permissions: JSON.stringify(DEFAULT_PERMISSIONS) },
    create: {
      id: 'default',
      permissions: JSON.stringify(DEFAULT_PERMISSIONS),
    },
  });

  console.log('📧 Seeding API service config...');
  await prisma.apiServiceConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      emailProvider: 'none',
      otpProvider: 'none',
      enableEmailNotifications: false,
      enableSMSNotifications: false,
      testMode: true,
    },
  });

  console.log('📚 Seeding journal categories...');
  for (const category of JOURNAL_CATEGORIES) {
    await prisma.journalCategory.upsert({
      where: { key: category.key },
      update: category,
      create: category,
    });
  }

  const totalMembers = await prisma.familyMember.count();
  const males = await prisma.familyMember.count({ where: { gender: 'Male' } });
  const females = await prisma.familyMember.count({ where: { gender: 'Female' } });
  const generations = await prisma.familyMember.groupBy({
    by: ['generation'],
    _count: true,
  });

  console.log('\n✅ Production database seeded successfully!');
  console.log('📊 Statistics:');
  console.log(`   - Total members: ${totalMembers}`);
  console.log(`   - Males: ${males}`);
  console.log(`   - Females: ${females}`);
  console.log(`   - Generations: ${generations.length}`);
  console.log('\n🌳 شجرة آل شايع جاهزة!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
