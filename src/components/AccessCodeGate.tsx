'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Lock, Eye, EyeOff, LogOut, Key, Shield, AlertCircle } from 'lucide-react';

// Access code configuration
const ACCESS_CODE = 'alshaye2024'; // This should be moved to env in production
const STORAGE_KEY = 'alshaye_access_granted';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface AccessContextType {
  isAuthenticated: boolean;
  login: (code: string) => boolean;
  logout: () => void;
}

const AccessContext = createContext<AccessContextType>({
  isAuthenticated: false,
  login: () => false,
  logout: () => {},
});

export function useAccess() {
  return useContext(AccessContext);
}

export function AccessProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if already authenticated
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const { timestamp } = JSON.parse(stored);
        if (Date.now() - timestamp < SESSION_DURATION) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = (code: string): boolean => {
    if (code === ACCESS_CODE) {
      setIsAuthenticated(true);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ timestamp: Date.now() })
      );
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-gray-500">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <AccessContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AccessContext.Provider>
  );
}

export function AccessGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, login } = useAccess();
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);

  if (isAuthenticated) {
    return <>{children}</>;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(code)) {
      setError(false);
    } else {
      setError(true);
      setAttempts((prev) => prev + 1);
      setTimeout(() => setError(false), 3000);
    }
  };

  const isLocked = attempts >= 5;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 via-white to-green-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-full mb-4 shadow-xl">
            <span className="text-5xl">🌳</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">شجرة آل شايع</h1>
          <p className="text-gray-500 mt-2">Al-Shaye Family Tree</p>
        </div>

        {/* Access Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-l from-green-600 to-green-700 p-6 text-white text-center">
            <Shield className="mx-auto mb-3" size={40} />
            <h2 className="text-xl font-bold">منطقة خاصة بالعائلة</h2>
            <p className="text-green-100 text-sm mt-1">
              يرجى إدخال رمز الدخول للوصول إلى شجرة العائلة
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {isLocked ? (
              <div className="text-center py-8">
                <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
                <h3 className="text-lg font-bold text-red-600">تم تجاوز عدد المحاولات</h3>
                <p className="text-gray-500 text-sm mt-2">
                  يرجى التواصل مع مسؤول العائلة للحصول على رمز الدخول
                </p>
              </div>
            ) : (
              <>
                {/* Code Input */}
                <div>
                  <label className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                    <Key size={18} />
                    رمز الدخول / Access Code
                  </label>
                  <div className="relative">
                    <input
                      type={showCode ? 'text' : 'password'}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="أدخل رمز الدخول..."
                      className={`w-full px-4 py-3 pl-12 border-2 rounded-xl text-lg text-center tracking-widest transition-all ${
                        error
                          ? 'border-red-400 bg-red-50 shake'
                          : 'border-gray-200 focus:border-green-500 focus:bg-green-50'
                      } focus:outline-none`}
                      autoComplete="off"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCode(!showCode)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCode ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                    <AlertCircle size={16} />
                    <span>رمز الدخول غير صحيح - حاول مرة أخرى</span>
                  </div>
                )}

                {/* Attempts Warning */}
                {attempts > 0 && attempts < 5 && (
                  <p className="text-center text-sm text-orange-500">
                    المحاولات المتبقية: {5 - attempts}
                  </p>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!code.trim()}
                  className="w-full py-3 bg-gradient-to-l from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Lock size={20} />
                  دخول / Enter
                </button>
              </>
            )}
          </form>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
            <p className="text-center text-sm text-gray-400">
              للحصول على رمز الدخول، تواصل مع أحد أفراد العائلة
            </p>
          </div>
        </div>

        {/* Info */}
        <p className="text-center text-sm text-gray-400 mt-6">
          هذه الشجرة خاصة بعائلة آل شايع فقط
        </p>
      </div>

      {/* Add shake animation style */}
      <style jsx>{`
        .shake {
          animation: shake 0.5s ease-in-out;
        }

        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-10px);
          }
          75% {
            transform: translateX(10px);
          }
        }
      `}</style>
    </div>
  );
}

// Logout Button Component
export function LogoutButton({ className = '' }: { className?: string }) {
  const { logout, isAuthenticated } = useAccess();

  if (!isAuthenticated) return null;

  return (
    <button
      onClick={logout}
      className={`flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all ${className}`}
    >
      <LogOut size={16} />
      تسجيل الخروج
    </button>
  );
}
