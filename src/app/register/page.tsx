'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GuestOnly } from '@/components/auth/ProtectedRoute';
import type { FamilyMember } from '@/lib/types';
import { getFullLineageString } from '@/lib/lineage-utils';
import { isMale, isFemale } from '@/lib/utils';
import {
  Mail, UserPlus, Eye, ChevronLeft, ChevronRight, Check, Shield,
  Users, Lock, ArrowRight, Loader2, X, Search, Phone
} from 'lucide-react';
import { relationshipTypes } from '@/config/constants';
import { useAuth } from '@/contexts/AuthContext';
import PhoneInput from '@/components/PhoneInput';
import OtpInput from '@/components/OtpInput';
import { GenderAvatarInline } from '@/components/GenderAvatar';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  nameArabic: string;
  nameEnglish: string;
  phone: string;
  countryCode: string;
  claimedRelation: string;
  relatedMemberId: string;
  relationshipType: string;
  parentMemberId: string;
  parentPendingId: string;
  gender: string;
  message: string;
  birthYear: string;
  birthCalendar: string;
  occupation: string;
}

type JoinPath = 'invite' | 'request' | 'browse' | null;
type PhoneStep = 'form' | 'uncle_verify' | 'verify' | 'complete';

const RELATIONSHIP_TYPES = relationshipTypes;

