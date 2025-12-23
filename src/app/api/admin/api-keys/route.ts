import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/store';
import { encrypt, decrypt, isEncrypted } from '@/lib/encryption';

// ============================================
// TEST EMAIL/SMS HELPER FUNCTIONS
// ============================================

interface EmailTestConfig {
  provider: 'resend' | 'sendgrid' | 'mailgun' | 'smtp';
  apiKey?: string;
  fromAddress: string;
  fromName: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpSecure?: boolean;
  testMode: boolean;
}

interface SmsTestConfig {
  provider: 'twilio' | 'vonage' | 'messagebird';
  apiKey?: string;
  apiSecret?: string;
  fromNumber?: string;
}

interface TestResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

async function sendTestEmail(config: EmailTestConfig, toEmail: string): Promise<TestResult> {
  const testSubject = 'Test Email - Al-Shaye Family Tree';
  const testHtml = `
    <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1E3A5F 0%, #2D5A87 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">شجرة عائلة آل شايع</h1>
        <p style="margin: 10px 0 0; opacity: 0.9;">Test Email</p>
      </div>
      <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #27ae60; margin-top: 0;">✓ Email Configuration Working!</h2>
        <p style="color: #666; line-height: 1.8;">
          This is a test email to confirm your email configuration is working correctly.
        </p>
        <p style="color: #666; line-height: 1.8;">
          Provider: <strong>${config.provider}</strong>
        </p>
        <p style="color: #999; font-size: 14px;">
          Sent at: ${new Date().toLocaleString('ar-SA')}
        </p>
      </div>
    </div>
  `;
  const testText = `Test Email - Your ${config.provider} email configuration is working! Sent at: ${new Date().toLocaleString()}`;

  try {
    switch (config.provider) {
      case 'resend':
        return await sendViaResendTest(config, toEmail, testSubject, testHtml, testText);
      case 'sendgrid':
        return await sendViaSendGridTest(config, toEmail, testSubject, testHtml, testText);
      case 'mailgun':
        return await sendViaMailgunTest(config, toEmail, testSubject, testHtml, testText);
      case 'smtp':
        return await sendViaSMTPTest(config, toEmail, testSubject, testHtml, testText);
      default:
        return { success: false, error: 'Unknown email provider' };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function sendViaResendTest(config: EmailTestConfig, to: string, subject: string, html: string, text: string): Promise<TestResult> {
  if (!config.apiKey) return { success: false, error: 'Resend API key not configured' };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${config.fromName} <${config.fromAddress}>`,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return { success: false, error: `Resend error: ${error}` };
  }

  const data = await response.json();
  return { success: true, messageId: data.id };
}

async function sendViaSendGridTest(config: EmailTestConfig, to: string, subject: string, html: string, text: string): Promise<TestResult> {
  if (!config.apiKey) return { success: false, error: 'SendGrid API key not configured' };

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: config.fromAddress, name: config.fromName },
      subject,
      content: [
        { type: 'text/plain', value: text },
        { type: 'text/html', value: html },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return { success: false, error: `SendGrid error: ${error}` };
  }

  return { success: true, messageId: response.headers.get('x-message-id') || undefined };
}

async function sendViaMailgunTest(config: EmailTestConfig, to: string, subject: string, html: string, text: string): Promise<TestResult> {
  if (!config.apiKey) return { success: false, error: 'Mailgun API key not configured' };

  const domain = config.fromAddress.split('@')[1] || 'mg.example.com';
  const formData = new URLSearchParams();
  formData.append('from', `${config.fromName} <${config.fromAddress}>`);
  formData.append('to', to);
  formData.append('subject', subject);
  formData.append('html', html);
  formData.append('text', text);

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
}

async function sendViaSMTPTest(config: EmailTestConfig, to: string, subject: string, html: string, text: string): Promise<TestResult> {
  if (!config.smtpHost || !config.smtpPort) {
    return { success: false, error: 'SMTP host and port are required' };
  }

  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure ?? config.smtpPort === 465,
      auth: config.smtpUser ? {
        user: config.smtpUser,
        pass: config.smtpPassword,
      } : undefined,
    });

    const info = await transporter.sendMail({
      from: `${config.fromName} <${config.fromAddress}>`,
      to,
      subject,
      html,
      text,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    return { success: false, error: `SMTP error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

async function sendTestSms(config: SmsTestConfig, toPhone: string): Promise<TestResult> {
  const testMessage = 'Test SMS from Al-Shaye Family Tree. If you received this, your SMS configuration is working!';

  try {
    switch (config.provider) {
      case 'twilio':
        return await sendViaTwilioTest(config, toPhone, testMessage);
      case 'vonage':
        return await sendViaVonageTest(config, toPhone, testMessage);
      case 'messagebird':
        return await sendViaMessageBirdTest(config, toPhone, testMessage);
      default:
        return { success: false, error: 'Unknown SMS provider' };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function sendViaTwilioTest(config: SmsTestConfig, to: string, message: string): Promise<TestResult> {
  if (!config.apiKey || !config.apiSecret || !config.fromNumber) {
    return { success: false, error: 'Twilio requires Account SID, Auth Token, and From Number' };
  }

  const formData = new URLSearchParams();
  formData.append('To', to);
  formData.append('From', config.fromNumber);
  formData.append('Body', message);

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${config.apiKey}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    return { success: false, error: `Twilio error: ${error}` };
  }

  const data = await response.json();
  return { success: true, messageId: data.sid };
}

async function sendViaVonageTest(config: SmsTestConfig, to: string, message: string): Promise<TestResult> {
  if (!config.apiKey || !config.apiSecret || !config.fromNumber) {
    return { success: false, error: 'Vonage requires API Key, API Secret, and From Number' };
  }

  const response = await fetch('https://rest.nexmo.com/sms/json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: config.apiKey,
      api_secret: config.apiSecret,
      to,
      from: config.fromNumber,
      text: message,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return { success: false, error: `Vonage error: ${error}` };
  }

  const data = await response.json();
  if (data.messages?.[0]?.status !== '0') {
    return { success: false, error: `Vonage error: ${data.messages?.[0]?.['error-text'] || 'Unknown error'}` };
  }
  return { success: true, messageId: data.messages[0]['message-id'] };
}

async function sendViaMessageBirdTest(config: SmsTestConfig, to: string, message: string): Promise<TestResult> {
  if (!config.apiKey || !config.fromNumber) {
    return { success: false, error: 'MessageBird requires API Key and Originator' };
  }

  const response = await fetch('https://rest.messagebird.com/messages', {
    method: 'POST',
    headers: {
      'Authorization': `AccessKey ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      originator: config.fromNumber,
      recipients: [to],
      body: message,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return { success: false, error: `MessageBird error: ${error}` };
  }

  const data = await response.json();
  return { success: true, messageId: data.id };
}

// Helper to get auth user from request
async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) return null;

  const session = await findSessionByToken(token);
  if (!session) return null;

  const user = await findUserById(session.userId);
  if (!user || user.status !== 'ACTIVE') return null;

  return user;
}

// Fields that should be encrypted/decrypted
const ENCRYPTED_FIELDS = [
  'emailApiKey',
  'smtpPassword',
  'otpApiKey',
  'otpApiSecret',
];

// GET /api/admin/api-keys - Get API service configuration (with masked keys)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Super Admin required' },
        { status: 401 }
      );
    }

    // Get or create default config
    let config = await prisma.apiServiceConfig.findUnique({
      where: { id: 'default' },
    });

    if (!config) {
      config = await prisma.apiServiceConfig.create({
        data: {
          id: 'default',
          emailProvider: 'none',
          otpProvider: 'none',
          enableEmailNotifications: false,
          enableSMSNotifications: false,
          testMode: true,
        },
      });
    }

    // Mask sensitive fields for display
    const maskedConfig = {
      ...config,
      emailApiKey: config.emailApiKey ? maskApiKey(config.emailApiKey) : null,
      smtpPassword: config.smtpPassword ? '********' : null,
      otpApiKey: config.otpApiKey ? maskApiKey(config.otpApiKey) : null,
      otpApiSecret: config.otpApiSecret ? '********' : null,
      // Indicate which fields have values set
      hasEmailApiKey: !!config.emailApiKey,
      hasSmtpPassword: !!config.smtpPassword,
      hasOtpApiKey: !!config.otpApiKey,
      hasOtpApiSecret: !!config.otpApiSecret,
    };

    return NextResponse.json({
      success: true,
      config: maskedConfig,
    });
  } catch (error) {
    console.error('Error fetching API config:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch API configuration' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/api-keys - Update API service configuration
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Super Admin required' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate email provider
    if (body.emailProvider && !['none', 'resend', 'sendgrid', 'mailgun', 'smtp'].includes(body.emailProvider)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email provider' },
        { status: 400 }
      );
    }

    // Validate OTP provider
    if (body.otpProvider && !['none', 'twilio', 'vonage', 'messagebird'].includes(body.otpProvider)) {
      return NextResponse.json(
        { success: false, message: 'Invalid OTP provider' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};

    // Non-sensitive fields
    if (body.emailProvider !== undefined) updateData.emailProvider = body.emailProvider;
    if (body.emailFromAddress !== undefined) updateData.emailFromAddress = body.emailFromAddress;
    if (body.emailFromName !== undefined) updateData.emailFromName = body.emailFromName;
    if (body.smtpHost !== undefined) updateData.smtpHost = body.smtpHost;
    if (body.smtpPort !== undefined) updateData.smtpPort = body.smtpPort;
    if (body.smtpUser !== undefined) updateData.smtpUser = body.smtpUser;
    if (body.smtpSecure !== undefined) updateData.smtpSecure = body.smtpSecure;
    if (body.otpProvider !== undefined) updateData.otpProvider = body.otpProvider;
    if (body.otpFromNumber !== undefined) updateData.otpFromNumber = body.otpFromNumber;
    if (body.enableEmailNotifications !== undefined) updateData.enableEmailNotifications = body.enableEmailNotifications;
    if (body.enableSMSNotifications !== undefined) updateData.enableSMSNotifications = body.enableSMSNotifications;
    if (body.testMode !== undefined) updateData.testMode = body.testMode;

    // Encrypt sensitive fields before storing
    if (body.emailApiKey !== undefined && body.emailApiKey !== null) {
      updateData.emailApiKey = encrypt(body.emailApiKey);
    }
    if (body.smtpPassword !== undefined && body.smtpPassword !== null) {
      updateData.smtpPassword = encrypt(body.smtpPassword);
    }
    if (body.otpApiKey !== undefined && body.otpApiKey !== null) {
      updateData.otpApiKey = encrypt(body.otpApiKey);
    }
    if (body.otpApiSecret !== undefined && body.otpApiSecret !== null) {
      updateData.otpApiSecret = encrypt(body.otpApiSecret);
    }

    // Allow clearing fields by setting to null
    if (body.emailApiKey === null) updateData.emailApiKey = null;
    if (body.smtpPassword === null) updateData.smtpPassword = null;
    if (body.otpApiKey === null) updateData.otpApiKey = null;
    if (body.otpApiSecret === null) updateData.otpApiSecret = null;

    updateData.updatedBy = user.id;

    // Update or create config
    const config = await prisma.apiServiceConfig.upsert({
      where: { id: 'default' },
      update: updateData,
      create: {
        id: 'default',
        ...updateData,
        emailProvider: body.emailProvider || 'none',
        otpProvider: body.otpProvider || 'none',
      } as typeof updateData & { id: string; emailProvider: string; otpProvider: string },
    });

    // Return masked version
    const maskedConfig = {
      ...config,
      emailApiKey: config.emailApiKey ? maskApiKey(config.emailApiKey) : null,
      smtpPassword: config.smtpPassword ? '********' : null,
      otpApiKey: config.otpApiKey ? maskApiKey(config.otpApiKey) : null,
      otpApiSecret: config.otpApiSecret ? '********' : null,
      hasEmailApiKey: !!config.emailApiKey,
      hasSmtpPassword: !!config.smtpPassword,
      hasOtpApiKey: !!config.otpApiKey,
      hasOtpApiSecret: !!config.otpApiSecret,
    };

    return NextResponse.json({
      success: true,
      message: 'API configuration updated',
      messageAr: 'تم تحديث إعدادات API',
      config: maskedConfig,
    });
  } catch (error) {
    console.error('Error updating API config:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update API configuration' },
      { status: 500 }
    );
  }
}

// POST /api/admin/api-keys - Test API connection
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Super Admin required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { testType } = body;

    if (!['email', 'sms'].includes(testType)) {
      return NextResponse.json(
        { success: false, message: 'Invalid test type. Must be "email" or "sms"' },
        { status: 400 }
      );
    }

    // Get config
    const config = await prisma.apiServiceConfig.findUnique({
      where: { id: 'default' },
    });

    if (!config) {
      return NextResponse.json(
        { success: false, message: 'API configuration not found' },
        { status: 404 }
      );
    }

    if (testType === 'email') {
      if (config.emailProvider === 'none') {
        return NextResponse.json({
          success: false,
          message: 'Email provider not configured',
        });
      }

      // Decrypt API key if needed
      let apiKey = config.emailApiKey;
      if (apiKey && isEncrypted(apiKey)) {
        apiKey = decrypt(apiKey);
      }

      // In test mode, just verify the config looks valid
      if (config.testMode) {
        const isValid = validateEmailConfig(config.emailProvider, {
          apiKey,
          fromAddress: config.emailFromAddress,
          smtpHost: config.smtpHost,
          smtpPort: config.smtpPort,
          smtpUser: config.smtpUser,
        });

        return NextResponse.json({
          success: isValid,
          message: isValid
            ? 'Email configuration appears valid (test mode - no email sent)'
            : 'Email configuration incomplete',
          testMode: true,
        });
      }

      // Actually send a test email
      const testEmail = body.testEmail || user.email;
      if (!testEmail) {
        return NextResponse.json({
          success: false,
          message: 'Test email address required',
        });
      }

      const result = await sendTestEmail({
        provider: config.emailProvider as 'resend' | 'sendgrid' | 'mailgun' | 'smtp',
        apiKey: apiKey || undefined,
        fromAddress: config.emailFromAddress || 'noreply@alshaye.com',
        fromName: config.emailFromName || 'Al-Shaye Family Tree',
        smtpHost: config.smtpHost || undefined,
        smtpPort: config.smtpPort || undefined,
        smtpUser: config.smtpUser || undefined,
        smtpPassword: config.smtpPassword ? (isEncrypted(config.smtpPassword) ? decrypt(config.smtpPassword) : config.smtpPassword) : undefined,
        smtpSecure: config.smtpSecure ?? true,
        testMode: false,
      }, testEmail);

      return NextResponse.json({
        success: result.success,
        message: result.success
          ? `Test email sent successfully to ${testEmail}`
          : result.error || 'Failed to send test email',
        messageId: result.messageId,
      });
    }

    if (testType === 'sms') {
      if (config.otpProvider === 'none') {
        return NextResponse.json({
          success: false,
          message: 'SMS/OTP provider not configured',
        });
      }

      // Decrypt API keys if needed
      let apiKey = config.otpApiKey;
      let apiSecret = config.otpApiSecret;
      if (apiKey && isEncrypted(apiKey)) {
        apiKey = decrypt(apiKey);
      }
      if (apiSecret && isEncrypted(apiSecret)) {
        apiSecret = decrypt(apiSecret);
      }

      // In test mode, just verify the config looks valid
      if (config.testMode) {
        const isValid = validateSmsConfig(config.otpProvider, {
          apiKey,
          apiSecret,
          fromNumber: config.otpFromNumber,
        });

        return NextResponse.json({
          success: isValid,
          message: isValid
            ? 'SMS configuration appears valid (test mode - no SMS sent)'
            : 'SMS configuration incomplete',
          testMode: true,
        });
      }

      // Actually send a test SMS
      const testPhone = body.testPhone || config.otpFromNumber;
      if (!testPhone) {
        return NextResponse.json({
          success: false,
          message: 'Test phone number required',
        });
      }

      const smsResult = await sendTestSms({
        provider: config.otpProvider as 'twilio' | 'vonage' | 'messagebird',
        apiKey: apiKey || undefined,
        apiSecret: apiSecret || undefined,
        fromNumber: config.otpFromNumber || undefined,
      }, testPhone);

      return NextResponse.json({
        success: smsResult.success,
        message: smsResult.success
          ? `Test SMS sent successfully to ${testPhone}`
          : smsResult.error || 'Failed to send test SMS',
        messageId: smsResult.messageId,
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid test type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error testing API:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to test API connection' },
      { status: 500 }
    );
  }
}

// Helper to mask API keys for display
function maskApiKey(key: string): string {
  if (!key) return '';

  // If it's encrypted, just show that it's set
  if (isEncrypted(key)) {
    return '••••••••••••••••';
  }

  // Otherwise, show first 4 and last 4 characters
  if (key.length <= 8) {
    return '*'.repeat(key.length);
  }
  return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
}

// Validate email configuration
function validateEmailConfig(
  provider: string,
  config: { apiKey?: string | null; fromAddress?: string | null; smtpHost?: string | null; smtpPort?: number | null; smtpUser?: string | null }
): boolean {
  if (provider === 'smtp') {
    return !!(config.smtpHost && config.smtpPort && config.fromAddress);
  }
  return !!(config.apiKey && config.fromAddress);
}

// Validate SMS configuration
function validateSmsConfig(
  provider: string,
  config: { apiKey?: string | null; apiSecret?: string | null; fromNumber?: string | null }
): boolean {
  if (provider === 'twilio') {
    return !!(config.apiKey && config.apiSecret && config.fromNumber);
  }
  return !!(config.apiKey && config.fromNumber);
}
