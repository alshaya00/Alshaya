import { prisma, Prisma } from './prisma';
import { logAuditToDb } from './db-audit';
import type { FamilyMember } from '@prisma/client';

export interface MergePreview {
  source: FamilyMember;
  target: FamilyMember;
  conflicts: MergeConflict[];
  impactedChildren: { id: string; firstName: string }[];
  impactedPhotos: number;
  impactedJournals: number;
  warnings: string[];
  warningsAr: string[];
  linkedAccounts: { userId: string; email: string; nameArabic: string; memberType: 'source' | 'target' }[];
  hasCriticalGenerationMismatch: boolean;
  generationDifference: number;
  hasDifferentFather: boolean;
}

export interface MergeConflict {
  field: string;
  fieldAr: string;
  sourceValue: string | number | null;
  targetValue: string | number | null;
  recommendation: 'keep_source' | 'keep_target' | 'manual';
}

export interface MergeResult {
  success: boolean;
  message: string;
  messageAr: string;
  mergedMember?: FamilyMember;
  deletedMemberId?: string;
  impactSummary?: {
    childrenUpdated: number;
    photosTransferred: number;
    journalsUpdated: number;
    linkedAccountsTransferred: number;
    pendingRequestsUpdated: number;
  };
}

export interface MergeOptions {
  keepSourceFields?: string[];
  performedBy: string;
  reason?: string;
}

const MERGEABLE_FIELDS = [
  'firstName', 'fatherName', 'grandfatherName', 'greatGrandfatherName',
  'fullNameAr', 'fullNameEn',
  'birthYear', 'birthCalendar', 'deathYear', 'deathCalendar',
  'phone', 'email', 'city', 'occupation', 'biography', 'photoUrl', 'status'
];

