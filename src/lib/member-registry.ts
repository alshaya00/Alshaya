import { prisma, Prisma } from './prisma';
import { logAuditToDb } from './db-audit';
import { transliterateName, generateFullNameEn } from './utils/transliteration';
import type { FamilyMember } from '@prisma/client';

type TransactionClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

export interface MemberInput {
  firstName: string;
  fatherName?: string;
  grandfatherName?: string;
  greatGrandfatherName?: string;
  familyName?: string;
  fatherId?: string;
  gender: 'Male' | 'Female';
  birthYear?: number;
  deathYear?: number;
  phone?: string;
  email?: string;
  city?: string;
  status?: string;
  occupation?: string;
  biography?: string;
  branch?: string;
}

export interface CreateMemberOptions {
  skipDuplicateCheck?: boolean;
  skipAuditLog?: boolean;
  createdBy?: string;
  source?: 'admin' | 'pending_approval' | 'csv_import' | 'registration' | 'api';
}

export interface CreateMemberResult {
  success: boolean;
  member?: FamilyMember;
  errors: string[];
  warnings: string[];
  duplicates?: FamilyMember[];
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingMembers: FamilyMember[];
}

export interface CircularAncestryResult {
  isCircular: boolean;
  path?: string[];
}

export interface ParentValidationResult {
  valid: boolean;
  error?: string;
  errorAr?: string;
  father?: {
    id: string;
    firstName: string;
    gender: string;
    generation: number;
  };
}

export interface LineageInfo {
  lineagePath: string;
  lineageBranchId: string | null;
  lineageBranchName: string | null;
  subBranchId: string | null;
  subBranchName: string | null;
}

export interface FullNames {
  fullNameAr: string;
  fullNameEn: string;
}

const MIN_GENERATION = 1;
const MAX_GENERATION = 20;

export class DuplicateError extends Error {
  duplicates: FamilyMember[];
  constructor(message: string, duplicates: FamilyMember[]) {
    super(message);
    this.name = 'DuplicateError';
    this.duplicates = duplicates;
  }
}

export async function generateNextMemberId(tx?: TransactionClient): Promise<string> {
  const client = tx || prisma;
  
  const result = await client.$queryRaw<{ max_prefixed: number | null; max_numeric: number | null }[]>`
    SELECT 
      MAX(CASE WHEN id ~ '^P[0-9]+$' THEN CAST(SUBSTRING(id FROM 2) AS INTEGER) ELSE NULL END) as max_prefixed,
      MAX(CASE WHEN id ~ '^[0-9]+$' THEN CAST(id AS INTEGER) ELSE NULL END) as max_numeric
    FROM "FamilyMember"
  `;

  const { max_prefixed, max_numeric } = result[0] || {};
  
  const nextNum = Math.max(max_prefixed || 0, max_numeric || 0) + 1;
  return `P${String(nextNum).padStart(4, '0')}`;
}

export async function calculateGeneration(
  fatherId: string | null | undefined,
  tx?: TransactionClient
): Promise<{ generation: number; valid: boolean; error?: string }> {
  if (!fatherId) {
    return { generation: 1, valid: true };
  }

  const client = tx || prisma;
  const father = await client.familyMember.findUnique({
    where: { id: fatherId },
    select: { generation: true },
  });

  if (!father) {
    return { generation: 1, valid: true };
  }

  const generation = father.generation + 1;

  if (generation < MIN_GENERATION || generation > MAX_GENERATION) {
    return {
      generation,
      valid: false,
      error: `Generation ${generation} is outside valid range (${MIN_GENERATION}-${MAX_GENERATION})`,
    };
  }

  return { generation, valid: true };
}

