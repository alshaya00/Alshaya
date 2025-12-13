import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/store';
import { encrypt, decrypt, encryptApiKey, isEncrypted } from '@/lib/encryption';

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

      // TODO: Implement actual email test when not in test mode
      return NextResponse.json({
        success: true,
        message: 'Email test would be sent here (not implemented)',
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

      // TODO: Implement actual SMS test when not in test mode
      return NextResponse.json({
        success: true,
        message: 'SMS test would be sent here (not implemented)',
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
