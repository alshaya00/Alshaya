// Broadcast Service
// Al-Shaye Family Tree Application
// Handles email broadcasts for meetings, announcements, reminders, and updates

import { prisma } from '@/lib/prisma';
import { emailService } from './email';

// ============================================
// TYPES
// ============================================

export type BroadcastType = 'MEETING' | 'ANNOUNCEMENT' | 'REMINDER' | 'UPDATE';
export type BroadcastStatus = 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'CANCELLED';
export type TargetAudience = 'ALL' | 'BRANCH' | 'GENERATION' | 'CUSTOM';
export type RSVPResponse = 'YES' | 'NO' | 'MAYBE';

export interface CreateBroadcastInput {
  titleAr: string;
  titleEn?: string;
  contentAr: string;
  contentEn?: string;
  type: BroadcastType;
  // Meeting fields
  meetingDate?: Date;
  meetingLocation?: string;
  meetingUrl?: string;
  rsvpRequired?: boolean;
  rsvpDeadline?: Date;
  // Targeting
  targetAudience: TargetAudience;
  targetBranch?: string;
  targetGeneration?: number;
  targetMemberIds?: string[];
  // Scheduling
  scheduledAt?: Date;
  // Creator info
  createdBy: string;
  createdByName: string;
}

export interface BroadcastRecipient {
  memberId?: string;
  memberName: string;
  email: string;
}

export interface SendBroadcastResult {
  success: boolean;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  errors?: string[];
}

// ============================================
// BROADCAST TEMPLATES
// ============================================

function renderBroadcastEmail(
  broadcast: {
    titleAr: string;
    titleEn?: string | null;
    contentAr: string;
    contentEn?: string | null;
    type: string;
    meetingDate?: Date | null;
    meetingLocation?: string | null;
    meetingUrl?: string | null;
    rsvpRequired?: boolean;
    rsvpDeadline?: Date | null;
  },
  recipient: BroadcastRecipient,
  baseUrl: string,
  broadcastId: string
): { subject: string; html: string; text: string } {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Riyadh',
    }).format(date);
  };

  const typeLabels: Record<string, { ar: string; en: string; color: string }> = {
    MEETING: { ar: 'دعوة اجتماع', en: 'Meeting Invitation', color: '#2563eb' },
    ANNOUNCEMENT: { ar: 'إعلان', en: 'Announcement', color: '#1E3A5F' },
    REMINDER: { ar: 'تذكير', en: 'Reminder', color: '#f59e0b' },
    UPDATE: { ar: 'تحديث', en: 'Update', color: '#10b981' },
  };

  const typeInfo = typeLabels[broadcast.type] || typeLabels.ANNOUNCEMENT;

  // Build meeting details section
  let meetingSection = '';
  if (broadcast.type === 'MEETING' && broadcast.meetingDate) {
    meetingSection = `
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 15px 0; color: #1E3A5F;">📅 تفاصيل الاجتماع</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666; width: 100px;"><strong>التاريخ:</strong></td>
            <td style="padding: 8px 0; color: #333;">${formatDate(broadcast.meetingDate)}</td>
          </tr>
          ${broadcast.meetingLocation ? `
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>المكان:</strong></td>
            <td style="padding: 8px 0; color: #333;">${broadcast.meetingLocation}</td>
          </tr>
          ` : ''}
          ${broadcast.meetingUrl ? `
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>الرابط:</strong></td>
            <td style="padding: 8px 0;"><a href="${broadcast.meetingUrl}" style="color: #2563eb;">${broadcast.meetingUrl}</a></td>
          </tr>
          ` : ''}
          ${broadcast.rsvpDeadline ? `
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>آخر موعد للرد:</strong></td>
            <td style="padding: 8px 0; color: #e74c3c;">${formatDate(broadcast.rsvpDeadline)}</td>
          </tr>
          ` : ''}
        </table>
      </div>
    `;
  }

  // Build RSVP section
  let rsvpSection = '';
  if (broadcast.rsvpRequired) {
    const rsvpBaseUrl = `${baseUrl}/api/broadcasts/${broadcastId}/rsvp?email=${encodeURIComponent(recipient.email)}`;
    rsvpSection = `
      <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <h3 style="margin: 0 0 15px 0; color: #856404;">🗓️ يرجى تأكيد حضورك</h3>
        <p style="color: #856404; margin-bottom: 15px;">نرجو الرد على الدعوة لمساعدتنا في التنظيم</p>
        <div style="display: inline-block;">
          <a href="${rsvpBaseUrl}&response=YES" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 0 5px; display: inline-block;">
            ✓ سأحضر
          </a>
          <a href="${rsvpBaseUrl}&response=MAYBE" style="background: #ffc107; color: #333; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 0 5px; display: inline-block;">
            ❓ ربما
          </a>
          <a href="${rsvpBaseUrl}&response=NO" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 0 5px; display: inline-block;">
            ✗ لن أحضر
          </a>
        </div>
      </div>
    `;
  }

  const html = `
    <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, ${typeInfo.color} 0%, ${typeInfo.color}dd 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <p style="margin: 0 0 10px; opacity: 0.9; font-size: 14px;">شجرة عائلة آل شايع</p>
        <h1 style="margin: 0; font-size: 24px;">${typeInfo.ar}</h1>
        ${broadcast.titleEn ? `<p style="margin: 10px 0 0; opacity: 0.8; font-size: 14px;">${typeInfo.en}</p>` : ''}
      </div>
      <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #1E3A5F; margin-top: 0;">${broadcast.titleAr}</h2>
        ${broadcast.titleEn ? `<h3 style="color: #666; margin-top: 5px; font-weight: normal;">${broadcast.titleEn}</h3>` : ''}

        <p style="color: #666; line-height: 1.8;">
          السلام عليكم <strong>${recipient.memberName}</strong>،
        </p>

        <div style="color: #333; line-height: 1.8;">
          ${broadcast.contentAr}
        </div>

        ${broadcast.contentEn ? `
        <div style="color: #666; line-height: 1.8; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;" dir="ltr">
          ${broadcast.contentEn}
        </div>
        ` : ''}

        ${meetingSection}
        ${rsvpSection}

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          هذه الرسالة أرسلت إلى أفراد عائلة آل شايع
          <br>
          <a href="${baseUrl}/unsubscribe?email=${encodeURIComponent(recipient.email)}" style="color: #999;">إلغاء الاشتراك</a>
        </p>
      </div>
    </div>
  `;

  const text = `
${typeInfo.ar}

${broadcast.titleAr}

السلام عليكم ${recipient.memberName}،

${broadcast.contentAr.replace(/<[^>]*>/g, '')}

${broadcast.meetingDate ? `
تفاصيل الاجتماع:
- التاريخ: ${formatDate(broadcast.meetingDate)}
${broadcast.meetingLocation ? `- المكان: ${broadcast.meetingLocation}` : ''}
${broadcast.meetingUrl ? `- الرابط: ${broadcast.meetingUrl}` : ''}
` : ''}

---
شجرة عائلة آل شايع
  `.trim();

  return {
    subject: `${typeInfo.ar}: ${broadcast.titleAr}`,
    html,
    text,
  };
}

