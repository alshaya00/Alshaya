'use client';

import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent, ChangeEvent } from 'react';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

export default function OtpInput({
  length = 6,
  value,
  onChange,
  disabled = false,
  error
}: OtpInputProps) {
  const [otp, setOtp] = useState<string[]>(new Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (value) {
      const otpArray = value.split('').slice(0, length);
      while (otpArray.length < length) otpArray.push('');
      setOtp(otpArray);
    } else {
      setOtp(new Array(length).fill(''));
    }
  }, [value, length]);

  // Handle iOS Security Code AutoFill via hidden input
  const handleHiddenInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value.replace(/\D/g, '').slice(0, length);
    if (inputValue.length > 0) {
      const newOtp = inputValue.split('');
      while (newOtp.length < length) newOtp.push('');
      setOtp(newOtp);
      onChange(newOtp.join(''));
      
      // Focus the appropriate visible input
      const focusIndex = Math.min(inputValue.length, length - 1);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  const handleChange = (index: number, digit: string) => {
    // Handle case where iOS autofill puts full code in first box
    if (digit.length > 1) {
      const cleanDigits = digit.replace(/\D/g, '').slice(0, length);
      if (cleanDigits.length > 1) {
        const newOtp = cleanDigits.split('');
        while (newOtp.length < length) newOtp.push('');
        setOtp(newOtp);
        onChange(newOtp.join(''));
        const focusIndex = Math.min(cleanDigits.length, length - 1);
        inputRefs.current[focusIndex]?.focus();
        return;
      }
    }

    if (!/^\d*$/.test(digit)) return;

    const newOtp = [...otp];
    newOtp[index] = digit.slice(-1);
    setOtp(newOtp);
    onChange(newOtp.join(''));

    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    
    if (pastedData) {
      const newOtp = pastedData.split('');
      while (newOtp.length < length) newOtp.push('');
      setOtp(newOtp);
      onChange(newOtp.join(''));
      
      const nextEmptyIndex = Math.min(pastedData.length, length - 1);
      inputRefs.current[nextEmptyIndex]?.focus();
    }
  };

  // Focus handler for visible inputs - also focus hidden input for iOS
  const handleFocus = () => {
    // On iOS, focusing the hidden input helps trigger autofill suggestion
    if (hiddenInputRef.current && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      hiddenInputRef.current.focus();
      // Quickly refocus to visible input
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 50);
    }
  };

  return (
    <div className="w-full">
      {/* Hidden input for iOS Security Code AutoFill */}
      <input
        ref={hiddenInputRef}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        name="otp-autofill"
        value={otp.join('')}
        onChange={handleHiddenInputChange}
        disabled={disabled}
        className="absolute opacity-0 w-0 h-0 pointer-events-none"
        aria-hidden="true"
        tabIndex={-1}
      />
      
      <div className="flex justify-center gap-2" dir="ltr">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={index === 0 ? length : 1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={index === 0 ? handleFocus : undefined}
            disabled={disabled}
            className={`w-12 h-14 text-center text-2xl font-semibold border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
              disabled ? 'bg-gray-100 opacity-50 cursor-not-allowed' : 'bg-white'
            } ${error ? 'border-red-500' : 'border-gray-300'}`}
          />
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-red-500 text-center">{error}</p>}
    </div>
  );
}