export async function generateMergePreview(
  sourceId: string,
  targetId: string
): Promise<MergePreview | null> {
  const [source, target] = await Promise.all([
    prisma.familyMember.findUnique({ where: { id: sourceId } }),
    prisma.familyMember.findUnique({ where: { id: targetId } }),
  ]);

  if (!source || !target) {
    return null;
  }

  const conflicts: MergeConflict[] = [];
  const warnings: string[] = [];
  const warningsAr: string[] = [];

  for (const field of MERGEABLE_FIELDS) {
    const sourceVal = (source as Record<string, unknown>)[field];
    const targetVal = (target as Record<string, unknown>)[field];

    if (sourceVal && targetVal && sourceVal !== targetVal) {
      conflicts.push({
        field,
        fieldAr: getFieldNameAr(field),
        sourceValue: sourceVal as string | number | null,
        targetValue: targetVal as string | number | null,
        recommendation: targetVal ? 'keep_target' : 'keep_source',
      });
    }
  }

  if (source.generation !== target.generation) {
    const genDiff = Math.abs(source.generation - target.generation);
    if (genDiff >= 2) {
      warnings.push(`⚠️ CRITICAL: Large generation difference (${genDiff} generations apart) - Gen ${source.generation} vs Gen ${target.generation}. These are almost certainly DIFFERENT PEOPLE with the same name!`);
      warningsAr.push(`⚠️ تحذير خطير: فارق كبير في الأجيال (${genDiff} أجيال) - الجيل ${source.generation} مقابل الجيل ${target.generation}. هؤلاء على الأرجح أشخاص مختلفون بنفس الاسم!`);
    } else {
      warnings.push(`Generation mismatch: source is Gen ${source.generation}, target is Gen ${target.generation}`);
      warningsAr.push(`اختلاف الجيل: المصدر الجيل ${source.generation}، الهدف الجيل ${target.generation}`);
    }
  }

  // Check for different fathers - this is a critical blocker
  const hasDifferentFather = !!(source.fatherId && target.fatherId && source.fatherId !== target.fatherId);
  if (hasDifferentFather) {
    warnings.push('⚠️ CRITICAL: Members have DIFFERENT FATHERS - These are DEFINITELY DIFFERENT PEOPLE with the same name! Merge is blocked.');
    warningsAr.push('⚠️ تحذير خطير: الأعضاء لديهم آباء مختلفون - هؤلاء أشخاص مختلفون بالتأكيد بنفس الاسم! الدمج محظور.');
  } else if (source.fatherId !== target.fatherId) {
    warnings.push('Members have different or missing father links');
    warningsAr.push('الأعضاء لديهم روابط آباء مختلفة أو مفقودة');
  }

  if (source.phone && target.phone && source.phone !== target.phone) {
    warnings.push(`Phone number conflict: source ${source.phone} vs target ${target.phone}`);
    warningsAr.push(`تعارض في رقم الهاتف: المصدر ${source.phone} مقابل الهدف ${target.phone}`);
  }

  if (source.email && target.email && source.email.toLowerCase() !== target.email.toLowerCase()) {
    warnings.push(`Email conflict: source ${source.email} vs target ${target.email}`);
    warningsAr.push(`تعارض في البريد الإلكتروني: المصدر ${source.email} مقابل الهدف ${target.email}`);
  }

  const [children, photos, journals, linkedUsers] = await Promise.all([
    prisma.familyMember.findMany({
      where: { fatherId: sourceId, deletedAt: null },
      select: { id: true, firstName: true },
    }),
    prisma.memberPhoto.count({ where: { memberId: sourceId } }),
    prisma.familyJournal.count({
      where: {
        OR: [
          { primaryMemberId: sourceId },
          { relatedMemberIds: { has: sourceId } },
        ],
      },
    }),
    prisma.user.findMany({
      where: { linkedMemberId: { in: [sourceId, targetId] } },
      select: { id: true, email: true, nameArabic: true, linkedMemberId: true }
    }),
  ]);

  if (children.length > 0) {
    warnings.push(`Source member has ${children.length} children that will be reassigned to target`);
    warningsAr.push(`العضو المصدر لديه ${children.length} أبناء سيتم نقلهم للعضو الهدف`);
  }

  // Process linked accounts
  const linkedAccounts: { userId: string; email: string; nameArabic: string; memberType: 'source' | 'target' }[] = [];
  const sourceLinkedUsers = linkedUsers.filter(u => u.linkedMemberId === sourceId);
  const targetLinkedUsers = linkedUsers.filter(u => u.linkedMemberId === targetId);

  for (const user of sourceLinkedUsers) {
    linkedAccounts.push({
      userId: user.id,
      email: user.email,
      nameArabic: user.nameArabic,
      memberType: 'source',
    });
    warnings.push(`Source has linked account: ${user.email}`);
    warningsAr.push(`المصدر مرتبط بحساب: ${user.email}`);
  }

  for (const user of targetLinkedUsers) {
    linkedAccounts.push({
      userId: user.id,
      email: user.email,
      nameArabic: user.nameArabic,
      memberType: 'target',
    });
    warnings.push(`Target has linked account: ${user.email}`);
    warningsAr.push(`الهدف مرتبط بحساب: ${user.email}`);
  }

  // Critical warning if both have linked accounts - merge will be blocked
  if (sourceLinkedUsers.length > 0 && targetLinkedUsers.length > 0) {
    warnings.push('BLOCKED: Both members have linked user accounts! You must unlink one account before merging.');
    warningsAr.push('محظور: كلا العضوين مرتبطان بحسابات مستخدمين! يجب فك ارتباط أحد الحسابات قبل الدمج');
  }

  const generationDifference = Math.abs(source.generation - target.generation);
  const hasCriticalGenerationMismatch = generationDifference >= 2;

  return {
    source,
    target,
    conflicts,
    impactedChildren: children,
    impactedPhotos: photos,
    impactedJournals: journals,
    warnings,
    warningsAr,
    linkedAccounts,
    hasCriticalGenerationMismatch,
    generationDifference,
    hasDifferentFather,
  };
}

