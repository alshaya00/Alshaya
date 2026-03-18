import { cn } from '@/lib/utils';
import { HTMLAttributes } from 'react';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'circular' | 'text';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className,
  variant = 'default',
  width,
  height,
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-muted animate-pulse',
        variant === 'circular' && 'rounded-full',
        variant === 'text' && 'rounded h-4',
        variant === 'default' && 'rounded-md',
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  );
}

/* ============================================
   Skeleton presets for common patterns
   ============================================ */

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border border-border p-6 space-y-4', className)}>
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="space-y-2 flex-1">
          <Skeleton variant="text" className="w-1/3" />
          <Skeleton variant="text" className="w-1/2" />
        </div>
      </div>
      <Skeleton variant="text" className="w-full" />
      <Skeleton variant="text" className="w-4/5" />
      <Skeleton variant="text" className="w-3/5" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="text" className="flex-1 h-6" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {[1, 2, 3, 4].map((j) => (
            <Skeleton key={j} variant="text" className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = { sm: 32, md: 40, lg: 48 };
  return <Skeleton variant="circular" width={sizeMap[size]} height={sizeMap[size]} />;
}
