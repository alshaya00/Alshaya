import { prisma } from './prisma';
import { sendEmail } from './services/email';

export interface BackupNotificationData {
  success: boolean;
  destination: 'GitHub' | 'Google Drive' | 'Google Sheets' | 'Local';
  memberCount?: number;
  url?: string;
  error?: string;
}

export async function sendBackupNotification(data: BackupNotificationData): Promise<void> {
  try {
    const adminsWithEmailAlerts = await prisma.user.findMany({
      where: {
        role: { in: ['SUPER_ADMIN', 'ADMIN'] },
        status: 'ACTIVE',
        email: { not: null },
      },
      select: {
        email: true,
        nameArabic: true,
      },
    });

    if (adminsWithEmailAlerts.length === 0) {
      console.log('No admins with email alerts configured');
      return;
    }

    const today = new Date().toLocaleDateString('ar-SA');
    const templateName = data.success ? 'backup_complete' : 'backup_failed';
    const templateData = {
      memberCount: data.memberCount,
      destination: data.destination,
      date: today,
      url: data.url,
      error: data.error,
    };

    for (const admin of adminsWithEmailAlerts) {
      if (admin.email) {
        try {
          await sendEmail({
            to: admin.email,
            templateName,
            templateData,
          });
          console.log(`Backup notification sent to ${admin.email}`);
        } catch (emailError) {
          console.error(`Failed to send backup notification to ${admin.email}:`, emailError);
        }
      }
    }
  } catch (error) {
    console.error('Error sending backup notifications:', error);
  }
}
