'use client';

import { useState, useEffect, useCallback } from 'react';
import { extractLocalNumber, buildSaudiPhone, formatPhoneDisplay } from '@/lib/phone-utils';

interface SaudiPhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  id?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}

export default function SaudiPhoneInput({
  value,
  onChange,
  name = 'phone',
  id,
  placeholder = '5X XXX XXXX',
  className = '',
  disabled = false,
  required = false,
  error,
}: SaudiPhoneInputProps) {
  // Extract local number from value for display
  const [localNumber, setLocalNumber] = useState('');

  useEffect(() => {
    // Initialize from value prop
    if (value) {
      const local = extractLocalNumber(value);
      setLocalNumber(local);
    } else {
      setLocalNumber('');
    }
  }, [value]);

  const formatLocalNumber = (input: string): string => {
    // Remove non-digits
    const digits = input.replace(/\D/g, '');
    
    // Limit to 9 digits
    const limited = digits.slice(0, 9);
    
    // Format as 5X XXX XXXX
    if (limited.length <= 2) return limited;
    if (limited.length <= 5) return `${limited.slice(0, 2)} ${limited.slice(2)}`;
    return `${limited.slice(0, 2)} ${limited.slice(2, 5)} ${limited.slice(5)}`;
  };

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // Remove formatting for processing
    const digits = input.replace(/\D/g, '');
    
    // Limit to 9 digits
    const limited = digits.slice(0, 9);
    
    // Update local display
    setLocalNumber(limited);
    
    // Build full phone number and notify parent
    if (limited.length === 9 && limited.startsWith('5')) {
      const fullPhone = buildSaudiPhone(limited);
      onChange(fullPhone || '');
    } else if (limited.length === 0) {
      onChange('');
    } else {
      // Partial input - store as-is for now
      onChange(limited);
    }
  }, [onChange]);

  const isValid = localNumber.length === 0 || (localNumber.length === 9 && localNumber.startsWith('5'));
  const hasError = error || (localNumber.length > 0 && localNumber.length === 9 && !localNumber.startsWith('5'));

  return (
    <div className="relative">
      <div className={`flex items-center border rounded-xl overflow-hidden ${
        hasError ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-500'
      } ${disabled ? 'bg-gray-100' : 'bg-white'}`}>
        <span className="px-3 py-3 bg-gray-50 text-gray-600 font-medium border-l select-none" dir="ltr">
          +966
        </span>
        <input
          type="tel"
          name={name}
          id={id || name}
          value={formatLocalNumber(localNumber)}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          dir="ltr"
          className={`flex-1 px-3 py-3 outline-none text-left ${className}`}
          maxLength={11} // 9 digits + 2 spaces
          autoComplete="tel-local"
        />
      </div>
      {hasError && (
        <p className="text-red-500 text-xs mt-1">
          {error || 'رقم الهاتف يجب أن يبدأ بـ 5'}
        </p>
      )}
      {localNumber.length > 0 && localNumber.length < 9 && (
        <p className="text-gray-400 text-xs mt-1">
          {9 - localNumber.length} أرقام متبقية
        </p>
      )}
    </div>
  );
}