export async function buildLineageInfo(
  fatherId: string | null | undefined,
  tx?: TransactionClient
): Promise<LineageInfo> {
  const emptyResult: LineageInfo = {
    lineagePath: '[]',
    lineageBranchId: null,
    lineageBranchName: null,
    subBranchId: null,
    subBranchName: null,
  };

  if (!fatherId) {
    return emptyResult;
  }

  const client = tx || prisma;
  const ancestorIds: string[] = [];
  const ancestors: Array<{ id: string; firstName: string; generation: number }> = [];
  let currentId: string | null = fatherId;

  for (let i = 0; i < MAX_GENERATION && currentId; i++) {
    const ancestor = await client.familyMember.findUnique({
      where: { id: currentId },
      select: { id: true, firstName: true, fatherId: true, generation: true },
    });

    if (!ancestor) break;

    ancestorIds.unshift(ancestor.id);
    ancestors.unshift({
      id: ancestor.id,
      firstName: ancestor.firstName,
      generation: ancestor.generation,
    });
    currentId = ancestor.fatherId;
  }

  const gen2Ancestor = ancestors.find(a => a.generation === 2);
  const gen3Ancestor = ancestors.find(a => a.generation === 3);

  return {
    lineagePath: JSON.stringify(ancestorIds),
    lineageBranchId: gen2Ancestor?.id || null,
    lineageBranchName: gen2Ancestor?.firstName || null,
    subBranchId: gen3Ancestor?.id || null,
    subBranchName: gen3Ancestor?.firstName || null,
  };
}

export interface AncestorNames {
  fatherName: string | null;
  grandfatherName: string | null;
  greatGrandfatherName: string | null;
}

export async function getAncestorNamesFromLineage(
  fatherId: string | null | undefined,
  tx?: TransactionClient
): Promise<AncestorNames> {
  const emptyResult: AncestorNames = {
    fatherName: null,
    grandfatherName: null,
    greatGrandfatherName: null,
  };

  if (!fatherId) {
    return emptyResult;
  }

  const client = tx || prisma;
  const ancestors: string[] = [];
  let currentId: string | null = fatherId;

  for (let i = 0; i < 3 && currentId; i++) {
    const ancestor = await client.familyMember.findUnique({
      where: { id: currentId },
      select: { firstName: true, fatherId: true },
    });

    if (!ancestor) break;

    ancestors.push(ancestor.firstName);
    currentId = ancestor.fatherId;
  }

  return {
    fatherName: ancestors[0] || null,
    grandfatherName: ancestors[1] || null,
    greatGrandfatherName: ancestors[2] || null,
  };
}

export async function checkForDuplicates(
  input: { firstName: string; fatherId?: string; fatherName?: string },
  tx?: TransactionClient
): Promise<DuplicateCheckResult> {
  const client = tx || prisma;
  const existingMembers: FamilyMember[] = [];

  if (input.fatherId) {
    const byFatherId = await client.familyMember.findMany({
      where: {
        firstName: input.firstName,
        fatherId: input.fatherId,
        deletedAt: null,
      },
    });
    existingMembers.push(...byFatherId);
  }

  if (input.fatherName && existingMembers.length === 0) {
    const byFatherName = await client.familyMember.findMany({
      where: {
        firstName: input.firstName,
        fatherName: input.fatherName,
        deletedAt: null,
      },
    });
    existingMembers.push(...byFatherName);
  }

  const uniqueMembers = Array.from(
    new Map(existingMembers.map(m => [m.id, m])).values()
  );

  return {
    isDuplicate: uniqueMembers.length > 0,
    existingMembers: uniqueMembers,
  };
}

export async function checkCircularAncestry(
  memberId: string | undefined,
  proposedFatherId: string,
  tx?: TransactionClient
): Promise<CircularAncestryResult> {
  if (!memberId) {
    return { isCircular: false };
  }

  if (memberId === proposedFatherId) {
    return { isCircular: true, path: [memberId] };
  }

  const client = tx || prisma;
  const path: string[] = [proposedFatherId];
  let currentId: string | null = proposedFatherId;

  for (let i = 0; i < MAX_GENERATION && currentId; i++) {
    const ancestor = await client.familyMember.findUnique({
      where: { id: currentId },
      select: { id: true, fatherId: true },
    });

    if (!ancestor) break;

    if (ancestor.fatherId === memberId) {
      path.push(ancestor.id, memberId);
      return { isCircular: true, path };
    }

    if (ancestor.fatherId) {
      path.push(ancestor.fatherId);
    }
    currentId = ancestor.fatherId;
  }

  return { isCircular: false };
}

