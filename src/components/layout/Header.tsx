'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { Moon, Sun, Globe } from 'lucide-react';

/* ============================================
   ThemeToggle
   ============================================ */
export interface ThemeToggleProps {
  theme: 'light' | 'dark';
  onToggle: () => void;
  className?: string;
}

export function ThemeToggle({ theme, onToggle, className }: ThemeToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'inline-flex items-center justify-center rounded-md',
        'h-9 w-9',
        'text-muted-foreground hover:text-foreground',
        'hover:bg-accent',
        'transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {theme === 'light' ? (
        <Moon size={18} aria-hidden="true" />
      ) : (
        <Sun size={18} aria-hidden="true" />
      )}
    </button>
  );
}

/* ============================================
   LanguageToggle
   ============================================ */
export interface LanguageToggleProps {
  locale: 'ar' | 'en';
  onToggle: () => void;
  className?: string;
}

export function LanguageToggle({ locale, onToggle, className }: LanguageToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md',
        'h-9 px-3 text-sm font-medium',
        'text-muted-foreground hover:text-foreground',
        'hover:bg-accent',
        'transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
      aria-label={locale === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
    >
      <Globe size={16} aria-hidden="true" />
      <span>{locale === 'ar' ? 'EN' : 'عربي'}</span>
    </button>
  );
}

/* ============================================
   Header
   ============================================ */
export interface HeaderProps {
  children?: ReactNode;
  className?: string;
  sticky?: boolean;
  bordered?: boolean;
}

export function Header({
  children,
  className,
  sticky = true,
  bordered = true,
}: HeaderProps) {
  return (
    <header
      className={cn(
        'flex h-14 items-center gap-4 px-4 lg:px-6',
        'bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        sticky && 'sticky top-0 z-40',
        bordered && 'border-b border-border',
        className
      )}
    >
      {children}
    </header>
  );
}

/* ============================================
   HeaderTitle
   ============================================ */
export interface HeaderTitleProps {
  children: ReactNode;
  className?: string;
}

export function HeaderTitle({ children, className }: HeaderTitleProps) {
  return (
    <div className={cn('flex-1 flex items-center gap-2', className)}>
      {children}
    </div>
  );
}

/* ============================================
   HeaderActions
   ============================================ */
export interface HeaderActionsProps {
  children: ReactNode;
  className?: string;
}

export function HeaderActions({ children, className }: HeaderActionsProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {children}
    </div>
  );
}
