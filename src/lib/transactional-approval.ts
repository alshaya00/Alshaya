import { prisma } from './prisma';
import { Prisma } from '@prisma/client';
import { checkDataConsistency, ValidationIssue } from './data-integrity';
import { logAuditToDb } from './db-audit';
import { transliterateName } from './utils/transliteration';
import type { FamilyMember as PrismaFamilyMember, PendingMember } from '@prisma/client';

export interface ApprovalResult {
  success: boolean;
  member?: PrismaFamilyMember;
  message: string;
  messageAr: string;
  validationIssues?: ValidationIssue[];
  rollbackReason?: string;
}

export interface ApprovalContext {
  pendingId: string;
  userId: string;
  userEmail: string;
  userRole: string;
  reviewNote?: string;
}

type TransactionClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

async function getNextIdFromTransaction(tx: TransactionClient): Promise<string> {
  const lastMember = await tx.familyMember.findFirst({
    orderBy: { id: 'desc' },
    select: { id: true },
  });

  if (!lastMember) return '1';

  const lastIdNum = parseInt(lastMember.id, 10);
  if (isNaN(lastIdNum)) {
    const count = await tx.familyMember.count();
    return String(count + 1);
  }

  return String(lastIdNum + 1);
}

async function calculateGenerationInTx(tx: TransactionClient, fatherId: string | null): Promise<number> {
  if (!fatherId) return 1;

  const father = await tx.familyMember.findUnique({
    where: { id: fatherId },
    select: { generation: true },
  });

  return father ? father.generation + 1 : 1;
}

async function buildLineagePathInTx(tx: TransactionClient, fatherId: string | null): Promise<string> {
  if (!fatherId) return '';

  const ancestors: string[] = [];
  let currentId: string | null = fatherId;

  for (let i = 0; i < 20 && currentId; i++) {
    const ancestor: { id: string; firstName: string; fatherId: string | null } | null = 
      await tx.familyMember.findUnique({
        where: { id: currentId },
        select: { id: true, firstName: true, fatherId: true },
      });

    if (!ancestor) break;
    ancestors.unshift(ancestor.firstName);
    currentId = ancestor.fatherId;
  }

  return ancestors.join(' > ');
}

async function updateParentChildrenCountInTx(tx: TransactionClient, fatherId: string): Promise<void> {
  const children = await tx.familyMember.findMany({
    where: { fatherId, deletedAt: null },
    select: { gender: true },
  });

  const sonsCount = children.filter(c => c.gender === 'Male').length;
  const daughtersCount = children.filter(c => c.gender === 'Female').length;

  await tx.familyMember.update({
    where: { id: fatherId },
    data: { sonsCount, daughtersCount },
  });
}