export async function mergeMemberProfiles(
  sourceId: string,
  targetId: string,
  options: MergeOptions
): Promise<MergeResult> {
  const preview = await generateMergePreview(sourceId, targetId);

  if (!preview) {
    return {
      success: false,
      message: 'One or both members not found',
      messageAr: 'لم يتم العثور على أحد الأعضاء أو كلاهما',
    };
  }

  // Block merge if both members have linked user accounts
  const sourceAccounts = preview.linkedAccounts.filter(a => a.memberType === 'source');
  const targetAccounts = preview.linkedAccounts.filter(a => a.memberType === 'target');
  if (sourceAccounts.length > 0 && targetAccounts.length > 0) {
    return {
      success: false,
      message: 'Cannot merge: both members have linked user accounts. Unlink one account first.',
      messageAr: 'لا يمكن الدمج: كلا العضوين مرتبطان بحسابات مستخدمين. يرجى فك ارتباط أحد الحسابات أولاً',
    };
  }

  // Block merge if members have different fathers (definitely different people with same name)
  if (preview.hasDifferentFather) {
    return {
      success: false,
      message: `Cannot merge: Members have DIFFERENT FATHERS - These are definitely different people with the same name.`,
      messageAr: `لا يمكن الدمج: الأعضاء لديهم آباء مختلفون - هؤلاء أشخاص مختلفون بالتأكيد بنفس الاسم.`,
    };
  }

  // Block merge if generation difference is too large (likely different people with same name)
  if (preview.hasCriticalGenerationMismatch) {
    return {
      success: false,
      message: `Cannot merge: ${preview.generationDifference} generation difference indicates these are different people with the same name. Gen ${preview.source.generation} vs Gen ${preview.target.generation}.`,
      messageAr: `لا يمكن الدمج: فارق ${preview.generationDifference} أجيال يشير إلى أن هؤلاء أشخاص مختلفون بنفس الاسم. الجيل ${preview.source.generation} مقابل الجيل ${preview.target.generation}.`,
    };
  }

  const { source, target } = preview;

  try {
    const result = await prisma.$transaction(async (tx) => {
      let childrenUpdated = 0;
      let photosTransferred = 0;
      let journalsUpdated = 0;

      const childUpdateResult = await tx.familyMember.updateMany({
        where: { fatherId: sourceId },
        data: { fatherId: targetId },
      });
      childrenUpdated = childUpdateResult.count;

      const pendingUpdateResult = await tx.pendingMember.updateMany({
        where: { proposedFatherId: sourceId, reviewStatus: 'PENDING' },
        data: { proposedFatherId: targetId },
      });
      const pendingRequestsUpdated = pendingUpdateResult.count;

      const photoUpdateResult = await tx.memberPhoto.updateMany({
        where: { memberId: sourceId },
        data: { memberId: targetId },
      });
      photosTransferred = photoUpdateResult.count;

      const journalsWithSource = await tx.familyJournal.findMany({
        where: {
          OR: [
            { primaryMemberId: sourceId },
            { relatedMemberIds: { has: sourceId } },
          ],
        },
      });

      for (const journal of journalsWithSource) {
        const updates: Prisma.FamilyJournalUpdateInput = {};

        if (journal.primaryMemberId === sourceId) {
          updates.primaryMemberId = targetId;
        }

        if (journal.relatedMemberIds?.includes(sourceId)) {
          updates.relatedMemberIds = journal.relatedMemberIds.map(id =>
            id === sourceId ? targetId : id
          );
        }

        await tx.familyJournal.update({
          where: { id: journal.id },
          data: updates,
        });
        journalsUpdated++;
      }

      const mergeData: Prisma.FamilyMemberUpdateInput = {};

      for (const field of MERGEABLE_FIELDS) {
        const sourceVal = (source as Record<string, unknown>)[field];
        const targetVal = (target as Record<string, unknown>)[field];

        if (options.keepSourceFields?.includes(field) && sourceVal) {
          (mergeData as Record<string, unknown>)[field] = sourceVal;
        } else if (!targetVal && sourceVal) {
          (mergeData as Record<string, unknown>)[field] = sourceVal;
        }
      }

      if (source.sonsCount > 0 || source.daughtersCount > 0) {
        mergeData.sonsCount = (target.sonsCount || 0) + (source.sonsCount || 0);
        mergeData.daughtersCount = (target.daughtersCount || 0) + (source.daughtersCount || 0);
      }

      const mergedMember = await tx.familyMember.update({
        where: { id: targetId },
        data: mergeData,
      });

      await tx.familyMember.update({
        where: { id: sourceId },
        data: {
          deletedAt: new Date(),
          deletedBy: options.performedBy,
          deletedReason: `Merged into ${targetId}: ${options.reason || 'Duplicate profile merge'}`,
        },
      });

      // Transfer linked user accounts from source to target
      const linkedAccountsTransfer = await tx.user.updateMany({
        where: { linkedMemberId: sourceId },
        data: { linkedMemberId: targetId },
      });

      return {
        mergedMember,
        childrenUpdated,
        photosTransferred,
        journalsUpdated,
        linkedAccountsTransferred: linkedAccountsTransfer.count,
        pendingRequestsUpdated,
      };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    await logAuditToDb({
      action: 'MERGE_MEMBERS',
      targetType: 'FAMILY_MEMBER',
      targetId: targetId,
      targetName: `${source.firstName} → ${target.firstName}`,
      userId: options.performedBy,
      description: `تم دمج "${source.firstName}" (${sourceId}) في "${target.firstName}" (${targetId})`,
      details: {
        sourceId,
        targetId,
        sourceName: source.fullNameAr || source.firstName,
        targetName: target.fullNameAr || target.firstName,
        reason: options.reason,
        childrenUpdated: result.childrenUpdated,
        photosTransferred: result.photosTransferred,
        journalsUpdated: result.journalsUpdated,
        linkedAccountsTransferred: result.linkedAccountsTransferred,
        pendingRequestsUpdated: result.pendingRequestsUpdated,
      },
      previousState: {
        sourceId,
        sourceName: source.fullNameAr || source.firstName,
        sourceGeneration: source.generation,
      },
      newState: {
        targetId,
        targetName: target.fullNameAr || target.firstName,
        merged: true,
      },
      impactedIds: [sourceId, targetId, ...preview.impactedChildren.map(c => c.id)],
      impactSummary: {
        action: 'merge',
        childrenUpdated: result.childrenUpdated,
        photosTransferred: result.photosTransferred,
        journalsUpdated: result.journalsUpdated,
        linkedAccountsTransferred: result.linkedAccountsTransferred,
        pendingRequestsUpdated: result.pendingRequestsUpdated,
      },
      severity: 'WARNING',
    });

    return {
      success: true,
      message: 'Members merged successfully',
      messageAr: 'تم دمج الأعضاء بنجاح',
      mergedMember: result.mergedMember,
      deletedMemberId: sourceId,
      impactSummary: {
        childrenUpdated: result.childrenUpdated,
        photosTransferred: result.photosTransferred,
        journalsUpdated: result.journalsUpdated,
        linkedAccountsTransferred: result.linkedAccountsTransferred,
        pendingRequestsUpdated: result.pendingRequestsUpdated,
      },
    };
  } catch (error) {
    console.error('Error merging members:', error);
    return {
      success: false,
      message: 'Failed to merge members',
      messageAr: 'فشل في دمج الأعضاء',
    };
  }
}

function getFieldNameAr(field: string): string {
  const fieldNames: Record<string, string> = {
    firstName: 'الاسم الأول',
    fatherName: 'اسم الأب',
    grandfatherName: 'اسم الجد',
    greatGrandfatherName: 'اسم الجد الأعلى',
    fullNameAr: 'الاسم الكامل (عربي)',
    fullNameEn: 'الاسم الكامل (إنجليزي)',
    birthYear: 'سنة الميلاد',
    birthCalendar: 'نوع التقويم',
    deathYear: 'سنة الوفاة',
    deathCalendar: 'تقويم الوفاة',
    phone: 'الهاتف',
    email: 'البريد الإلكتروني',
    city: 'المدينة',
    occupation: 'المهنة',
    biography: 'السيرة الذاتية',
    photoUrl: 'صورة الملف الشخصي',
    status: 'الحالة',
  };
  return fieldNames[field] || field;
}
