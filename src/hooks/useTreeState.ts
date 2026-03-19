'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { FamilyMember } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useSystemConfig } from '@/lib/hooks/useSystemConfig';
import { smartMemberFilter } from '@/lib/search-utils';

// ============================================
// Types
// ============================================

export type ViewMode = 'tree' | 'generations' | 'list' | 'graph';

export interface TreeNodeData extends FamilyMember {
  children: TreeNodeData[];
  isExpanded: boolean;
}

export const GENERATION_COLORS: Record<number, string> = {
  1: 'bg-red-500',
  2: 'bg-orange-500',
  3: 'bg-amber-500',
  4: 'bg-green-500',
  5: 'bg-teal-500',
  6: 'bg-blue-500',
  7: 'bg-indigo-500',
  8: 'bg-purple-500',
  9: 'bg-pink-500',
  10: 'bg-cyan-500',
  11: 'bg-lime-500',
  12: 'bg-rose-500',
};

// ============================================
// Hook
// ============================================

export function useTreeState() {
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [allMembers, setAllMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { session } = useAuth();
  const { display } = useSystemConfig();

  // Fetch members
  useEffect(() => {
    async function fetchMembers() {
      try {
        const res = await fetch('/api/members?limit=2000', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
          },
        });
        if (res.ok) {
          const data = await res.json();
          const members = data.data || [];
          setAllMembers(members);
          const root = members.find((m: FamilyMember) => !m.fatherId || m.generation === 1);
          if (root) {
            setExpandedNodes(new Set([root.id]));
          }
        }
      } catch (error) {
        console.error('Error fetching members:', error);
      } finally {
        setIsLoading(false);
      }
    }
    if (session?.token) {
      fetchMembers();
    } else {
      setIsLoading(false);
    }
  }, [session?.token]);

  // Utility: get member by ID
  const getMemberById = useCallback(
    (id: string): FamilyMember | undefined => {
      return allMembers.find(m => m.id === id);
    },
    [allMembers]
  );

  // Filter members based on display settings
  const displayMembers = useMemo(() => {
    if (display?.showDeceasedMembers === false) {
      return allMembers.filter(m => m.status !== 'Deceased');
    }
    return allMembers;
  }, [allMembers, display?.showDeceasedMembers]);

  const deceasedHiddenCount = allMembers.length - displayMembers.length;

  // Build tree structure
  const treeData = useMemo(() => {
    const memberMap = new Map<string, TreeNodeData>();

    displayMembers.forEach(member => {
      memberMap.set(member.id, {
        ...member,
        children: [],
        isExpanded: expandedNodes.has(member.id),
      });
    });

    const roots: TreeNodeData[] = [];
    memberMap.forEach(node => {
      if (node.fatherId && memberMap.has(node.fatherId)) {
        memberMap.get(node.fatherId)!.children.push(node);
      } else if (!node.fatherId) {
        roots.push(node);
      }
    });

    const sortChildren = (node: TreeNodeData) => {
      node.children.sort((a, b) => (a.birthYear || 0) - (b.birthYear || 0));
      node.children.forEach(sortChildren);
    };
    roots.forEach(sortChildren);

    return roots;
  }, [displayMembers, expandedNodes]);

  // Group by generation
  const generations = useMemo(() => {
    const groups: Map<number, FamilyMember[]> = new Map();
    displayMembers.forEach(member => {
      if (!groups.has(member.generation)) {
        groups.set(member.generation, []);
      }
      groups.get(member.generation)!.push(member);
    });
    return Array.from(groups.entries()).sort((a, b) => a[0] - b[0]);
  }, [displayMembers]);

  // Search results
  const searchResults = useMemo(() => {
    return smartMemberFilter(allMembers, searchTerm, { limit: 10 });
  }, [searchTerm, allMembers]);

  // Toggle expand/collapse a node
  const toggleNode = useCallback((id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Expand all male members
  const expandAll = useCallback(() => {
    setExpandedNodes(
      new Set(allMembers.filter(m => m.gender?.toUpperCase() === 'MALE').map(m => m.id))
    );
  }, [allMembers]);

  // Collapse to root only
  const collapseAll = useCallback(() => {
    const root = allMembers.find(m => !m.fatherId || m.generation === 1);
    setExpandedNodes(new Set(root ? [root.id] : []));
  }, [allMembers]);

  // Highlight a member and expand path to it
  const highlightMember = useCallback(
    (id: string) => {
      setHighlightedId(id);
      setSearchTerm('');

      const member = getMemberById(id);
      if (member) {
        const newExpanded = new Set(expandedNodes);
        let current = member;
        while (current.fatherId) {
          newExpanded.add(current.fatherId);
          const parent = getMemberById(current.fatherId);
          if (!parent) break;
          current = parent;
        }
        setExpandedNodes(newExpanded);
      }

      setTimeout(() => setHighlightedId(null), 4000);
    },
    [getMemberById, expandedNodes]
  );

  return {
    // State
    viewMode,
    expandedNodes,
    selectedMember,
    searchTerm,
    highlightedId,
    allMembers,
    isLoading,

    // Derived data
    displayMembers,
    deceasedHiddenCount,
    treeData,
    generations,
    searchResults,

    // Actions
    setViewMode,
    setSelectedMember,
    setSearchTerm,
    toggleNode,
    expandAll,
    collapseAll,
    highlightMember,
    getMemberById,
  };
}
