import { Octokit } from '@octokit/rest';
import { prisma } from './prisma';

interface ConnectionSettings {
  settings: {
    access_token?: string;
    expires_at?: string;
    oauth?: {
      credentials?: {
        access_token?: string;
      };
    };
  };
}

let connectionSettings: ConnectionSettings | null = null;

const REPO_NAME = 'alshaye-family-backup';
const BACKUP_BRANCH = 'main';

async function getAccessToken(): Promise<string> {
  if (connectionSettings?.settings?.expires_at && 
      new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    const token = connectionSettings.settings.access_token;
    if (token) return token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken || !hostname) {
    throw new Error('GitHub not connected');
  }

  try {
    const response = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    );
    
    const data = await response.json();
    connectionSettings = data.items?.[0] as ConnectionSettings;

    const accessToken = connectionSettings?.settings?.access_token || 
                        connectionSettings?.settings?.oauth?.credentials?.access_token;

    if (!connectionSettings || !accessToken) {
      throw new Error('GitHub not connected');
    }
    
    return accessToken;
  } catch (error) {
    console.error('GitHub connection error:', error);
    throw new Error('GitHub not connected');
  }
}

async function getGitHubClient(): Promise<Octokit> {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

export async function isGitHubConnected(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}

async function getAuthenticatedUser(octokit: Octokit): Promise<string> {
  const { data } = await octokit.users.getAuthenticated();
  return data.login;
}

async function ensureRepoExists(octokit: Octokit, owner: string): Promise<{ owner: string; repo: string }> {
  try {
    await octokit.repos.get({ owner, repo: REPO_NAME });
    return { owner, repo: REPO_NAME };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
      await octokit.repos.createForAuthenticatedUser({
        name: REPO_NAME,
        description: 'Al-Shaya Family Tree Encrypted Backups',
        private: true,
        auto_init: true,
      });
      return { owner, repo: REPO_NAME };
    }
    throw error;
  }
}

function encodeBase64(data: string): string {
  return Buffer.from(data, 'utf-8').toString('base64');
}

async function getAllMembers() {
  return prisma.member.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      firstName: true,
      fatherName: true,
      grandfatherName: true,
      greatGrandfatherName: true,
      familyName: true,
      fatherId: true,
      gender: true,
      birthYear: true,
      deathYear: true,
      sonsCount: true,
      daughtersCount: true,
      generation: true,
      branch: true,
      fullNameAr: true,
      fullNameEn: true,
      lineageBranchId: true,
      lineageBranchName: true,
      subBranchId: true,
      subBranchName: true,
      lineagePath: true,
      phone: true,
      city: true,
      status: true,
      photoUrl: true,
      biography: true,
      occupation: true,
      email: true,
      createdAt: true,
      updatedAt: true,
      createdBy: true,
      lastModifiedBy: true,
      version: true,
    },
  });
}

async function createBackupContent(): Promise<{ json: string; csv: string; memberCount: number }> {
  const members = await getAllMembers();
  
  const backupData = {
    exportDate: new Date().toISOString(),
    version: '2.1',
    schemaVersion: 'FamilyMember_v1',
    memberCount: members.length,
    members: members.map(m => ({
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
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      createdBy: m.createdBy,
      lastModifiedBy: m.lastModifiedBy,
      version: m.version,
    })),
  };

  const headers = [
    'ID', 'First Name', 'Father Name', 'Grandfather Name', 'Great Grandfather Name',
    'Family Name', 'Father ID', 'Gender', 'Birth Year', 'Death Year',
    'Sons Count', 'Daughters Count', 'Generation', 'Branch', 'Full Name (Arabic)',
    'Full Name (English)', 'Lineage Branch ID', 'Lineage Branch Name', 'Sub Branch ID',
    'Sub Branch Name', 'Lineage Path', 'Phone', 'City', 'Status', 'Photo URL',
    'Biography', 'Occupation', 'Email', 'Created At', 'Updated At',
    'Created By', 'Last Modified By', 'Version'
  ];

  const csvRows = [headers.join(',')];
  for (const m of members) {
    const row = [
      m.id,
      `"${(m.firstName || '').replace(/"/g, '""')}"`,
      `"${(m.fatherName || '').replace(/"/g, '""')}"`,
      `"${(m.grandfatherName || '').replace(/"/g, '""')}"`,
      `"${(m.greatGrandfatherName || '').replace(/"/g, '""')}"`,
      `"${(m.familyName || '').replace(/"/g, '""')}"`,
      m.fatherId || '',
      m.gender || '',
      m.birthYear || '',
      m.deathYear || '',
      m.sonsCount || 0,
      m.daughtersCount || 0,
      m.generation || '',
      `"${(m.branch || '').replace(/"/g, '""')}"`,
      `"${(m.fullNameAr || '').replace(/"/g, '""')}"`,
      `"${(m.fullNameEn || '').replace(/"/g, '""')}"`,
      m.lineageBranchId || '',
      `"${(m.lineageBranchName || '').replace(/"/g, '""')}"`,
      m.subBranchId || '',
      `"${(m.subBranchName || '').replace(/"/g, '""')}"`,
      `"${(m.lineagePath || '').replace(/"/g, '""')}"`,
      m.phone || '',
      `"${(m.city || '').replace(/"/g, '""')}"`,
      m.status || '',
      m.photoUrl || '',
      `"${(m.biography || '').replace(/"/g, '""')}"`,
      `"${(m.occupation || '').replace(/"/g, '""')}"`,
      m.email || '',
      m.createdAt?.toISOString() || '',
      m.updatedAt?.toISOString() || '',
      m.createdBy || '',
      m.lastModifiedBy || '',
      m.version || 1,
    ];
    csvRows.push(row.join(','));
  }

  return {
    json: JSON.stringify(backupData, null, 2),
    csv: csvRows.join('\n'),
    memberCount: members.length,
  };
}

