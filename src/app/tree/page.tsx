'use client';

import { useState, useEffect, useMemo } from 'react';
import { FamilyMember } from '@/lib/types';
import {
  Search, ChevronDown, ChevronRight, Users, User,
  Eye, X, TreePine, LayoutGrid, List, GitBranch
} from 'lucide-react';
import Link from 'next/link';
import FamilyTreeGraph from '@/components/FamilyTreeGraph';
import { FeatureGate } from '@/components/FeatureGate';
import { useAuth } from '@/contexts/AuthContext';

type ViewMode = 'tree' | 'generations' | 'list' | 'graph';

interface TreeNodeData extends FamilyMember {
  children: TreeNodeData[];
  isExpanded: boolean;
}

function TreePageContent() {
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['P001']));
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [allMembers, setAllMembers] = useState<FamilyMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const { session } = useAuth();

  // Fetch members from API
  useEffect(() => {
    async function fetchMembers() {
      try {
        const headers: HeadersInit = {};
        if (session?.token) {
          headers['Authorization'] = `Bearer ${session.token}`;
        }
        const response = await fetch('/api/members?limit=500', { headers });
        if (response.ok) {
          const result = await response.json();
          setAllMembers(result.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch members:', error);
      } finally {
        setMembersLoading(false);
      }
    }
    fetchMembers();
  }, [session?.token]);

  // Helper to get member by ID from the loaded members
  const getMemberById = (id: string): FamilyMember | undefined => {
    return allMembers.find(m => m.id === id);
  };

  // Build tree structure
  const treeData = useMemo(() => {
    const memberMap = new Map<string, TreeNodeData>();

    // Create nodes
    allMembers.forEach(member => {
      memberMap.set(member.id, {
        ...member,
        children: [],
        isExpanded: expandedNodes.has(member.id)
      });
    });

    // Build hierarchy
    const roots: TreeNodeData[] = [];
    memberMap.forEach(node => {
      if (node.fatherId && memberMap.has(node.fatherId)) {
        memberMap.get(node.fatherId)!.children.push(node);
      } else if (!node.fatherId) {
        roots.push(node);
      }
    });

    // Sort children by birth year
    const sortChildren = (node: TreeNodeData) => {
      node.children.sort((a, b) => (a.birthYear || 0) - (b.birthYear || 0));
      node.children.forEach(sortChildren);
    };
    roots.forEach(sortChildren);

    return roots;
  }, [allMembers, expandedNodes]);

  // Group by generation for generation view
  const generations = useMemo(() => {
    const groups: Map<number, FamilyMember[]> = new Map();
    allMembers.forEach(member => {
      if (!groups.has(member.generation)) {
        groups.set(member.generation, []);
      }
      groups.get(member.generation)!.push(member);
    });
    return Array.from(groups.entries()).sort((a, b) => a[0] - b[0]);
  }, [allMembers]);

  // Search functionality
  const searchResults = useMemo(() => {
    if (searchTerm.length < 2) return [];
    const term = searchTerm.toLowerCase();
    return allMembers.filter(m =>
      m.firstName.toLowerCase().includes(term) ||
      m.fullNameAr?.toLowerCase().includes(term) ||
      m.id.toLowerCase().includes(term)
    ).slice(0, 10);
  }, [searchTerm, allMembers]);

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedNodes(new Set(allMembers.filter(m => m.gender === 'Male').map(m => m.id)));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set(['P001']));
  };

  const highlightMember = (id: string) => {
    setHighlightedId(id);
    setSearchTerm('');

    // Expand path to member
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
  };

  const generationColors: Record<number, string> = {
    1: 'bg-red-500',
    2: 'bg-orange-500',
    3: 'bg-amber-500',
    4: 'bg-green-500',
    5: 'bg-teal-500',
    6: 'bg-blue-500',
    7: 'bg-indigo-500',
    8: 'bg-purple-500',
  };

  // Render tree node recursively
  const renderTreeNode = (node: TreeNodeData, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const isHighlighted = node.id === highlightedId;

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setSelectedMember(getMemberById(node.id) || null);
      }
      if (e.key === 'ArrowRight' && hasChildren && !isExpanded) {
        e.preventDefault();
        toggleNode(node.id);
      }
      if (e.key === 'ArrowLeft' && isExpanded) {
        e.preventDefault();
        toggleNode(node.id);
      }
    };

    return (
      <div key={node.id} className="relative" role="treeitem" aria-expanded={hasChildren ? isExpanded : undefined}>
        {/* Node */}
        <div
          className={`
            flex items-center gap-1 sm:gap-2 py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg mb-1 transition-all cursor-pointer
            ${isHighlighted ? 'bg-yellow-100 ring-2 ring-yellow-400 animate-pulse' : 'hover:bg-gray-50'}
            ${level === 0 ? 'bg-green-50 border border-green-200' : ''}
            focus-within:ring-2 focus-within:ring-green-400
          `}
          style={{ marginRight: `${level * 16}px` }}
        >
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <button
              onClick={(e) => { e.stopPropagation(); toggleNode(node.id); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleNode(node.id);
                }
              }}
              aria-label={isExpanded ? `طي ${node.firstName}` : `توسيع ${node.firstName}`}
              aria-expanded={isExpanded}
              className={`w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-green-400 ${
                isExpanded ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {isExpanded ? <ChevronDown size={12} className="sm:w-3.5 sm:h-3.5" /> : <ChevronRight size={12} className="sm:w-3.5 sm:h-3.5" />}
            </button>
          ) : (
            <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center shrink-0">
              <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${node.gender === 'Male' ? 'bg-blue-400' : 'bg-pink-400'}`} aria-hidden="true" />
            </div>
          )}

          {/* Avatar */}
          <div className={`
            w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold border-2
            ${node.gender === 'Male'
              ? 'bg-blue-50 border-blue-400 text-blue-600'
              : 'bg-pink-50 border-pink-400 text-pink-600'
            }
          `}>
            {node.gender === 'Male' ? '♂' : '♀'}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0" onClick={() => setSelectedMember(node)}>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-800 truncate">{node.firstName}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full text-white ${generationColors[node.generation]}`}>
                ج{node.generation}
              </span>
              {node.sonsCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded">
                  {node.sonsCount} ابن
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 truncate">
              {node.id} • {node.branch || 'الأصل'}
              {node.birthYear && ` • ${node.birthYear}`}
            </p>
          </div>

          {/* Actions */}
          <button
            onClick={() => setSelectedMember(node)}
            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
          >
            <Eye size={16} />
          </button>
        </div>

        {/* Children */}
        {isExpanded && hasChildren && (
          <div className="relative">
            {/* Vertical line */}
            <div
              className="absolute top-0 bottom-0 border-r-2 border-gray-200"
              style={{ right: `${level * 24 + 36}px` }}
            />
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Render generation view
  const renderGenerationView = () => (
    <div className="space-y-6">
      {generations.map(([gen, members]) => (
        <div key={gen} className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {/* Generation Header */}
          <div className={`${generationColors[gen]} text-white px-4 py-3 flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <Users size={20} />
              <span className="font-bold">الجيل {gen}</span>
            </div>
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
              {members.length} عضو
            </span>
          </div>

          {/* Members Grid */}
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {members.map(member => (
              <button
                key={member.id}
                onClick={() => setSelectedMember(member)}
                className={`
                  p-3 rounded-xl border-2 text-center transition-all hover:shadow-md
                  ${member.id === highlightedId ? 'border-yellow-400 bg-yellow-50' : 'border-gray-100 hover:border-gray-200'}
                  ${member.gender === 'Male' ? 'bg-blue-50/50' : 'bg-pink-50/50'}
                `}
              >
                <div className={`
                  w-12 h-12 mx-auto rounded-full flex items-center justify-center text-2xl mb-2 border-2
                  ${member.gender === 'Male'
                    ? 'bg-blue-100 border-blue-300'
                    : 'bg-pink-100 border-pink-300'
                  }
                `}>
                  {member.gender === 'Male' ? '👨' : '👩'}
                </div>
                <p className="font-bold text-sm text-gray-800 truncate">{member.firstName}</p>
                <p className="text-[10px] text-gray-500">{member.id}</p>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  // Render list view
  const renderListView = () => (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="text-right px-4 py-3 text-sm font-semibold text-gray-600">الاسم</th>
            <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600">الجيل</th>
            <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600">الجنس</th>
            <th className="text-right px-4 py-3 text-sm font-semibold text-gray-600 hidden md:table-cell">الفرع</th>
            <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600 hidden sm:table-cell">الأبناء</th>
            <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {allMembers.map(member => (
            <tr
              key={member.id}
              className={`hover:bg-gray-50 transition-colors ${member.id === highlightedId ? 'bg-yellow-50' : ''}`}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm
                    ${member.gender === 'Male' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}
                  `}>
                    {member.gender === 'Male' ? '♂' : '♀'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{member.firstName}</p>
                    <p className="text-xs text-gray-400">{member.id}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <span className={`inline-block px-2 py-1 rounded-full text-white text-xs font-bold ${generationColors[member.generation]}`}>
                  {member.generation}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className={`text-sm ${member.gender === 'Male' ? 'text-blue-600' : 'text-pink-600'}`}>
                  {member.gender === 'Male' ? 'ذكر' : 'أنثى'}
                </span>
              </td>
              <td className="px-4 py-3 text-right hidden md:table-cell">
                <span className="text-sm text-gray-600">{member.branch || '-'}</span>
              </td>
              <td className="px-4 py-3 text-center hidden sm:table-cell">
                <span className="text-sm font-medium">{member.sonsCount + member.daughtersCount}</span>
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => setSelectedMember(member)}
                  className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                >
                  <Eye size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Show loading state
  if (membersLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري تحميل شجرة العائلة...</p>
        </div>
      </div>
    );
  }

  // Main return
  return (
    <div className="min-h-screen bg-gray-100 py-4 pb-24 lg:pb-4">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center justify-center gap-2">
            <TreePine className="text-green-600" size={32} />
            شجرة عائلة آل شايع
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {allMembers.length} عضو • {generations.length} أجيال
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث عن شخص..."
                className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-200 focus:border-green-500"
              />
              {searchResults.length > 0 && (
                <div className="absolute top-full right-0 left-0 mt-1 bg-white rounded-lg shadow-lg border z-50 max-h-64 overflow-auto">
                  {searchResults.map(m => (
                    <button
                      key={m.id}
                      onClick={() => highlightMember(m.id)}
                      className="w-full px-4 py-2.5 text-right hover:bg-green-50 flex items-center gap-3 border-b last:border-0"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        m.gender === 'Male' ? 'bg-blue-100' : 'bg-pink-100'
                      }`}>
                        {m.gender === 'Male' ? '👨' : '👩'}
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-800">{m.firstName}</p>
                        <p className="text-xs text-gray-400">{m.id} • الجيل {m.generation}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('tree')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-all ${
                  viewMode === 'tree' ? 'bg-white shadow text-green-600' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <TreePine size={16} />
                <span className="hidden sm:inline">شجرة</span>
              </button>
              <button
                onClick={() => setViewMode('generations')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-all ${
                  viewMode === 'generations' ? 'bg-white shadow text-green-600' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <LayoutGrid size={16} />
                <span className="hidden sm:inline">أجيال</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-all ${
                  viewMode === 'list' ? 'bg-white shadow text-green-600' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <List size={16} />
                <span className="hidden sm:inline">قائمة</span>
              </button>
              <button
                onClick={() => setViewMode('graph')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-all ${
                  viewMode === 'graph' ? 'bg-white shadow text-green-600' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <GitBranch size={16} />
                <span className="hidden sm:inline">رسم بياني</span>
              </button>
            </div>

            {/* Expand/Collapse for Tree View */}
            {viewMode === 'tree' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={expandAll}
                  className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm"
                >
                  توسيع الكل
                </button>
                <button
                  onClick={collapseAll}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                >
                  طي الكل
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex gap-4">
          {/* Tree/Grid/List/Graph */}
          <div className={`flex-1 min-w-0 ${viewMode === 'graph' && selectedMember ? 'lg:max-w-[calc(100%-340px)]' : ''}`}>
            {viewMode === 'tree' && (
              <div className="bg-white rounded-xl shadow-sm border p-2 sm:p-4 overflow-x-auto">
                <div className="min-w-0">
                  {treeData.map(root => renderTreeNode(root))}
                </div>
              </div>
            )}
            {viewMode === 'generations' && renderGenerationView()}
            {viewMode === 'list' && renderListView()}
            {viewMode === 'graph' && (
              <FamilyTreeGraph
                members={allMembers}
                onSelectMember={setSelectedMember}
                highlightedId={highlightedId}
              />
            )}
          </div>

          {/* Member Details Sidebar */}
          {selectedMember && (
            <div className="w-80 shrink-0 bg-white rounded-xl shadow-lg border p-5 h-fit sticky top-4 hidden lg:block relative">
              <button
                onClick={() => setSelectedMember(null)}
                className="absolute top-3 left-3 p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <X size={18} />
              </button>

              {/* Avatar */}
              <div className="text-center mb-5">
                <div className={`
                  w-20 h-20 mx-auto rounded-full flex items-center justify-center text-4xl border-4
                  ${selectedMember.gender === 'Male'
                    ? 'bg-blue-50 border-blue-400'
                    : 'bg-pink-50 border-pink-400'
                  }
                `}>
                  {selectedMember.gender === 'Male' ? '👨' : '👩'}
                </div>
                <h3 className="text-xl font-bold mt-3 text-gray-800">{selectedMember.firstName}</h3>
                <p className="text-sm text-gray-500">{selectedMember.id}</p>
              </div>

              {/* Full Name */}
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <p className="text-xs text-gray-500 mb-1">الاسم الكامل</p>
                <p className="font-semibold text-gray-800">{selectedMember.fullNameAr}</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{selectedMember.generation}</p>
                  <p className="text-xs text-gray-500">الجيل</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-sm font-bold text-gray-700">{selectedMember.branch || 'الأصل'}</p>
                  <p className="text-xs text-gray-500">الفرع</p>
                </div>
              </div>

              {/* Children Count */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-blue-600">{selectedMember.sonsCount}</p>
                  <p className="text-xs text-gray-500">أبناء</p>
                </div>
                <div className="bg-pink-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-pink-600">{selectedMember.daughtersCount}</p>
                  <p className="text-xs text-gray-500">بنات</p>
                </div>
              </div>

              {/* Additional Info */}
              {(selectedMember.birthYear || selectedMember.city) && (
                <div className="border-t pt-3 mb-4 space-y-2 text-sm">
                  {selectedMember.birthYear && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">سنة الميلاد:</span>
                      <span className="font-medium">{selectedMember.birthYear}</span>
                    </div>
                  )}
                  {selectedMember.city && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">المدينة:</span>
                      <span className="font-medium">{selectedMember.city}</span>
                    </div>
                  )}
                </div>
              )}

              {/* View Profile Button */}
              <Link
                href={`/member/${selectedMember.id}`}
                className="block w-full text-center bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 px-4 rounded-lg transition-colors"
              >
                عرض الملف الكامل
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Member Modal */}
        {selectedMember && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/50 flex items-end justify-center p-4">
            <div className="bg-white rounded-t-2xl w-full max-w-lg max-h-[80vh] overflow-auto">
              <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
                <h3 className="font-bold text-lg">{selectedMember.firstName}</h3>
                <button
                  onClick={() => setSelectedMember(null)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4">
                {/* Avatar */}
                <div className="text-center mb-4">
                  <div className={`
                    w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl border-4
                    ${selectedMember.gender === 'Male'
                      ? 'bg-blue-50 border-blue-400'
                      : 'bg-pink-50 border-pink-400'
                    }
                  `}>
                    {selectedMember.gender === 'Male' ? '👨' : '👩'}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">{selectedMember.id}</p>
                </div>

                {/* Full Name */}
                <div className="bg-gray-50 rounded-lg p-3 mb-3 text-center">
                  <p className="font-semibold">{selectedMember.fullNameAr}</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  <div className="bg-green-50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-green-600">{selectedMember.generation}</p>
                    <p className="text-[10px] text-gray-500">الجيل</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-xs font-bold">{selectedMember.branch || 'الأصل'}</p>
                    <p className="text-[10px] text-gray-500">الفرع</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-blue-600">{selectedMember.sonsCount}</p>
                    <p className="text-[10px] text-gray-500">أبناء</p>
                  </div>
                  <div className="bg-pink-50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-pink-600">{selectedMember.daughtersCount}</p>
                    <p className="text-[10px] text-gray-500">بنات</p>
                  </div>
                </div>

                <Link
                  href={`/member/${selectedMember.id}`}
                  className="block w-full text-center bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg"
                >
                  عرض الملف الكامل
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Generation Legend */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">مفتاح الأجيال:</p>
          <div className="flex flex-wrap gap-2">
            {generations.map(([gen, members]) => (
              <span
                key={gen}
                className={`px-3 py-1.5 rounded-full text-white text-sm font-medium ${generationColors[gen]}`}
              >
                الجيل {gen} ({members.length})
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrap with FeatureGate to check if the family tree feature is enabled
export default function TreePage() {
  return (
    <FeatureGate feature="familyTree">
      <TreePageContent />
    </FeatureGate>
  );
}
