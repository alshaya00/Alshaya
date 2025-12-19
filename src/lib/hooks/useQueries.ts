// React Query hooks for data fetching
// Al-Shaye Family Tree Application

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { FamilyMember, TreeNode } from '@/lib/types';

// ============================================
// QUERY KEYS
// ============================================

export const queryKeys = {
  members: ['members'] as const,
  member: (id: string) => ['member', id] as const,
  tree: ['tree'] as const,
  statistics: ['statistics'] as const,
  users: ['users'] as const,
  user: (id: string) => ['user', id] as const,
  settings: ['settings'] as const,
  apiServices: ['apiServices'] as const,
  history: ['history'] as const,
  snapshots: ['snapshots'] as const,
  pendingMembers: ['pendingMembers'] as const,
  duplicates: ['duplicates'] as const,
  branchLinks: ['branchLinks'] as const,
  auditLogs: ['auditLogs'] as const,
  nameMatch: (input: NameMatchInput) => ['nameMatch', input] as const,
};

// Name matching types
export interface NameMatchInput {
  firstName: string;
  fatherName: string;
  grandfatherName?: string;
  greatGrandfatherName?: string;
}

// ============================================
// API FUNCTIONS
// ============================================

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// ============================================
// MEMBER HOOKS
// ============================================

interface MembersResponse {
  members: FamilyMember[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface MemberQueryParams {
  page?: number;
  limit?: number;
  gender?: string;
  generation?: number;
  branch?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function useMembers(params: MemberQueryParams = {}) {
  const queryString = new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)])
  ).toString();

  return useQuery({
    queryKey: [...queryKeys.members, params],
    queryFn: () => fetchJson<MembersResponse>(`/api/members?${queryString}`),
  });
}

export function useMember(id: string) {
  return useQuery({
    queryKey: queryKeys.member(id),
    queryFn: () => fetchJson<{ member: FamilyMember; children: FamilyMember[] }>(`/api/members/${id}`),
    enabled: !!id,
  });
}

export function useCreateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<FamilyMember>) =>
      fetchJson<{ member: FamilyMember }>('/api/members', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members });
      queryClient.invalidateQueries({ queryKey: queryKeys.tree });
      queryClient.invalidateQueries({ queryKey: queryKeys.statistics });
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FamilyMember> }) =>
      fetchJson<{ member: FamilyMember }>(`/api/members/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.member(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.members });
      queryClient.invalidateQueries({ queryKey: queryKeys.tree });
    },
  });
}

export function useDeleteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetchJson<{ success: boolean }>(`/api/members/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members });
      queryClient.invalidateQueries({ queryKey: queryKeys.tree });
      queryClient.invalidateQueries({ queryKey: queryKeys.statistics });
    },
  });
}

// ============================================
// TREE HOOKS
// ============================================

export function useTree() {
  return useQuery({
    queryKey: queryKeys.tree,
    queryFn: () => fetchJson<{ tree: TreeNode }>('/api/tree'),
    staleTime: 10 * 60 * 1000, // Tree data is more stable, cache for 10 minutes
  });
}

// ============================================
// STATISTICS HOOKS
// ============================================

interface Statistics {
  totalMembers: number;
  totalMales: number;
  totalFemales: number;
  livingMembers: number;
  deceasedMembers: number;
  generationCounts: Record<number, number>;
  branchCounts: Record<string, number>;
  topCities: { city: string; count: number }[];
  topOccupations: { occupation: string; count: number }[];
}

export function useStatistics() {
  return useQuery({
    queryKey: queryKeys.statistics,
    queryFn: () => fetchJson<Statistics>('/api/statistics'),
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================
// SETTINGS HOOKS
// ============================================

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => fetchJson<{ settings: Record<string, unknown> }>('/api/settings'),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetchJson<{ success: boolean }>('/api/settings', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings });
    },
  });
}

// ============================================
// API SERVICES HOOKS
// ============================================

export function useApiServices() {
  return useQuery({
    queryKey: queryKeys.apiServices,
    queryFn: () => fetchJson<{ success: boolean; data: Record<string, unknown> }>('/api/admin/services'),
  });
}

export function useUpdateApiServices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetchJson<{ success: boolean; data: Record<string, unknown> }>('/api/admin/services', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiServices });
    },
  });
}

// ============================================
// HISTORY HOOKS
// ============================================