async function uploadFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string
): Promise<string> {
  let sha: string | undefined;
  
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: BACKUP_BRANCH,
    });
    if (!Array.isArray(data) && data.type === 'file') {
      sha = data.sha;
    }
  } catch {
  }

  const { data } = await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: encodeBase64(content),
    branch: BACKUP_BRANCH,
    sha,
  });

  return data.commit.sha || '';
}

export interface GitHubBackupResult {
  success: boolean;
  commitSha?: string;
  repoUrl?: string;
  memberCount?: number;
  error?: string;
}

export async function exportBackupToGitHub(): Promise<GitHubBackupResult> {
  try {
    const octokit = await getGitHubClient();
    const owner = await getAuthenticatedUser(octokit);
    await ensureRepoExists(octokit, owner);

    const { json, csv, memberCount } = await createBackupContent();
    const timestamp = new Date().toISOString().split('T')[0];
    
    const jsonPath = `backups/${timestamp}/backup.json`;
    const csvPath = `backups/${timestamp}/members.csv`;
    const latestJsonPath = 'latest/backup.json';
    const latestCsvPath = 'latest/members.csv';

    await uploadFile(
      octokit, owner, REPO_NAME, jsonPath, json,
      `Backup ${timestamp}: ${memberCount} members (JSON)`
    );

    await uploadFile(
      octokit, owner, REPO_NAME, csvPath, csv,
      `Backup ${timestamp}: ${memberCount} members (CSV)`
    );

    await uploadFile(
      octokit, owner, REPO_NAME, latestJsonPath, json,
      `Update latest backup: ${memberCount} members (JSON)`
    );

    const commitSha = await uploadFile(
      octokit, owner, REPO_NAME, latestCsvPath, csv,
      `Update latest backup: ${memberCount} members (CSV)`
    );

    return {
      success: true,
      commitSha,
      repoUrl: `https://github.com/${owner}/${REPO_NAME}`,
      memberCount,
    };
  } catch (error) {
    console.error('GitHub backup error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getGitHubBackupInfo(): Promise<{
  connected: boolean;
  repoUrl?: string;
  lastBackup?: string;
  backupCount?: number;
}> {
  try {
    const octokit = await getGitHubClient();
    const owner = await getAuthenticatedUser(octokit);
    
    try {
      await octokit.repos.get({ owner, repo: REPO_NAME });
    } catch {
      return { connected: true };
    }

    let lastBackup: string | undefined;
    let backupCount = 0;

    try {
      const { data: contents } = await octokit.repos.getContent({
        owner,
        repo: REPO_NAME,
        path: 'backups',
      });

      if (Array.isArray(contents)) {
        const folders = contents.filter(c => c.type === 'dir').map(c => c.name).sort().reverse();
        backupCount = folders.length;
        if (folders.length > 0) {
          lastBackup = folders[0];
        }
      }
    } catch {
    }

    return {
      connected: true,
      repoUrl: `https://github.com/${owner}/${REPO_NAME}`,
      lastBackup,
      backupCount,
    };
  } catch {
    return { connected: false };
  }
}
