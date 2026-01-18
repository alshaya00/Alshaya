import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const creditsCategories = [
  {
    nameAr: 'المؤسسون الأوائل',
    nameEn: 'Project Founders',
    descriptionAr: 'أصحاب فكرة المشروع',
    descriptionEn: 'Project Founders',
    category: 'founder',
    icon: 'Star',
    sortOrder: 1,
    isActive: true,
  },
  {
    nameAr: 'كبار العائلة',
    nameEn: 'Family Elders',
    descriptionAr: 'مصدر المعلومات والروايات',
    descriptionEn: 'Source of information and narratives',
    category: 'data',
    icon: 'BookOpen',
    sortOrder: 2,
    isActive: true,
  },
  {
    nameAr: 'حفظة الأنساب',
    nameEn: 'Genealogy Keepers',
    descriptionAr: 'الذين حفظوا سلسلة النسب',
    descriptionEn: 'Those who preserved the lineage chain',
    category: 'data',
    icon: 'BookOpen',
    sortOrder: 3,
    isActive: true,
  },
  {
    nameAr: 'فريق التطوير',
    nameEn: 'Development Team',
    descriptionAr: 'بناء وتطوير المنصة',
    descriptionEn: 'Building and developing the platform',
    category: 'technical',
    icon: 'Code',
    sortOrder: 4,
    isActive: true,
  },
  {
    nameAr: 'الداعمون والمشجعون',
    nameEn: 'Supporters',
    descriptionAr: 'كل من دعم وشجع المشروع',
    descriptionEn: 'Everyone who supported and encouraged the project',
    category: 'support',
    icon: 'Heart',
    sortOrder: 5,
    isActive: true,
  },
  {
    nameAr: 'جميع أفراد العائلة',
    nameEn: 'All Family Members',
    descriptionAr: 'الذين صبروا وساهموا',
    descriptionEn: 'Those who were patient and contributed',
    category: 'special',
    icon: 'Sparkles',
    sortOrder: 6,
    isActive: true,
  },
];

async function main() {
  console.log('Seeding Credits Categories...');

  for (const category of creditsCategories) {
    const existing = await prisma.creditsCategory.findFirst({
      where: { nameAr: category.nameAr },
    });

    if (existing) {
      console.log(`Category "${category.nameAr}" already exists, skipping...`);
      continue;
    }

    await prisma.creditsCategory.create({
      data: category,
    });
    console.log(`Created category: ${category.nameAr}`);
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding credits categories:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
