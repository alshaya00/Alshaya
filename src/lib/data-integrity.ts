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
    circularAncestry: ValidationResult;
    deletedReferences: ValidationResult;
    duplicateMembers: ValidationResult;
    childrenCounts: ValidationResult;
    lineageConsistency: ValidationResult;
    pendingMembers: ValidationResult;
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

export async function validateCircularAncestry(): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];

  const members = await prisma.familyMember.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      firstName: true,
      fatherId: true,
    },
  });

  const memberMap = new Map(members.map(m => [m.id, m]));

  for (const member of members) {
    if (!member.fatherId) continue;

    const visited = new Set<string>();
    let currentId: string | null = member.id;
    let cycleDetected = false;

    while (currentId) {
      if (visited.has(currentId)) {
        cycleDetected = true;
        break;
      }
      visited.add(currentId);

      const current = memberMap.get(currentId);
      currentId = current?.fatherId || null;
    }

    if (cycleDetected) {
      const ancestorPath = Array.from(visited);
      issues.push({
        memberId: member.id,
        memberName: member.firstName,
        issue: `Circular ancestry detected. Member appears in their own ancestor chain.`,
        issueAr: `تم اكتشاف سلسلة نسب دائرية. العضو يظهر في سلسلة أسلافه.`,
        severity: 'error',
        details: {
          ancestorPath,
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

export async function validateDeletedReferences(): Promise<ValidationResult> {
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
    },
  });

  const deletedMembers = await prisma.familyMember.findMany({
    where: {
      deletedAt: { not: null },
    },
    select: {
      id: true,
      firstName: true,
      deletedAt: true,
    },
  });

  const deletedMemberMap = new Map(deletedMembers.map(m => [m.id, m]));

  for (const member of membersWithFather) {
    if (member.fatherId) {
      const deletedFather = deletedMemberMap.get(member.fatherId);
      if (deletedFather) {
        issues.push({
          memberId: member.id,
          memberName: member.firstName,
          issue: `Father ID '${member.fatherId}' (${deletedFather.firstName}) is soft-deleted. This is an orphaned reference.`,
          issueAr: `معرف الأب '${member.fatherId}' (${deletedFather.firstName}) محذوف. هذا مرجع يتيم يحتاج إلى تنظيف.`,
          severity: 'warning',
          details: {
            deletedFatherId: member.fatherId,
            deletedFatherName: deletedFather.firstName,
            deletedAt: deletedFather.deletedAt,
          },
        });
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    checkedAt: new Date(),
  };
}

export async function validateDuplicateMembers(): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];

  const members = await prisma.familyMember.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      firstName: true,
      fatherId: true,
      fatherName: true,
    },
  });

  const byFirstNameAndFatherId = new Map<string, typeof members>();
  const byFirstNameAndFatherName = new Map<string, typeof members>();

  for (const member of members) {
    if (member.fatherId) {
      const key = `${member.firstName}|${member.fatherId}`;
      if (!byFirstNameAndFatherId.has(key)) {
        byFirstNameAndFatherId.set(key, []);
      }
      byFirstNameAndFatherId.get(key)!.push(member);
    }

    if (member.fatherName) {
      const key = `${member.firstName}|${member.fatherName}`;
      if (!byFirstNameAndFatherName.has(key)) {
        byFirstNameAndFatherName.set(key, []);
      }
      byFirstNameAndFatherName.get(key)!.push(member);
    }
  }

  const reportedPairs = new Set<string>();

  for (const [key, duplicates] of byFirstNameAndFatherId) {
    if (duplicates.length > 1) {
      const [firstName, fatherId] = key.split('|');
      const memberIds = duplicates.map(d => d.id).sort();
      const pairKey = memberIds.join('|');
      
      if (!reportedPairs.has(pairKey)) {
        reportedPairs.add(pairKey);
        issues.push({
          memberId: memberIds[0],
          memberName: firstName,
          issue: `Potential duplicate: ${duplicates.length} members with firstName '${firstName}' and same fatherId '${fatherId}'.`,
          issueAr: `احتمال تكرار: ${duplicates.length} أعضاء بنفس الاسم '${firstName}' ونفس معرف الأب '${fatherId}'.`,
          severity: 'warning',
          details: {
            matchType: 'firstName+fatherId',
            firstName,
            fatherId,
            duplicateIds: memberIds,
          },
        });
      }
    }
  }

  for (const [key, duplicates] of byFirstNameAndFatherName) {
    if (duplicates.length > 1) {
      const [firstName, fatherName] = key.split('|');
      const memberIds = duplicates.map(d => d.id).sort();
      const pairKey = memberIds.join('|');
      
      if (!reportedPairs.has(pairKey)) {
        reportedPairs.add(pairKey);
        issues.push({
          memberId: memberIds[0],
          memberName: firstName,
          issue: `Potential duplicate: ${duplicates.length} members with firstName '${firstName}' and fatherName '${fatherName}'.`,
          issueAr: `احتمال تكرار: ${duplicates.length} أعضاء بنفس الاسم '${firstName}' واسم الأب '${fatherName}'.`,
          severity: 'warning',
          details: {
            matchType: 'firstName+fatherName',
            firstName,
            fatherName,
            duplicateIds: memberIds,
          },
        });
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    checkedAt: new Date(),
  };
}

export async function validateChildrenCounts(): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];

  const members = await prisma.familyMember.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      firstName: true,
      sonsCount: true,
      daughtersCount: true,
    },
  });

  const children = await prisma.familyMember.findMany({
    where: { deletedAt: null, fatherId: { not: null } },
    select: {
      fatherId: true,
      gender: true,
    },
  });

  const childrenByFather = new Map<string, { sons: number; daughters: number }>();
  
  for (const child of children) {
    if (!child.fatherId) continue;
    
    if (!childrenByFather.has(child.fatherId)) {
      childrenByFather.set(child.fatherId, { sons: 0, daughters: 0 });
    }
    
    const counts = childrenByFather.get(child.fatherId)!;
    if (child.gender === 'Male') {
      counts.sons++;
    } else if (child.gender === 'Female') {
      counts.daughters++;
    }
  }

  for (const member of members) {
    const actualCounts = childrenByFather.get(member.id) || { sons: 0, daughters: 0 };
    
    if (member.sonsCount !== actualCounts.sons) {
      issues.push({
        memberId: member.id,
        memberName: member.firstName,
        issue: `Sons count mismatch: stored ${member.sonsCount}, actual ${actualCounts.sons}.`,
        issueAr: `عدم تطابق عدد الأبناء: المخزن ${member.sonsCount}، الفعلي ${actualCounts.sons}.`,
        severity: 'warning',
        details: {
          storedSonsCount: member.sonsCount,
          actualSonsCount: actualCounts.sons,
        },
      });
    }
    
    if (member.daughtersCount !== actualCounts.daughters) {
      issues.push({
        memberId: member.id,
        memberName: member.firstName,
        issue: `Daughters count mismatch: stored ${member.daughtersCount}, actual ${actualCounts.daughters}.`,
        issueAr: `عدم تطابق عدد البنات: المخزن ${member.daughtersCount}، الفعلي ${actualCounts.daughters}.`,
        severity: 'warning',
        details: {
          storedDaughtersCount: member.daughtersCount,
          actualDaughtersCount: actualCounts.daughters,
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

export async function validateLineageConsistency(): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];

  const members = await prisma.familyMember.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      firstName: true,
      fatherId: true,
      generation: true,
      lineageBranchId: true,
      subBranchId: true,
      lineagePath: true,
    },
  });

  const memberMap = new Map(members.map(m => [m.id, m]));

  function getGen2Ancestor(memberId: string): string | null {
    let currentId: string | null = memberId;
    const visited = new Set<string>();
    
    while (currentId) {
      if (visited.has(currentId)) return null;
      visited.add(currentId);
      
      const member = memberMap.get(currentId);
      if (!member) return null;
      
      if (member.generation === 2) {
        return member.id;
      }
      
      currentId = member.fatherId;
    }
    return null;
  }

  function getGen3Ancestor(memberId: string): string | null {
    let currentId: string | null = memberId;
    const visited = new Set<string>();
    
    while (currentId) {
      if (visited.has(currentId)) return null;
      visited.add(currentId);
      
      const member = memberMap.get(currentId);
      if (!member) return null;
      
      if (member.generation === 3) {
        return member.id;
      }
      
      currentId = member.fatherId;
    }
    return null;
  }

  function getAncestorPath(memberId: string): string[] {
    const path: string[] = [];
    let currentId: string | null = memberId;
    const visited = new Set<string>();
    
    while (currentId) {
      if (visited.has(currentId)) break;
      visited.add(currentId);
      
      const member = memberMap.get(currentId);
      if (!member) break;
      
      if (member.fatherId) {
        path.unshift(member.fatherId);
      }
      currentId = member.fatherId;
    }
    return path;
  }

  for (const member of members) {
    if (member.generation <= 2) continue;

    const expectedGen2 = getGen2Ancestor(member.id);
    if (member.lineageBranchId && expectedGen2 && member.lineageBranchId !== expectedGen2) {
      issues.push({
        memberId: member.id,
        memberName: member.firstName,
        issue: `lineageBranchId mismatch: stored '${member.lineageBranchId}', expected '${expectedGen2}' (actual Gen 2 ancestor).`,
        issueAr: `عدم تطابق معرف فرع النسب: المخزن '${member.lineageBranchId}'، المتوقع '${expectedGen2}' (الجد الفعلي للجيل 2).`,
        severity: 'warning',
        details: {
          storedLineageBranchId: member.lineageBranchId,
          expectedLineageBranchId: expectedGen2,
        },
      });
    }

    if (member.generation <= 3) continue;

    const expectedGen3 = getGen3Ancestor(member.id);
    if (member.subBranchId && expectedGen3 && member.subBranchId !== expectedGen3) {
      issues.push({
        memberId: member.id,
        memberName: member.firstName,
        issue: `subBranchId mismatch: stored '${member.subBranchId}', expected '${expectedGen3}' (actual Gen 3 ancestor).`,
        issueAr: `عدم تطابق معرف الفرع الفرعي: المخزن '${member.subBranchId}'، المتوقع '${expectedGen3}' (الجد الفعلي للجيل 3).`,
        severity: 'warning',
        details: {
          storedSubBranchId: member.subBranchId,
          expectedSubBranchId: expectedGen3,
        },
      });
    }

    if (member.lineagePath) {
      try {
        const storedPath = JSON.parse(member.lineagePath);
        if (!Array.isArray(storedPath)) {
          issues.push({
            memberId: member.id,
            memberName: member.firstName,
            issue: `lineagePath is not a valid JSON array.`,
            issueAr: `مسار النسب ليس مصفوفة JSON صالحة.`,
            severity: 'warning',
            details: {
              lineagePath: member.lineagePath,
            },
          });
        } else {
          const expectedPath = getAncestorPath(member.id);
          const storedPathStr = JSON.stringify(storedPath);
          const expectedPathStr = JSON.stringify(expectedPath);
          
          if (storedPathStr !== expectedPathStr) {
            issues.push({
              memberId: member.id,
              memberName: member.firstName,
              issue: `lineagePath mismatch: stored path doesn't match actual ancestor chain.`,
              issueAr: `عدم تطابق مسار النسب: المسار المخزن لا يطابق سلسلة الأسلاف الفعلية.`,
              severity: 'warning',
              details: {
                storedPath,
                expectedPath,
              },
            });
          }
        }
      } catch {
        issues.push({
          memberId: member.id,
          memberName: member.firstName,
          issue: `lineagePath is not valid JSON: ${member.lineagePath}`,
          issueAr: `مسار النسب ليس JSON صالح: ${member.lineagePath}`,
          severity: 'warning',
          details: {
            lineagePath: member.lineagePath,
          },
        });
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    checkedAt: new Date(),
  };
}

export async function validatePendingMembers(): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];

  const pendingRequests = await prisma.accessRequest.findMany({
    where: {
      status: 'PENDING',
      parentMemberId: { not: null },
    },
    select: {
      id: true,
      email: true,
      nameArabic: true,
      parentMemberId: true,
    },
  });

  if (pendingRequests.length === 0) {
    return {
      valid: true,
      issues,
      checkedAt: new Date(),
    };
  }

  const parentIds = pendingRequests
    .map(r => r.parentMemberId)
    .filter((id): id is string => id !== null);

  const allMembers = await prisma.familyMember.findMany({
    where: {
      id: { in: parentIds },
    },
    select: {
      id: true,
      firstName: true,
      gender: true,
      deletedAt: true,
    },
  });

  const memberMap = new Map(allMembers.map(m => [m.id, m]));

  for (const request of pendingRequests) {
    if (!request.parentMemberId) continue;

    const proposedFather = memberMap.get(request.parentMemberId);

    if (!proposedFather) {
      issues.push({
        memberId: request.id,
        memberName: request.nameArabic,
        issue: `Pending request references non-existent member ID '${request.parentMemberId}' as parent.`,
        issueAr: `طلب معلق يشير إلى معرف عضو غير موجود '${request.parentMemberId}' كأب.`,
        severity: 'error',
        details: {
          requestId: request.id,
          email: request.email,
          invalidParentId: request.parentMemberId,
        },
      });
      continue;
    }

    if (proposedFather.deletedAt) {
      issues.push({
        memberId: request.id,
        memberName: request.nameArabic,
        issue: `Pending request references soft-deleted member '${proposedFather.firstName}' (${request.parentMemberId}) as parent.`,
        issueAr: `طلب معلق يشير إلى عضو محذوف '${proposedFather.firstName}' (${request.parentMemberId}) كأب.`,
        severity: 'warning',
        details: {
          requestId: request.id,
          email: request.email,
          deletedParentId: request.parentMemberId,
          deletedParentName: proposedFather.firstName,
        },
      });
    }

    if (proposedFather.gender === 'Female') {
      issues.push({
        memberId: request.id,
        memberName: request.nameArabic,
        issue: `Pending request references female member '${proposedFather.firstName}' (${request.parentMemberId}) as father.`,
        issueAr: `طلب معلق يشير إلى عضو أنثى '${proposedFather.firstName}' (${request.parentMemberId}) كأب.`,
        severity: 'error',
        details: {
          requestId: request.id,
          email: request.email,
          femaleParentId: request.parentMemberId,
          femaleParentName: proposedFather.firstName,
        },
      });
    }
  }

  return {
    valid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    checkedAt: new Date(),
  };
}

