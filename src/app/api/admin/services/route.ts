// API Services Configuration Endpoint
// Al-Shaye Family Tree Application

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiServiceConfigSchema, validateInput, formatZodErrors } from '@/lib/validations';
import { emailService } from '@/lib/services/email';
import { smsService } from '@/lib/services/sms';

// GET - Retrieve current API service configuration
export async function GET() {
  try {
    let config = await prisma.apiServiceConfig?.findUnique({
      where: { id: 'default' },
    });

    // If no config exists, create default
    if (!config) {
      config = await prisma.apiServiceConfig?.create({
        data: {
          id: 'default',
          emailProvider: 'none',
          otpProvider: 'none',
          testMode: true,
        },
      });
    }

    // Mask sensitive data
    const maskedConfig = {
      ...config,
      emailApiKey: config?.emailApiKey ? '••••••••' + config.emailApiKey.slice(-4) : null,
      smtpPassword: config?.smtpPassword ? '••••••••' : null,
      otpApiKey: config?.otpApiKey ? '••••••••' + config.otpApiKey.slice(-4) : null,
      otpApiSecret: config?.otpApiSecret ? '••••••••' : null,
    };

    return NextResponse.json({
      success: true,
      data: maskedConfig,
    });
  } catch (error) {
    console.error('Error fetching API service config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}

// POST - Update API service configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = validateInput(apiServiceConfigSchema.partial(), body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, errors: formatZodErrors(validation.errors) },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Get existing config to preserve non-updated fields
    const existingConfig = await prisma.apiServiceConfig?.findUnique({
      where: { id: 'default' },
    });

    // Handle special case: if API key is masked, use existing value
    const updateData: Record<string, unknown> = {};

    // Email configuration
    if (data.emailProvider !== undefined) updateData.emailProvider = data.emailProvider;
    if (data.emailApiKey !== undefined && !data.emailApiKey.startsWith('••••')) {
      updateData.emailApiKey = data.emailApiKey;
    }
    if (data.emailFromAddress !== undefined) updateData.emailFromAddress = data.emailFromAddress;
    if (data.emailFromName !== undefined) updateData.emailFromName = data.emailFromName;

    // SMTP configuration
    if (data.smtpHost !== undefined) updateData.smtpHost = data.smtpHost;
    if (data.smtpPort !== undefined) updateData.smtpPort = data.smtpPort;
    if (data.smtpUser !== undefined) updateData.smtpUser = data.smtpUser;
    if (data.smtpPassword !== undefined && !data.smtpPassword.startsWith('••••')) {
      updateData.smtpPassword = data.smtpPassword;
    }
    if (data.smtpSecure !== undefined) updateData.smtpSecure = data.smtpSecure;

    // OTP configuration
    if (data.otpProvider !== undefined) updateData.otpProvider = data.otpProvider;
    if (data.otpApiKey !== undefined && !data.otpApiKey.startsWith('••••')) {
      updateData.otpApiKey = data.otpApiKey;
    }
    if (data.otpApiSecret !== undefined && !data.otpApiSecret.startsWith('••••')) {
      updateData.otpApiSecret = data.otpApiSecret;
    }
    if (data.otpFromNumber !== undefined) updateData.otpFromNumber = data.otpFromNumber;

    // General settings
    if (data.enableEmailNotifications !== undefined) updateData.enableEmailNotifications = data.enableEmailNotifications;
    if (data.enableSMSNotifications !== undefined) updateData.enableSMSNotifications = data.enableSMSNotifications;
    if (data.testMode !== undefined) updateData.testMode = data.testMode;

    // Upsert configuration
    const config = await prisma.apiServiceConfig?.upsert({
      where: { id: 'default' },
      update: updateData,
      create: {
        id: 'default',
        ...updateData,
      },
    });

    // Clear service caches to pick up new config
    emailService.clearConfigCache();
    smsService.clearConfigCache();

    // Mask sensitive data in response
    const maskedConfig = {
      ...config,
      emailApiKey: config?.emailApiKey ? '••••••••' + config.emailApiKey.slice(-4) : null,
      smtpPassword: config?.smtpPassword ? '••••••••' : null,
      otpApiKey: config?.otpApiKey ? '••••••••' + config.otpApiKey.slice(-4) : null,
      otpApiSecret: config?.otpApiSecret ? '••••••••' : null,
    };

    return NextResponse.json({
      success: true,
      data: maskedConfig,
      message: 'Configuration updated successfully',
    });
  } catch (error) {
    console.error('Error updating API service config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update configuration' },
      { status: 500 }
    );
  }
}

// PUT - Test email/SMS configuration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, to } = body;

    if (!type || !to) {
      return NextResponse.json(
        { success: false, error: 'Missing type or to parameter' },
        { status: 400 }
      );
    }

    if (type === 'email') {
      const result = await emailService.sendEmail({
        to,
        subject: 'اختبار الإعدادات - Test Configuration',
        html: `
          <div dir="rtl" style="font-family: sans-serif; padding: 20px;">
            <h2 style="color: #1E3A5F;">✅ تم الاتصال بنجاح!</h2>
            <p>هذه رسالة اختبار من شجرة عائلة آل شايع.</p>
            <hr>
            <p style="color: #666; font-size: 14px;">
              إذا وصلتك هذه الرسالة، فإن إعدادات البريد الإلكتروني صحيحة.
            </p>
          </div>
        `,
        text: 'Test email from Al-Shaye Family Tree. If you received this, your email settings are correct.',
      });

      return NextResponse.json({
        success: result.success,
        message: result.success
          ? 'Test email sent successfully'
          : `Failed to send test email: ${result.error}`,
      });
    }

    if (type === 'sms') {
      const result = await smsService.sendSms({
        to,
        message: 'اختبار من شجرة عائلة آل شايع - Test from Al-Shaye Family Tree',
        type: 'NOTIFICATION',
      });

      return NextResponse.json({
        success: result.success,
        message: result.success
          ? 'Test SMS sent successfully'
          : `Failed to send test SMS: ${result.error}`,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid type. Use "email" or "sms"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error testing configuration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to test configuration' },
      { status: 500 }
    );
  }
}