export async function validateParent(
  fatherId: string | null | undefined,
  tx?: TransactionClient
): Promise<ParentValidationResult> {
  if (!fatherId) {
    return { valid: true };
  }

  const client = tx || prisma;
  const father = await client.familyMember.findUnique({
    where: { id: fatherId },
    select: {
      id: true,
      firstName: true,
      gender: true,
      generation: true,
      deletedAt: true,
    },
  });

  if (!father) {
    return {
      valid: false,
      error: `Father with ID '${fatherId}' does not exist`,
      errorAr: `الأب ذو المعرف '${fatherId}' غير موجود`,
    };
  }

  if (father.gender?.toUpperCase() !== 'MALE') {
    return {
      valid: false,
      error: `Parent must be male. '${father.firstName}' is ${father.gender}`,
      errorAr: `يجب أن يكون الوالد ذكراً. '${father.firstName}' هو ${father.gender?.toUpperCase() === 'FEMALE' ? 'أنثى' : father.gender}`,
    };
  }

  if (father.deletedAt) {
    return {
      valid: false,
      error: `Father '${father.firstName}' has been deleted`,
      errorAr: `تم حذف الأب '${father.firstName}'`,
    };
  }

  return {
    valid: true,
    father: {
      id: father.id,
      firstName: father.firstName,
      gender: father.gender,
      generation: father.generation,
    },
  };
}

export async function updateParentChildrenCount(
  fatherId: string,
  tx?: TransactionClient
): Promise<{ sonsCount: number; daughtersCount: number }> {
  const client = tx || prisma;

  const children = await client.familyMember.findMany({
    where: { fatherId, deletedAt: null },
    select: { gender: true },
  });

  const sonsCount = children.filter(c => c.gender?.toUpperCase() === 'MALE').length;
  const daughtersCount = children.filter(c => c.gender?.toUpperCase() === 'FEMALE').length;

  await client.familyMember.update({
    where: { id: fatherId },
    data: { sonsCount, daughtersCount },
  });

  return { sonsCount, daughtersCount };
}

export function generateFullNames(
  input: {
    firstName: string;
    fatherName?: string | null;
    grandfatherName?: string | null;
    familyName?: string | null;
    gender: 'Male' | 'Female';
  }
): FullNames {
  const connector = input.gender?.toUpperCase() === 'FEMALE' ? 'بنت' : 'بن';
  const parts: string[] = [];

  if (input.firstName) {
    parts.push(input.firstName.trim());
  }
  if (input.fatherName) {
    parts.push(`${connector} ${input.fatherName.trim()}`);
  }
  if (input.grandfatherName) {
    parts.push(`${connector} ${input.grandfatherName.trim()}`);
  }
  if (input.familyName) {
    parts.push(input.familyName.trim());
  }

  const fullNameAr = parts.join(' ').replace(/\s+/g, ' ').trim();

  const fullNameEn = generateFullNameEn(
    input.firstName,
    input.fatherName,
    input.grandfatherName,
    input.familyName
  );

  return { fullNameAr, fullNameEn };
}

export async function generateFullNamesFromLineage(
  memberId: string,
  memberData: {
    firstName: string;
    gender: 'Male' | 'Female';
    fatherId?: string | null;
  },
  tx?: TransactionClient
): Promise<FullNames> {
  const client = tx || prisma;
  const connector = memberData.gender?.toUpperCase() === 'FEMALE' ? 'بنت' : 'بن';
  
  const ancestorNames: string[] = [];
  let currentFatherId: string | null | undefined = memberData.fatherId;
  
  for (let i = 0; i < MAX_GENERATION && currentFatherId; i++) {
    const ancestor = await client.familyMember.findUnique({
      where: { id: currentFatherId },
      select: { id: true, firstName: true, fatherId: true },
    });
    
    if (!ancestor) break;
    
    ancestorNames.push(ancestor.firstName);
    currentFatherId = ancestor.fatherId;
  }
  
  const partsAr: string[] = [memberData.firstName.trim()];
  for (const name of ancestorNames) {
    partsAr.push(`${connector} ${name.trim()}`);
  }
  partsAr.push('آل شايع');
  
  const fullNameAr = partsAr.join(' ').replace(/\s+/g, ' ').trim();
  
  const connectorEn = memberData.gender?.toUpperCase() === 'FEMALE' ? 'bint' : 'bin';
  const partsEn: string[] = [transliterateName(memberData.firstName)];
  for (const name of ancestorNames) {
    partsEn.push(`${connectorEn} ${transliterateName(name)}`);
  }
  partsEn.push('Al Shaya');
  
  const fullNameEn = partsEn.join(' ').replace(/\s+/g, ' ').trim();
  
  return { fullNameAr, fullNameEn };
}

