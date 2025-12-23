import { PrismaClient } from '@prisma/client';
import { getProcessedFamilyData } from './family-data';
import { DEFAULT_PERMISSION_MATRIX } from '../src/lib/auth/types';

const prisma = new PrismaClient();

// Alias for seed script
const DEFAULT_PERMISSIONS = DEFAULT_PERMISSION_MATRIX;

// آل شايع Family Data - 389 members across 10 generations
// Imported from family-data.ts (processed with lineage calculations)
const familyMembers = getProcessedFamilyData();
const JOURNAL_CATEGORIES = [
  { key: 'ORAL_HISTORY', nameAr: 'الروايات الشفهية', nameEn: 'Oral History', descriptionAr: 'القصص المتوارثة شفهياً عبر الأجيال', descriptionEn: 'Stories passed down orally through generations', icon: '📜', color: '#f59e0b', displayOrder: 1 },
  { key: 'MIGRATION', nameAr: 'قصص الهجرة', nameEn: 'Migration Stories', descriptionAr: 'رحلات وهجرات أفراد العائلة', descriptionEn: 'Family migration and travel stories', icon: '🐪', color: '#14b8a6', displayOrder: 2 },
  { key: 'MEMORY', nameAr: 'ذكريات', nameEn: 'Memories', descriptionAr: 'ذكريات ومواقف عائلية', descriptionEn: 'Family memories and moments', icon: '💭', color: '#8b5cf6', displayOrder: 3 },
  { key: 'POEM', nameAr: 'شعر', nameEn: 'Poetry', descriptionAr: 'قصائد وأشعار العائلة', descriptionEn: 'Family poems and poetry', icon: '📝', color: '#ec4899', displayOrder: 4 },
  { key: 'GENEALOGY', nameAr: 'أنساب', nameEn: 'Genealogy', descriptionAr: 'معلومات عن الأنساب والسلالة', descriptionEn: 'Genealogical information', icon: '🌳', color: '#22c55e', displayOrder: 5 },
];

async function main() {
  console.log('🌳 Seeding آل شايع family database...');
  console.log(`📊 Total members to upsert: ${familyMembers.length}`);

  // ============================================
  // SEED FAMILY MEMBERS (Idempotent with upsert)
  // ============================================
  console.log('\n📦 Seeding family members (using upsert for idempotency)...');

  for (const member of familyMembers) {
    await prisma.familyMember.upsert({
      where: { id: member.id },
      update: member,
      create: member,
    });
  }

  // ============================================
  // SEED SITE SETTINGS
  // ============================================
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
      sessionDurationDays: 7,
      rememberMeDurationDays: 30,
      allowSelfRegistration: true,
      requireEmailVerification: false,
      requireApprovalForRegistration: true,
      maxLoginAttempts: 5,
      lockoutDurationMinutes: 15,
      require2FAForAdmins: false,
      minPasswordLength: 8,
      allowGuestPreview: true,
      guestPreviewMemberCount: 20,
    },
  });

  // ============================================
  // SEED PRIVACY SETTINGS
  // ============================================
  console.log('🔒 Seeding privacy settings...');
  await prisma.privacySettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      profileVisibility: JSON.stringify({
        GUEST: false,
        MEMBER: true,
        BRANCH_LEADER: true,
        ADMIN: true,
        SUPER_ADMIN: true,
      }),
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

  // ============================================
  // SEED PERMISSION MATRIX
  // ============================================
  console.log('🔐 Seeding permission matrix...');
  await prisma.permissionMatrix.upsert({
    where: { id: 'default' },
    update: { permissions: JSON.stringify(DEFAULT_PERMISSIONS) },
    create: {
      id: 'default',
      permissions: JSON.stringify(DEFAULT_PERMISSIONS),
    },
  });

  // ============================================
  // SEED API SERVICE CONFIG
  // ============================================
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

  // ============================================
  // SEED JOURNAL CATEGORIES (Idempotent with upsert)
  // ============================================
  console.log('📚 Seeding journal categories (using upsert for idempotency)...');

  for (const category of JOURNAL_CATEGORIES) {
    await prisma.journalCategory.upsert({
      where: { key: category.key },
      update: category,
      create: category,
    });
  }

  // ============================================
  // VERIFY & REPORT
  // ============================================
  const totalMembers = await prisma.familyMember.count();
  const males = await prisma.familyMember.count({ where: { gender: 'Male' } });
  const females = await prisma.familyMember.count({ where: { gender: 'Female' } });
  const generations = await prisma.familyMember.groupBy({
    by: ['generation'],
    _count: true,
  });
  const categoryCount = await prisma.journalCategory.count();

  console.log('\n✅ Database seeded successfully!');
  console.log('📊 Statistics:');
  console.log(`   - Total members: ${totalMembers}`);
  console.log(`   - Males: ${males}`);
  console.log(`   - Females: ${females}`);
  console.log(`   - Generations: ${generations.length}`);
  console.log(`   - Journal categories: ${categoryCount}`);
  console.log('   - Site settings: ✓');
  console.log('   - Privacy settings: ✓');
  console.log('   - Permission matrix: ✓');
  console.log('   - API service config: ✓');
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
