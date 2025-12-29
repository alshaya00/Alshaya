/**
 * Phone Number Normalization Script
 * Normalizes all phone numbers in the database to Saudi format: +9665XXXXXXXX
 * 
 * Run with: npx tsx scripts/normalize-phones.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  
  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Remove leading + for processing
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  
  // Handle different formats
  if (cleaned.startsWith('00966')) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('966')) {
    // Already in 966 format
  } else if (cleaned.startsWith('05')) {
    cleaned = '966' + cleaned.substring(1);
  } else if (cleaned.startsWith('5') && cleaned.length === 9) {
    cleaned = '966' + cleaned;
  } else if (cleaned.length === 9 && /^\d{9}$/.test(cleaned)) {
    if (cleaned.startsWith('5')) {
      cleaned = '966' + cleaned;
    }
  }
  
  // Validate final format
  if (cleaned.length === 12 && cleaned.startsWith('9665')) {
    return '+' + cleaned;
  }
  
  return phone.trim() || null;
}

async function normalizePhones() {
  console.log('🔄 Starting phone number normalization...\n');
  
  // Normalize FamilyMember phones
  const members = await prisma.familyMember.findMany({
    where: {
      phone: { not: null },
      deletedAt: null,
    },
    select: { id: true, firstName: true, phone: true }
  });
  
  console.log(`📋 Found ${members.length} members with phone numbers`);
  let memberUpdates = 0;
  
  for (const member of members) {
    const normalized = normalizePhone(member.phone);
    if (normalized && normalized !== member.phone) {
      await prisma.familyMember.update({
        where: { id: member.id },
        data: { phone: normalized }
      });
      console.log(`  ✓ ${member.firstName}: ${member.phone} → ${normalized}`);
      memberUpdates++;
    }
  }
  console.log(`  Updated ${memberUpdates} member phone numbers\n`);
  
  // Normalize AccessRequest phones
  const requests = await prisma.accessRequest.findMany({
    where: { phone: { not: null } },
    select: { id: true, nameArabic: true, phone: true }
  });
  
  console.log(`📋 Found ${requests.length} access requests with phone numbers`);
  let requestUpdates = 0;
  
  for (const request of requests) {
    const normalized = normalizePhone(request.phone);
    if (normalized && normalized !== request.phone) {
      await prisma.accessRequest.update({
        where: { id: request.id },
        data: { phone: normalized }
      });
      console.log(`  ✓ ${request.nameArabic}: ${request.phone} → ${normalized}`);
      requestUpdates++;
    }
  }
  console.log(`  Updated ${requestUpdates} access request phone numbers\n`);
  
  // Normalize PendingMember phones
  const pending = await prisma.pendingMember.findMany({
    where: { phone: { not: null } },
    select: { id: true, firstName: true, phone: true }
  });
  
  console.log(`📋 Found ${pending.length} pending members with phone numbers`);
  let pendingUpdates = 0;
  
  for (const pm of pending) {
    const normalized = normalizePhone(pm.phone);
    if (normalized && normalized !== pm.phone) {
      await prisma.pendingMember.update({
        where: { id: pm.id },
        data: { phone: normalized }
      });
      console.log(`  ✓ ${pm.firstName}: ${pm.phone} → ${normalized}`);
      pendingUpdates++;
    }
  }
  console.log(`  Updated ${pendingUpdates} pending member phone numbers\n`);
  
  // Normalize User phones
  const users = await prisma.user.findMany({
    where: { phone: { not: null } },
    select: { id: true, nameArabic: true, phone: true }
  });
  
  console.log(`📋 Found ${users.length} users with phone numbers`);
  let userUpdates = 0;
  
  for (const user of users) {
    const normalized = normalizePhone(user.phone);
    if (normalized && normalized !== user.phone) {
      await prisma.user.update({
        where: { id: user.id },
        data: { phone: normalized }
      });
      console.log(`  ✓ ${user.nameArabic}: ${user.phone} → ${normalized}`);
      userUpdates++;
    }
  }
  console.log(`  Updated ${userUpdates} user phone numbers\n`);
  
  console.log('✅ Phone normalization complete!');
  console.log(`   Total updates: ${memberUpdates + requestUpdates + pendingUpdates + userUpdates}`);
}

normalizePhones()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
