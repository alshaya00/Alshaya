'use client';

import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { forwardRef, SelectHTMLAttributes, ReactNode, useId } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: ReactNode;
  fullWidth?: boolean;
}

const sizeStyles = {
  sm: 'h-9 text-sm px-3 pe-8',
  md: 'h-10 text-sm px-3 pe-9',
  lg: 'h-11 text-base px-4 pe-10',
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      options,
      placeholder,
      size = 'md',
      leftIcon,
      fullWidth = true,
      id: providedId,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;

    return (
      <div className={cn('space-y-2', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={id}
            className={cn(
              'text-sm font-medium leading-none',
              error ? 'text-destructive' : 'text-foreground'
            )}
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-muted-foreground">
              {leftIcon}
            </div>
          )}
          <select
            ref={ref}
            id={id}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={
              error ? errorId : helperText ? helperId : undefined
            }
            className={cn(
              'flex w-full rounded-md border bg-background appearance-none',
              'transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error
                ? 'border-destructive focus-visible:ring-destructive'
                : 'border-input',
              sizeStyles[size],
              leftIcon && 'ps-10',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 end-0 flex items-center pe-2.5 pointer-events-none text-muted-foreground">
            <ChevronDown size={16} />
          </div>
        </div>
        {error && (
          <p id={errorId} className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="text-sm text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
