import { prisma } from './prisma';

export interface ValidationIssue {
  memberId: string;
  memberName?: string;
  issue: string;
  issueAr: string;
  severity: 'error' | 'warning';
  details?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  checkedAt: Date;
}

export interface DataConsistencyReport {
  overallValid: boolean;
  totalMembers: number;
  totalIssues: number;
  checkedAt: Date;
  validations: {
    generations: ValidationResult;
    parentRelationships: ValidationResult;
    orphanedMembers: ValidationResult;
  };
}

const MIN_GENERATION = 1;
const MAX_GENERATION = 20;

export async function validateGenerations(): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];

  const members = await prisma.familyMember.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      firstName: true,
      generation: true,
    },
  });

  for (const member of members) {
    if (member.generation < MIN_GENERATION || member.generation > MAX_GENERATION) {
      issues.push({
        memberId: member.id,
        memberName: member.firstName,
        issue: `Invalid generation value: ${member.generation}. Must be between ${MIN_GENERATION} and ${MAX_GENERATION}.`,
        issueAr: `قيمة جيل غير صالحة: ${member.generation}. يجب أن تكون بين ${MIN_GENERATION} و ${MAX_GENERATION}.`,
        severity: 'error',
        details: {
          currentGeneration: member.generation,
          validRange: { min: MIN_GENERATION, max: MAX_GENERATION },
        },
      });
    }

    if (member.generation === null || member.generation === undefined) {
      issues.push({
        memberId: member.id,
        memberName: member.firstName,
        issue: 'Missing generation value.',
        issueAr: 'قيمة الجيل مفقودة.',
        severity: 'error',
      });
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    checkedAt: new Date(),
  };
}

export async function validateParentRelationships(): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];

  const membersWithFather = await prisma.familyMember.findMany({
    where: {
      deletedAt: null,
      fatherId: { not: null },
    },
    select: {
      id: true,
      firstName: true,
      fatherId: true,
      generation: true,
    },
  });

  const allMemberIds = new Set(
    (await prisma.familyMember.findMany({
      where: { deletedAt: null },
      select: { id: true },
    })).map(m => m.id)
  );

  for (const member of membersWithFather) {
    if (member.fatherId && !allMemberIds.has(member.fatherId)) {
      issues.push({
        memberId: member.id,
        memberName: member.firstName,
        issue: `Father ID '${member.fatherId}' does not exist in the database.`,
        issueAr: `معرف الأب '${member.fatherId}' غير موجود في قاعدة البيانات.`,
        severity: 'error',
        details: {
          invalidFatherId: member.fatherId,
        },
      });
    }
  }

  const fathers = await prisma.familyMember.findMany({
    where: {
      deletedAt: null,
      id: { in: membersWithFather.map(m => m.fatherId).filter(Boolean) as string[] },
    },
    select: { id: true, generation: true },
  });

  const fatherMap = new Map(fathers.map(f => [f.id, f]));

  for (const member of membersWithFather) {
    if (member.fatherId) {
      const father = fatherMap.get(member.fatherId);
      if (father) {
        if (member.generation <= father.generation) {
          issues.push({
            memberId: member.id,
            memberName: member.firstName,
            issue: `Member's generation (${member.generation}) should be greater than father's generation (${father.generation}).`,
            issueAr: `جيل العضو (${member.generation}) يجب أن يكون أكبر من جيل الأب (${father.generation}).`,
            severity: 'warning',
            details: {
              memberGeneration: member.generation,
              fatherGeneration: father.generation,
              fatherId: member.fatherId,
            },
          });
        }

        if (member.generation !== father.generation + 1) {
          issues.push({
            memberId: member.id,
            memberName: member.firstName,
            issue: `Member's generation (${member.generation}) should be exactly father's generation + 1 (${father.generation + 1}).`,
            issueAr: `جيل العضو (${member.generation}) يجب أن يكون جيل الأب + 1 (${father.generation + 1}).`,
            severity: 'warning',
            details: {
              memberGeneration: member.generation,
              expectedGeneration: father.generation + 1,
              fatherId: member.fatherId,
            },
          });
        }
      }
    }
  }

  return {
    valid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    checkedAt: new Date(),
  };
}

