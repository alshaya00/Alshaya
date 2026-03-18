import { cn } from '@/lib/utils';
import { HTMLAttributes, forwardRef } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles: Record<string, string> = {
  default: 'bg-primary text-primary-foreground border-transparent',
  secondary: 'bg-secondary text-secondary-foreground border-transparent',
  destructive: 'bg-destructive text-destructive-foreground border-transparent',
  outline: 'text-foreground border-border bg-transparent',
  success: 'bg-emerald-100 text-emerald-800 border-transparent dark:bg-emerald-900/30 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-800 border-transparent dark:bg-amber-900/30 dark:text-amber-300',
  info: 'bg-blue-100 text-blue-800 border-transparent dark:bg-blue-900/30 dark:text-blue-300',
};

const sizeStyles: Record<string, string> = {
  sm: 'px-2 py-0.5 text-2xs',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
};

export const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        'transition-colors',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    />
  )
);

Badge.displayName = 'Badge';
