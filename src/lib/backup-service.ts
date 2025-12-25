import { prisma } from './prisma';

export interface BackupData {
  version: string;
  createdAt: string;
  totalMembers: number;
  members: MemberBackup[];
  checksum: string;
}

export interface MemberBackup {
  id: string;
  firstName: string;
  fatherName: string | null;
  grandfatherName: string | null;
  greatGrandfatherName: string | null;
  familyName: string | null;
  fatherId: string | null;
  gender: string;
  birthYear: number | null;
  deathYear: number | null;
  sonsCount: number;
  daughtersCount: number;
  generation: number;
  branch: string | null;
  fullNameAr: string | null;
  fullNameEn: string | null;
  lineageBranchId: string | null;
  lineageBranchName: string | null;
  subBranchId: string | null;
  subBranchName: string | null;
  lineagePath: string | null;
  phone: string | null;
  city: string | null;
  status: string;
  photoUrl: string | null;
  biography: string | null;
  occupation: string | null;
  email: string | null;
  version: number;
  deletedAt: string | null;
  deletedBy: string | null;
  deletedReason: string | null;
}

function generateChecksum(members: MemberBackup[]): string {
  const data = members.map(m => `${m.id}:${m.firstName}:${m.fatherId || 'null'}`).sort().join('|');
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `chk_${Math.abs(hash).toString(16)}_${members.length}`;
}

export async function createFullBackup(): Promise<BackupData> {
  const members = await prisma.familyMember.findMany({
    orderBy: { id: 'asc' },
  });

  const memberBackups: MemberBackup[] = members.map(m => ({
    id: m.id,
    firstName: m.firstName,
    fatherName: m.fatherName,
    grandfatherName: m.grandfatherName,
    greatGrandfatherName: m.greatGrandfatherName,
    familyName: m.familyName,
    fatherId: m.fatherId,
    gender: m.gender,
    birthYear: m.birthYear,
    deathYear: m.deathYear,
    sonsCount: m.sonsCount,
    daughtersCount: m.daughtersCount,
    generation: m.generation,
    branch: m.branch,
    fullNameAr: m.fullNameAr,
    fullNameEn: m.fullNameEn,
    lineageBranchId: m.lineageBranchId,
    lineageBranchName: m.lineageBranchName,
    subBranchId: m.subBranchId,
    subBranchName: m.subBranchName,
    lineagePath: m.lineagePath,
    phone: m.phone,
    city: m.city,
    status: m.status,
    photoUrl: m.photoUrl,
    biography: m.biography,
    occupation: m.occupation,
    email: m.email,
    version: m.version,
    deletedAt: m.deletedAt?.toISOString() || null,
    deletedBy: m.deletedBy,
    deletedReason: m.deletedReason,
  }));

  const checksum = generateChecksum(memberBackups);

  return {
    version: '2.0',
    createdAt: new Date().toISOString(),
    totalMembers: memberBackups.length,
    members: memberBackups,
    checksum,
  };
}

export interface RestoreResult {
  success: boolean;
  restoredCount: number;
  expectedCount: number;
  errors: string[];
  preRestoreSnapshotId?: string;
}

function sortMembersByDependency(members: MemberBackup[]): MemberBackup[] {
  const memberMap = new Map<string, MemberBackup>();
  members.forEach(m => memberMap.set(m.id, m));

  const sorted: MemberBackup[] = [];
  const visited = new Set<string>();
  const inProgress = new Set<string>();

  function visit(member: MemberBackup) {
    if (visited.has(member.id)) return;
    if (inProgress.has(member.id)) {
      visited.add(member.id);
      sorted.push(member);
      return;
    }

    inProgress.add(member.id);

    if (member.fatherId && memberMap.has(member.fatherId)) {
      visit(memberMap.get(member.fatherId)!);
    }

    inProgress.delete(member.id);
    visited.add(member.id);
    sorted.push(member);
  }

  for (const member of members) {
    visit(member);
  }

  return sorted;
}