export async function validateOrphanedMembers(): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];

  const membersWithoutParent = await prisma.familyMember.findMany({
    where: {
      deletedAt: null,
      fatherId: null,
    },
    select: {
      id: true,
      firstName: true,
      generation: true,
    },
  });

  for (const member of membersWithoutParent) {
    if (member.generation > 2) {
      issues.push({
        memberId: member.id,
        memberName: member.firstName,
        issue: `Member has no parent (fatherId is null) but is in generation ${member.generation}. Only members in generation 1-2 should be root members.`,
        issueAr: `العضو ليس لديه أب (معرف الأب فارغ) لكنه في الجيل ${member.generation}. فقط الأعضاء في الجيل 1-2 يجب أن يكونوا أعضاء جذر.`,
        severity: 'warning',
        details: {
          generation: member.generation,
          expectedMaxGeneration: 2,
        },
      });
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    checkedAt: new Date(),
  };
}

export async function checkDataConsistency(): Promise<DataConsistencyReport> {
  const totalMembers = await prisma.familyMember.count({
    where: { deletedAt: null },
  });

  const [generations, parentRelationships, orphanedMembers] = await Promise.all([
    validateGenerations(),
    validateParentRelationships(),
    validateOrphanedMembers(),
  ]);

  const totalIssues =
    generations.issues.length +
    parentRelationships.issues.length +
    orphanedMembers.issues.length;

  const hasErrors =
    generations.issues.some(i => i.severity === 'error') ||
    parentRelationships.issues.some(i => i.severity === 'error') ||
    orphanedMembers.issues.some(i => i.severity === 'error');

  return {
    overallValid: !hasErrors,
    totalMembers,
    totalIssues,
    checkedAt: new Date(),
    validations: {
      generations,
      parentRelationships,
      orphanedMembers,
    },
  };
}

export async function validateSingleMember(memberId: string): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];

  const member = await prisma.familyMember.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      firstName: true,
      generation: true,
      fatherId: true,
    },
  });

  if (!member) {
    return {
      valid: false,
      issues: [{
        memberId,
        issue: 'Member not found',
        issueAr: 'العضو غير موجود',
        severity: 'error',
      }],
      checkedAt: new Date(),
    };
  }

  if (member.generation < MIN_GENERATION || member.generation > MAX_GENERATION) {
    issues.push({
      memberId: member.id,
      memberName: member.firstName,
      issue: `Invalid generation: ${member.generation}`,
      issueAr: `جيل غير صالح: ${member.generation}`,
      severity: 'error',
      details: { generation: member.generation },
    });
  }

  if (member.fatherId) {
    const father = await prisma.familyMember.findUnique({
      where: { id: member.fatherId },
      select: { id: true, generation: true, firstName: true },
    });

    if (!father) {
      issues.push({
        memberId: member.id,
        memberName: member.firstName,
        issue: `Father ${member.fatherId} not found`,
        issueAr: `الأب ${member.fatherId} غير موجود`,
        severity: 'error',
        details: { fatherId: member.fatherId },
      });
    } else if (member.generation !== father.generation + 1) {
      issues.push({
        memberId: member.id,
        memberName: member.firstName,
        issue: `Generation mismatch: expected ${father.generation + 1}, got ${member.generation}`,
        issueAr: `عدم تطابق الجيل: متوقع ${father.generation + 1}، وجد ${member.generation}`,
        severity: 'warning',
        details: {
          expectedGeneration: father.generation + 1,
          actualGeneration: member.generation,
          fatherName: father.firstName,
        },
      });
    }
  } else if (member.generation > 2) {
    issues.push({
      memberId: member.id,
      memberName: member.firstName,
      issue: `Root member in generation ${member.generation} (expected 1-2)`,
      issueAr: `عضو جذر في الجيل ${member.generation} (متوقع 1-2)`,
      severity: 'warning',
      details: { generation: member.generation },
    });
  }

  return {
    valid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    checkedAt: new Date(),
  };
}

