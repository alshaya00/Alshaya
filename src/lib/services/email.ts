// Email Service
// Al-Shaya Family Tree Application
// Supports multiple providers: Resend, SendGrid, Mailgun, SMTP

import { prisma } from '@/lib/prisma';
import { sendEmailViaResendConnector, isResendConnectorAvailable } from './resend-client';

// ============================================
// TYPES
// ============================================

export type EmailProvider = 'resend' | 'sendgrid' | 'mailgun' | 'smtp' | 'none';

export interface EmailConfig {
  provider: EmailProvider;
  apiKey?: string;
  fromAddress: string;
  fromName: string;
  // SMTP specific
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpSecure?: boolean;
  // General
  testMode: boolean;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  templateName?: string;
  templateData?: Record<string, unknown>;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============================================
// EMAIL TEMPLATES
// ============================================

export const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  PASSWORD_RESET: 'password_reset',
  EMAIL_VERIFICATION: 'email_verification',
  INVITE: 'invite',
  ACCESS_REQUEST_SUBMITTED: 'access_request_submitted',
  ACCESS_REQUEST_APPROVED: 'access_request_approved',
  ACCESS_REQUEST_REJECTED: 'access_request_rejected',
  NEW_MEMBER_ADDED: 'new_member_added',
  MEMBER_UPDATED: 'member_updated',
  BACKUP_COMPLETE: 'backup_complete',
  BACKUP_FAILED: 'backup_failed',
  SECURITY_ALERT: 'security_alert',
} as const;

export type EmailTemplate = typeof EMAIL_TEMPLATES[keyof typeof EMAIL_TEMPLATES];

// ============================================
// TEMPLATE RENDERER
// ============================================

