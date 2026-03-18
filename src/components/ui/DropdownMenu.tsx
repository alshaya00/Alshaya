'use client';

import { cn } from '@/lib/utils';
import { forwardRef, HTMLAttributes, ReactNode, useCallback, useEffect, useRef, useState } from 'react';

/* ============================================
   DropdownMenu Root
   ============================================ */
export interface DropdownMenuProps {
  children: ReactNode;
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  return <div className="relative inline-block">{children}</div>;
}

/* ============================================
   DropdownMenuTrigger
   ============================================ */
export interface DropdownMenuTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const DropdownMenuTrigger = forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
  ({ className, onClick, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn('inline-flex items-center', className)}
      {...props}
    >
      {children}
    </button>
  )
);
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

/* ============================================
   DropdownMenuContent
   ============================================ */
export interface DropdownMenuContentProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose: () => void;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom';
  sideOffset?: number;
}

export const DropdownMenuContent = forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ className, open, onClose, align = 'end', side = 'bottom', children, ...props }, ref) => {
    const contentRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
      if (!open) return;
      const handler = (e: MouseEvent) => {
        const el = contentRef.current;
        if (el && !el.contains(e.target as Node)) {
          onClose();
        }
      };
      // Delay to prevent immediate close
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handler);
      }, 0);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handler);
      };
    }, [open, onClose]);

    // Close on Escape
    useEffect(() => {
      if (!open) return;
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handler);
      return () => document.removeEventListener('keydown', handler);
    }, [open, onClose]);

    if (!open) return null;

    return (
      <div
        ref={(node) => {
          (contentRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        className={cn(
          'absolute z-50 min-w-[8rem] overflow-hidden',
          'rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md',
          'animate-scale-in',
          side === 'bottom' ? 'top-full mt-1' : 'bottom-full mb-1',
          align === 'start' && 'start-0',
          align === 'center' && 'start-1/2 -translate-x-1/2',
          align === 'end' && 'end-0',
          className
        )}
        role="menu"
        {...props}
      >
        {children}
      </div>
    );
  }
);
DropdownMenuContent.displayName = 'DropdownMenuContent';

/* ============================================
   DropdownMenuItem
   ============================================ */
export interface DropdownMenuItemProps extends HTMLAttributes<HTMLDivElement> {
  disabled?: boolean;
  destructive?: boolean;
}

export const DropdownMenuItem = forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  ({ className, disabled, destructive, ...props }, ref) => (
    <div
      ref={ref}
      role="menuitem"
      tabIndex={disabled ? -1 : 0}
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
        'transition-colors',
        'focus:bg-accent focus:text-accent-foreground',
        'hover:bg-accent hover:text-accent-foreground',
        disabled && 'pointer-events-none opacity-50',
        destructive && 'text-destructive focus:text-destructive hover:text-destructive',
        className
      )}
      {...props}
    />
  )
);
DropdownMenuItem.displayName = 'DropdownMenuItem';

/* ============================================
   DropdownMenuSeparator
   ============================================ */
export const DropdownMenuSeparator = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('-mx-1 my-1 h-px bg-border', className)}
      role="separator"
      {...props}
    />
  )
);
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';

/* ============================================
   DropdownMenuLabel
   ============================================ */
export const DropdownMenuLabel = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-2 py-1.5 text-sm font-semibold', className)}
      {...props}
    />
  )
);
DropdownMenuLabel.displayName = 'DropdownMenuLabel';