export default function RegisterPage() {
  const { session, setSessionFromOAuth } = useAuth();
  const router = useRouter();
  const [joinPath, setJoinPath] = useState<JoinPath>(null);
  const [allMembers, setAllMembers] = useState<FamilyMember[]>([]);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    nameArabic: '',
    nameEnglish: '',
    phone: '',
    countryCode: '+966',
    claimedRelation: '',
    relatedMemberId: '',
    relationshipType: '',
    parentMemberId: '',
    parentPendingId: '',
    gender: '',
    message: '',
    birthYear: '',
    birthCalendar: 'HIJRI',
    occupation: '',
  });
  const [parentSearchQuery, setParentSearchQuery] = useState('');
  const [showParentDropdown, setShowParentDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  const [phoneStep, setPhoneStep] = useState<PhoneStep>('form');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpExpiresIn, setOtpExpiresIn] = useState<number>(0);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [uncleName, setUncleName] = useState('');
  const [uncleError, setUncleError] = useState<string | null>(null);
  const [uncleVerified, setUncleVerified] = useState(false);
  const [hasSiblings, setHasSiblings] = useState(true);
  const [lastVerifiedParentId, setLastVerifiedParentId] = useState<string | null>(null);

  useEffect(() => {
    if (formData.parentMemberId !== lastVerifiedParentId) {
      setUncleVerified(false);
      setUncleName('');
      setUncleError(null);
    }
  }, [formData.parentMemberId, lastVerifiedParentId]);

  useEffect(() => {
    async function fetchMembers() {
      try {
        const res = await fetch('/api/members/public?limit=2000&includePending=true');
        if (res.ok) {
          const data = await res.json();
          setAllMembers(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching members:', error);
      }
    }
    fetchMembers();
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    if (otpExpiresIn > 0) {
      const timer = setTimeout(() => setOtpExpiresIn(otpExpiresIn - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpExpiresIn]);

  const normalizeArabic = (text: string): string => {
    return text
      .replace(/[أإآا]/g, 'ا')
      .replace(/[ىي]/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/\s+بن\s+/g, ' ')
      .replace(/\s+بنت\s+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  };

  const filteredMembers = allMembers.filter((m) => {
    if (!searchQuery || searchQuery.length < 2) return false;
    const normalizedQuery = normalizeArabic(searchQuery);
    const queryParts = normalizedQuery.split(' ').filter(p => p.length > 0);
    
    const normalizedFirstName = normalizeArabic(m.firstName || '');
    const normalizedFullNameAr = normalizeArabic(m.fullNameAr || '');
    const normalizedFullNameEn = (m.fullNameEn || '').toLowerCase();
    
    return queryParts.every(part => 
      normalizedFirstName.includes(part) ||
      normalizedFullNameAr.includes(part) ||
      normalizedFullNameEn.includes(part) ||
      m.id.toLowerCase().includes(part)
    );
  }).slice(0, 15);

  const filteredParents = (() => {
    if (!parentSearchQuery || parentSearchQuery.length < 2) return [];
    
    // Check if searching by ID directly (e.g., P333)
    const upperQuery = parentSearchQuery.trim().toUpperCase();
    if (/^P\d+$/.test(upperQuery)) {
      const found = allMembers.filter(m => m.id.toUpperCase() === upperQuery);
      if (found.length > 0) return found;
    }
    
    const normalizedQuery = normalizeArabic(parentSearchQuery);
    const queryParts = normalizedQuery.split(' ').filter(p => p.length > 0);
    
    // The FIRST word is the father's first name - prioritize matching this
    const fatherFirstName = queryParts[0];
    
    // Score and filter members - prioritize firstName, fatherName, branch matches
    const scored = allMembers.map((m) => {
      const normalizedFirstName = normalizeArabic(m.firstName || '');
      const normalizedFatherName = normalizeArabic(m.fatherName || '');
      const normalizedGrandfatherName = normalizeArabic(m.grandfatherName || '');
      const normalizedFullNameAr = normalizeArabic(m.fullNameAr || '');
      const normalizedFullNameEn = (m.fullNameEn || '').toLowerCase();
      const normalizedBranch = normalizeArabic(m.branch || '');
      
      let score = 0;
      
      // Strong match: firstName exactly matches or starts with search
      if (normalizedFirstName === fatherFirstName) {
        score += 100; // Exact firstName match
      } else if (normalizedFirstName.startsWith(fatherFirstName)) {
        score += 80; // Prefix match
      } else if (normalizedFirstName.includes(fatherFirstName)) {
        score += 50; // Partial match
      }
      
      // Check if lineage matches (subsequent query parts)
      if (queryParts.length > 1) {
        const lineageNames = queryParts.slice(1);
        for (const part of lineageNames) {
          // High priority: fatherName match (second word often is father's name)
          if (normalizedFatherName === part) {
            score += 60; // Exact fatherName match - very important
          } else if (normalizedFatherName.includes(part)) {
            score += 40; // Partial fatherName match
          }
          
          // Medium priority: grandfatherName match
          if (normalizedGrandfatherName === part) {
            score += 35;
          } else if (normalizedGrandfatherName.includes(part)) {
            score += 25;
          }
          
          // Branch match bonus
          if (normalizedBranch.includes(part)) {
            score += 30;
          }
          
          // General lineage match
          if (normalizedFullNameAr.includes(part)) {
            score += 15;
          }
        }
      }
      
      // Fallback: any match in full name or ID
      if (score === 0) {
        const matchesAny = queryParts.some(part => 
          normalizedFirstName.includes(part) ||
          normalizedFatherName.includes(part) ||
          normalizedFullNameAr.includes(part) ||
          normalizedFullNameEn.includes(part) ||
          normalizedBranch.includes(part) ||
          m.id.toLowerCase().includes(part)
        );
        if (matchesAny) score = 10;
      }
      
      return { member: m, score };
    }).filter(({ score }) => score > 0);
    
    // Sort by score descending, then by generation (lower generations first - closer to user)
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Lower generation = closer family member, more likely to be the father
      return (a.member.generation || 0) - (b.member.generation || 0);
    });
    
    return scored.slice(0, 30).map(({ member }) => member);
  })();

  const selectedParent = formData.parentMemberId
    ? allMembers.find((m) => m.id === formData.parentMemberId)
    : formData.parentPendingId
      ? allMembers.find((m) => (m as { pendingId?: string }).pendingId === formData.parentPendingId)
      : null;

  const selectedMember = formData.relatedMemberId
    ? allMembers.find((m) => m.id === formData.relatedMemberId)
    : null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleMemberSelect = (memberId: string) => {
    const member = allMembers.find((m) => m.id === memberId);
    setFormData({
      ...formData,
      relatedMemberId: memberId,
      claimedRelation: member
        ? `قريب ${member.fullNameAr || member.firstName}`
        : formData.claimedRelation,
    });
    setSearchQuery('');
    setShowMemberDropdown(false);
  };

  const handleParentSelect = (memberId: string) => {
    const parent = allMembers.find((m) => m.id === memberId);
    if (parent) {
      const isPending = (parent as { isPending?: boolean; pendingId?: string }).isPending;
      const pendingId = (parent as { pendingId?: string }).pendingId;
      const parentName = parent.fullNameAr || parent.firstName;
      
      setFormData({
        ...formData,
        parentMemberId: isPending ? '' : memberId,
        parentPendingId: isPending && pendingId ? pendingId : '',
        relationshipType: 'CHILD',
        claimedRelation: `${isFemale(formData.gender) ? 'ابنة' : 'ابن'} ${parentName}${isPending ? ' (قيد المراجعة)' : ''}`,
      });
    }
    setParentSearchQuery('');
    setShowParentDropdown(false);
  };

  const validateForm = (): string | null => {
    if (!formData.email) return 'البريد الإلكتروني مطلوب';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return 'صيغة البريد الإلكتروني غير صحيحة';
    }
    if (!formData.password) return 'كلمة المرور مطلوبة';
    if (formData.password.length < 8) return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
    if (!/[A-Z]/.test(formData.password)) return 'كلمة المرور يجب أن تحتوي على حرف كبير';
    if (!/[a-z]/.test(formData.password)) return 'كلمة المرور يجب أن تحتوي على حرف صغير';
    if (!/[0-9]/.test(formData.password)) return 'كلمة المرور يجب أن تحتوي على رقم';
    if (formData.password !== formData.confirmPassword) return 'كلمتا المرور غير متطابقتين';
    if (!selectedMember && !formData.nameArabic) return 'الاسم بالعربي مطلوب';
    if (!formData.phone) return 'رقم الاتصال مطلوب';
    if (formData.phone.replace(/\D/g, '').length < 7) {
      return 'صيغة رقم الاتصال غير صحيحة';
    }
    if (!selectedMember && formData.parentMemberId && !formData.gender) {
      return 'يرجى تحديد الجنس';
    }
    if (!formData.relatedMemberId && !formData.parentMemberId && !formData.parentPendingId) {
      return 'يرجى اختيار اسمك من الشجرة أو تحديد والدك';
    }
    return null;
  };

  const handleSendOtp = async () => {
    setError(null);
    setOtpError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (formData.parentMemberId && !formData.parentPendingId && !uncleVerified) {
      await handleStartUncleVerification();
      return;
    }
    
    if (formData.parentPendingId) {
      setUncleVerified(true);
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formData.phone,
          countryCode: formData.countryCode,
          purpose: 'REGISTRATION',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'فشل في إرسال رمز التحقق');
        return;
      }

      setPhoneStep('verify');
      setOtpExpiresIn(data.expiresIn || 600);
      setResendCooldown(60);
    } catch {
      setError('حدث خطأ أثناء إرسال رمز التحقق');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    setOtpError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formData.phone,
          countryCode: formData.countryCode,
          purpose: 'REGISTRATION',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setOtpError(data.error || 'فشل في إرسال رمز التحقق');
        return;
      }

      setOtp('');
      setOtpExpiresIn(data.expiresIn || 600);
      setResendCooldown(60);
    } catch {
      setOtpError('حدث خطأ أثناء إرسال رمز التحقق');
    } finally {
      setIsLoading(false);
    }
  };

  const checkForUncles = async () => {
    if (!formData.parentMemberId) {
      return { hasSiblings: false };
    }
    if (formData.parentPendingId) {
      return { hasSiblings: false };
    }

    try {
      const response = await fetch(`/api/members/siblings?memberId=${formData.parentMemberId}`);
      const data = await response.json();
      return { 
        hasSiblings: data.hasSiblings || false,
        count: data.count || 0
      };
    } catch {
      return { hasSiblings: false };
    }
  };

  const handleStartUncleVerification = async () => {
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    const uncleCheck = await checkForUncles();
    setHasSiblings(uncleCheck.hasSiblings);

    if (!uncleCheck.hasSiblings) {
      await proceedToOtpStep();
    } else {
      setPhoneStep('uncle_verify');
      setIsLoading(false);
    }
  };

  const handleVerifyUncle = async () => {
    if (!uncleName.trim()) {
      setUncleError('يرجى إدخال اسم أحد أعمامك');
      return;
    }

    setIsLoading(true);
    setUncleError(null);

    try {
      const response = await fetch('/api/members/siblings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: formData.parentMemberId,
          uncleName: uncleName.trim()
        })
      });

      const data = await response.json();

      if (data.valid) {
        setUncleVerified(true);
        setLastVerifiedParentId(formData.parentMemberId);
        await proceedToOtpStep();
      } else {
        setUncleError(data.message || 'اسم العم/العمة غير صحيح');
      }
    } catch {
      setUncleError('حدث خطأ أثناء التحقق');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipUncleVerification = async () => {
    setIsLoading(true);
    await proceedToOtpStep();
  };

  const proceedToOtpStep = async () => {
    try {
      const response = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formData.phone,
          countryCode: formData.countryCode,
          purpose: 'REGISTRATION',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'فشل في إرسال رمز التحقق');
        setPhoneStep('form');
        return;
      }

      setPhoneStep('verify');
      setOtpExpiresIn(data.expiresIn || 600);
      setResendCooldown(60);
    } catch {
      setError('حدث خطأ أثناء إرسال رمز التحقق');
      setPhoneStep('form');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndCreate = async () => {
    if (otp.length !== 6) {
      setOtpError('يرجى إدخال رمز التحقق المكون من 6 أرقام');
      return;
    }

    setOtpError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register/verify-and-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          otp,
          birthYear: formData.birthYear ? parseInt(formData.birthYear) : null,
          birthCalendar: formData.birthCalendar,
          occupation: formData.occupation || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setOtpError(data.messageAr || data.message || 'فشل في التحقق');
        return;
      }

      if (data.token && data.user && data.expiresAt) {
        setSessionFromOAuth({
          user: {
            id: data.user.id,
            email: data.user.email,
            nameArabic: data.user.nameArabic,
            nameEnglish: data.user.nameEnglish || null,
            phone: data.user.phone,
            role: data.user.role || 'MEMBER',
            status: data.user.status || 'ACTIVE',
            linkedMemberId: data.user.linkedMemberId || null,
            assignedBranch: null,
            permissions: [],
            twoFactorEnabled: false,
          },
          token: data.token,
          expiresAt: data.expiresAt,
        });
        
        router.push('/');
        return;
      }

      // Handle needsLogin case - account created but needs manual login
      if (data.needsLogin) {
        setPhoneStep('complete');
        setSuccess(true);
        return;
      }

      // Default success case
      setPhoneStep('complete');
      setSuccess(true);
    } catch (error) {
      console.error('Registration verification error:', error);
      setOtpError('فشل في الاتصال بالخادم. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setShowMemberDropdown(false);
      setShowParentDropdown(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (formData.parentMemberId && formData.gender) {
      const parent = allMembers.find((m) => m.id === formData.parentMemberId);
      if (parent) {
        const parentName = parent.fullNameAr || parent.firstName;
        const prefix = isFemale(formData.gender) ? 'ابنة' : 'ابن';
        const newRelation = `${prefix} ${parentName}`;
        if (formData.claimedRelation !== newRelation) {
          setFormData(prev => ({
            ...prev,
            claimedRelation: newRelation,
          }));
        }
      }
    }
  }, [formData.gender, formData.parentMemberId, allMembers]);

  if (success) {
    return (
      <GuestOnly redirectTo="/">
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4" dir="rtl">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              تم إنشاء حسابك بنجاح!
            </h2>
            <p className="text-gray-600 mb-6">
              تم التحقق من رقم جوالك وإنشاء حسابك. يمكنك الآن تسجيل الدخول واستخدام شجرة العائلة.
            </p>
            <div className="space-y-3">
              <Link
                href="/login"
                className="block w-full py-3 px-4 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors"
              >
                تسجيل الدخول
              </Link>
              <Link
                href="/"
                className="block w-full py-3 px-4 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                الصفحة الرئيسية
              </Link>
            </div>
          </div>
        </div>
      </GuestOnly>
    );
  }

  if (phoneStep === 'uncle_verify') {
    const selectedParentForVerify = formData.parentMemberId
      ? allMembers.find((m) => m.id === formData.parentMemberId)
      : null;

    return (
      <GuestOnly redirectTo="/">
        <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700" dir="rtl">
          <header className="py-6 px-4">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <Link href="/" className="flex items-center gap-2">
                <span className="text-2xl">🌳</span>
                <span className="text-xl font-bold text-white">آل شايع</span>
              </Link>
              <div className="text-white text-sm">
                الخطوة 2: المطابقة
              </div>
            </div>
          </header>

          <div className="bg-indigo-700 py-4 px-4 text-white text-center">
            <h1 className="text-xl font-bold">الخطوة 2: المطابقة</h1>
            <p className="text-indigo-200 text-sm mt-1">تأكيد مكانك في شجرة العائلة</p>
          </div>

          <main className="max-w-lg mx-auto px-4 py-8">
            <div className="bg-white rounded-3xl shadow-xl p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">ما اسم أحد أعمامك؟</h2>
                  <p className="text-gray-600 mt-1">
                    أي عم من أعمامك (إخوة والدك) يساعدنا في التأكد
                  </p>
                </div>
              </div>

              {selectedParentForVerify && (
                <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-sm text-gray-500">الوالد المحدد:</p>
                  <p className="font-semibold text-gray-900">{selectedParentForVerify.fullNameAr || selectedParentForVerify.firstName}</p>
                </div>
              )}

              {uncleError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-800 font-medium">{uncleError}</p>
                </div>
              )}

              <div className="mb-6">
                <input
                  type="text"
                  value={uncleName}
                  onChange={(e) => setUncleName(e.target.value)}
                  placeholder="مثال: سعد، عبدالله، محمد..."
                  className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg"
                  disabled={isLoading}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSkipUncleVerification}
                  disabled={isLoading}
                  className="px-6 py-4 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <ChevronRight className="w-4 h-4" />
                  تخطي
                </button>
                <button
                  onClick={handleVerifyUncle}
                  disabled={isLoading || !uncleName.trim()}
                  className="flex-1 py-4 px-6 bg-green-600 text-white font-bold text-lg rounded-xl hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      جاري التحقق...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      تأكيد
                    </>
                  )}
                </button>
              </div>

              <button
                onClick={() => {
                  setPhoneStep('form');
                  setUncleName('');
                  setUncleError(null);
                  setUncleVerified(false);
                }}
                className="w-full mt-4 text-gray-500 hover:text-gray-700 flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                الرجوع للنموذج
              </button>
            </div>
          </main>
        </div>
      </GuestOnly>
    );
  }

  if (phoneStep === 'verify') {
    return (
      <GuestOnly redirectTo="/">
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100" dir="rtl">
          <header className="py-6 px-4">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <Link href="/" className="flex items-center gap-2">
                <span className="text-2xl">🌳</span>
                <span className="text-xl font-bold text-green-800">آل شايع</span>
              </Link>
            </div>
          </header>

          <main className="max-w-md mx-auto px-4 py-8">
            <div className="bg-white rounded-3xl shadow-xl p-8">
              <button
                onClick={() => {
                  setPhoneStep('form');
                  setOtp('');
                  setOtpError(null);
                }}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6"
              >
                <ChevronRight className="w-5 h-5" />
                رجوع
              </button>

              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-4">
                  <Phone className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">التحقق من رقم الجوال</h1>
                <p className="text-gray-600 mt-2">
                  تم إرسال رمز التحقق إلى
                </p>
                <p className="text-lg font-semibold text-gray-900 mt-1 dir-ltr" dir="ltr">
                  {formData.countryCode} {formData.phone}
                </p>
              </div>

              {otpError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-red-800">{otpError}</p>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                  أدخل رمز التحقق المكون من 6 أرقام
                </label>
                <OtpInput
                  value={otp}
                  onChange={setOtp}
                  disabled={isLoading}
                />
                {otpExpiresIn > 0 && (
                  <p className="text-sm text-gray-500 text-center mt-3">
                    صالح لمدة {Math.floor(otpExpiresIn / 60)}:{(otpExpiresIn % 60).toString().padStart(2, '0')}
                  </p>
                )}
              </div>

              <button
                onClick={handleVerifyAndCreate}
                disabled={isLoading || otp.length !== 6}
                className="w-full py-4 px-4 bg-green-600 text-white font-bold text-lg rounded-xl hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    جاري التحقق...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    تأكيد وإنشاء الحساب
                  </>
                )}
              </button>

              <div className="mt-6 text-center">
                <p className="text-gray-600 mb-2">لم تستلم الرمز؟</p>
                <button
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isLoading}
                  className="text-green-600 hover:text-green-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0
                    ? `إعادة الإرسال بعد ${resendCooldown} ثانية`
                    : 'إعادة إرسال الرمز'}
                </button>
              </div>
            </div>
          </main>
        </div>
      </GuestOnly>
    );
  }

  if (!joinPath) {
    return (
      <GuestOnly redirectTo="/">
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100" dir="rtl">
          <header className="py-6 px-4">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <Link href="/" className="flex items-center gap-2">
                <span className="text-2xl">🌳</span>
                <span className="text-xl font-bold text-green-800">آل شايع</span>
              </Link>
              <Link
                href="/login"
                className="text-green-700 hover:text-green-900 font-medium"
              >
                تسجيل الدخول
              </Link>
            </div>
          </header>

          <main className="max-w-2xl mx-auto px-4 py-12">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-3xl mb-6">
                <Users className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                انضم إلى العائلة
              </h1>
              <p className="text-gray-600 text-lg">
                كيف تود الانضمام لشجرة آل شايع؟
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => router.push('/invite')}
                className="w-full bg-white rounded-2xl shadow-lg border-2 border-transparent hover:border-green-500 p-6 text-right transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-green-500 transition-colors">
                    <Mail className="w-7 h-7 text-green-600 group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800 mb-1">
                      لدي دعوة
                    </h3>
                    <p className="text-sm text-gray-500">I have an invitation</p>
                    <p className="text-gray-600 mt-2">
                      استلمت رمز دعوة أو رابط من أحد أفراد العائلة
                    </p>
                  </div>
                  <ChevronLeft className="w-6 h-6 text-gray-400 group-hover:text-green-500 transition-colors" />
                </div>
              </button>

              <button
                onClick={() => setJoinPath('request')}
                className="w-full bg-white rounded-2xl shadow-lg border-2 border-transparent hover:border-blue-500 p-6 text-right transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-blue-500 transition-colors">
                    <UserPlus className="w-7 h-7 text-blue-600 group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800 mb-1">
                      أنا من العائلة
                    </h3>
                    <p className="text-sm text-gray-500">I&apos;m a family member</p>
                    <p className="text-gray-600 mt-2">
                      أرغب في الانضمام والتحقق عبر رقم جوالي
                    </p>
                  </div>
                  <ChevronLeft className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
                </div>
              </button>

              <button
                onClick={() => router.push('/tree')}
                className="w-full bg-white rounded-2xl shadow-lg border-2 border-transparent hover:border-gray-400 p-6 text-right transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-gray-500 transition-colors">
                    <Eye className="w-7 h-7 text-gray-600 group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800 mb-1">
                      أتصفح فقط
                    </h3>
                    <p className="text-sm text-gray-500">Just browsing</p>
                    <p className="text-gray-600 mt-2">
                      أريد استكشاف الشجرة أولاً قبل الانضمام
                    </p>
                  </div>
                  <ChevronLeft className="w-6 h-6 text-gray-400 group-hover:text-gray-500 transition-colors" />
                </div>
              </button>
            </div>

            <div className="mt-10 p-6 bg-white/50 rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-gray-800">خصوصيتك محمية</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>فقط أفراد العائلة</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>لا مشاركة للبيانات</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>تحكم كامل بمعلوماتك</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>إدارة موثوقة</span>
                </div>
              </div>
            </div>

            <p className="text-center mt-8 text-gray-600">
              لديك حساب بالفعل؟{' '}
              <Link href="/login" className="text-green-600 hover:text-green-800 font-medium">
                تسجيل الدخول
              </Link>
            </p>
          </main>
        </div>
      </GuestOnly>
    );
  }

  return (
    <GuestOnly redirectTo="/">
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100" dir="rtl">
        <header className="py-6 px-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🌳</span>
              <span className="text-xl font-bold text-green-800">آل شايع</span>
            </Link>
            <Link
              href="/login"
              className="text-green-700 hover:text-green-900 font-medium"
            >
              تسجيل الدخول
            </Link>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <button
              onClick={() => setJoinPath(null)}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6"
            >
              <ChevronRight className="w-5 h-5" />
              رجوع
            </button>

            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4">
                <UserPlus className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">الانضمام للعائلة</h1>
              <p className="text-gray-600 mt-2">
                أدخل بياناتك وسيتم التحقق من رقم جوالك عبر رسالة نصية
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleSendOtp(); }} className="space-y-6">
              <div className="border-b pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center text-sm font-bold text-green-600">1</span>
                  ابحث عن اسمك في شجرة العائلة
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  ابحث عن اسمك في الشجرة لتسهيل عملية التحقق من هويتك
                </p>

                <div className="relative">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowMemberDropdown(true);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMemberDropdown(true);
                      }}
                      className="w-full pr-11 pl-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
                      placeholder="ابحث بالاسم الأول أو اسم العائلة..."
                    />
                  </div>
                  {showMemberDropdown && filteredMembers.length > 0 && (
                    <div className="absolute z-20 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-72 overflow-auto">
                      {filteredMembers.map((member) => {
                        const fullLineage = getFullLineageString(member.id, allMembers);
                        return (
                          <button
                            key={member.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMemberSelect(member.id);
                              setFormData({
                                ...formData,
                                relatedMemberId: member.id,
                                nameArabic: member.fullNameAr || member.firstName,
                                nameEnglish: member.fullNameEn || '',
                                claimedRelation: `أنا ${fullLineage || member.fullNameAr || member.firstName}`,
                                relationshipType: 'self',
                              });
                            }}
                            className="w-full px-4 py-4 text-right hover:bg-green-50 border-b border-gray-100 last:border-0 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <span className="font-semibold text-gray-900 block">
                                  {fullLineage || member.fullNameAr || member.firstName}
                                </span>
                                {member.fullNameEn && (
                                  <span className="text-sm text-gray-500 block mt-1" dir="ltr">
                                    {member.fullNameEn}
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              الجيل {member.generation}{member.branch ? ` - فرع: ${member.branch}` : ''}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {searchQuery && filteredMembers.length === 0 && showMemberDropdown && (
                    <div className="absolute z-20 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl p-4 text-center text-gray-500">
                      لم يتم العثور على نتائج. يمكنك إدخال اسمك يدوياً أدناه.
                    </div>
                  )}
                </div>

                {selectedMember && (
                  <div className="mt-4 p-4 bg-gradient-to-l from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                          <Users className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-green-900 text-lg">
                            {getFullLineageString(selectedMember.id, allMembers) || selectedMember.fullNameAr || selectedMember.firstName}
                          </p>
                          <p className="text-sm text-green-700">
                            الجيل {selectedMember.generation} {selectedMember.branch ? `- فرع ${selectedMember.branch}` : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ 
                            ...formData, 
                            relatedMemberId: '', 
                            claimedRelation: '',
                            nameArabic: '',
                            nameEnglish: '',
                            relationshipType: '',
                          });
                        }}
                        className="text-green-600 hover:text-green-800 p-2 hover:bg-green-100 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {!selectedMember && (
                <div className="border-b pb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center text-sm font-bold text-blue-600">أو</span>
                    أدخل معلوماتك يدوياً
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    لم تجد اسمك في الشجرة؟ أدخل بياناتك وابحث عن والدك لتحديد موقعك في الشجرة
                  </p>
                  
                  <div className="grid gap-4 md:grid-cols-2 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الاسم بالعربي <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="nameArabic"
                        value={formData.nameArabic}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="أحمد محمد آل شايع"
                        required={!selectedMember}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الاسم بالإنجليزي
                      </label>
                      <input
                        type="text"
                        name="nameEnglish"
                        value={formData.nameEnglish}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="Ahmed Mohammed Al-Shaya"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الجنس <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-4">
                      <label className={`flex-1 flex items-center justify-center gap-2 p-4 border-2 rounded-xl cursor-pointer transition-all ${isMale(formData.gender) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input
                          type="radio"
                          name="gender"
                          value="Male"
                          checked={isMale(formData.gender)}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <GenderAvatarInline gender="Male" size="md" />
                        <span className="font-medium text-gray-800">ذكر</span>
                      </label>
                      <label className={`flex-1 flex items-center justify-center gap-2 p-4 border-2 rounded-xl cursor-pointer transition-all ${isFemale(formData.gender) ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input
                          type="radio"
                          name="gender"
                          value="Female"
                          checked={isFemale(formData.gender)}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <GenderAvatarInline gender="Female" size="md" />
                        <span className="font-medium text-gray-800">أنثى</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        سنة الميلاد (اختياري)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          name="birthYear"
                          value={formData.birthYear}
                          onChange={handleChange}
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          placeholder="مثال: 1410"
                          min="1300"
                          max="1500"
                        />
                        <select
                          name="birthCalendar"
                          value={formData.birthCalendar}
                          onChange={handleChange}
                          className="px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                        >
                          <option value="HIJRI">هجري</option>
                          <option value="GREGORIAN">ميلادي</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        المهنة (اختياري)
                      </label>
                      <input
                        type="text"
                        name="occupation"
                        value={formData.occupation}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="مثال: مهندس، طبيب، تاجر..."
                      />
                    </div>
                  </div>

                  <div className="bg-gradient-to-l from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-xl p-4">
                    <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                      <span className="text-lg">🔍</span>
                      ابحث عن والدك في الشجرة
                    </h4>
                    <p className="text-sm text-amber-700 mb-3">
                      ابحث عن اسم والدك لتسهيل تحديد موقعك الصحيح في شجرة العائلة
                    </p>
                    
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-400" />
                        <input
                          type="text"
                          value={parentSearchQuery}
                          onChange={(e) => {
                            setParentSearchQuery(e.target.value);
                            setShowParentDropdown(true);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowParentDropdown(true);
                          }}
                          className="w-full pr-11 pl-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                          placeholder="ابحث عن اسم الوالد..."
                        />
                      </div>
                      {showParentDropdown && filteredParents.length > 0 && (
                        <div className="absolute z-20 w-full mt-2 bg-white border-2 border-amber-200 rounded-xl shadow-xl max-h-60 overflow-auto">
                          {filteredParents.map((parent) => {
                            const isPending = (parent as { isPending?: boolean }).isPending;
                            const fullLineage = isPending ? null : getFullLineageString(parent.id, allMembers);
                            return (
                              <button
                                key={parent.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleParentSelect(parent.id);
                                }}
                                className={`w-full px-4 py-3 text-right border-b border-amber-100 last:border-0 transition-colors ${
                                  isPending ? 'bg-orange-50 hover:bg-orange-100' : 'hover:bg-amber-50'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-900">
                                    {fullLineage || parent.fullNameAr || parent.firstName}
                                  </span>
                                  {isPending && (
                                    <span className="text-xs px-2 py-0.5 bg-orange-500 text-white rounded-full">
                                      قيد المراجعة
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500 mt-1">
                                  الجيل {parent.generation}{parent.branch ? ` - فرع: ${parent.branch}` : ''}
                                  {isPending && ' - مُضاف حديثاً'}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {selectedParent && (
                      <div className={`mt-3 p-3 bg-white rounded-xl border-2 ${
                        formData.parentPendingId ? 'border-orange-300' : 'border-green-300'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              formData.parentPendingId ? 'bg-orange-500' : 'bg-green-500'
                            }`}>
                              <Users className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className={`text-sm font-medium ${
                                  formData.parentPendingId ? 'text-orange-600' : 'text-green-600'
                                }`}>الوالد المحدد</p>
                                {formData.parentPendingId && (
                                  <span className="text-xs px-2 py-0.5 bg-orange-500 text-white rounded-full">
                                    قيد المراجعة
                                  </span>
                                )}
                              </div>
                              <p className={`font-bold ${
                                formData.parentPendingId ? 'text-orange-900' : 'text-green-900'
                              }`}>
                                {formData.parentPendingId 
                                  ? (selectedParent.fullNameAr || selectedParent.firstName)
                                  : (getFullLineageString(selectedParent.id, allMembers) || selectedParent.fullNameAr || selectedParent.firstName)
                                }
                              </p>
                              {formData.parentPendingId && (
                                <p className="text-xs text-orange-600 mt-1">
                                  سيتم ربط طلبك بطلب والدك - الموافقة ستكون بالتسلسل
                                </p>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                parentMemberId: '',
                                parentPendingId: '',
                                claimedRelation: '',
                              });
                            }}
                            className={`p-1 rounded-lg transition-colors ${
                              formData.parentPendingId 
                                ? 'text-orange-600 hover:text-orange-800 hover:bg-orange-100'
                                : 'text-green-600 hover:text-green-800 hover:bg-green-100'
                            }`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="border-b pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center text-sm font-bold text-green-600">2</span>
                  معلومات التواصل
                </h3>
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-800">
                      سيتم إرسال رمز التحقق عبر رسالة نصية للتأكد من رقم جوالك
                    </p>
                  </div>
                </div>
                <div>
                  <PhoneInput
                    value={formData.phone}
                    onChange={(phone, countryCode) => setFormData({ ...formData, phone, countryCode })}
                    countryCode={formData.countryCode}
                    required
                  />
                </div>
              </div>

              <div className="border-b pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center text-sm font-bold text-green-600">3</span>
                  معلومات الحساب
                </h3>
                <div className="grid gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      البريد الإلكتروني <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="example@email.com"
                      required
                      dir="ltr"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        كلمة المرور <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="••••••••"
                        required
                        dir="ltr"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        8 أحرف على الأقل، حرف كبير، حرف صغير، ورقم
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        تأكيد كلمة المرور <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="••••••••"
                        required
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>
              </div>


              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رسالة إضافية (اختياري)
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="أي معلومات إضافية تود مشاركتها..."
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 px-4 bg-green-600 text-white font-bold text-lg rounded-xl hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    جاري إرسال رمز التحقق...
                  </>
                ) : (
                  <>
                    <Phone className="w-5 h-5" />
                    التحقق من رقم الجوال
                  </>
                )}
              </button>
            </form>

            <p className="text-center mt-6 text-gray-600">
              لديك حساب بالفعل؟{' '}
              <Link href="/login" className="text-green-600 hover:text-green-800 font-medium">
                تسجيل الدخول
              </Link>
            </p>
          </div>
        </main>
      </div>
    </GuestOnly>
  );
}
