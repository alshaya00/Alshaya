import { prisma } from './prisma';
import { getTwilioClient } from './twilio-client';
import { normalizePhone } from './phone-utils';

const OTP_EXPIRY_MINUTES = 10;
const RATE_LIMIT_WINDOW_MINUTES = 30;
const MAX_REQUESTS_PER_WINDOW = 30;

export type OtpPurpose = 'LOGIN' | 'REGISTRATION' | 'VERIFICATION';
export type OtpChannel = 'sms' | 'whatsapp';

const TWILIO_VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;

/**
 * Normalizes a phone number using the centralized phone-utils function.
 * This ensures consistent format across all OTP operations.
 * Handles all Saudi phone formats including +9660505... -> +966505...
 * 
 * For Saudi numbers (+966): Returns +9665XXXXXXXX format only
 * For non-Saudi numbers: Basic cleanup with provided country code
 */
export function normalizePhoneNumber(phone: string, countryCode?: string): string {
  // Use the centralized normalizePhone function for Saudi numbers
  const normalized = normalizePhone(phone);
  
  // If normalization to Saudi format succeeded, return it
  if (normalized) {
    return normalized;
  }
  
  // For non-Saudi numbers (with explicit non-966 country code), do basic cleanup
  let cleaned = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
  
  // If a non-Saudi country code is explicitly provided, handle it
  if (countryCode && !countryCode.startsWith('+966')) {
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    
    if (cleaned.startsWith('00')) {
      return '+' + cleaned.substring(2);
    }
    
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    
    return countryCode + cleaned;
  }
  
  // For Saudi numbers that failed normalization, try one more time with cleanup
  // This handles edge cases where the input has extra characters
  const reCleaned = phone.replace(/[^\d]/g, '');
  if (reCleaned.length >= 9) {
    // Try to normalize the cleaned digits
    const retryNormalized = normalizePhone(reCleaned);
    if (retryNormalized) {
      return retryNormalized;
    }
  }
  
  // If all else fails, throw an error for invalid Saudi numbers
  throw new Error(`Invalid Saudi phone number format: ${phone}`);
}

export async function checkRateLimit(phone: string): Promise<{ allowed: boolean; remainingAttempts: number }> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
  
  const recentCodes = await prisma.otpCode.count({
    where: {
      phone,
      createdAt: { gte: windowStart }
    }
  });
  
  const allowed = recentCodes < MAX_REQUESTS_PER_WINDOW;
  const remainingAttempts = Math.max(0, MAX_REQUESTS_PER_WINDOW - recentCodes);
  
  return { allowed, remainingAttempts };
}

