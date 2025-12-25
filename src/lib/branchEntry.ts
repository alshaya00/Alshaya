// Branch Entry System - Database-backed via API
// All branch links and pending members are stored in the PostgreSQL database

export interface BranchEntryLink {
  id: string;
  branchHeadId: string;
  branchHeadName: string;
  token: string;
  createdAt: string;
  isActive: boolean;
}

export interface PendingMember {
  id: string;
  tempId: string;
  firstName: string;
  fatherId: string;
  fatherName: string;
  gender: 'Male' | 'Female';
  birthYear?: number;
  city?: string;
  occupation?: string;
  phone?: string;
  generation: number;
  branch: string;
  fullNameAr: string;
  submittedAt: string;
  submittedVia: string;
  branchHeadId: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewNote?: string;
}

// Client-side function to get auth header from storage
function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('alshaye_token') || sessionStorage.getItem('alshaye_token');
  if (token) {
    return { 'Authorization': `Bearer ${token}` };
  }
  return {};
}

// Generate token (client-side fallback, but server generates the real one)
export function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 8; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

// Generate unique temp ID for pending members
export function generateTempId(): string {
  return 'TEMP_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
}

// Get all branch links from database via API
export async function getBranchLinks(): Promise<BranchEntryLink[]> {
  try {
    const res = await fetch('/api/admin/branch-links', {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    if (!res.ok) {
      console.error('Failed to fetch branch links');
      return [];
    }
    const data = await res.json();
    return data.links || [];
  } catch (error) {
    console.error('Error fetching branch links:', error);
    return [];
  }
}

// Create a new branch link via API
export async function createBranchLink(branchHeadId: string, branchHeadName: string): Promise<BranchEntryLink | null> {
  try {
    const res = await fetch('/api/admin/branch-links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ branchHeadId, branchHeadName }),
    });

    if (!res.ok) {
      console.error('Failed to create branch link');
      return null;
    }

    const data = await res.json();
    return data.link || null;
  } catch (error) {
    console.error('Error creating branch link:', error);
    return null;
  }
}

// Get link by token via API (public - no auth needed for branch entry)
export async function getLinkByToken(token: string): Promise<BranchEntryLink | null> {
  try {
    const res = await fetch(`/api/branch-links/${token}`);
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    return data.link || null;
  } catch (error) {
    console.error('Error fetching link by token:', error);
    return null;
  }
}

// Deactivate a link via API
export async function deactivateLink(token: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/admin/branch-links/${token}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    return res.ok;
  } catch (error) {
    console.error('Error deactivating link:', error);
    return false;
  }
}

// Get all pending members from database via API
export async function getPendingMembers(): Promise<PendingMember[]> {
  try {
    const res = await fetch('/api/admin/pending', {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    if (!res.ok) {
      console.error('Failed to fetch pending members');
      return [];
    }
    const data = await res.json();
    return data.members || data.entries || [];
  } catch (error) {
    console.error('Error fetching pending members:', error);
    return [];
  }
}

// Add a pending member via API (public - for branch entry form)
export async function addPendingMember(member: Omit<PendingMember, 'id' | 'tempId' | 'submittedAt' | 'status'>): Promise<PendingMember | null> {
  try {
    const res = await fetch('/api/admin/pending', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(member),
    });

    if (!res.ok) {
      console.error('Failed to add pending member');
      return null;
    }

    const data = await res.json();
    return data.member || data.entry || null;
  } catch (error) {
    console.error('Error adding pending member:', error);
    return null;
  }
}

// Update pending member status via API
export async function updatePendingStatus(
  id: string,
  status: 'approved' | 'rejected',
  reviewNote?: string
): Promise<boolean> {
  try {
    const res = await fetch(`/api/admin/pending/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ status, reviewNote }),
    });
    return res.ok;
  } catch (error) {
    console.error('Error updating pending status:', error);
    return false;
  }
}

// Remove pending member via API
export async function removePendingMember(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/admin/pending/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    return res.ok;
  } catch (error) {
    console.error('Error removing pending member:', error);
    return false;
  }
}

// Get pending count by branch (client-side filter on fetched data)
export async function getPendingCountByBranch(branchHeadId: string): Promise<number> {
  const members = await getPendingMembers();
  return members.filter(m => m.branchHeadId === branchHeadId && m.status === 'pending').length;
}

// Get total pending count (client-side filter on fetched data)
export async function getTotalPendingCount(): Promise<number> {
  const members = await getPendingMembers();
  return members.filter(m => m.status === 'pending').length;
}

// Build full entry URL
export function buildEntryUrl(token: string): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/add-branch/${token}`;
}
