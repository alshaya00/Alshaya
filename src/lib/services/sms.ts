// SMS/OTP Service
// Al-Shaye Family Tree Application
// Supports multiple providers: Twilio, Vonage, MessageBird

import { prisma } from '@/lib/prisma';

// ============================================
// TYPES
// ============================================

export type OtpProvider = 'twilio' | 'vonage' | 'messagebird' | 'none';

export interface OtpConfig {
  provider: OtpProvider;
  apiKey?: string;
  apiSecret?: string;
  fromNumber?: string;
  testMode: boolean;
}

export interface SendSmsOptions {
  to: string;
  message: string;
  type?: 'OTP' | 'NOTIFICATION';
}

export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface OtpResult {
  success: boolean;
  code?: string;
  expiresAt?: Date;
  error?: string;
}

// ============================================
// OTP STORAGE (In-memory for simplicity, use Redis in production)
// ============================================

const otpStore = new Map<string, { code: string; expiresAt: Date; attempts: number }>();

const MAX_OTP_ATTEMPTS = 3;
const OTP_EXPIRY_MINUTES = 5;

// ============================================
// PROVIDER IMPLEMENTATIONS
// ============================================

async function sendViaTwilio(config: OtpConfig, options: SendSmsOptions): Promise<SmsResult> {
  if (!config.apiKey || !config.apiSecret) {
    return { success: false, error: 'Twilio credentials not configured' };
  }

  try {
    const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64');

    const formData = new URLSearchParams();
    formData.append('To', options.to);
    formData.append('From', config.fromNumber || '');
    formData.append('Body', options.message);

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${config.apiKey}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
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
  } catch (error) {
    return { success: false, error: `Twilio error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

async function sendViaVonage(config: OtpConfig, options: SendSmsOptions): Promise<SmsResult> {
  if (!config.apiKey || !config.apiSecret) {
    return { success: false, error: 'Vonage credentials not configured' };
  }

  try {
    const response = await fetch('https://rest.nexmo.com/sms/json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: config.apiKey,
        api_secret: config.apiSecret,
        from: config.fromNumber || 'AlShaye',
        to: options.to.replace(/[^0-9]/g, ''),
        text: options.message,
      }),
    });

    const data = await response.json();

    if (data.messages && data.messages[0].status === '0') {
      return { success: true, messageId: data.messages[0]['message-id'] };
    }

    return { success: false, error: `Vonage error: ${data.messages?.[0]?.['error-text'] || 'Unknown error'}` };
  } catch (error) {
    return { success: false, error: `Vonage error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

async function sendViaMessageBird(config: OtpConfig, options: SendSmsOptions): Promise<SmsResult> {
  if (!config.apiKey) {
    return { success: false, error: 'MessageBird API key not configured' };
  }

  try {
    const response = await fetch('https://rest.messagebird.com/messages', {
      method: 'POST',
      headers: {
        'Authorization': `AccessKey ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        originator: config.fromNumber || 'AlShaye',
        recipients: [options.to.replace(/[^0-9]/g, '')],
        body: options.message,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `MessageBird error: ${error}` };
    }

    const data = await response.json();
    return { success: true, messageId: data.id };
  } catch (error) {
    return { success: false, error: `MessageBird error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// ============================================
// MAIN SMS/OTP SERVICE
// ============================================

export class SmsService {
  private config: OtpConfig | null = null;

  async getConfig(): Promise<OtpConfig> {
    if (this.config) {
      return this.config;
    }

    try {
      // Try to get from database first
      // @ts-expect-error - Model may not exist yet
      const dbConfig = await prisma.apiServiceConfig?.findUnique({
        where: { id: 'default' },
      });

      if (dbConfig) {
        this.config = {
          provider: dbConfig.otpProvider as OtpProvider,
          apiKey: dbConfig.otpApiKey || undefined,
          apiSecret: dbConfig.otpApiSecret || undefined,
          fromNumber: dbConfig.otpFromNumber || undefined,
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
      testMode: true,
    };
    return this.config;
  }

  clearConfigCache(): void {
    this.config = null;
  }

  async sendSms(options: SendSmsOptions): Promise<SmsResult> {
    const config = await this.getConfig();

    // If test mode or no provider, just log and return success
    if (config.testMode || config.provider === 'none') {
      console.log('[SMS TEST MODE]', {
        to: options.to,
        message: options.message,
        provider: config.provider,
      });
      return { success: true, messageId: `test-${Date.now()}` };
    }

    let result: SmsResult;

    switch (config.provider) {
      case 'twilio':
        result = await sendViaTwilio(config, options);
        break;
      case 'vonage':
        result = await sendViaVonage(config, options);
        break;
      case 'messagebird':
        result = await sendViaMessageBird(config, options);
        break;
      default:
        result = { success: false, error: 'No SMS provider configured' };
    }

    // Log to database
    try {
      // @ts-expect-error - Model may not exist yet
      await prisma.smsLog?.create({
        data: {
          to: options.to,
          from: config.fromNumber || 'SYSTEM',
          message: options.message,
          type: options.type || 'NOTIFICATION',
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

  // Generate a random OTP code
  generateOtp(length: number = 6): string {
    let code = '';
    for (let i = 0; i < length; i++) {
      code += Math.floor(Math.random() * 10).toString();
    }
    return code;
  }

  // Send OTP and store for verification
  async sendOtp(phoneNumber: string): Promise<OtpResult> {
    const code = this.generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Store OTP
    otpStore.set(phoneNumber, {
      code,
      expiresAt,
      attempts: 0,
    });

    // Send SMS
    const message = `رمز التحقق الخاص بك هو: ${code}\nينتهي خلال ${OTP_EXPIRY_MINUTES} دقائق.\n\nYour verification code is: ${code}\nExpires in ${OTP_EXPIRY_MINUTES} minutes.`;

    const result = await this.sendSms({
      to: phoneNumber,
      message,
      type: 'OTP',
    });

    if (result.success) {
      return {
        success: true,
        code: process.env.NODE_ENV === 'development' ? code : undefined, // Only return code in dev
        expiresAt,
      };
    }

    return {
      success: false,
      error: result.error,
    };
  }

  // Verify OTP
  verifyOtp(phoneNumber: string, code: string): { success: boolean; error?: string } {
    const stored = otpStore.get(phoneNumber);

    if (!stored) {
      return { success: false, error: 'No OTP found for this number. Please request a new one.' };
    }

    if (stored.attempts >= MAX_OTP_ATTEMPTS) {
      otpStore.delete(phoneNumber);
      return { success: false, error: 'Too many attempts. Please request a new OTP.' };
    }

    if (new Date() > stored.expiresAt) {
      otpStore.delete(phoneNumber);
      return { success: false, error: 'OTP has expired. Please request a new one.' };
    }

    if (stored.code !== code) {
      stored.attempts++;
      return { success: false, error: `Invalid OTP. ${MAX_OTP_ATTEMPTS - stored.attempts} attempts remaining.` };
    }

    // Success - remove OTP
    otpStore.delete(phoneNumber);
    return { success: true };
  }

  // Check if OTP exists and is valid
  hasValidOtp(phoneNumber: string): boolean {
    const stored = otpStore.get(phoneNumber);
    if (!stored) return false;
    if (new Date() > stored.expiresAt) {
      otpStore.delete(phoneNumber);
      return false;
    }
    return true;
  }

  // Clear OTP for a phone number
  clearOtp(phoneNumber: string): void {
    otpStore.delete(phoneNumber);
  }
}

// Export singleton instance
export const smsService = new SmsService();