export async function checkDataConsistency(): Promise<DataConsistencyReport> {
  const totalMembers = await prisma.familyMember.count({
    where: { deletedAt: null },
  });

  const [
    generations,
    parentRelationships,
    orphanedMembers,
    circularAncestry,
    deletedReferences,
    duplicateMembers,
    childrenCounts,
    lineageConsistency,
    pendingMembers,
  ] = await Promise.all([
    validateGenerations(),
    validateParentRelationships(),
    validateOrphanedMembers(),
    validateCircularAncestry(),
    validateDeletedReferences(),
    validateDuplicateMembers(),
    validateChildrenCounts(),
    validateLineageConsistency(),
    validatePendingMembers(),
  ]);

  const totalIssues =
    generations.issues.length +
    parentRelationships.issues.length +
    orphanedMembers.issues.length +
    circularAncestry.issues.length +
    deletedReferences.issues.length +
    duplicateMembers.issues.length +
    childrenCounts.issues.length +
    lineageConsistency.issues.length +
    pendingMembers.issues.length;

  const allValidations = [
    generations,
    parentRelationships,
    orphanedMembers,
    circularAncestry,
    deletedReferences,
    duplicateMembers,
    childrenCounts,
    lineageConsistency,
    pendingMembers,
  ];

  const hasErrors = allValidations.some(v => 
    v.issues.some(i => i.severity === 'error')
  );

  return {
    overallValid: !hasErrors,
    totalMembers,
    totalIssues,
    checkedAt: new Date(),
    validations: {
      generations,
      parentRelationships,
      orphanedMembers,
      circularAncestry,
      deletedReferences,
      duplicateMembers,
      childrenCounts,
      lineageConsistency,
      pendingMembers,
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

  const validationSections = [
    { name: '1. Generation Validation', key: 'generations' as const },
    { name: '2. Parent Relationship Validation', key: 'parentRelationships' as const },
    { name: '3. Orphaned Members Validation', key: 'orphanedMembers' as const },
    { name: '4. Circular Ancestry Validation', key: 'circularAncestry' as const },
    { name: '5. Deleted References Validation', key: 'deletedReferences' as const },
    { name: '6. Duplicate Members Validation', key: 'duplicateMembers' as const },
    { name: '7. Children Counts Validation', key: 'childrenCounts' as const },
    { name: '8. Lineage Consistency Validation', key: 'lineageConsistency' as const },
    { name: '9. Pending Members Validation', key: 'pendingMembers' as const },
  ];

  for (const section of validationSections) {
    const validation = report.validations[section.key];
    lines.push('-'.repeat(60));
    lines.push(section.name);
    lines.push('-'.repeat(60));
    lines.push(`Status: ${validation.valid ? '✅ PASSED' : '❌ FAILED'}`);
    lines.push(`Issues: ${validation.issues.length}`);
    for (const issue of validation.issues) {
      lines.push(`  [${issue.severity.toUpperCase()}] ${issue.memberId}: ${issue.issue}`);
    }
    lines.push('');
  }

  lines.push('='.repeat(60));
  lines.push('END OF REPORT');
  lines.push('='.repeat(60));

  return lines.join('\n');
}
