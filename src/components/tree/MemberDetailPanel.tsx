'use client';

import type { FamilyMember } from '@/lib/types';
import { X } from 'lucide-react';
import Link from 'next/link';
import { formatMemberId } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

// ============================================
// Props
// ============================================

interface MemberDetailPanelProps {
  member: FamilyMember;
  onClose: () => void;
}

// ============================================
// Desktop Sidebar
// ============================================

function DesktopSidebar({ member, onClose }: MemberDetailPanelProps) {
  return (
    <div className="w-80 shrink-0 bg-white rounded-xl shadow-lg border p-5 h-fit sticky top-4 hidden lg:block relative">
      <button
        onClick={onClose}
        className="absolute top-3 left-3 p-1.5 hover:bg-gray-100 rounded-lg"
      >
        <X size={18} />
      </button>

      {/* Avatar */}
      <div className="text-center mb-5">
        <div className={`
          w-20 h-20 mx-auto rounded-full overflow-hidden border-4
          ${member.gender?.toUpperCase() === 'MALE'
            ? 'border-blue-400'
            : 'border-pink-400'
          }
        `}>
          <img
            src={member.gender?.toUpperCase() === 'MALE' ? '/avatars/male-avatar.png' : '/avatars/female-avatar.png'}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <h3 className="text-xl font-bold mt-3 text-gray-800">{member.firstName}</h3>
        <p className="text-sm text-gray-500">{formatMemberId(member.id)}</p>
      </div>

      {/* Full Name */}
      <div className="bg-gray-50 rounded-lg p-3 mb-3">
        <p className="text-xs text-gray-500 mb-1">الاسم الكامل</p>
        <p className="font-semibold text-gray-800">{member.fullNameAr}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{member.generation}</p>
          <p className="text-xs text-gray-500">الجيل</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-sm font-bold text-gray-700">{member.branch || 'الأصل'}</p>
          <p className="text-xs text-gray-500">الفرع</p>
        </div>
      </div>

      {/* Children Count */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-blue-600">{member.sonsCount}</p>
          <p className="text-xs text-gray-500">أبناء</p>
        </div>
        <div className="bg-pink-50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-pink-600">{member.daughtersCount}</p>
          <p className="text-xs text-gray-500">بنات</p>
        </div>
      </div>

      {/* Additional Info */}
      {(member.birthYear || member.city) && (
        <div className="border-t pt-3 mb-4 space-y-2 text-sm">
          {member.birthYear && (
            <div className="flex justify-between">
              <span className="text-gray-500">سنة الميلاد:</span>
              <span className="font-medium">{member.birthYear}</span>
            </div>
          )}
          {member.city && (
            <div className="flex justify-between">
              <span className="text-gray-500">المدينة:</span>
              <span className="font-medium">{member.city}</span>
            </div>
          )}
        </div>
      )}

      {/* View Profile Button */}
      <Link
        href={`/member/${member.id}`}
        className="block w-full text-center bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 px-4 rounded-lg transition-colors"
      >
        عرض الملف الكامل
      </Link>
    </div>
  );
}

// ============================================
// Mobile Modal
// ============================================

function MobileModal({ member, onClose }: MemberDetailPanelProps) {
  return (
    <div className="lg:hidden fixed inset-0 z-50 bg-black/50 flex items-end justify-center p-4">
      <div className="bg-white rounded-t-2xl w-full max-w-lg max-h-[80vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h3 className="font-bold text-lg">{member.firstName}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          {/* Avatar */}
          <div className="text-center mb-4">
            <div className={`
              w-16 h-16 mx-auto rounded-full overflow-hidden border-4
              ${member.gender?.toUpperCase() === 'MALE'
                ? 'border-blue-400'
                : 'border-pink-400'
              }
            `}>
              <img
                src={member.gender?.toUpperCase() === 'MALE' ? '/avatars/male-avatar.png' : '/avatars/female-avatar.png'}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">{formatMemberId(member.id)}</p>
          </div>

          {/* Full Name */}
          <div className="bg-gray-50 rounded-lg p-3 mb-3 text-center">
            <p className="font-semibold">{member.fullNameAr}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="bg-green-50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-green-600">{member.generation}</p>
              <p className="text-[10px] text-gray-500">الجيل</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <p className="text-xs font-bold">{member.branch || 'الأصل'}</p>
              <p className="text-[10px] text-gray-500">الفرع</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-blue-600">{member.sonsCount}</p>
              <p className="text-[10px] text-gray-500">أبناء</p>
            </div>
            <div className="bg-pink-50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-pink-600">{member.daughtersCount}</p>
              <p className="text-[10px] text-gray-500">بنات</p>
            </div>
          </div>

          <Link
            href={`/member/${member.id}`}
            className="block w-full text-center bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg"
          >
            عرض الملف الكامل
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Combined Export
// ============================================

export function MemberDetailPanel({ member, onClose }: MemberDetailPanelProps) {
  return (
    <>
      <DesktopSidebar member={member} onClose={onClose} />
      <MobileModal member={member} onClose={onClose} />
    </>
  );
}
