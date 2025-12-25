/**
 * Ensure Admin Script for Replit Deployment
 *
 * This script runs at startup to ensure the admin user exists.
 * It uses upsert for idempotent operation - safe to run multiple times.
 *
 * Environment variables:
 * - ADMIN_EMAIL: Admin email (default: admin@alshaye.family)
 * - ADMIN_PASSWORD: Admin password (default: ChangeThisSecurePassword123!)
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

async function ensureAdmin() {
  const prisma = new PrismaClient();

  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@alshaye.family';
    const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeThisSecurePassword123!';

    console.log('🔐 Checking for admin user...');

    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Role: ${existingAdmin.role}`);
      console.log(`   Status: ${existingAdmin.status}`);
      
      // Always sync password with environment variable
      console.log('🔄 Syncing admin password with environment...');
      const newPasswordHash = await bcrypt.hash(adminPassword, SALT_ROUNDS);
      await prisma.user.update({
        where: { email: adminEmail },
        data: { passwordHash: newPasswordHash },
      });
      console.log('✅ Admin password synced');
    } else {
      console.log('📝 Creating admin user...');

      // Hash password using bcrypt
      const passwordHash = await bcrypt.hash(adminPassword, SALT_ROUNDS);

      // Create admin user using upsert for idempotency
      const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {
          // Update existing user to be admin if they exist
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
        },
        create: {
          email: adminEmail,
          passwordHash,
          nameArabic: 'مدير النظام',
          nameEnglish: 'System Administrator',
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
        },
      });

      console.log('✅ Admin user created successfully!');
      console.log(`   ID: ${admin.id}`);
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Role: SUPER_ADMIN`);
    }

    // Ensure default site settings exist
    console.log('⚙️  Checking site settings...');
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      await prisma.siteSettings.create({
        data: {
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
      console.log('✅ Site settings created');
    } else {
      console.log('✅ Site settings exist');
    }

    // Ensure privacy settings exist
    console.log('🔒 Checking privacy settings...');
    const privacy = await prisma.privacySettings.findUnique({
      where: { id: 'default' },
    });

    if (!privacy) {
      await prisma.privacySettings.create({
        data: {
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
      console.log('✅ Privacy settings created');
    } else {
      console.log('✅ Privacy settings exist');
    }

    // Ensure API service config exists
    console.log('📧 Checking API service config...');
    const apiConfig = await prisma.apiServiceConfig.findUnique({
      where: { id: 'default' },
    });

    if (!apiConfig) {
      await prisma.apiServiceConfig.create({
        data: {
          id: 'default',
          emailProvider: 'none',
          otpProvider: 'none',
          enableEmailNotifications: false,
          enableSMSNotifications: false,
          testMode: true,
        },
      });
      console.log('✅ API service config created');
    } else {
      console.log('✅ API service config exists');
    }

    // Ensure backup config exists (Replit-compatible)
    console.log('💾 Checking backup config...');
    const backupConfig = await prisma.backupConfig.findUnique({
      where: { id: 'default' },
    });

    if (!backupConfig) {
      await prisma.backupConfig.create({
        data: {
          id: 'default',
          enabled: true,
          intervalHours: 24,
          maxBackups: 10,
          retentionDays: 30,
        },
      });
      console.log('✅ Backup config created');
    } else {
      console.log('✅ Backup config exists');
    }

    // Ensure feature flags exist
    console.log('🚩 Checking feature flags...');
    const featureFlags = await prisma.featureFlag.findUnique({
      where: { id: 'default' },
    });

    if (!featureFlags) {
      await prisma.featureFlag.create({
        data: {
          id: 'default',
        },
      });
      console.log('✅ Feature flags created');
    } else {
      console.log('✅ Feature flags exist');
    }

    // Check environment variables
    console.log('🔧 Environment check...');
    const requiredInProd = ['DATABASE_URL'];
    const recommended = ['JWT_SECRET', 'ENCRYPTION_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'];

    const missing: string[] = [];
    const warnings: string[] = [];

    for (const key of requiredInProd) {
      if (!process.env[key]) {
        missing.push(key);
      }
    }

    for (const key of recommended) {
      if (!process.env[key]) {
        warnings.push(key);
      }
    }

    if (missing.length > 0) {
      console.warn(`⚠️  Missing required env vars: ${missing.join(', ')}`);
    }

    if (warnings.length > 0) {
      console.warn(`ℹ️  Recommended env vars not set: ${warnings.join(', ')}`);
    }

    if (missing.length === 0 && warnings.length === 0) {
      console.log('✅ All environment variables configured');
    }

    // Check if automatic backup is needed
    console.log('💾 Checking automatic backup...');
    const lastBackup = await prisma.snapshot.findFirst({
      where: { snapshotType: 'AUTO_BACKUP' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, memberCount: true },
    });

    const backupConfigData = await prisma.backupConfig.findUnique({
      where: { id: 'default' },
    });

    if (backupConfigData?.enabled !== false) {
      const intervalHours = backupConfigData?.intervalHours || 24;
      const needsBackup = !lastBackup || 
        (Date.now() - lastBackup.createdAt.getTime()) / (1000 * 60 * 60) >= intervalHours;

      if (needsBackup) {
        console.log('📦 Creating automatic backup...');
        const members = await prisma.familyMember.findMany();

        const snapshot = await prisma.snapshot.create({
          data: {
            name: `Auto Backup - ${new Date().toLocaleString('ar-SA')}`,
            description: 'Automatic scheduled backup on server startup',
            treeData: JSON.stringify(members),
            memberCount: members.length,
            createdBy: 'SYSTEM',
            createdByName: 'النظام (تلقائي)',
            snapshotType: 'AUTO_BACKUP',
          },
        });

        await prisma.backupConfig.update({
          where: { id: 'default' },
          data: { lastBackupAt: new Date(), lastBackupStatus: 'SUCCESS' },
        });

        console.log(`✅ Auto backup created: ${snapshot.id} (${members.length} members)`);

        // Cleanup old backups
        const maxBackups = backupConfigData?.maxBackups || 10;
        const allAutoBackups = await prisma.snapshot.findMany({
          where: { snapshotType: 'AUTO_BACKUP' },
          orderBy: { createdAt: 'desc' },
        });

        if (allAutoBackups.length > maxBackups) {
          const toDelete = allAutoBackups.slice(maxBackups);
          for (const old of toDelete) {
            await prisma.snapshot.delete({ where: { id: old.id } });
          }
          console.log(`🧹 Cleaned up ${toDelete.length} old backups`);
        }
      } else {
        const hoursSince = Math.round((Date.now() - lastBackup.createdAt.getTime()) / (1000 * 60 * 60));
        console.log(`✅ Last backup: ${hoursSince}h ago (${lastBackup.memberCount} members)`);
      }
    } else {
      console.log('ℹ️  Automatic backups disabled');
    }

    console.log('🚀 Startup checks complete!');
  } catch (error) {
    console.error('❌ Error during startup:', error);
    // Don't exit with error - allow app to start anyway
    // The app can function without admin in some cases
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
ensureAdmin()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
