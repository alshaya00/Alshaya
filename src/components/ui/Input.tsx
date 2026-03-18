'use client';

import { cn } from '@/lib/utils';
import { forwardRef, InputHTMLAttributes, ReactNode, useId } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
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
              'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
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
          <input
            ref={ref}
            id={id}
            type={type}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={
              error ? errorId : helperText ? helperId : undefined
            }
            className={cn(
              'flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm',
              'file:border-0 file:bg-transparent file:text-sm file:font-medium',
              'placeholder:text-muted-foreground',
              'transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error
                ? 'border-destructive focus-visible:ring-destructive'
                : 'border-input',
              leftIcon && 'ps-10',
              rightIcon && 'pe-10',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 end-0 flex items-center pe-3 pointer-events-none text-muted-foreground">
              {rightIcon}
            </div>
          )}
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

Input.displayName = 'Input';
