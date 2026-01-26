'use client';

import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';

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

  useEffect(() => {
    if (value) {
      const otpArray = value.split('').slice(0, length);
      while (otpArray.length < length) otpArray.push('');
      setOtp(otpArray);
    } else {
      setOtp(new Array(length).fill(''));
    }
  }, [value, length]);

  const handleChange = (index: number, inputValue: string) => {
    const cleanValue = inputValue.replace(/\D/g, '');
    
    if (cleanValue.length > 1) {
      const digits = cleanValue.slice(0, length).split('');
      const newOtp = [...otp];
      
      for (let i = 0; i < digits.length && index + i < length; i++) {
        newOtp[index + i] = digits[i];
      }
      
      while (newOtp.length < length) newOtp.push('');
      setOtp(newOtp);
      onChange(newOtp.join(''));
      
      const nextIndex = Math.min(index + digits.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    if (cleanValue.length === 1) {
      const newOtp = [...otp];
      newOtp[index] = cleanValue;
      setOtp(newOtp);
      onChange(newOtp.join(''));

      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    } else if (cleanValue.length === 0 && inputValue.length === 0) {
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
      onChange(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
        onChange(newOtp.join(''));
      }
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

  const handleClick = (index: number) => {
    const input = inputRefs.current[index];
    if (input) {
      input.setSelectionRange(0, input.value.length);
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-center gap-2" dir="ltr">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={6}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onClick={() => handleClick(index)}
            disabled={disabled}
            className={`w-12 h-14 text-center text-2xl font-semibold border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors ${
              disabled ? 'bg-gray-100 opacity-50 cursor-not-allowed' : 'bg-white'
            } ${error ? 'border-red-500' : 'border-gray-300'}`}
            style={{ 
              WebkitAppearance: 'none',
              MozAppearance: 'textfield',
              caretColor: 'transparent'
            }}
          />
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-red-500 text-center">{error}</p>}
    </div>
  );
}