export async function sendVerification(
  phone: string,
  purpose: OtpPurpose,
  channel: OtpChannel = 'sms',
  countryCode?: string
): Promise<{ success: boolean; message: string; messageAr: string; expiresIn?: number }> {
  const normalizedPhone = normalizePhoneNumber(phone, countryCode);
  
  if (!TWILIO_VERIFY_SERVICE_SID) {
    console.error('TWILIO_VERIFY_SERVICE_SID not configured');
    return {
      success: false,
      message: 'OTP service not configured',
      messageAr: 'خدمة التحقق غير مُعدة'
    };
  }
  
  const { allowed, remainingAttempts } = await checkRateLimit(normalizedPhone);
  if (!allowed) {
    return {
      success: false,
      message: `Too many attempts. Please wait ${RATE_LIMIT_WINDOW_MINUTES} minutes.`,
      messageAr: `تم تجاوز الحد الأقصى للمحاولات. يرجى الانتظار ${RATE_LIMIT_WINDOW_MINUTES} دقيقة.`
    };
  }
  
  try {
    const client = await getTwilioClient();
    
    const verification = await client.verify.v2
      .services(TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({
        to: normalizedPhone,
        channel: channel
      });
    
    console.log(`Twilio Verify sent to ${normalizedPhone.slice(0, 7)}*** via ${channel}, status: ${verification.status}`);
    
    await prisma.otpCode.updateMany({
      where: {
        phone: normalizedPhone,
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      data: {
        expiresAt: new Date()
      }
    });
    
    await prisma.otpCode.create({
      data: {
        phone: normalizedPhone,
        code: 'VERIFY_SERVICE',
        purpose,
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)
      }
    });
    
    const channelMessage = channel === 'whatsapp' 
      ? { en: 'Verification code sent via WhatsApp', ar: 'تم إرسال رمز التحقق عبر واتساب' }
      : { en: 'Verification code sent via SMS', ar: 'تم إرسال رمز التحقق عبر رسالة نصية' };
    
    return {
      success: true,
      message: channelMessage.en,
      messageAr: channelMessage.ar,
      expiresIn: OTP_EXPIRY_MINUTES * 60
    };
  } catch (error: any) {
    console.error('Twilio Verify error:', error?.message || error);
    
    if (error?.code === 60200) {
      return {
        success: false,
        message: 'Invalid phone number format',
        messageAr: 'صيغة رقم الجوال غير صحيحة'
      };
    }
    
    if (error?.code === 60203) {
      return {
        success: false,
        message: 'Too many verification attempts. Please wait 5 minutes before trying again.',
        messageAr: 'طلبات كثيرة جداً. يرجى الانتظار 5 دقائق ثم المحاولة مرة أخرى.'
      };
    }
    
    return {
      success: false,
      message: 'Failed to send verification code. Please try again.',
      messageAr: 'فشل في إرسال رمز التحقق. يرجى المحاولة مرة أخرى.'
    };
  }
}

export async function checkVerification(
  phone: string,
  code: string,
  purpose: OtpPurpose,
  countryCode?: string
): Promise<{ valid: boolean; message: string; messageAr: string }> {
  const normalizedPhone = normalizePhoneNumber(phone, countryCode);
  
  if (!TWILIO_VERIFY_SERVICE_SID) {
    console.error('TWILIO_VERIFY_SERVICE_SID not configured');
    return {
      valid: false,
      message: 'OTP service not configured',
      messageAr: 'خدمة التحقق غير مُعدة'
    };
  }
  
  const activeOtp = await prisma.otpCode.findFirst({
    where: {
      phone: normalizedPhone,
      purpose,
      usedAt: null,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  if (!activeOtp) {
    return {
      valid: false,
      message: 'No active verification for this purpose. Please request a new code.',
      messageAr: 'لا يوجد تحقق نشط لهذا الغرض. يرجى طلب رمز جديد.'
    };
  }
  
  try {
    const client = await getTwilioClient();
    
    const verificationCheck = await client.verify.v2
      .services(TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({
        to: normalizedPhone,
        code: code
      });
    
    console.log(`Verification check for ${normalizedPhone.slice(0, 7)}*** (${purpose}): ${verificationCheck.status}`);
    
    if (verificationCheck.status === 'approved') {
      await prisma.otpCode.update({
        where: { id: activeOtp.id },
        data: { usedAt: new Date() }
      });
      
      return {
        valid: true,
        message: 'Verification successful',
        messageAr: 'تم التحقق بنجاح'
      };
    }
    
    return {
      valid: false,
      message: 'Invalid verification code',
      messageAr: 'رمز التحقق غير صحيح'
    };
  } catch (error: any) {
    console.error('Verification check error:', error?.message || error);
    
    if (error?.code === 20404) {
      await prisma.otpCode.update({
        where: { id: activeOtp.id },
        data: { expiresAt: new Date() }
      });
      return {
        valid: false,
        message: 'Verification code expired or not found. Please request a new code.',
        messageAr: 'رمز التحقق منتهي الصلاحية أو غير موجود. يرجى طلب رمز جديد.'
      };
    }
    
    if (error?.code === 60202) {
      await prisma.otpCode.update({
        where: { id: activeOtp.id },
        data: { expiresAt: new Date() }
      });
      return {
        valid: false,
        message: 'Too many failed attempts. Please request a new code.',
        messageAr: 'محاولات فاشلة كثيرة. يرجى طلب رمز جديد.'
      };
    }
    
    return {
      valid: false,
      message: 'Verification failed. Please try again.',
      messageAr: 'فشل التحقق. يرجى المحاولة مرة أخرى.'
    };
  }
}

export async function createAndSendOtp(
  phone: string,
  purpose: OtpPurpose,
  userId?: string,
  countryCode?: string
): Promise<{ success: boolean; message: string; expiresIn?: number }> {
  const result = await sendVerification(phone, purpose, 'sms', countryCode);
  return {
    success: result.success,
    message: result.messageAr,
    expiresIn: result.expiresIn
  };
}

export async function verifyOtp(
  phone: string,
  code: string,
  purpose: OtpPurpose,
  countryCode?: string
): Promise<{ valid: boolean; message: string; userId?: string }> {
  const result = await checkVerification(phone, code, purpose, countryCode);
  return {
    valid: result.valid,
    message: result.messageAr
  };
}

export async function findUserByPhone(phone: string, countryCode?: string) {
  let normalizedPhone: string;
  
  try {
    normalizedPhone = normalizePhoneNumber(phone, countryCode);
  } catch {
    // Invalid phone format - return null
    return null;
  }
  
  // Try exact match with normalized phone (preferred)
  let user = await prisma.user.findFirst({
    where: {
      phone: normalizedPhone,
      status: 'ACTIVE'
    }
  });
  
  if (user) return user;
  
  // TEMPORARY FALLBACK: Flexible matching for legacy/unnormalized data
  // This can be removed once all data sources are verified to be normalized
  const digits = normalizedPhone.replace(/\D/g, '');
  let localNumber = '';
  
  if (digits.startsWith('966') && digits.length === 12) {
    localNumber = digits.substring(3); // 5XXXXXXXX
  }
  
  if (localNumber && localNumber.length === 9) {
    const possibleFormats = [
      `+966${localNumber}`,           // +9665XXXXXXXX (correct)
      `0${localNumber}`,              // 05XXXXXXXX (legacy local)
      localNumber,                     // 5XXXXXXXX (legacy without 0)
    ];
    
    user = await prisma.user.findFirst({
      where: {
        phone: { in: possibleFormats },
        status: 'ACTIVE'
      }
    });
  }
  
  return user;
}

export async function cleanupExpiredOtps() {
  const deleted = await prisma.otpCode.deleteMany({
    where: {
      expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  });
  
  return deleted.count;
}