export function useHistory(params: { page?: number; limit?: number; memberId?: string } = {}) {
  const queryString = new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)])
  ).toString();

  return useQuery({
    queryKey: [...queryKeys.history, params],
    queryFn: () => fetchJson<{ history: unknown[]; total: number }>(`/api/admin/history?${queryString}`),
  });
}

// ============================================
// SNAPSHOTS HOOKS
// ============================================

export function useSnapshots() {
  return useQuery({
    queryKey: queryKeys.snapshots,
    queryFn: () => fetchJson<{ snapshots: unknown[] }>('/api/admin/snapshots'),
  });
}

export function useCreateSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      fetchJson<{ snapshot: unknown }>('/api/admin/snapshots', {
        method: 'POST',
        body: JSON.stringify({ action: 'create', ...data }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.snapshots });
    },
  });
}

export function useRestoreSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (snapshotId: string) =>
      fetchJson<{ success: boolean }>('/api/admin/snapshots', {
        method: 'POST',
        body: JSON.stringify({ action: 'restore', snapshotId }),
      }),
    onSuccess: () => {
      // Invalidate all data after restore
      queryClient.invalidateQueries();
    },
  });
}

// ============================================
// PENDING MEMBERS HOOKS
// ============================================

export function usePendingMembers() {
  return useQuery({
    queryKey: queryKeys.pendingMembers,
    queryFn: () => fetchJson<{ pending: unknown[] }>('/api/admin/pending'),
  });
}

export function useApprovePendingMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; action: 'approve' | 'reject'; notes?: string }) =>
      fetchJson<{ success: boolean }>('/api/admin/pending', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingMembers });
      queryClient.invalidateQueries({ queryKey: queryKeys.members });
      queryClient.invalidateQueries({ queryKey: queryKeys.tree });
    },
  });
}

// ============================================
// DUPLICATES HOOKS
// ============================================

export function useDuplicates() {
  return useQuery({
    queryKey: queryKeys.duplicates,
    queryFn: () => fetchJson<{ duplicates: unknown[] }>('/api/admin/duplicates'),
  });
}

export function useResolveDuplicate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; resolution: string }) =>
      fetchJson<{ success: boolean }>('/api/admin/duplicates', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.duplicates });
    },
  });
}

// ============================================
// BRANCH LINKS HOOKS
// ============================================

export function useBranchLinks() {
  return useQuery({
    queryKey: queryKeys.branchLinks,
    queryFn: () => fetchJson<{ links: unknown[] }>('/api/admin/branch-links'),
  });
}

export function useCreateBranchLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      branchName: string;
      branchHeadId: string;
      branchHeadName: string;
      expiresAt?: string;
      maxUses?: number;
    }) =>
      fetchJson<{ link: unknown }>('/api/admin/branch-links', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.branchLinks });
    },
  });
}

// ============================================
// PREFETCHING UTILITIES
// ============================================

export function usePrefetchMember(queryClient: ReturnType<typeof useQueryClient>) {
  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.member(id),
      queryFn: () => fetchJson<{ member: FamilyMember; children: FamilyMember[] }>(`/api/members/${id}`),
      staleTime: 5 * 60 * 1000,
    });
  };
}

// ============================================
// NAME MATCHING HOOKS
// ============================================

import type { MatchResult, MatchCandidate } from '@/lib/matching';

export interface NameMatchResponse {
  success: boolean;
  data: MatchResult & {
    allMatches: (MatchCandidate & {
      explanation: {
        summary: string;
        summaryAr: string;
        details: string[];
        detailsAr: string[];
      };
    })[];
  };
  input: NameMatchInput;
  errors?: string[];
  errorsAr?: string[];
  message?: string;
  messageAr?: string;
}

/**
 * Hook to perform name matching for quick-add
 * Uses mutation since this is a POST request that performs a search
 */
export function useNameMatch() {
  return useMutation({
    mutationFn: (input: NameMatchInput) =>
      fetchJson<NameMatchResponse>('/api/members/match', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  });
}

/**
 * Hook to submit a pending member for approval
 */
export function useSubmitPendingMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      firstName: string;
      fatherName?: string;
      grandfatherName?: string;
      greatGrandfatherName?: string;
      familyName?: string;
      proposedFatherId: string;
      gender: 'Male' | 'Female';
      birthYear?: number;
      generation: number;
      branch?: string;
      fullNameAr?: string;
      fullNameEn?: string;
      phone?: string;
      city?: string;
      occupation?: string;
      email?: string;
    }) =>
      fetchJson<{ success: boolean; pending: unknown }>('/api/pending-members', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingMembers });
    },
  });
}
