'use client';

import type { FamilyMember } from '@/lib/types';
import type { TreeNodeData } from '@/hooks/useTreeState';
import { GENERATION_COLORS } from '@/hooks/useTreeState';
import { ChevronDown, ChevronRight, Eye } from 'lucide-react';
import { formatMemberId } from '@/lib/utils';

// ============================================
// Props
// ============================================

interface TreeViewProps {
  treeData: TreeNodeData[];
  expandedNodes: Set<string>;
  highlightedId: string | null;
  onToggleNode: (id: string) => void;
  onSelectMember: (member: FamilyMember) => void;
  getMemberById: (id: string) => FamilyMember | undefined;
}

// ============================================
// Component
// ============================================

export function TreeView({
  treeData,
  expandedNodes,
  highlightedId,
  onToggleNode,
  onSelectMember,
  getMemberById,
}: TreeViewProps) {
  const renderTreeNode = (node: TreeNodeData, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const isHighlighted = node.id === highlightedId;

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelectMember(getMemberById(node.id) || node);
      }
      if (e.key === 'ArrowRight' && hasChildren && !isExpanded) {
        e.preventDefault();
        onToggleNode(node.id);
      }
      if (e.key === 'ArrowLeft' && isExpanded) {
        e.preventDefault();
        onToggleNode(node.id);
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
              onClick={(e) => { e.stopPropagation(); onToggleNode(node.id); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleNode(node.id);
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
              <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${node.gender?.toUpperCase() === 'MALE' ? 'bg-blue-400' : 'bg-pink-400'}`} aria-hidden="true" />
            </div>
          )}

          {/* Avatar */}
          <div className={`
            w-10 h-10 rounded-full overflow-hidden border-2
            ${node.gender?.toUpperCase() === 'MALE'
              ? 'border-blue-400'
              : 'border-pink-400'
            }
          `}>
            <img
              src={node.gender?.toUpperCase() === 'MALE' ? '/avatars/male-avatar.png' : '/avatars/female-avatar.png'}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0" onClick={() => onSelectMember(node)}>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-800 truncate">{node.firstName}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full text-white ${GENERATION_COLORS[node.generation]}`}>
                ج{node.generation}
              </span>
              {node.sonsCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded">
                  {node.sonsCount} ابن
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 truncate">
              {formatMemberId(node.id)} • {node.branch || 'الأصل'}
              {node.birthYear && ` • ${node.birthYear}`}
            </p>
          </div>

          {/* Actions */}
          <button
            onClick={() => onSelectMember(node)}
            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
          >
            <Eye size={16} />
          </button>
        </div>

        {/* Children */}
        {isExpanded && hasChildren && (
          <div className="relative">
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

  return (
    <div className="bg-white rounded-xl shadow-sm border p-2 sm:p-4 overflow-x-auto">
      <div className="min-w-0">
        {treeData.map(root => renderTreeNode(root))}
      </div>
    </div>
  );
}