export async function approvePendingMemberTransactional(
  context: ApprovalContext
): Promise<ApprovalResult> {
  const { pendingId, userId, userEmail, userRole, reviewNote } = context;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const pending = await tx.pendingMember.findUnique({
        where: { id: pendingId },
      });

      if (!pending) {
        throw new Error('PENDING_NOT_FOUND');
      }

      if (pending.reviewStatus !== 'PENDING') {
        throw new Error('ALREADY_PROCESSED');
      }

      if (pending.proposedFatherId) {
        const father = await tx.familyMember.findUnique({
          where: { id: pending.proposedFatherId },
          select: { id: true, gender: true, firstName: true },
        });

        if (!father) {
          throw new Error('FATHER_NOT_FOUND');
        }

        if (father.gender !== 'Male') {
          throw new Error('FATHER_NOT_MALE');
        }
      }

      const newId = await getNextIdFromTransaction(tx);
      const calculatedGeneration = await calculateGenerationInTx(tx, pending.proposedFatherId);
      const lineagePath = await buildLineagePathInTx(tx, pending.proposedFatherId);

      let fullNameEn = pending.fullNameEn;
      if (!fullNameEn && pending.fullNameAr) {
        fullNameEn = transliterateName(pending.fullNameAr);
      }

      const newMember = await tx.familyMember.create({
        data: {
          id: newId,
          firstName: pending.firstName,
          fatherName: pending.fatherName,
          grandfatherName: pending.grandfatherName,
          greatGrandfatherName: pending.greatGrandfatherName,
          familyName: pending.familyName || 'آل شايع',
          fatherId: pending.proposedFatherId,
          gender: pending.gender,
          birthYear: pending.birthYear,
          generation: calculatedGeneration,
          branch: pending.branch,
          fullNameAr: pending.fullNameAr,
          fullNameEn: fullNameEn,
          lineagePath: lineagePath,
          phone: pending.phone,
          city: pending.city,
          status: pending.status || 'Living',
          occupation: pending.occupation,
          email: pending.email,
          sonsCount: 0,
          daughtersCount: 0,
          createdBy: userId,
          version: 1,
        },
      });

      await tx.pendingMember.update({
        where: { id: pendingId },
        data: {
          reviewStatus: 'APPROVED',
          reviewedBy: userId,
          reviewedAt: new Date(),
          reviewNotes: reviewNote,
          approvedMemberId: newId,
        },
      });

      if (pending.proposedFatherId) {
        await updateParentChildrenCountInTx(tx, pending.proposedFatherId);
      }

      const memberWithFather = await tx.familyMember.findUnique({
        where: { id: newId },
        select: {
          id: true,
          firstName: true,
          generation: true,
          fatherId: true,
        },
      });

      if (memberWithFather?.fatherId) {
        const father = await tx.familyMember.findUnique({
          where: { id: memberWithFather.fatherId },
          select: { generation: true },
        });

        if (father && memberWithFather.generation !== father.generation + 1) {
          throw new Error(`GENERATION_MISMATCH: Expected ${father.generation + 1}, got ${memberWithFather.generation}`);
        }
      }

      return { newMember, pending, newId, calculatedGeneration };
    }, {
      maxWait: 10000,
      timeout: 30000,
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    try {
      await logAuditToDb({
        action: 'PENDING_APPROVE_TRANSACTIONAL',
        severity: 'INFO',
        userId: userId,
        userName: userEmail,
        userRole: userRole,
        targetType: 'FAMILY_MEMBER',
        targetId: result.newId,
        targetName: result.pending.fullNameAr || result.pending.firstName,
        description: `تمت الموافقة على العضو المعلق وإضافته للشجرة: ${result.pending.firstName}`,
        details: {
          pendingId,
          newMemberId: result.newId,
          generation: result.calculatedGeneration,
          fatherId: result.pending.proposedFatherId,
          reviewNote,
          parentChildrenUpdated: !!result.pending.proposedFatherId,
          transactionType: 'SERIALIZABLE',
        },
        newState: result.newMember as unknown as Record<string, unknown>,
        success: true,
      });
    } catch (auditError) {
      console.error('Audit logging failed (non-critical):', auditError);
    }

    return {
      success: true,
      member: result.newMember,
      message: 'Member approved and added to family tree successfully',
      messageAr: 'تمت الموافقة على العضو وإضافته لشجرة العائلة بنجاح',
    };

  } catch (error) {
    console.error('Transactional approval failed:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let userMessage = 'Failed to approve member. Transaction rolled back.';
    let userMessageAr = 'فشل في الموافقة على العضو. تم التراجع عن جميع التغييرات.';

    if (errorMessage === 'PENDING_NOT_FOUND') {
      userMessage = 'Pending member not found';
      userMessageAr = 'العضو المعلق غير موجود';
    } else if (errorMessage === 'ALREADY_PROCESSED') {
      userMessage = 'This member has already been processed';
      userMessageAr = 'تمت معالجة هذا العضو مسبقاً';
    } else if (errorMessage === 'FATHER_NOT_FOUND') {
      userMessage = 'Proposed father does not exist in family tree';
      userMessageAr = 'الأب المقترح غير موجود في شجرة العائلة';
    } else if (errorMessage === 'FATHER_NOT_MALE') {
      userMessage = 'Proposed father must be male';
      userMessageAr = 'يجب أن يكون الأب المقترح ذكراً';
    } else if (errorMessage.startsWith('GENERATION_MISMATCH')) {
      userMessage = 'Generation calculation error detected';
      userMessageAr = 'تم اكتشاف خطأ في حساب الجيل';
    }

    try {
      await logAuditToDb({
        action: 'PENDING_APPROVE_FAILED',
        severity: 'ERROR',
        userId: userId,
        userName: userEmail,
        userRole: userRole,
        targetType: 'PENDING_MEMBER',
        targetId: pendingId,
        description: `فشل في الموافقة على العضو المعلق: ${errorMessage}`,
        details: {
          error: errorMessage,
          rolledBack: true,
        },
        success: false,
      });
    } catch (auditError) {
      console.error('Failed to log audit for failed approval:', auditError);
    }

    return {
      success: false,
      message: userMessage,
      messageAr: userMessageAr,
      rollbackReason: errorMessage,
    };
  }
}

export async function recalculateAllChildrenCounts(): Promise<{
  updated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let updated = 0;

  const fathers = await prisma.familyMember.findMany({
    where: { deletedAt: null, gender: 'Male' },
    select: { id: true, firstName: true },
  });

  for (const father of fathers) {
    try {
      const children = await prisma.familyMember.findMany({
        where: { fatherId: father.id, deletedAt: null },
        select: { gender: true },
      });

      const sonsCount = children.filter(c => c.gender === 'Male').length;
      const daughtersCount = children.filter(c => c.gender === 'Female').length;

      await prisma.familyMember.update({
        where: { id: father.id },
        data: { sonsCount, daughtersCount },
      });

      updated++;
    } catch (error) {
      errors.push(`Failed to update ${father.firstName} (${father.id}): ${error}`);
    }
  }

  return { updated, errors };
}

export async function validateAndFixGenerations(): Promise<{
  fixed: number;
  issues: ValidationIssue[];
}> {
  const issues: ValidationIssue[] = [];
  let fixed = 0;

  const members = await prisma.familyMember.findMany({
    where: { deletedAt: null, fatherId: { not: null } },
    select: { id: true, firstName: true, fatherId: true, generation: true },
  });

  for (const member of members) {
    if (!member.fatherId) continue;

    const father = await prisma.familyMember.findUnique({
      where: { id: member.fatherId },
      select: { generation: true },
    });

    if (father && member.generation !== father.generation + 1) {
      issues.push({
        memberId: member.id,
        memberName: member.firstName,
        issue: `Generation mismatch: was ${member.generation}, should be ${father.generation + 1}`,
        issueAr: `عدم تطابق الجيل: كان ${member.generation}، يجب أن يكون ${father.generation + 1}`,
        severity: 'warning',
        details: {
          oldGeneration: member.generation,
          expectedGeneration: father.generation + 1,
        },
      });

      await prisma.familyMember.update({
        where: { id: member.id },
        data: { generation: father.generation + 1 },
      });

      fixed++;
    }
  }

  return { fixed, issues };
}

export async function runFullIntegrityCheck(): Promise<{
  passed: boolean;
  report: Awaited<ReturnType<typeof checkDataConsistency>>;
}> {
  const report = await checkDataConsistency();
  
  return {
    passed: report.overallValid,
    report,
  };
}
