'use client';

import { TreePine } from 'lucide-react';
import FamilyTreeGraph from '@/components/FamilyTreeGraph';
import { FeatureGate } from '@/components/FeatureGate';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

import { useTreeState, GENERATION_COLORS } from '@/hooks/useTreeState';
import { TreeFilters } from '@/components/tree/TreeFilters';
import { TreeView } from '@/components/tree/TreeView';
import { GenerationsView } from '@/components/tree/GenerationsView';
import { ListView } from '@/components/tree/ListView';
import { MemberDetailPanel } from '@/components/tree/MemberDetailPanel';

// ============================================
// Main Content
// ============================================

function TreePageContent() {
  const {
    viewMode,
    expandedNodes,
    selectedMember,
    searchTerm,
    highlightedId,
    allMembers,
    isLoading,
    treeData,
    generations,
    searchResults,
    setViewMode,
    setSelectedMember,
    setSearchTerm,
    toggleNode,
    expandAll,
    collapseAll,
    highlightMember,
    getMemberById,
  } = useTreeState();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <TreePine className="mx-auto text-green-600 animate-pulse" size={48} />
          <p className="mt-4 text-gray-500">جاري تحميل الشجرة...</p>
        </div>
      </div>
    );
  }

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

        {/* Filters / Controls */}
        <TreeFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchResults={searchResults}
          onHighlightMember={highlightMember}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onExpandAll={expandAll}
          onCollapseAll={collapseAll}
        />

        {/* Main Content Area */}
        <div className="flex gap-4">
          {/* View */}
          <div className={`flex-1 min-w-0 ${viewMode === 'graph' && selectedMember ? 'lg:max-w-[calc(100%-340px)]' : ''}`}>
            {viewMode === 'tree' && (
              <TreeView
                treeData={treeData}
                expandedNodes={expandedNodes}
                highlightedId={highlightedId}
                onToggleNode={toggleNode}
                onSelectMember={setSelectedMember}
                getMemberById={getMemberById}
              />
            )}
            {viewMode === 'generations' && (
              <GenerationsView
                generations={generations}
                highlightedId={highlightedId}
                onSelectMember={setSelectedMember}
              />
            )}
            {viewMode === 'list' && (
              <ListView
                members={allMembers}
                highlightedId={highlightedId}
                onSelectMember={setSelectedMember}
              />
            )}
            {viewMode === 'graph' && (
              <FamilyTreeGraph
                members={allMembers}
                onSelectMember={setSelectedMember}
                highlightedId={highlightedId}
              />
            )}
          </div>

          {/* Member Detail Sidebar (desktop) */}
          {selectedMember && (
            <MemberDetailPanel
              member={selectedMember}
              onClose={() => setSelectedMember(null)}
            />
          )}
        </div>

        {/* Generation Legend */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">مفتاح الأجيال:</p>
          <div className="flex flex-wrap gap-2">
            {generations.map(([gen, members]) => (
              <span
                key={gen}
                className={`px-3 py-1.5 rounded-full text-white text-sm font-medium ${GENERATION_COLORS[gen]}`}
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

// ============================================
// Page Export (with auth + feature gate)
// ============================================

export default function TreePage() {
  return (
    <ProtectedRoute redirectTo="/login">
      <FeatureGate feature="familyTree">
        <TreePageContent />
      </FeatureGate>
    </ProtectedRoute>
  );
}
