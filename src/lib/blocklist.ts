import { prisma } from '@/lib/prisma';
import { normalizePhoneNumber } from '@/lib/phone-utils';

export async function isPhoneBlocked(phone: string): Promise<{ blocked: boolean; reason?: string }> {
  const normalizedPhone = normalizePhoneNumber(phone) || phone;
  
  const blockEntry = await prisma.blocklist.findFirst({
    where: {
      type: 'PHONE',
      value: normalizedPhone,
    },
  });

  if (blockEntry) {
    return { blocked: true, reason: blockEntry.reason || undefined };
  }

  return { blocked: false };
}

export async function isEmailBlocked(email: string): Promise<{ blocked: boolean; reason?: string }> {
  const normalizedEmail = email.toLowerCase();
  
  const blockEntry = await prisma.blocklist.findFirst({
    where: {
      type: 'EMAIL',
      value: normalizedEmail,
    },
  });

  if (blockEntry) {
    return { blocked: true, reason: blockEntry.reason || undefined };
  }

  return { blocked: false };
}

export async function checkBlocklist(phone?: string, email?: string): Promise<{
  blocked: boolean;
  blockedPhone: boolean;
  blockedEmail: boolean;
  reason?: string;
}> {
  let blockedPhone = false;
  let blockedEmail = false;
  let reason: string | undefined;

  if (phone) {
    const phoneResult = await isPhoneBlocked(phone);
    blockedPhone = phoneResult.blocked;
    if (phoneResult.reason) {
      reason = phoneResult.reason;
    }
  }

  if (email) {
    const emailResult = await isEmailBlocked(email);
    blockedEmail = emailResult.blocked;
    if (emailResult.reason) {
      reason = emailResult.reason;
    }
  }

  return {
    blocked: blockedPhone || blockedEmail,
    blockedPhone,
    blockedEmail,
    reason,
  };
}
