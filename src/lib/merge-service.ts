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
    warnings.push(`Generation mismatch: source is Gen ${source.generation}, target is Gen ${target.generation}`);
    warningsAr.push(`اختلاف الجيل: المصدر الجيل ${source.generation}، الهدف الجيل ${target.generation}`);
  }

  if (source.fatherId !== target.fatherId) {
    warnings.push('Members have different fathers - this may indicate they are not duplicates');
    warningsAr.push('الأعضاء لديهم آباء مختلفون - قد يعني ذلك أنهم ليسوا تكرارات');
  }

  if (source.phone && target.phone && source.phone !== target.phone) {
    warnings.push(`Phone number conflict: source ${source.phone} vs target ${target.phone}`);
    warningsAr.push(`تعارض في رقم الهاتف: المصدر ${source.phone} مقابل الهدف ${target.phone}`);
  }

  if (source.email && target.email && source.email.toLowerCase() !== target.email.toLowerCase()) {
    warnings.push(`Email conflict: source ${source.email} vs target ${target.email}`);
    warningsAr.push(`تعارض في البريد الإلكتروني: المصدر ${source.email} مقابل الهدف ${target.email}`);
  }

  const [children, photos, journals] = await Promise.all([
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
  ]);

  if (children.length > 0) {
    warnings.push(`Source member has ${children.length} children that will be reassigned to target`);
    warningsAr.push(`العضو المصدر لديه ${children.length} أبناء سيتم نقلهم للعضو الهدف`);
  }

  return {
    source,
    target,
    conflicts,
    impactedChildren: children,
    impactedPhotos: photos,
    impactedJournals: journals,
    warnings,
    warningsAr,
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

      return {
        mergedMember,
        childrenUpdated,
        photosTransferred,
        journalsUpdated,
      };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    await logAuditToDb({
      action: 'MERGE_MEMBERS',
      entityType: 'family_member',
      entityId: targetId,
      performedBy: options.performedBy,
      details: {
        sourceId,
        targetId,
        reason: options.reason,
        childrenUpdated: result.childrenUpdated,
        photosTransferred: result.photosTransferred,
        journalsUpdated: result.journalsUpdated,
      },
      impactedIds: [sourceId, targetId, ...preview.impactedChildren.map(c => c.id)],
      impactSummary: `Merged ${source.firstName} into ${target.firstName}. Updated ${result.childrenUpdated} children, ${result.photosTransferred} photos, ${result.journalsUpdated} journals.`,
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
