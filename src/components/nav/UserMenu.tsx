'use client';

import Link from 'next/link';
import { LogOut, User, Shield, Settings } from 'lucide-react';
import { ROLE_LABELS, type UserRole, type PermissionKey } from '@/lib/auth/types';

interface UserMenuUser {
  nameArabic: string;
  role: UserRole;
}

interface UserMenuProps {
  user: UserMenuUser;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onLogout: () => void;
  hasPermission: (permission: PermissionKey) => boolean;
}

export function UserMenu({
  user,
  isOpen,
  onToggle,
  onClose,
  onLogout,
  hasPermission,
}: UserMenuProps) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-green-500 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <User size={18} />
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">{user.nameArabic}</p>
          <p className="text-[10px] text-green-200">{ROLE_LABELS[user.role].ar}</p>
        </div>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={onClose}
          />
          <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-50 py-2 text-gray-700">
            <Link
              href="/profile"
              className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100"
              onClick={onClose}
            >
              <User size={16} />
              <span>الملف الشخصي</span>
            </Link>
            <Link
              href="/account/settings"
              className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100"
              onClick={onClose}
            >
              <Settings size={16} />
              <span>إعدادات الحساب</span>
            </Link>
            {hasPermission('view_users') && (
              <Link
                href="/admin"
                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100"
                onClick={onClose}
              >
                <Shield size={16} />
                <span>لوحة الإدارة</span>
              </Link>
            )}
            <hr className="my-2" />
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 w-full text-red-600"
            >
              <LogOut size={16} />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
