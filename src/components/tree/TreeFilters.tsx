'use client';

import type { FamilyMember } from '@/lib/types';
import type { ViewMode } from '@/hooks/useTreeState';
import { GENERATION_COLORS } from '@/hooks/useTreeState';
import {
  Search, TreePine, LayoutGrid, List, GitBranch,
} from 'lucide-react';
import { formatMemberId } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

// ============================================
// Props
// ============================================

interface TreeFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  searchResults: FamilyMember[];
  onHighlightMember: (id: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

// ============================================
// Component
// ============================================

export function TreeFilters({
  searchTerm,
  onSearchChange,
  searchResults,
  onHighlightMember,
  viewMode,
  onViewModeChange,
  onExpandAll,
  onCollapseAll,
}: TreeFiltersProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-4 mb-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ابحث عن شخص..."
            className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-200 focus:border-green-500"
          />
          {searchResults.length > 0 && (
            <div className="absolute top-full right-0 left-0 mt-1 bg-white rounded-lg shadow-lg border z-50 max-h-64 overflow-auto">
              {searchResults.map(m => (
                <button
                  key={m.id}
                  onClick={() => onHighlightMember(m.id)}
                  className="w-full px-4 py-2.5 text-right hover:bg-green-50 flex items-center gap-3 border-b last:border-0"
                >
                  <div className={`w-8 h-8 rounded-full overflow-hidden ${
                    m.gender?.toUpperCase() === 'MALE' ? 'ring-1 ring-blue-200' : 'ring-1 ring-pink-200'
                  }`}>
                    <img
                      src={m.gender?.toUpperCase() === 'MALE' ? '/avatars/male-avatar.png' : '/avatars/female-avatar.png'}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-800">{m.fullNameAr || m.firstName}</p>
                    <p className="text-xs text-gray-400">
                      {formatMemberId(m.id)} • الجيل {m.generation} {m.branch ? `• ${m.branch}` : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          {([
            { mode: 'tree' as ViewMode, icon: TreePine, label: 'شجرة' },
            { mode: 'generations' as ViewMode, icon: LayoutGrid, label: 'أجيال' },
            { mode: 'list' as ViewMode, icon: List, label: 'قائمة' },
            { mode: 'graph' as ViewMode, icon: GitBranch, label: 'رسم بياني' },
          ] as const).map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-all ${
                viewMode === mode ? 'bg-white shadow text-green-600' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Expand/Collapse for Tree View */}
        {viewMode === 'tree' && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onExpandAll} className="bg-green-100 text-green-700 hover:bg-green-200">
              توسيع الكل
            </Button>
            <Button variant="ghost" size="sm" onClick={onCollapseAll} className="bg-gray-100 text-gray-700 hover:bg-gray-200">
              طي الكل
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
