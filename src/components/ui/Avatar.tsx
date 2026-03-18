import { cn } from '@/lib/utils';
import { forwardRef, HTMLAttributes, ImgHTMLAttributes, useState } from 'react';

/* ============================================
   Avatar
   ============================================ */
export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const sizeStyles: Record<string, string> = {
  xs: 'h-6 w-6 text-2xs',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size = 'md', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative flex shrink-0 overflow-hidden rounded-full',
        sizeStyles[size],
        className
      )}
      {...props}
    />
  )
);
Avatar.displayName = 'Avatar';

/* ============================================
   AvatarImage
   ============================================ */
export interface AvatarImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  onLoadingStatusChange?: (status: 'loading' | 'loaded' | 'error') => void;
}

export const AvatarImage = forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, src, alt, onLoadingStatusChange, ...props }, ref) => {
    const [hasError, setHasError] = useState(false);

    if (!src || hasError) return null;

    return (
      <img
        ref={ref}
        src={src}
        alt={alt || ''}
        className={cn('aspect-square h-full w-full object-cover', className)}
        onError={() => {
          setHasError(true);
          onLoadingStatusChange?.('error');
        }}
        onLoad={() => onLoadingStatusChange?.('loaded')}
        {...props}
      />
    );
  }
);
AvatarImage.displayName = 'AvatarImage';

/* ============================================
   AvatarFallback
   ============================================ */
export interface AvatarFallbackProps extends HTMLAttributes<HTMLDivElement> {}

export const AvatarFallback = forwardRef<HTMLDivElement, AvatarFallbackProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full',
        'bg-muted text-muted-foreground font-medium',
        className
      )}
      {...props}
    />
  )
);
AvatarFallback.displayName = 'AvatarFallback';

/* ============================================
   Helper: get initials from a name
   ============================================ */
export function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