function renderTemplate(templateName: string, data: Record<string, unknown>): { subject: string; html: string; text: string } {
  const templates: Record<string, { subject: string; html: string; text: string }> = {
    welcome: {
      subject: 'مرحباً بك في شجرة عائلة آل شايع - Welcome to Al-Shaya Family Tree',
      html: `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1E3A5F 0%, #2D5A87 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">شجرة عائلة آل شايع</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">Al-Shaya Family Tree</p>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1E3A5F; margin-top: 0;">مرحباً ${data.name || 'بك'}!</h2>
            <p style="color: #666; line-height: 1.8;">
              نرحب بك في منصة شجرة عائلة آل شايع. نحن سعداء بانضمامك إلى مجتمعنا.
            </p>
            <p style="color: #666; line-height: 1.8;">
              يمكنك الآن استكشاف شجرة العائلة، والتعرف على أفراد العائلة، والمساهمة في إثراء المحتوى.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.loginUrl || '#'}" style="background: #1E3A5F; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                دخول إلى حسابك
              </a>
            </div>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
            <p style="color: #999; font-size: 14px; text-align: center;">
              هذه الرسالة آلية، يرجى عدم الرد عليها.
            </p>
          </div>
        </div>
      `,
      text: `مرحباً ${data.name || 'بك'}!\n\nنرحب بك في منصة شجرة عائلة آل شايع.\n\nيمكنك تسجيل الدخول من: ${data.loginUrl || '#'}`,
    },
    password_reset: {
      subject: 'إعادة تعيين كلمة المرور - Password Reset',
      html: `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1E3A5F 0%, #2D5A87 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">شجرة عائلة آل شايع</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1E3A5F; margin-top: 0;">إعادة تعيين كلمة المرور</h2>
            <p style="color: #666; line-height: 1.8;">
              تم طلب إعادة تعيين كلمة المرور لحسابك. إذا لم تقم بهذا الطلب، يمكنك تجاهل هذه الرسالة.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.resetUrl || '#'}" style="background: #e74c3c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                إعادة تعيين كلمة المرور
              </a>
            </div>
            <p style="color: #999; font-size: 14px;">
              ينتهي هذا الرابط خلال ${data.expiresIn || '1 ساعة'}.
            </p>
          </div>
        </div>
      `,
      text: `إعادة تعيين كلمة المرور\n\nاضغط على الرابط التالي: ${data.resetUrl || '#'}\n\nينتهي الرابط خلال ${data.expiresIn || '1 ساعة'}.`,
    },
    email_verification: {
      subject: 'تأكيد البريد الإلكتروني - Email Verification',
      html: `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1E3A5F 0%, #2D5A87 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">شجرة عائلة آل شايع</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1E3A5F; margin-top: 0;">تأكيد البريد الإلكتروني</h2>
            <p style="color: #666; line-height: 1.8;">
              يرجى تأكيد بريدك الإلكتروني بالضغط على الزر أدناه.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.verifyUrl || '#'}" style="background: #27ae60; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                تأكيد البريد الإلكتروني
              </a>
            </div>
          </div>
        </div>
      `,
      text: `تأكيد البريد الإلكتروني\n\nاضغط على الرابط التالي: ${data.verifyUrl || '#'}`,
    },
    invite: {
      subject: 'دعوة للانضمام إلى شجرة عائلة آل شايع - Invitation',
      html: `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1E3A5F 0%, #2D5A87 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">شجرة عائلة آل شايع</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1E3A5F; margin-top: 0;">دعوة للانضمام</h2>
            <p style="color: #666; line-height: 1.8;">
              تمت دعوتك من قبل <strong>${data.inviterName || 'أحد أفراد العائلة'}</strong> للانضمام إلى منصة شجرة عائلة آل شايع.
            </p>
            ${data.message ? `<p style="color: #666; line-height: 1.8; background: #f8f9fa; padding: 15px; border-radius: 8px;">"${data.message}"</p>` : ''}
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.inviteUrl || '#'}" style="background: #1E3A5F; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                قبول الدعوة
              </a>
            </div>
            <p style="color: #999; font-size: 14px;">
              تنتهي هذه الدعوة خلال ${data.expiresIn || '7 أيام'}.
            </p>
          </div>
        </div>
      `,
      text: `دعوة للانضمام\n\nتمت دعوتك من قبل ${data.inviterName || 'أحد أفراد العائلة'} للانضمام.\n\nاضغط على الرابط: ${data.inviteUrl || '#'}`,
    },
    access_request_submitted: {
      subject: 'تم استلام طلب الوصول - Access Request Received',
      html: `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1E3A5F 0%, #2D5A87 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">شجرة عائلة آل شايع</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1E3A5F; margin-top: 0;">تم استلام طلبك</h2>
            <p style="color: #666; line-height: 1.8;">
              شكراً لك! تم استلام طلب الوصول الخاص بك وسيتم مراجعته قريباً.
            </p>
            <p style="color: #666; line-height: 1.8;">
              سنقوم بإعلامك عبر البريد الإلكتروني عند اتخاذ قرار بشأن طلبك.
            </p>
          </div>
        </div>
      `,
      text: `تم استلام طلب الوصول\n\nشكراً لك! سيتم مراجعة طلبك قريباً.`,
    },
    access_request_approved: {
      subject: 'تمت الموافقة على طلبك - Access Request Approved',
      html: `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">🎉 مبروك!</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #27ae60; margin-top: 0;">تمت الموافقة على طلبك</h2>
            <p style="color: #666; line-height: 1.8;">
              يسعدنا إبلاغك بأنه تمت الموافقة على طلب الوصول الخاص بك. مرحباً بك في عائلة آل شايع!
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.loginUrl || '#'}" style="background: #27ae60; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                تسجيل الدخول الآن
              </a>
            </div>
          </div>
        </div>
      `,
      text: `تمت الموافقة على طلبك!\n\nمرحباً بك في عائلة آل شايع.\n\nتسجيل الدخول: ${data.loginUrl || '#'}`,
    },
    access_request_rejected: {
      subject: 'حالة طلب الوصول - Access Request Status',
      html: `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1E3A5F 0%, #2D5A87 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">شجرة عائلة آل شايع</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1E3A5F; margin-top: 0;">حالة طلبك</h2>
            <p style="color: #666; line-height: 1.8;">
              نأسف لإبلاغك بأنه لم يتم قبول طلب الوصول الخاص بك في هذا الوقت.
            </p>
            ${data.reason ? `<p style="color: #666; line-height: 1.8;"><strong>السبب:</strong> ${data.reason}</p>` : ''}
            <p style="color: #666; line-height: 1.8;">
              إذا كان لديك أي استفسار، يرجى التواصل معنا.
            </p>
          </div>
        </div>
      `,
      text: `حالة طلب الوصول\n\nnنأسف لإبلاغك بأنه لم يتم قبول طلبك.${data.reason ? `\n\nالسبب: ${data.reason}` : ''}`,
    },
    new_member_added: {
      subject: 'تمت إضافة فرد جديد للعائلة - New Family Member Added',
      html: `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1E3A5F 0%, #2D5A87 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">👨‍👩‍👧‍👦 فرد جديد في العائلة</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1E3A5F; margin-top: 0;">تمت إضافة فرد جديد</h2>
            <p style="color: #666; line-height: 1.8;">
              تمت إضافة <strong>${data.memberName || 'فرد جديد'}</strong> إلى شجرة العائلة.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.viewUrl || '#'}" style="background: #1E3A5F; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                عرض الملف الشخصي
              </a>
            </div>
          </div>
        </div>
      `,
      text: `تمت إضافة فرد جديد: ${data.memberName || 'فرد جديد'}\n\nعرض: ${data.viewUrl || '#'}`,
    },
    backup_complete: {
      subject: 'اكتمل النسخ الاحتياطي - Backup Complete',
      html: `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">✅ اكتمل النسخ الاحتياطي</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="color: #666; line-height: 1.8;">
              تم إنشاء نسخة احتياطية بنجاح.
            </p>
            <ul style="color: #666;">
              <li>عدد الأعضاء: ${data.memberCount || 0}</li>
              <li>الموقع: ${data.destination || 'غير محدد'}</li>
              <li>التاريخ: ${data.date || new Date().toLocaleDateString('ar-SA')}</li>
            </ul>
            ${data.url ? `<p style="margin-top: 20px;"><a href="${data.url}" style="color: #27ae60;">عرض النسخة الاحتياطية</a></p>` : ''}
          </div>
        </div>
      `,
      text: `اكتمل النسخ الاحتياطي\n\nعدد الأعضاء: ${data.memberCount || 0}\nالموقع: ${data.destination || 'غير محدد'}`,
    },
    backup_failed: {
      subject: 'فشل النسخ الاحتياطي - Backup Failed',
      html: `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">❌ فشل النسخ الاحتياطي</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="color: #666; line-height: 1.8;">
              فشلت عملية النسخ الاحتياطي. يرجى التحقق من الإعدادات.
            </p>
            <ul style="color: #666;">
              <li>الموقع: ${data.destination || 'غير محدد'}</li>
              <li>السبب: ${data.error || 'خطأ غير معروف'}</li>
              <li>التاريخ: ${data.date || new Date().toLocaleDateString('ar-SA')}</li>
            </ul>
            <p style="color: #e74c3c; margin-top: 20px;">
              يرجى التحقق من اتصال الخدمة والمحاولة مرة أخرى.
            </p>
          </div>
        </div>
      `,
      text: `فشل النسخ الاحتياطي\n\nالموقع: ${data.destination || 'غير محدد'}\nالسبب: ${data.error || 'خطأ غير معروف'}`,
    },
    security_alert: {
      subject: '🔔 تنبيه أمني - Security Alert',
      html: `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">🔔 تنبيه أمني</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="color: #666; line-height: 1.8;">
              تم رصد نشاط غير عادي في حسابك:
            </p>
            <p style="color: #e74c3c; font-weight: bold;">
              ${data.alertMessage || 'تم تسجيل دخول من موقع جديد'}
            </p>
            <ul style="color: #666;">
              <li>الوقت: ${data.time || new Date().toLocaleString('ar-SA')}</li>
              <li>IP: ${data.ipAddress || 'غير معروف'}</li>
              <li>الجهاز: ${data.device || 'غير معروف'}</li>
            </ul>
            <p style="color: #666; line-height: 1.8;">
              إذا لم تكن أنت، يرجى تغيير كلمة المرور فوراً.
            </p>
          </div>
        </div>
      `,
      text: `تنبيه أمني\n\n${data.alertMessage || 'تم رصد نشاط غير عادي'}\n\nالوقت: ${data.time || new Date().toLocaleString('ar-SA')}\nIP: ${data.ipAddress || 'غير معروف'}`,
    },
  };

  const template = templates[templateName] || {
    subject: 'رسالة من شجرة عائلة آل شايع',
    html: `<p>${data.message || ''}</p>`,
    text: `${data.message || ''}`,
  };

  return template;
}