export async function restoreFromBackup(
  backupData: BackupData,
  userId: string,
  userName: string
): Promise<RestoreResult> {
  const errors: string[] = [];

  if (!backupData.members || !Array.isArray(backupData.members)) {
    return {
      success: false,
      restoredCount: 0,
      expectedCount: 0,
      errors: ['Invalid backup data: members array is missing'],
    };
  }

  const expectedCount = backupData.members.length;

  if (expectedCount === 0) {
    return {
      success: false,
      restoredCount: 0,
      expectedCount: 0,
      errors: ['Cannot restore empty backup'],
    };
  }

  const currentMembers = await prisma.familyMember.findMany();
  
  const preRestoreSnapshot = await prisma.snapshot.create({
    data: {
      name: `Pre-Restore Safety Backup`,
      description: `Automatic safety backup before restore operation - ${currentMembers.length} members preserved`,
      treeData: JSON.stringify(currentMembers),
      memberCount: currentMembers.length,
      createdBy: userId,
      createdByName: userName,
      snapshotType: 'PRE_RESTORE',
    },
  });

  const sortedMembers = sortMembersByDependency(backupData.members);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.familyMember.deleteMany({});

      for (const member of sortedMembers) {
        await tx.familyMember.create({
          data: {
            id: member.id,
            firstName: member.firstName,
            fatherName: member.fatherName ?? undefined,
            grandfatherName: member.grandfatherName ?? undefined,
            greatGrandfatherName: member.greatGrandfatherName ?? undefined,
            familyName: member.familyName ?? undefined,
            fatherId: member.fatherId ?? undefined,
            gender: member.gender,
            birthYear: member.birthYear ?? undefined,
            deathYear: member.deathYear ?? undefined,
            sonsCount: member.sonsCount || 0,
            daughtersCount: member.daughtersCount || 0,
            generation: member.generation,
            branch: member.branch ?? undefined,
            fullNameAr: member.fullNameAr ?? undefined,
            fullNameEn: member.fullNameEn ?? undefined,
            lineageBranchId: member.lineageBranchId ?? undefined,
            lineageBranchName: member.lineageBranchName ?? undefined,
            subBranchId: member.subBranchId ?? undefined,
            subBranchName: member.subBranchName ?? undefined,
            lineagePath: member.lineagePath ?? undefined,
            phone: member.phone ?? undefined,
            city: member.city ?? undefined,
            status: member.status || 'Living',
            photoUrl: member.photoUrl ?? undefined,
            biography: member.biography ?? undefined,
            occupation: member.occupation ?? undefined,
            email: member.email ?? undefined,
            version: member.version || 1,
            deletedAt: member.deletedAt ? new Date(member.deletedAt) : null,
            deletedBy: member.deletedBy ?? undefined,
            deletedReason: member.deletedReason ?? undefined,
          },
        });
      }

      const finalCount = await tx.familyMember.count();
      
      if (finalCount !== expectedCount) {
        throw new Error(`Member count mismatch: expected ${expectedCount}, got ${finalCount}. Rolling back.`);
      }
    }, {
      timeout: 60000,
    });

    const verifyCount = await prisma.familyMember.count();
    
    if (verifyCount !== expectedCount) {
      errors.push(`Post-transaction verification failed: expected ${expectedCount}, found ${verifyCount}`);
      return {
        success: false,
        restoredCount: verifyCount,
        expectedCount,
        errors,
        preRestoreSnapshotId: preRestoreSnapshot.id,
      };
    }

    return {
      success: true,
      restoredCount: verifyCount,
      expectedCount,
      errors: [],
      preRestoreSnapshotId: preRestoreSnapshot.id,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during restore';
    errors.push(errorMessage);

    console.error('Restore failed, attempting to recover from pre-restore backup:', error);

    try {
      const preRestoreData = JSON.parse(preRestoreSnapshot.treeData);
      
      await prisma.$transaction(async (tx) => {
        await tx.familyMember.deleteMany({});
        
        for (const member of preRestoreData) {
          const { createdAt, updatedAt, ...memberData } = member;
          await tx.familyMember.create({
            data: {
              ...memberData,
              sonsCount: memberData.sonsCount || 0,
              daughtersCount: memberData.daughtersCount || 0,
            },
          });
        }
      });
      
      errors.push('Data restored to pre-restore state after failure');
    } catch (recoveryError) {
      errors.push(`CRITICAL: Recovery also failed: ${recoveryError instanceof Error ? recoveryError.message : 'Unknown'}`);
    }

    return {
      success: false,
      restoredCount: 0,
      expectedCount,
      errors,
      preRestoreSnapshotId: preRestoreSnapshot.id,
    };
  }
}

export function generateCSV(members: MemberBackup[]): string {
  const headers = [
    'الرقم',
    'الاسم الأول',
    'اسم الأب',
    'اسم الجد',
    'اسم الجد الأعلى',
    'العائلة',
    'رقم الأب',
    'الجنس',
    'سنة الميلاد',
    'سنة الوفاة',
    'عدد الأبناء',
    'عدد البنات',
    'الجيل',
    'الفرع',
    'الاسم الكامل بالعربي',
    'الاسم الكامل بالانجليزي',
    'الهاتف',
    'المدينة',
    'الحالة',
    'المهنة',
    'البريد الإلكتروني',
  ];

  const rows = members.map(m => [
    m.id,
    m.firstName,
    m.fatherName || '',
    m.grandfatherName || '',
    m.greatGrandfatherName || '',
    m.familyName || '',
    m.fatherId || '',
    m.gender === 'Male' ? 'ذكر' : 'أنثى',
    m.birthYear?.toString() || '',
    m.deathYear?.toString() || '',
    m.sonsCount.toString(),
    m.daughtersCount.toString(),
    m.generation.toString(),
    m.branch || '',
    m.fullNameAr || '',
    m.fullNameEn || '',
    m.phone || '',
    m.city || '',
    m.status === 'Deceased' ? 'متوفي' : 'على قيد الحياة',
    m.occupation || '',
    m.email || '',
  ]);

  const escapeCSV = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(',')),
  ].join('\n');

  return '\uFEFF' + csvContent;
}

export async function createDailyCSVBackup(): Promise<{ csv: string; memberCount: number; date: string }> {
  const backup = await createFullBackup();
  const csv = generateCSV(backup.members);
  const date = new Date().toISOString().split('T')[0];
  
  return {
    csv,
    memberCount: backup.totalMembers,
    date,
  };
}
