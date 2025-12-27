import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultFolders = [
  {
    name: 'Profile Photos',
    nameAr: 'صور شخصية',
    description: 'Personal profile photos',
    descriptionAr: 'الصور الشخصية للأفراد',
    color: '#3b82f6', // blue-500
    icon: 'User',
    isSystem: true,
    displayOrder: 1,
  },
  {
    name: 'Memories',
    nameAr: 'ذكريات',
    description: 'Family memories and gatherings',
    descriptionAr: 'ذكريات وتجمعات العائلة',
    color: '#a855f7', // purple-500
    icon: 'Heart',
    isSystem: true,
    displayOrder: 2,
  },
  {
    name: 'Documents',
    nameAr: 'وثائق',
    description: 'Official documents and records',
    descriptionAr: 'الوثائق والسجلات الرسمية',
    color: '#f59e0b', // amber-500
    icon: 'FileText',
    isSystem: true,
    displayOrder: 3,
  },
  {
    name: 'Historical',
    nameAr: 'تاريخية',
    description: 'Historical photos and archives',
    descriptionAr: 'الصور التاريخية والأرشيف',
    color: '#10b981', // emerald-500
    icon: 'Archive',
    isSystem: true,
    displayOrder: 4,
  },
  {
    name: 'Events',
    nameAr: 'مناسبات',
    description: 'Weddings, graduations, and celebrations',
    descriptionAr: 'الأعراس والتخرج والاحتفالات',
    color: '#ec4899', // pink-500
    icon: 'Calendar',
    isSystem: false,
    displayOrder: 5,
  },
];

async function seedFolders() {
  console.log('Seeding album folders...');

  for (const folder of defaultFolders) {
    const existing = await prisma.albumFolder.findFirst({
      where: { nameAr: folder.nameAr },
    });

    if (!existing) {
      await prisma.albumFolder.create({
        data: {
          ...folder,
          createdByName: 'النظام',
        },
      });
      console.log(`Created folder: ${folder.nameAr} (${folder.name})`);
    } else {
      console.log(`Folder already exists: ${folder.nameAr}`);
    }
  }

  console.log('Done seeding folders!');
  
  const folders = await prisma.albumFolder.findMany({
    orderBy: { displayOrder: 'asc' },
  });
  console.log('\nCurrent folders:');
  folders.forEach(f => console.log(`  - ${f.nameAr} (${f.name}) [${f.isSystem ? 'system' : 'custom'}]`));
}

seedFolders()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