// ============================================
// PROVIDER IMPLEMENTATIONS
// ============================================

async function sendViaResend(config: EmailConfig, options: SendEmailOptions): Promise<EmailResult> {
  // First try Resend connector (preferred - handles API key automatically)
  const connectorAvailable = await isResendConnectorAvailable();
  if (connectorAvailable) {
    return sendEmailViaResendConnector({
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      fromName: config.fromName,
      replyTo: options.replyTo,
    });
  }

  // Fallback to direct API if connector not available
  if (!config.apiKey) {
    return { success: false, error: 'Resend API key not configured and connector not available' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${config.fromName} <${config.fromAddress}>`,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Resend error: ${error}` };
    }

    const data = await response.json();
    return { success: true, messageId: data.id };
  } catch (error) {
    return { success: false, error: `Resend error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

async function sendViaSendGrid(config: EmailConfig, options: SendEmailOptions): Promise<EmailResult> {
  if (!config.apiKey) {
    return { success: false, error: 'SendGrid API key not configured' };
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: Array.isArray(options.to)
            ? options.to.map(email => ({ email }))
            : [{ email: options.to }],
        }],
        from: { email: config.fromAddress, name: config.fromName },
        subject: options.subject,
        content: [
          { type: 'text/plain', value: options.text || '' },
          { type: 'text/html', value: options.html || '' },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `SendGrid error: ${error}` };
    }

    return { success: true, messageId: response.headers.get('x-message-id') || undefined };
  } catch (error) {
    return { success: false, error: `SendGrid error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

async function sendViaMailgun(config: EmailConfig, options: SendEmailOptions): Promise<EmailResult> {
  if (!config.apiKey) {
    return { success: false, error: 'Mailgun API key not configured' };
  }

  // Extract domain from fromAddress
  const domain = config.fromAddress.split('@')[1] || 'mg.example.com';

  try {
    const formData = new URLSearchParams();
    formData.append('from', `${config.fromName} <${config.fromAddress}>`);
    formData.append('to', Array.isArray(options.to) ? options.to.join(',') : options.to);
    formData.append('subject', options.subject);
    if (options.html) formData.append('html', options.html);
    if (options.text) formData.append('text', options.text);

    const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${config.apiKey}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Mailgun error: ${error}` };
    }

    const data = await response.json();
    return { success: true, messageId: data.id };
  } catch (error) {
    return { success: false, error: `Mailgun error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// Note: SMTP requires additional setup with nodemailer
async function sendViaSMTP(config: EmailConfig, options: SendEmailOptions): Promise<EmailResult> {
  // For SMTP, you would typically use nodemailer
  // This is a placeholder - in a real implementation, you'd import nodemailer
  return {
    success: false,
    error: 'SMTP provider requires nodemailer setup. Please use Resend, SendGrid, or Mailgun instead.'
  };
}

// ============================================
// MAIN EMAIL SERVICE
// ============================================

export class EmailService {
  private config: EmailConfig | null = null;

  async getConfig(): Promise<EmailConfig> {
    if (this.config) {
      return this.config;
    }

    // First, check environment variables
    const envProvider = process.env.EMAIL_PROVIDER as EmailProvider | undefined;
    const envApiKey = process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY || process.env.MAILGUN_API_KEY;
    const envFromAddress = process.env.EMAIL_FROM_ADDRESS;
    const envFromName = process.env.EMAIL_FROM_NAME;
    const envTestMode = process.env.TEST_MODE === 'true';

    if (envProvider && envProvider !== 'none' && envApiKey) {
      this.config = {
        provider: envProvider,
        apiKey: envApiKey,
        fromAddress: envFromAddress || 'noreply@alshaye.com',
        fromName: envFromName || 'شجرة عائلة آل شايع',
        smtpHost: process.env.SMTP_HOST,
        smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : undefined,
        smtpUser: process.env.SMTP_USER,
        smtpPassword: process.env.SMTP_PASSWORD,
        smtpSecure: process.env.SMTP_SECURE !== 'false',
        testMode: envTestMode,
      };
      return this.config;
    }

    try {
      // Fall back to database configuration
      const dbConfig = await prisma.apiServiceConfig?.findUnique({
        where: { id: 'default' },
      });

      if (dbConfig) {
        this.config = {
          provider: dbConfig.emailProvider as EmailProvider,
          apiKey: dbConfig.emailApiKey || undefined,
          fromAddress: dbConfig.emailFromAddress || 'noreply@alshaye.com',
          fromName: dbConfig.emailFromName || 'شجرة عائلة آل شايع',
          smtpHost: dbConfig.smtpHost || undefined,
          smtpPort: dbConfig.smtpPort || undefined,
          smtpUser: dbConfig.smtpUser || undefined,
          smtpPassword: dbConfig.smtpPassword || undefined,
          smtpSecure: dbConfig.smtpSecure ?? true,
          testMode: dbConfig.testMode ?? true,
        };
        return this.config;
      }
    } catch {
      // Database model might not exist yet
    }

    // Return default config
    this.config = {
      provider: 'none',
      fromAddress: 'noreply@alshaye.com',
      fromName: 'شجرة عائلة آل شايع',
      testMode: true,
    };
    return this.config;
  }

  clearConfigCache(): void {
    this.config = null;
  }

  async sendEmail(options: SendEmailOptions): Promise<EmailResult> {
    const config = await this.getConfig();

    // If test mode or no provider, just log and return success
    if (config.testMode || config.provider === 'none') {
      console.log('[EMAIL TEST MODE]', {
        to: options.to,
        subject: options.subject,
        provider: config.provider,
      });
      return { success: true, messageId: `test-${Date.now()}` };
    }

    // Process template if specified
    let emailContent = {
      subject: options.subject,
      html: options.html || '',
      text: options.text || '',
    };

    if (options.templateName && options.templateData) {
      emailContent = renderTemplate(options.templateName, options.templateData);
      if (!options.subject) {
        options.subject = emailContent.subject;
      }
    }

    const finalOptions = {
      ...options,
      ...emailContent,
    };

    let result: EmailResult;

    switch (config.provider) {
      case 'resend':
        result = await sendViaResend(config, finalOptions);
        break;
      case 'sendgrid':
        result = await sendViaSendGrid(config, finalOptions);
        break;
      case 'mailgun':
        result = await sendViaMailgun(config, finalOptions);
        break;
      case 'smtp':
        result = await sendViaSMTP(config, finalOptions);
        break;
      default:
        result = { success: false, error: 'No email provider configured' };
    }

    // Log to database
    try {
      await prisma.emailLog?.create({
        data: {
          to: Array.isArray(options.to) ? options.to.join(',') : options.to,
          from: config.fromAddress,
          subject: options.subject,
          templateName: options.templateName || null,
          templateData: options.templateData ? JSON.stringify(options.templateData) : null,
          status: result.success ? 'SENT' : 'FAILED',
          provider: config.provider,
          providerMessageId: result.messageId || null,
          errorMessage: result.error || null,
          sentAt: result.success ? new Date() : null,
        },
      });
    } catch {
      // Database model might not exist yet
    }

    return result;
  }

  async sendTemplateEmail(
    to: string | string[],
    templateName: EmailTemplate,
    templateData: Record<string, unknown>
  ): Promise<EmailResult> {
    const rendered = renderTemplate(templateName, templateData);
    return this.sendEmail({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      templateName,
      templateData,
    });
  }

  // Convenience methods for common emails
  async sendWelcomeEmail(to: string, data: { name: string; loginUrl: string }): Promise<EmailResult> {
    return this.sendTemplateEmail(to, EMAIL_TEMPLATES.WELCOME, data);
  }

  async sendPasswordResetEmail(to: string, data: { resetUrl: string; expiresIn?: string }): Promise<EmailResult> {
    return this.sendTemplateEmail(to, EMAIL_TEMPLATES.PASSWORD_RESET, data);
  }

  async sendVerificationEmail(to: string, data: { verifyUrl: string }): Promise<EmailResult> {
    return this.sendTemplateEmail(to, EMAIL_TEMPLATES.EMAIL_VERIFICATION, data);
  }

  async sendInviteEmail(to: string, data: { inviterName: string; inviteUrl: string; message?: string; expiresIn?: string }): Promise<EmailResult> {
    return this.sendTemplateEmail(to, EMAIL_TEMPLATES.INVITE, data);
  }

  async sendAccessRequestSubmittedEmail(to: string): Promise<EmailResult> {
    return this.sendTemplateEmail(to, EMAIL_TEMPLATES.ACCESS_REQUEST_SUBMITTED, {});
  }

  async sendAccessRequestApprovedEmail(to: string, data: { loginUrl: string }): Promise<EmailResult> {
    return this.sendTemplateEmail(to, EMAIL_TEMPLATES.ACCESS_REQUEST_APPROVED, data);
  }

  async sendAccessRequestRejectedEmail(to: string, data: { reason?: string }): Promise<EmailResult> {
    return this.sendTemplateEmail(to, EMAIL_TEMPLATES.ACCESS_REQUEST_REJECTED, data);
  }

  async sendSecurityAlertEmail(to: string, data: { alertMessage: string; time: string; ipAddress: string; device: string }): Promise<EmailResult> {
    return this.sendTemplateEmail(to, EMAIL_TEMPLATES.SECURITY_ALERT, data);
  }
}

// Export singleton instance
export const emailService = new EmailService();