export async function createMember(
  input: MemberInput,
  options: CreateMemberOptions = {}
): Promise<CreateMemberResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!input.firstName || input.firstName.trim().length === 0) {
    return {
      success: false,
      errors: ['First name is required / الاسم الأول مطلوب'],
      warnings: [],
    };
  }

  if (!input.gender || !['Male', 'Female'].includes(input.gender)) {
    return {
      success: false,
      errors: ['Gender must be Male or Female / الجنس يجب أن يكون ذكر أو أنثى'],
      warnings: [],
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const parentValidation = await validateParent(input.fatherId, tx);
      if (!parentValidation.valid) {
        throw new Error(`PARENT_INVALID: ${parentValidation.error}`);
      }

      if (!options.skipDuplicateCheck) {
        const duplicates = await checkForDuplicates({
          firstName: input.firstName,
          fatherId: input.fatherId,
          fatherName: input.fatherName,
        }, tx);

        if (duplicates.isDuplicate) {
          throw new DuplicateError(
            `Duplicate member found: ${duplicates.existingMembers.map(m => m.id).join(', ')}`,
            duplicates.existingMembers
          );
        }
      }

      const newId = await generateNextMemberId(tx);

      const generationResult = await calculateGeneration(input.fatherId, tx);
      if (!generationResult.valid) {
        throw new Error(`INVALID_GENERATION: ${generationResult.error}`);
      }

      const lineageInfo = await buildLineageInfo(input.fatherId, tx);

      const fullNames = generateFullNames({
        firstName: input.firstName,
        fatherName: input.fatherName,
        grandfatherName: input.grandfatherName,
        familyName: input.familyName || 'آل شايع',
        gender: input.gender,
      });

      const newMember = await tx.familyMember.create({
        data: {
          id: newId,
          firstName: input.firstName.trim(),
          fatherName: input.fatherName?.trim() || null,
          grandfatherName: input.grandfatherName?.trim() || null,
          greatGrandfatherName: input.greatGrandfatherName?.trim() || null,
          familyName: input.familyName?.trim() || 'آل شايع',
          fatherId: input.fatherId || null,
          gender: input.gender,
          birthYear: input.birthYear || null,
          deathYear: input.deathYear || null,
          generation: generationResult.generation,
          branch: input.branch || null,
          fullNameAr: fullNames.fullNameAr,
          fullNameEn: fullNames.fullNameEn,
          lineagePath: lineageInfo.lineagePath,
          lineageBranchId: lineageInfo.lineageBranchId,
          lineageBranchName: lineageInfo.lineageBranchName,
          subBranchId: lineageInfo.subBranchId,
          subBranchName: lineageInfo.subBranchName,
          phone: input.phone || null,
          email: input.email || null,
          city: input.city || null,
          status: input.status || 'Living',
          occupation: input.occupation || null,
          biography: input.biography || null,
          sonsCount: 0,
          daughtersCount: 0,
          createdBy: options.createdBy || null,
          version: 1,
        },
      });

      if (input.fatherId) {
        await updateParentChildrenCount(input.fatherId, tx);
      }

      return { newMember, newId };
    }, {
      maxWait: 10000,
      timeout: 30000,
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    if (!options.skipAuditLog) {
      try {
        await logAuditToDb({
          action: 'MEMBER_CREATE',
          severity: 'INFO',
          userId: options.createdBy,
          targetType: 'FAMILY_MEMBER',
          targetId: result.newId,
          targetName: result.newMember.fullNameAr || result.newMember.firstName,
          description: `تم إنشاء عضو جديد: ${result.newMember.firstName}`,
          details: {
            source: options.source || 'api',
            generation: result.newMember.generation,
            fatherId: input.fatherId,
          },
          newState: result.newMember as unknown as Record<string, unknown>,
          success: true,
        });
      } catch (auditError) {
        console.error('Audit logging failed (non-critical):', auditError);
      }
    }

    return {
      success: true,
      member: result.newMember,
      errors: [],
      warnings,
    };

  } catch (error) {
    if (error instanceof DuplicateError) {
      return {
        success: false,
        errors: [error.message],
        warnings: [],
        duplicates: error.duplicates,
      };
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.startsWith('PARENT_INVALID:')) {
      return {
        success: false,
        errors: [errorMessage.replace('PARENT_INVALID: ', '')],
        warnings: [],
      };
    }

    if (errorMessage.startsWith('INVALID_GENERATION:')) {
      return {
        success: false,
        errors: [errorMessage.replace('INVALID_GENERATION: ', '')],
        warnings: [],
      };
    }

    console.error('Member creation failed:', error);

    if (!options.skipAuditLog) {
      try {
        await logAuditToDb({
          action: 'MEMBER_CREATE_FAILED',
          severity: 'ERROR',
          userId: options.createdBy,
          targetType: 'FAMILY_MEMBER',
          targetName: input.firstName,
          description: `فشل في إنشاء العضو: ${input.firstName}`,
          details: {
            source: options.source || 'api',
            errorMessage,
            input: { ...input, phone: '***', email: '***' },
          },
          success: false,
          errorMessage,
        });
      } catch {
        console.error('Failed to log audit for failed member creation');
      }
    }

    return {
      success: false,
      errors: [errorMessage],
      warnings: [],
    };
  }
}

