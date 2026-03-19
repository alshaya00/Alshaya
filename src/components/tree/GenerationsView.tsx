'use client';

import type { FamilyMember } from '@/lib/types';
import { GENERATION_COLORS } from '@/hooks/useTreeState';
import { Users } from 'lucide-react';
import { formatMemberId } from '@/lib/utils';

// ============================================
// Props
// ============================================

interface GenerationsViewProps {
  generations: [number, FamilyMember[]][];
  highlightedId: string | null;
  onSelectMember: (member: FamilyMember) => void;
}

// ============================================
// Component
// ============================================

export function GenerationsView({
  generations,
  highlightedId,
  onSelectMember,
}: GenerationsViewProps) {
  return (
    <div className="space-y-6">
      {generations.map(([gen, members]) => (
        <div key={gen} className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {/* Generation Header */}
          <div className={`${GENERATION_COLORS[gen]} text-white px-4 py-3 flex items-center justify-between`}>
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
                onClick={() => onSelectMember(member)}
                className={`
                  p-3 rounded-xl border-2 text-center transition-all hover:shadow-md
                  ${member.id === highlightedId ? 'border-yellow-400 bg-yellow-50' : 'border-gray-100 hover:border-gray-200'}
                  ${member.gender?.toUpperCase() === 'MALE' ? 'bg-blue-50/50' : 'bg-pink-50/50'}
                `}
              >
                <div className={`
                  w-12 h-12 mx-auto rounded-full overflow-hidden mb-2 border-2
                  ${member.gender?.toUpperCase() === 'MALE'
                    ? 'border-blue-300'
                    : 'border-pink-300'
                  }
                `}>
                  <img
                    src={member.gender?.toUpperCase() === 'MALE' ? '/avatars/male-avatar.png' : '/avatars/female-avatar.png'}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="font-bold text-sm text-gray-800 truncate">{member.firstName}</p>
                <p className="text-[10px] text-gray-500">{formatMemberId(member.id)}</p>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
