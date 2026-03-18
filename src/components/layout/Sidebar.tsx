'use client';

import { cn } from '@/lib/utils';
import { PanelLeftClose, PanelLeft } from 'lucide-react';
import { ReactNode, forwardRef, HTMLAttributes, createContext, useContext, useState } from 'react';

/* ============================================
   Context
   ============================================ */
interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => {},
  toggle: () => {},
});

export function useSidebar() {
  return useContext(SidebarContext);
}

/* ============================================
   SidebarProvider
   ============================================ */
export interface SidebarProviderProps {
  children: ReactNode;
  defaultCollapsed?: boolean;
}

export function SidebarProvider({ children, defaultCollapsed = false }: SidebarProviderProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const toggle = () => setCollapsed((prev) => !prev);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

/* ============================================
   Sidebar
   ============================================ */
export interface SidebarProps extends HTMLAttributes<HTMLElement> {
  position?: 'start' | 'end';
}

export const Sidebar = forwardRef<HTMLElement, SidebarProps>(
  ({ className, position = 'start', children, ...props }, ref) => {
    const { collapsed } = useSidebar();

    return (
      <aside
        ref={ref}
        className={cn(
          'flex flex-col h-full bg-background border-border',
          'transition-all duration-300 ease-in-out',
          position === 'start' ? 'border-e' : 'border-s',
          collapsed ? 'w-16' : 'w-64',
          className
        )}
        {...props}
      >
        {children}
      </aside>
    );
  }
);
Sidebar.displayName = 'Sidebar';

/* ============================================
   SidebarHeader
   ============================================ */
export const SidebarHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { collapsed } = useSidebar();
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center gap-2 p-4 border-b border-border',
          collapsed && 'justify-center px-2',
          className
        )}
        {...props}
      />
    );
  }
);
SidebarHeader.displayName = 'SidebarHeader';

/* ============================================
   SidebarContent
   ============================================ */
export const SidebarContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex-1 overflow-y-auto p-2', className)}
      {...props}
    />
  )
);
SidebarContent.displayName = 'SidebarContent';

/* ============================================
   SidebarGroup
   ============================================ */
export interface SidebarGroupProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
}

export const SidebarGroup = forwardRef<HTMLDivElement, SidebarGroupProps>(
  ({ className, label, children, ...props }, ref) => {
    const { collapsed } = useSidebar();
    return (
      <div ref={ref} className={cn('mb-2', className)} {...props}>
        {label && !collapsed && (
          <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
        )}
        <div className="space-y-0.5">{children}</div>
      </div>
    );
  }
);
SidebarGroup.displayName = 'SidebarGroup';

/* ============================================
   SidebarItem
   ============================================ */
export interface SidebarItemProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  active?: boolean;
  badge?: string | number;
}

export const SidebarItem = forwardRef<HTMLDivElement, SidebarItemProps>(
  ({ className, icon, active, badge, children, ...props }, ref) => {
    const { collapsed } = useSidebar();

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
          'cursor-pointer transition-colors',
          active
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          collapsed && 'justify-center px-2',
          className
        )}
        {...props}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        {!collapsed && <span className="flex-1 truncate">{children}</span>}
        {!collapsed && badge !== undefined && (
          <span className="ms-auto text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">
            {badge}
          </span>
        )}
      </div>
    );
  }
);
SidebarItem.displayName = 'SidebarItem';

/* ============================================
   SidebarFooter
   ============================================ */
export const SidebarFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('border-t border-border p-2', className)}
      {...props}
    />
  )
);
SidebarFooter.displayName = 'SidebarFooter';

/* ============================================
   SidebarToggle
   ============================================ */
export interface SidebarToggleProps {
  className?: string;
}

export function SidebarToggle({ className }: SidebarToggleProps) {
  const { collapsed, toggle } = useSidebar();

  return (
    <button
      onClick={toggle}
      className={cn(
        'inline-flex items-center justify-center rounded-md',
        'h-9 w-9',
        'text-muted-foreground hover:text-foreground',
        'hover:bg-accent transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      {collapsed ? (
        <PanelLeft size={18} aria-hidden="true" />
      ) : (
        <PanelLeftClose size={18} aria-hidden="true" />
      )}
    </button>
  );
}
