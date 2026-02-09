import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, createRateLimitResponse, RateLimitConfig } from '@/lib/rate-limit';
export const dynamic = "force-dynamic";

const validateRateLimiter: RateLimitConfig = {
  windowMs: 60000,
  maxRequests: 5,
  keyPrefix: 'invite_validate',
};

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(clientIp, validateRateLimiter);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        { status: 429 }
      );
    }

    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { 
          success: false, 
          valid: false,
          message: 'Invitation code is required', 
          messageAr: 'رمز الدعوة مطلوب' 
        },
        { status: 400 }
      );
    }

    const normalizedCode = code.trim().toUpperCase();

    const invitation = await prisma.invitationCode.findUnique({
      where: { code: normalizedCode },
      select: {
        id: true,
        code: true,
        status: true,
        maxUses: true,
        usedCount: true,
        expiresAt: true,
        linkedMemberId: true,
        linkedMemberName: true,
        note: true,
      },
    });

    if (!invitation) {
      return NextResponse.json({
        success: true,
        valid: false,
        reason: 'NOT_FOUND',
        message: 'Invalid invitation code',
        messageAr: 'رمز الدعوة غير صالح',
      });
    }

    if (invitation.status !== 'ACTIVE') {
      let reasonMessage = 'Invitation code is no longer active';
      let reasonMessageAr = 'رمز الدعوة لم يعد نشطًا';

      if (invitation.status === 'REVOKED') {
        reasonMessage = 'Invitation code has been revoked';
        reasonMessageAr = 'تم إلغاء رمز الدعوة';
      } else if (invitation.status === 'USED') {
        reasonMessage = 'Invitation code has already been fully used';
        reasonMessageAr = 'تم استخدام رمز الدعوة بالكامل';
      } else if (invitation.status === 'EXPIRED') {
        reasonMessage = 'Invitation code has expired';
        reasonMessageAr = 'انتهت صلاحية رمز الدعوة';
      }

      return NextResponse.json({
        success: true,
        valid: false,
        reason: invitation.status,
        message: reasonMessage,
        messageAr: reasonMessageAr,
      });
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      await prisma.invitationCode.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });

      return NextResponse.json({
        success: true,
        valid: false,
        reason: 'EXPIRED',
        message: 'Invitation code has expired',
        messageAr: 'انتهت صلاحية رمز الدعوة',
      });
    }

    if (invitation.usedCount >= invitation.maxUses) {
      await prisma.invitationCode.update({
        where: { id: invitation.id },
        data: { status: 'USED' },
      });

      return NextResponse.json({
        success: true,
        valid: false,
        reason: 'MAX_USES_REACHED',
        message: 'Invitation code has reached maximum uses',
        messageAr: 'رمز الدعوة وصل للحد الأقصى من الاستخدامات',
      });
    }

    let linkedMemberInfo = null;
    if (invitation.linkedMemberId) {
      const linkedMember = await prisma.familyMember.findUnique({
        where: { id: invitation.linkedMemberId },
        select: {
          id: true,
          firstName: true,
          fatherName: true,
          fullNameAr: true,
          fullNameEn: true,
          generation: true,
          branch: true,
        },
      });

      if (linkedMember) {
        linkedMemberInfo = {
          id: linkedMember.id,
          name: invitation.linkedMemberName || linkedMember.fullNameAr || linkedMember.firstName,
          fullNameAr: linkedMember.fullNameAr,
          fullNameEn: linkedMember.fullNameEn,
          generation: linkedMember.generation,
          branch: linkedMember.branch,
        };
      }
    }

    return NextResponse.json({
      success: true,
      valid: true,
      invitation: {
        id: invitation.id,
        code: invitation.code,
        remainingUses: invitation.maxUses - invitation.usedCount,
        expiresAt: invitation.expiresAt,
      },
      linkedMemberInfo,
      message: 'Invitation code is valid',
      messageAr: 'رمز الدعوة صالح',
    });
  } catch (error) {
    console.error('Error validating invitation:', error);
    return NextResponse.json(
      { 
        success: false, 
        valid: false,
        message: 'Failed to validate invitation code', 
        messageAr: 'فشل في التحقق من رمز الدعوة' 
      },
      { status: 500 }
    );
  }
}
