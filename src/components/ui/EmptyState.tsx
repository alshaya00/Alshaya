'use client';

import React, { ReactNode } from 'react';
import Link from 'next/link';
import {
  Camera, BookOpen, Calendar, Users, Search,
  TreePine, Bell, FileText, Image, MessageCircle,
  LucideIcon
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

type EmptyStateType =
  | 'photos'
  | 'stories'
  | 'gatherings'
  | 'members'
  | 'search'
  | 'tree'
  | 'notifications'
  | 'documents'
  | 'gallery'
  | 'comments'
  | 'custom';

interface EmptyStateProps {
  type?: EmptyStateType;
  icon?: ReactNode | LucideIcon;
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  actionLabel?: string;
  actionLabelAr?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// ============================================
// PRESET CONFIGURATIONS
// ============================================

const presets: Record<Exclude<EmptyStateType, 'custom'>, {
  icon: LucideIcon;
  color: string;
  bgColor: string;
}> = {
  photos: {
    icon: Camera,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
  },
  stories: {
    icon: BookOpen,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
  },
  gatherings: {
    icon: Calendar,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
  },
  members: {
    icon: Users,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
  },
  search: {
    icon: Search,
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
  },
  tree: {
    icon: TreePine,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
  },
  notifications: {
    icon: Bell,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-50',
  },
  documents: {
    icon: FileText,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
  },
  gallery: {
    icon: Image,
    color: 'text-pink-500',
    bgColor: 'bg-pink-50',
  },
  comments: {
    icon: MessageCircle,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50',
  },
};

// ============================================
// SIZE CONFIGURATIONS
// ============================================

const sizeConfig = {
  sm: {
    container: 'py-6 px-4',
    iconWrapper: 'w-12 h-12',
    iconSize: 24,
    title: 'text-base',
    description: 'text-sm',
    button: 'px-4 py-2 text-sm',
  },
  md: {
    container: 'py-10 px-6',
    iconWrapper: 'w-16 h-16',
    iconSize: 32,
    title: 'text-lg',
    description: 'text-base',
    button: 'px-5 py-2.5 text-sm',
  },
  lg: {
    container: 'py-16 px-8',
    iconWrapper: 'w-20 h-20',
    iconSize: 40,
    title: 'text-xl',
    description: 'text-base',
    button: 'px-6 py-3 text-base',
  },
};

// ============================================
// COMPONENT
// ============================================

export function EmptyState({
  type = 'custom',
  icon,
  title,
  titleAr,
  description,
  descriptionAr,
  actionLabel,
  actionLabelAr,
  actionHref,
  onAction,
  className = '',
  size = 'md',
}: EmptyStateProps) {
  const preset = type !== 'custom' ? presets[type] : null;
  const sizes = sizeConfig[size];

  // Determine the icon to use
  const IconComponent = icon || preset?.icon || Search;
  const iconColor = preset?.color || 'text-gray-500';
  const iconBgColor = preset?.bgColor || 'bg-gray-50';

  // Render icon
  const renderIcon = () => {
    if (React.isValidElement(icon)) {
      return icon;
    }
    const Icon = IconComponent as LucideIcon;
    return <Icon size={sizes.iconSize} />;
  };

  // Render action button
  const renderAction = () => {
    if (!actionLabel && !actionLabelAr) return null;

    const buttonContent = (
      <span className="flex items-center gap-2">
        {actionLabelAr || actionLabel}
      </span>
    );

    const buttonClasses = `${sizes.button} bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 active:scale-95 transition-all shadow-sm`;

    if (actionHref) {
      return (
        <Link href={actionHref} className={buttonClasses}>
          {buttonContent}
        </Link>
      );
    }

    if (onAction) {
      return (
        <button onClick={onAction} className={buttonClasses}>
          {buttonContent}
        </button>
      );
    }

    return null;
  };

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${sizes.container} ${className}`}
      dir="rtl"
    >
      {/* Icon */}
      <div
        className={`${sizes.iconWrapper} ${iconBgColor} rounded-2xl flex items-center justify-center mb-4`}
      >
        <span className={iconColor}>{renderIcon()}</span>
      </div>

      {/* Title */}
      <h3 className={`${sizes.title} font-bold text-gray-800 mb-2`}>
        {titleAr || title}
      </h3>

      {/* Description */}
      {(description || descriptionAr) && (
        <p className={`${sizes.description} text-gray-500 max-w-sm mb-6`}>
          {descriptionAr || description}
        </p>
      )}

      {/* Action */}
      {renderAction()}
    </div>
  );
}

// ============================================
// PRESET EMPTY STATES
// ============================================

export function EmptyPhotos({ onAction, actionHref }: { onAction?: () => void; actionHref?: string }) {
  return (
    <EmptyState
      type="photos"
      title="No photos yet"
      titleAr="لا توجد صور بعد"
      description="Be the first to share a memory! Upload a photo from a gathering or a historical image."
      descriptionAr="كن أول من يشارك ذكرى! ارفع صورة من لقاء عائلي أو صورة تاريخية."
      actionLabel="Upload Photo"
      actionLabelAr="رفع صورة"
      onAction={onAction}
      actionHref={actionHref}
    />
  );
}

export function EmptyStories({ actionHref }: { actionHref?: string }) {
  return (
    <EmptyState
      type="stories"
      title="No stories yet"
      titleAr="لا توجد قصص بعد"
      description="Every family has stories worth preserving. Share a memory, an oral history, or how your branch got its name."
      descriptionAr="كل عائلة لديها قصص تستحق الحفظ. شارك ذكرى، رواية شفهية، أو قصة فرعك."
      actionLabel="Share a Story"
      actionLabelAr="شارك قصة"
      actionHref={actionHref || '/journals/new'}
    />
  );
}

export function EmptyGatherings({ actionHref }: { actionHref?: string }) {
  return (
    <EmptyState
      type="gatherings"
      title="No gatherings yet"
      titleAr="لا توجد لقاءات بعد"
      description="Family gatherings bring us together. Create an event to invite everyone!"
      descriptionAr="اللقاءات العائلية تجمعنا. أنشئ لقاءً لدعوة الجميع!"
      actionLabel="Create Gathering"
      actionLabelAr="إنشاء لقاء"
      actionHref={actionHref}
    />
  );
}

export function EmptySearchResults({ query }: { query?: string }) {
  return (
    <EmptyState
      type="search"
      title="No results found"
      titleAr="لم يتم العثور على نتائج"
      description={query
        ? `We couldn't find anything matching "${query}". Try a different search term.`
        : "Try searching for a name, ID, or location."
      }
      descriptionAr={query
        ? `لم نتمكن من العثور على نتائج لـ "${query}". جرب بحثاً مختلفاً.`
        : "جرب البحث بالاسم، الرقم التعريفي، أو الموقع."
      }
    />
  );
}

export function EmptyNotifications() {
  return (
    <EmptyState
      type="notifications"
      title="No notifications"
      titleAr="لا توجد إشعارات"
      description="You're all caught up! We'll notify you when something happens."
      descriptionAr="أنت على اطلاع بكل شيء! سنخبرك عندما يحدث شيء جديد."
      size="sm"
    />
  );
}

export function EmptyMembers() {
  return (
    <EmptyState
      type="members"
      title="No members found"
      titleAr="لم يتم العثور على أفراد"
      description="Try adjusting your filters to see more family members."
      descriptionAr="جرب تعديل الفلاتر لرؤية المزيد من أفراد العائلة."
    />
  );
}
