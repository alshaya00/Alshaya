import { prisma } from './prisma';
import { Prisma } from '@prisma/client';
import { checkDataConsistency, ValidationIssue } from './data-integrity';
import { logAuditToDb } from './db-audit';
import {
  generateNextMemberId,
  calculateGeneration,
  buildLineageInfo,
  validateParent,
  updateParentChildrenCount,
  generateFullNames,
  checkForDuplicates,
} from './member-registry';
import type { FamilyMember as PrismaFamilyMember } from '@prisma/client';

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
  overrideDuplicateCheck?: boolean;
}

type TransactionClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

export async function approvePendingMemberTransactional(
  context: ApprovalContext
): Promise<ApprovalResult> {
  const { pendingId, userId, userEmail, userRole, reviewNote, overrideDuplicateCheck } = context;

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
        const parentValidation = await validateParent(pending.proposedFatherId, tx);
        
        if (!parentValidation.valid) {
          if (parentValidation.error?.includes('does not exist')) {
            throw new Error('FATHER_NOT_FOUND');
          }
          if (parentValidation.error?.includes('must be male')) {
            throw new Error('FATHER_NOT_MALE');
          }
          throw new Error(`PARENT_INVALID: ${parentValidation.error}`);
        }
      }

      // Skip duplicate check if admin explicitly overrides
      if (!overrideDuplicateCheck) {
        const duplicates = await checkForDuplicates({
          firstName: pending.firstName,
          fatherId: pending.proposedFatherId || undefined,
          fatherName: pending.fatherName || undefined,
        }, tx);

        if (duplicates.isDuplicate) {
          throw new Error(`DUPLICATE_FOUND: ${duplicates.existingMembers.map(m => m.id).join(', ')}`);
        }
      }

      const newId = await generateNextMemberId(tx);
      const generationResult = await calculateGeneration(pending.proposedFatherId, tx);
      
      if (!generationResult.valid) {
        throw new Error(`INVALID_GENERATION: ${generationResult.error}`);
      }
      
      const calculatedGeneration = generationResult.generation;
      const lineageInfo = await buildLineageInfo(pending.proposedFatherId, tx);

      const fullNames = generateFullNames({
        firstName: pending.firstName,
        fatherName: pending.fatherName,
        grandfatherName: pending.grandfatherName,
        familyName: pending.familyName || 'آل شايع',
        gender: pending.gender as 'Male' | 'Female',
      });

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
          fullNameAr: fullNames.fullNameAr,
          fullNameEn: fullNames.fullNameEn,
          lineagePath: lineageInfo.lineagePath,
          lineageBranchId: lineageInfo.lineageBranchId,
          lineageBranchName: lineageInfo.lineageBranchName,
          subBranchId: lineageInfo.subBranchId,
          subBranchName: lineageInfo.subBranchName,
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
        await updateParentChildrenCount(pending.proposedFatherId, tx);
      }

      const createdMember = await tx.familyMember.findUnique({
        where: { id: newId },
        select: {
          id: true,
          firstName: true,
          generation: true,
          fatherId: true,
          sonsCount: true,
          daughtersCount: true,
        },
      });

      if (!createdMember) {
        throw new Error('MEMBER_CREATE_FAILED');
      }

      if (createdMember.generation < 1 || createdMember.generation > 20) {
        throw new Error(`INVALID_GENERATION: ${createdMember.generation}`);
      }

      if (createdMember.fatherId) {
        const father = await tx.familyMember.findUnique({
          where: { id: createdMember.fatherId },
          select: { id: true, generation: true, sonsCount: true, daughtersCount: true },
        });

        if (!father) {
          throw new Error('FATHER_DISAPPEARED');
        }

        if (createdMember.generation !== father.generation + 1) {
          throw new Error(`GENERATION_MISMATCH: Expected ${father.generation + 1}, got ${createdMember.generation}`);
        }

        const actualChildren = await tx.familyMember.findMany({
          where: { fatherId: father.id, deletedAt: null },
          select: { gender: true },
        });
        const actualSons = actualChildren.filter(c => c.gender?.toUpperCase() === 'MALE').length;
        const actualDaughters = actualChildren.filter(c => c.gender?.toUpperCase() === 'FEMALE').length;

        if (father.sonsCount !== actualSons || father.daughtersCount !== actualDaughters) {
          throw new Error(`CHILDREN_COUNT_MISMATCH: sons=${father.sonsCount}/${actualSons}, daughters=${father.daughtersCount}/${actualDaughters}`);
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
          integrityValidated: true,
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
    let rollbackReason = errorMessage;

    if (errorMessage === 'PENDING_NOT_FOUND') {
      userMessage = 'Pending member not found';
      userMessageAr = 'العضو المعلق غير موجود';
      rollbackReason = 'Pending member record does not exist';
    } else if (errorMessage === 'ALREADY_PROCESSED') {
      userMessage = 'This member has already been processed';
      userMessageAr = 'تمت معالجة هذا العضو مسبقاً';
      rollbackReason = 'Review status is not PENDING';
    } else if (errorMessage === 'FATHER_NOT_FOUND') {
      userMessage = 'Proposed father does not exist in family tree';
      userMessageAr = 'الأب المقترح غير موجود في شجرة العائلة';
      rollbackReason = 'Father ID references non-existent member';
    } else if (errorMessage === 'FATHER_NOT_MALE') {
      userMessage = 'Proposed father must be male';
      userMessageAr = 'يجب أن يكون الأب المقترح ذكراً';
      rollbackReason = 'Father record has gender !== Male';
    } else if (errorMessage === 'FATHER_DISAPPEARED') {
      userMessage = 'Father record disappeared during transaction';
      userMessageAr = 'اختفى سجل الأب أثناء المعاملة';
      rollbackReason = 'Race condition: father deleted mid-transaction';
    } else if (errorMessage === 'MEMBER_CREATE_FAILED') {
      userMessage = 'Failed to create member record';
      userMessageAr = 'فشل في إنشاء سجل العضو';
      rollbackReason = 'FamilyMember.create returned null/undefined';
    } else if (errorMessage.startsWith('GENERATION_MISMATCH')) {
      userMessage = 'Generation calculation error detected';
      userMessageAr = 'تم اكتشاف خطأ في حساب الجيل';
      rollbackReason = errorMessage;
    } else if (errorMessage.startsWith('INVALID_GENERATION')) {
      userMessage = 'Invalid generation value';
      userMessageAr = 'قيمة جيل غير صالحة';
      rollbackReason = errorMessage;
    } else if (errorMessage.startsWith('CHILDREN_COUNT_MISMATCH')) {
      userMessage = 'Children count verification failed';
      userMessageAr = 'فشل التحقق من عدد الأبناء';
      rollbackReason = errorMessage;
    } else if (errorMessage.startsWith('PARENT_INVALID:')) {
      userMessage = 'Parent validation failed';
      userMessageAr = 'فشل التحقق من الوالد';
      rollbackReason = errorMessage;
    } else if (errorMessage.startsWith('DUPLICATE_FOUND:')) {
      userMessage = 'A member with this name already exists under this parent';
      userMessageAr = 'يوجد عضو بنفس الاسم تحت هذا الأب';
      rollbackReason = errorMessage;
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
        description: `فشل في الموافقة على العضو المعلق: ${rollbackReason}`,
        details: {
          errorCode: errorMessage,
          rollbackReason,
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
      rollbackReason,
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
      await updateParentChildrenCount(father.id);
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

    const generationResult = await calculateGeneration(member.fatherId);

    if (member.generation !== generationResult.generation) {
      issues.push({
        memberId: member.id,
        memberName: member.firstName,
        issue: `Generation mismatch: was ${member.generation}, should be ${generationResult.generation}`,
        issueAr: `عدم تطابق الجيل: كان ${member.generation}، يجب أن يكون ${generationResult.generation}`,
        severity: 'warning',
        details: {
          oldGeneration: member.generation,
          expectedGeneration: generationResult.generation,
        },
      });

      await prisma.familyMember.update({
        where: { id: member.id },
        data: { generation: generationResult.generation },
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
