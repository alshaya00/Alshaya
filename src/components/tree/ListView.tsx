'use client';

import type { FamilyMember } from '@/lib/types';
import { GENERATION_COLORS } from '@/hooks/useTreeState';
import { Eye } from 'lucide-react';
import { formatMemberId } from '@/lib/utils';

// ============================================
// Props
// ============================================

interface ListViewProps {
  members: FamilyMember[];
  highlightedId: string | null;
  onSelectMember: (member: FamilyMember) => void;
}

// ============================================
// Component
// ============================================

export function ListView({
  members,
  highlightedId,
  onSelectMember,
}: ListViewProps) {
  return (
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
          {members.map(member => (
            <tr
              key={member.id}
              className={`hover:bg-gray-50 transition-colors ${member.id === highlightedId ? 'bg-yellow-50' : ''}`}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`
                    w-8 h-8 rounded-full overflow-hidden
                    ${member.gender?.toUpperCase() === 'MALE' ? 'ring-1 ring-blue-200' : 'ring-1 ring-pink-200'}
                  `}>
                    <img
                      src={member.gender?.toUpperCase() === 'MALE' ? '/avatars/male-avatar.png' : '/avatars/female-avatar.png'}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{member.firstName}</p>
                    <p className="text-xs text-gray-400">{formatMemberId(member.id)}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <span className={`inline-block px-2 py-1 rounded-full text-white text-xs font-bold ${GENERATION_COLORS[member.generation]}`}>
                  {member.generation}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className={`text-sm ${member.gender?.toUpperCase() === 'MALE' ? 'text-blue-600' : 'text-pink-600'}`}>
                  {member.gender?.toUpperCase() === 'MALE' ? 'ذكر' : 'أنثى'}
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
                  onClick={() => onSelectMember(member)}
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
}
