'use client';

import Image from 'next/image';

interface GenderAvatarProps {
  gender: 'Male' | 'Female' | string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
  '2xl': 'w-24 h-24',
};

const sizePx = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
  '2xl': 96,
};

export default function GenderAvatar({ gender, size = 'md', className = '' }: GenderAvatarProps) {
  const isMale = gender?.toUpperCase() === 'MALE';
  const avatarSrc = isMale ? '/avatars/male-avatar.png' : '/avatars/female-avatar.png';
  const altText = isMale ? 'صورة ذكر' : 'صورة أنثى';
  
  return (
    <div className={`${sizeClasses[size]} rounded-full overflow-hidden ${className}`}>
      <Image
        src={avatarSrc}
        alt={altText}
        width={sizePx[size]}
        height={sizePx[size]}
        className="w-full h-full object-cover"
        priority={size === '2xl' || size === 'xl'}
      />
    </div>
  );
}

export function GenderAvatarInline({ gender, size = 'md' }: { gender: string; size?: 'xs' | 'sm' | 'md' | 'lg' }) {
  const isMale = gender?.toUpperCase() === 'MALE';
  const avatarSrc = isMale ? '/avatars/male-avatar.png' : '/avatars/female-avatar.png';
  
  return (
    <img
      src={avatarSrc}
      alt={isMale ? 'ذكر' : 'أنثى'}
      className={`${sizeClasses[size]} rounded-full object-cover inline-block`}
    />
  );
}
