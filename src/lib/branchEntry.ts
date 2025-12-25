// Branch Entry System - Types and Utilities

import { storageKeys } from '@/config/storage-keys';
import { randomBytes } from 'crypto';
import { safeStorage } from '@/lib/storage';

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
  submittedVia: string; // token
  branchHeadId: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewNote?: string;
}

const LINKS_STORAGE_KEY = storageKeys.branchLinks;
const PENDING_STORAGE_KEY = storageKeys.pendingMembers;

// SECURITY: Generate cryptographically secure token
export function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = randomBytes(8);
  let token = '';
  for (let i = 0; i < 8; i++) {
    token += chars[bytes[i] % chars.length];
  }
  return token;
}

// SECURITY: Generate unique temp ID for pending members
export function generateTempId(): string {
  return 'TEMP_' + Date.now() + '_' + randomBytes(4).toString('hex');
}

// Get all branch links (using safe storage with error handling)
export function getBranchLinks(): BranchEntryLink[] {
  return safeStorage.getItem<BranchEntryLink[]>(LINKS_STORAGE_KEY, []);
}

// Save branch links (using safe storage with error handling)
export function saveBranchLinks(links: BranchEntryLink[]): void {
  safeStorage.setItem(LINKS_STORAGE_KEY, links);
}

// Create a new branch link
export function createBranchLink(branchHeadId: string, branchHeadName: string): BranchEntryLink {
  const links = getBranchLinks();

  // Check if link already exists for this branch head
  const existing = links.find(l => l.branchHeadId === branchHeadId && l.isActive);
  if (existing) {
    return existing;
  }

  const newLink: BranchEntryLink = {
    id: generateToken(),
    branchHeadId,
    branchHeadName,
    token: generateToken(),
    createdAt: new Date().toISOString(),
    isActive: true,
  };

  links.push(newLink);
  saveBranchLinks(links);
  return newLink;
}

// Get link by token
export function getLinkByToken(token: string): BranchEntryLink | null {
  const links = getBranchLinks();
  return links.find(l => l.token === token && l.isActive) || null;
}

// Deactivate a link
export function deactivateLink(token: string): void {
  const links = getBranchLinks();
  const link = links.find(l => l.token === token);
  if (link) {
    link.isActive = false;
    saveBranchLinks(links);
  }
}

// Get all pending members (using safe storage with error handling)
export function getPendingMembers(): PendingMember[] {
  return safeStorage.getItem<PendingMember[]>(PENDING_STORAGE_KEY, []);
}

// Save pending members (using safe storage with error handling)
export function savePendingMembers(members: PendingMember[]): void {
  safeStorage.setItem(PENDING_STORAGE_KEY, members);
}

// Add a pending member
export function addPendingMember(member: Omit<PendingMember, 'id' | 'tempId' | 'submittedAt' | 'status'>): PendingMember {
  const members = getPendingMembers();

  const newMember: PendingMember = {
    ...member,
    id: generateToken(),
    tempId: generateTempId(),
    submittedAt: new Date().toISOString(),
    status: 'pending',
  };

  members.push(newMember);
  savePendingMembers(members);
  return newMember;
}

// Update pending member status
export function updatePendingStatus(
  id: string,
  status: 'approved' | 'rejected',
  reviewNote?: string
): void {
  const members = getPendingMembers();
  const member = members.find(m => m.id === id);
  if (member) {
    member.status = status;
    member.reviewNote = reviewNote;
    savePendingMembers(members);
  }
}

// Remove pending member
export function removePendingMember(id: string): void {
  const members = getPendingMembers();
  const filtered = members.filter(m => m.id !== id);
  savePendingMembers(filtered);
}

// Get pending count by branch
export function getPendingCountByBranch(branchHeadId: string): number {
  const members = getPendingMembers();
  return members.filter(m => m.branchHeadId === branchHeadId && m.status === 'pending').length;
}

// Get total pending count
export function getTotalPendingCount(): number {
  const members = getPendingMembers();
  return members.filter(m => m.status === 'pending').length;
}

// Build full entry URL
export function buildEntryUrl(token: string): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/add-branch/${token}`;
}
