'use client';

import { cn } from '@/lib/utils';
import {
  createContext,
  forwardRef,
  HTMLAttributes,
  ReactNode,
  useContext,
  useState,
} from 'react';

/* ============================================
   Context
   ============================================ */
interface TabsContextType {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | null>(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs components must be used within <Tabs>');
  return ctx;
}

/* ============================================
   Tabs Root
   ============================================ */
export interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

export function Tabs({
  defaultValue = '',
  value: controlledValue,
  onValueChange: controlledOnChange,
  className,
  children,
  ...props
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const onValueChange = controlledOnChange || setInternalValue;

  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn('w-full', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

/* ============================================
   TabsList
   ============================================ */
export const TabsList = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="tablist"
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-md',
        'bg-muted p-1 text-muted-foreground',
        className
      )}
      {...props}
    />
  )
);
TabsList.displayName = 'TabsList';

/* ============================================
   TabsTrigger
   ============================================ */
export interface TabsTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  value: string;
  disabled?: boolean;
}

export const TabsTrigger = forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, disabled, ...props }, ref) => {
    const { value: selectedValue, onValueChange } = useTabsContext();
    const isSelected = selectedValue === value;

    return (
      <button
        ref={ref}
        role="tab"
        type="button"
        aria-selected={isSelected}
        aria-controls={`tabpanel-${value}`}
        disabled={disabled}
        onClick={() => onValueChange(value)}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-sm',
          'px-3 py-1.5 text-sm font-medium',
          'ring-offset-background transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          isSelected
            ? 'bg-background text-foreground shadow-sm'
            : 'hover:bg-background/50 hover:text-foreground',
          className
        )}
        {...props}
      />
    );
  }
);
TabsTrigger.displayName = 'TabsTrigger';

/* ============================================
   TabsContent
   ============================================ */
export interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const TabsContent = forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, ...props }, ref) => {
    const { value: selectedValue } = useTabsContext();
    if (selectedValue !== value) return null;

    return (
      <div
        ref={ref}
        role="tabpanel"
        id={`tabpanel-${value}`}
        className={cn(
          'mt-2 ring-offset-background',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'animate-fade-in',
          className
        )}
        tabIndex={0}
        {...props}
      />
    );
  }
);
TabsContent.displayName = 'TabsContent';