export async function validateMemberChildrenCounts(memberId: string): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];

  const member = await prisma.familyMember.findUnique({
    where: { id: memberId },
    select: { id: true, firstName: true, sonsCount: true, daughtersCount: true },
  });

  if (!member) {
    return {
      valid: false,
      issues: [{
        memberId,
        issue: 'Member not found',
        issueAr: 'العضو غير موجود',
        severity: 'error',
      }],
      checkedAt: new Date(),
    };
  }

  const children = await prisma.familyMember.findMany({
    where: { fatherId: memberId, deletedAt: null },
    select: { gender: true },
  });

  const actualSons = children.filter(c => c.gender === 'Male').length;
  const actualDaughters = children.filter(c => c.gender === 'Female').length;

  if (member.sonsCount !== actualSons) {
    issues.push({
      memberId: member.id,
      memberName: member.firstName,
      issue: `Sons count mismatch: stored ${member.sonsCount}, actual ${actualSons}`,
      issueAr: `عدم تطابق عدد الأبناء: المخزن ${member.sonsCount}، الفعلي ${actualSons}`,
      severity: 'warning',
      details: { stored: member.sonsCount, actual: actualSons },
    });
  }

  if (member.daughtersCount !== actualDaughters) {
    issues.push({
      memberId: member.id,
      memberName: member.firstName,
      issue: `Daughters count mismatch: stored ${member.daughtersCount}, actual ${actualDaughters}`,
      issueAr: `عدم تطابق عدد البنات: المخزن ${member.daughtersCount}، الفعلي ${actualDaughters}`,
      severity: 'warning',
      details: { stored: member.daughtersCount, actual: actualDaughters },
    });
  }

  return {
    valid: issues.length === 0,
    issues,
    checkedAt: new Date(),
  };
}

export function formatValidationReport(report: DataConsistencyReport): string {
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push('DATA INTEGRITY VALIDATION REPORT');
  lines.push('='.repeat(60));
  lines.push(`Checked at: ${report.checkedAt.toISOString()}`);
  lines.push(`Total members: ${report.totalMembers}`);
  lines.push(`Total issues found: ${report.totalIssues}`);
  lines.push(`Overall status: ${report.overallValid ? '✅ VALID' : '❌ HAS ERRORS'}`);
  lines.push('');

  lines.push('-'.repeat(60));
  lines.push('1. Generation Validation');
  lines.push('-'.repeat(60));
  lines.push(`Status: ${report.validations.generations.valid ? '✅ PASSED' : '❌ FAILED'}`);
  lines.push(`Issues: ${report.validations.generations.issues.length}`);
  for (const issue of report.validations.generations.issues) {
    lines.push(`  [${issue.severity.toUpperCase()}] ${issue.memberId}: ${issue.issue}`);
  }
  lines.push('');

  lines.push('-'.repeat(60));
  lines.push('2. Parent Relationship Validation');
  lines.push('-'.repeat(60));
  lines.push(`Status: ${report.validations.parentRelationships.valid ? '✅ PASSED' : '❌ FAILED'}`);
  lines.push(`Issues: ${report.validations.parentRelationships.issues.length}`);
  for (const issue of report.validations.parentRelationships.issues) {
    lines.push(`  [${issue.severity.toUpperCase()}] ${issue.memberId}: ${issue.issue}`);
  }
  lines.push('');

  lines.push('-'.repeat(60));
  lines.push('3. Orphaned Members Validation');
  lines.push('-'.repeat(60));
  lines.push(`Status: ${report.validations.orphanedMembers.valid ? '✅ PASSED' : '❌ FAILED'}`);
  lines.push(`Issues: ${report.validations.orphanedMembers.issues.length}`);
  for (const issue of report.validations.orphanedMembers.issues) {
    lines.push(`  [${issue.severity.toUpperCase()}] ${issue.memberId}: ${issue.issue}`);
  }
  lines.push('');

  lines.push('='.repeat(60));
  lines.push('END OF REPORT');
  lines.push('='.repeat(60));

  return lines.join('\n');
}
