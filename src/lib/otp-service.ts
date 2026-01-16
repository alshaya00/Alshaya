import { prisma } from './prisma';
import { getTwilioClient, getTwilioFromPhoneNumber } from './twilio-client';

const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MINUTES = 15;
const MAX_CODES_PER_WINDOW = 5;

export type OtpPurpose = 'LOGIN' | 'REGISTRATION' | 'VERIFICATION';

function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function normalizePhoneNumber(phone: string, countryCode: string = '+966'): string {
  let cleaned = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
  
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

export async function checkRateLimit(phone: string): Promise<{ allowed: boolean; remainingAttempts: number }> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
  
  const recentCodes = await prisma.otpCode.count({
    where: {
      phone,
      createdAt: { gte: windowStart }
    }
  });
  
  const allowed = recentCodes < MAX_CODES_PER_WINDOW;
  const remainingAttempts = Math.max(0, MAX_CODES_PER_WINDOW - recentCodes);
  
  return { allowed, remainingAttempts };
}

export async function createAndSendOtp(
  phone: string,
  purpose: OtpPurpose,
  userId?: string
): Promise<{ success: boolean; message: string; expiresIn?: number }> {
  const normalizedPhone = normalizePhoneNumber(phone);
  
  const { allowed, remainingAttempts } = await checkRateLimit(normalizedPhone);
  if (!allowed) {
    return {
      success: false,
      message: `تم تجاوز الحد الأقصى للمحاولات. يرجى الانتظار ${RATE_LIMIT_WINDOW_MINUTES} دقيقة.`
    };
  }
  
  await prisma.otpCode.updateMany({
    where: {
      phone: normalizedPhone,
      purpose,
      usedAt: null,
      expiresAt: { gt: new Date() }
    },
    data: {
      expiresAt: new Date()
    }
  });
  
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  
  await prisma.otpCode.create({
    data: {
      phone: normalizedPhone,
      code,
      purpose,
      userId,
      expiresAt
    }
  });
  
  try {
    const client = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();
    
    const messageBody = purpose === 'LOGIN' 
      ? `رمز الدخول لشجرة عائلة آل شايع: ${code}\nصالح لمدة ${OTP_EXPIRY_MINUTES} دقائق.`
      : purpose === 'REGISTRATION'
      ? `رمز التحقق للتسجيل في شجرة عائلة آل شايع: ${code}\nصالح لمدة ${OTP_EXPIRY_MINUTES} دقائق.`
      : `رمز التحقق من رقم الجوال: ${code}\nصالح لمدة ${OTP_EXPIRY_MINUTES} دقائق.`;
    
    await client.messages.create({
      body: messageBody,
      from: fromNumber,
      to: normalizedPhone
    });
    
    return {
      success: true,
      message: 'تم إرسال رمز التحقق',
      expiresIn: OTP_EXPIRY_MINUTES * 60
    };
  } catch (error: any) {
    console.error('Failed to send SMS:', error);
    
    await prisma.otpCode.deleteMany({
      where: {
        phone: normalizedPhone,
        code
      }
    });
    
    return {
      success: false,
      message: 'فشل في إرسال الرسالة النصية. يرجى التأكد من صحة رقم الجوال.'
    };
  }
}

export async function verifyOtp(
  phone: string,
  code: string,
  purpose: OtpPurpose
): Promise<{ valid: boolean; message: string; userId?: string }> {
  const normalizedPhone = normalizePhoneNumber(phone);
  
  const otpRecord = await prisma.otpCode.findFirst({
    where: {
      phone: normalizedPhone,
      purpose,
      usedAt: null,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  if (!otpRecord) {
    return {
      valid: false,
      message: 'لا يوجد رمز تحقق صالح. يرجى طلب رمز جديد.'
    };
  }
  
  if (otpRecord.attempts >= MAX_ATTEMPTS) {
    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { expiresAt: new Date() }
    });
    
    return {
      valid: false,
      message: 'تم تجاوز عدد المحاولات المسموح. يرجى طلب رمز جديد.'
    };
  }
  
  if (otpRecord.code !== code) {
    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { attempts: otpRecord.attempts + 1 }
    });
    
    const remaining = MAX_ATTEMPTS - otpRecord.attempts - 1;
    return {
      valid: false,
      message: `رمز التحقق غير صحيح. المحاولات المتبقية: ${remaining}`
    };
  }
  
  await prisma.otpCode.update({
    where: { id: otpRecord.id },
    data: { usedAt: new Date() }
  });
  
  return {
    valid: true,
    message: 'تم التحقق بنجاح',
    userId: otpRecord.userId || undefined
  };
}

export async function findUserByPhone(phone: string) {
  const normalizedPhone = normalizePhoneNumber(phone);
  
  return prisma.user.findFirst({
    where: {
      phone: normalizedPhone,
      status: 'ACTIVE'
    }
  });
}

export async function cleanupExpiredOtps() {
  const deleted = await prisma.otpCode.deleteMany({
    where: {
      expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  });
  
  return deleted.count;
}