// ============================================
// BROADCAST SERVICE
// ============================================

export class BroadcastService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  }

  // Create a new broadcast
  async createBroadcast(input: CreateBroadcastInput) {
    const broadcast = await prisma.broadcast.create({
      data: {
        titleAr: input.titleAr,
        titleEn: input.titleEn,
        contentAr: input.contentAr,
        contentEn: input.contentEn,
        type: input.type,
        meetingDate: input.meetingDate,
        meetingLocation: input.meetingLocation,
        meetingUrl: input.meetingUrl,
        rsvpRequired: input.rsvpRequired ?? false,
        rsvpDeadline: input.rsvpDeadline,
        targetAudience: input.targetAudience,
        targetBranch: input.targetBranch,
        targetGeneration: input.targetGeneration,
        targetMemberIds: input.targetMemberIds ? JSON.stringify(input.targetMemberIds) : null,
        status: input.scheduledAt ? 'SCHEDULED' : 'DRAFT',
        scheduledAt: input.scheduledAt,
        createdBy: input.createdBy,
        createdByName: input.createdByName,
      },
    });

    return broadcast;
  }

  // Get recipients based on targeting
  async getRecipients(broadcast: {
    targetAudience: string;
    targetBranch?: string | null;
    targetGeneration?: number | null;
    targetMemberIds?: string | null;
  }): Promise<BroadcastRecipient[]> {
    let members;

    switch (broadcast.targetAudience) {
      case 'BRANCH':
        members = await prisma.familyMember.findMany({
          where: {
            branch: broadcast.targetBranch || undefined,
            email: { not: null },
            status: 'Living',
          },
          select: { id: true, fullNameAr: true, firstName: true, email: true },
        });
        break;

      case 'GENERATION':
        members = await prisma.familyMember.findMany({
          where: {
            generation: broadcast.targetGeneration || undefined,
            email: { not: null },
            status: 'Living',
          },
          select: { id: true, fullNameAr: true, firstName: true, email: true },
        });
        break;

      case 'CUSTOM':
        const memberIds = broadcast.targetMemberIds
          ? JSON.parse(broadcast.targetMemberIds)
          : [];
        members = await prisma.familyMember.findMany({
          where: {
            id: { in: memberIds },
            email: { not: null },
          },
          select: { id: true, fullNameAr: true, firstName: true, email: true },
        });
        break;

      case 'ALL':
      default:
        members = await prisma.familyMember.findMany({
          where: {
            email: { not: null },
            status: 'Living',
          },
          select: { id: true, fullNameAr: true, firstName: true, email: true },
        });
        break;
    }

    // Also include users with emails
    const users = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        email: { not: '' },
      },
      select: { id: true, nameArabic: true, email: true, linkedMemberId: true },
    });

    // Combine and dedupe by email
    const recipientMap = new Map<string, BroadcastRecipient>();

    // Add family members
    for (const member of members) {
      if (member.email) {
        recipientMap.set(member.email, {
          memberId: member.id,
          memberName: member.fullNameAr || member.firstName,
          email: member.email,
        });
      }
    }

    // Add users (only if their email isn't already in the map)
    for (const user of users) {
      if (user.email && !recipientMap.has(user.email)) {
        recipientMap.set(user.email, {
          memberId: user.linkedMemberId || undefined,
          memberName: user.nameArabic,
          email: user.email,
        });
      }
    }

    return Array.from(recipientMap.values());
  }

  // Send a broadcast
  async sendBroadcast(broadcastId: string): Promise<SendBroadcastResult> {
    const broadcast = await prisma.broadcast.findUnique({
      where: { id: broadcastId },
    });

    if (!broadcast) {
      return {
        success: false,
        totalRecipients: 0,
        sentCount: 0,
        failedCount: 0,
        errors: ['Broadcast not found'],
      };
    }

    if (broadcast.status === 'SENT') {
      return {
        success: false,
        totalRecipients: broadcast.totalRecipients,
        sentCount: broadcast.sentCount,
        failedCount: broadcast.failedCount,
        errors: ['Broadcast has already been sent'],
      };
    }

    // Update status to SENDING
    await prisma.broadcast.update({
      where: { id: broadcastId },
      data: { status: 'SENDING' },
    });

    // Get recipients
    const recipients = await this.getRecipients(broadcast);

    // Create recipient records
    for (const recipient of recipients) {
      await prisma.broadcastRecipient.upsert({
        where: {
          broadcastId_email: {
            broadcastId,
            email: recipient.email,
          },
        },
        update: {},
        create: {
          broadcastId,
          memberId: recipient.memberId,
          memberName: recipient.memberName,
          email: recipient.email,
          status: 'PENDING',
        },
      });
    }

    // Send emails
    const errors: string[] = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of recipients) {
      try {
        const emailContent = renderBroadcastEmail(
          broadcast,
          recipient,
          this.baseUrl,
          broadcastId
        );

        const result = await emailService.sendEmail({
          to: recipient.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });

        if (result.success) {
          sentCount++;
          await prisma.broadcastRecipient.update({
            where: {
              broadcastId_email: {
                broadcastId,
                email: recipient.email,
              },
            },
            data: {
              status: 'SENT',
              sentAt: new Date(),
            },
          });
        } else {
          failedCount++;
          errors.push(`${recipient.email}: ${result.error}`);
          await prisma.broadcastRecipient.update({
            where: {
              broadcastId_email: {
                broadcastId,
                email: recipient.email,
              },
            },
            data: {
              status: 'FAILED',
              errorMessage: result.error,
            },
          });
        }
      } catch (error) {
        failedCount++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${recipient.email}: ${errorMsg}`);
        await prisma.broadcastRecipient.update({
          where: {
            broadcastId_email: {
              broadcastId,
              email: recipient.email,
            },
          },
          data: {
            status: 'FAILED',
            errorMessage: errorMsg,
          },
        });
      }
    }

    // Update broadcast status
    await prisma.broadcast.update({
      where: { id: broadcastId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        totalRecipients: recipients.length,
        sentCount,
        failedCount,
      },
    });

    return {
      success: failedCount === 0,
      totalRecipients: recipients.length,
      sentCount,
      failedCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // Record RSVP response
  async recordRSVP(
    broadcastId: string,
    email: string,
    response: RSVPResponse,
    note?: string
  ) {
    const recipient = await prisma.broadcastRecipient.findUnique({
      where: {
        broadcastId_email: {
          broadcastId,
          email,
        },
      },
    });

    if (!recipient) {
      throw new Error('Recipient not found');
    }

    // Update recipient RSVP
    await prisma.broadcastRecipient.update({
      where: { id: recipient.id },
      data: {
        rsvpResponse: response,
        rsvpRespondedAt: new Date(),
        rsvpNote: note,
      },
    });

    // Update broadcast RSVP counts
    const counts = await prisma.broadcastRecipient.groupBy({
      by: ['rsvpResponse'],
      where: { broadcastId },
      _count: { rsvpResponse: true },
    });

    const rsvpCounts = {
      rsvpYesCount: 0,
      rsvpNoCount: 0,
      rsvpMaybeCount: 0,
    };

    for (const count of counts) {
      if (count.rsvpResponse === 'YES') rsvpCounts.rsvpYesCount = count._count.rsvpResponse;
      if (count.rsvpResponse === 'NO') rsvpCounts.rsvpNoCount = count._count.rsvpResponse;
      if (count.rsvpResponse === 'MAYBE') rsvpCounts.rsvpMaybeCount = count._count.rsvpResponse;
    }

    await prisma.broadcast.update({
      where: { id: broadcastId },
      data: rsvpCounts,
    });

    return { success: true, response };
  }

  // Get broadcast by ID with recipients
  async getBroadcast(id: string) {
    return prisma.broadcast.findUnique({
      where: { id },
      include: {
        recipients: {
          orderBy: { memberName: 'asc' },
        },
      },
    });
  }

  // List broadcasts
  async listBroadcasts(options?: {
    status?: BroadcastStatus;
    type?: BroadcastType;
    limit?: number;
    offset?: number;
  }) {
    const where: Record<string, unknown> = {};
    if (options?.status) where.status = options.status;
    if (options?.type) where.type = options.type;

    const [broadcasts, total] = await Promise.all([
      prisma.broadcast.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
        include: {
          _count: {
            select: { recipients: true },
          },
        },
      }),
      prisma.broadcast.count({ where }),
    ]);

    return { broadcasts, total };
  }

  // Delete a draft broadcast
  async deleteBroadcast(id: string) {
    const broadcast = await prisma.broadcast.findUnique({
      where: { id },
    });

    if (!broadcast) {
      throw new Error('Broadcast not found');
    }

    if (broadcast.status === 'SENT' || broadcast.status === 'SENDING') {
      throw new Error('Cannot delete a broadcast that has been sent');
    }

    await prisma.broadcast.delete({
      where: { id },
    });

    return { success: true };
  }

  // Update a draft broadcast
  async updateBroadcast(
    id: string,
    data: Partial<Omit<CreateBroadcastInput, 'createdBy' | 'createdByName'>>
  ) {
    const broadcast = await prisma.broadcast.findUnique({
      where: { id },
    });

    if (!broadcast) {
      throw new Error('Broadcast not found');
    }

    if (broadcast.status === 'SENT' || broadcast.status === 'SENDING') {
      throw new Error('Cannot update a broadcast that has been sent');
    }

    return prisma.broadcast.update({
      where: { id },
      data: {
        ...data,
        targetMemberIds: data.targetMemberIds
          ? JSON.stringify(data.targetMemberIds)
          : undefined,
        status: data.scheduledAt ? 'SCHEDULED' : broadcast.status,
      },
    });
  }

  // Cancel a scheduled broadcast
  async cancelBroadcast(id: string) {
    const broadcast = await prisma.broadcast.findUnique({
      where: { id },
    });

    if (!broadcast) {
      throw new Error('Broadcast not found');
    }

    if (broadcast.status === 'SENT') {
      throw new Error('Cannot cancel a broadcast that has already been sent');
    }

    return prisma.broadcast.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  // Get RSVP summary for a broadcast
  async getRSVPSummary(broadcastId: string) {
    const recipients = await prisma.broadcastRecipient.findMany({
      where: { broadcastId },
      select: {
        memberName: true,
        email: true,
        rsvpResponse: true,
        rsvpRespondedAt: true,
        rsvpNote: true,
      },
      orderBy: { memberName: 'asc' },
    });

    const summary = {
      yes: recipients.filter((r) => r.rsvpResponse === 'YES'),
      no: recipients.filter((r) => r.rsvpResponse === 'NO'),
      maybe: recipients.filter((r) => r.rsvpResponse === 'MAYBE'),
      noResponse: recipients.filter((r) => !r.rsvpResponse),
    };

    return summary;
  }
}

// Export singleton instance
export const broadcastService = new BroadcastService();