export async function recalculateLineageForMember(
  memberId: string,
  tx?: TransactionClient
): Promise<LineageInfo> {
  const client = tx || prisma;

  const member = await client.familyMember.findUnique({
    where: { id: memberId },
    select: { fatherId: true },
  });

  if (!member) {
    throw new Error(`Member ${memberId} not found`);
  }

  const lineageInfo = await buildLineageInfo(member.fatherId, tx);

  await client.familyMember.update({
    where: { id: memberId },
    data: {
      lineagePath: lineageInfo.lineagePath,
      lineageBranchId: lineageInfo.lineageBranchId,
      lineageBranchName: lineageInfo.lineageBranchName,
      subBranchId: lineageInfo.subBranchId,
      subBranchName: lineageInfo.subBranchName,
    },
  });

  return lineageInfo;
}

export async function recalculateGenerationForMember(
  memberId: string,
  tx?: TransactionClient
): Promise<number> {
  const client = tx || prisma;

  const member = await client.familyMember.findUnique({
    where: { id: memberId },
    select: { fatherId: true },
  });

  if (!member) {
    throw new Error(`Member ${memberId} not found`);
  }

  const genResult = await calculateGeneration(member.fatherId, tx);

  await client.familyMember.update({
    where: { id: memberId },
    data: { generation: genResult.generation },
  });

  return genResult.generation;
}

export async function updateMemberFullNames(
  memberId: string,
  tx?: TransactionClient
): Promise<FullNames> {
  const client = tx || prisma;

  const member = await client.familyMember.findUnique({
    where: { id: memberId },
    select: {
      firstName: true,
      fatherName: true,
      grandfatherName: true,
      familyName: true,
      gender: true,
    },
  });

  if (!member) {
    throw new Error(`Member ${memberId} not found`);
  }

  const fullNames = generateFullNames({
    firstName: member.firstName,
    fatherName: member.fatherName,
    grandfatherName: member.grandfatherName,
    familyName: member.familyName,
    gender: member.gender as 'Male' | 'Female',
  });

  await client.familyMember.update({
    where: { id: memberId },
    data: {
      fullNameAr: fullNames.fullNameAr,
      fullNameEn: fullNames.fullNameEn,
    },
  });

  return fullNames;
}
