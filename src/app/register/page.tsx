'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GuestOnly } from '@/components/auth/ProtectedRoute';
import type { FamilyMember } from '@/lib/types';
import { getFullLineageString } from '@/lib/lineage-utils';
import { isMale, isFemale } from '@/lib/utils';
import {
  Mail, UserPlus, Eye, ChevronLeft, ChevronRight, Check, Shield,
  Users, Lock, ArrowRight, X, Search, Phone, AlertTriangle, AlertCircle
} from 'lucide-react';
import { relationshipTypes } from '@/config/constants';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Input, Alert, AlertDescription, Card, CardContent, Spinner } from '@/components/ui';
import AuthPageLayout from '@/components/auth/AuthPageLayout';
import PhoneInput from '@/components/PhoneInput';
import OtpInput from '@/components/OtpInput';
import { GenderAvatarInline } from '@/components/GenderAvatar';
import { smartMemberFilter } from '@/lib/search-utils';

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

  const [duplicateWarning, setDuplicateWarning] = useState<{
    hasPotentialDuplicates: boolean;
    highestScore: number;
    isDuplicate: boolean;
    candidates: Array<{
      id: string;
      firstName: string;
      fullNameAr: string | null;
      similarityScore: number;
    }>;
  } | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  useEffect(() => {
    if (formData.parentMemberId !== lastVerifiedParentId) {
      setUncleVerified(false);
      setUncleName('');
      setUncleError(null);
    }
  }, [formData.parentMemberId, lastVerifiedParentId]);

  useEffect(() => {
    if (!formData.nameArabic || !formData.parentMemberId) {
      setDuplicateWarning(null);
      return;
    }

    const firstName = formData.nameArabic.trim().split(/\s+/)[0];
    if (!firstName) {
      setDuplicateWarning(null);
      return;
    }

    setIsCheckingDuplicate(true);

    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch('/api/duplicate-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName,
            fatherId: formData.parentMemberId,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.hasPotentialDuplicates) {
            setDuplicateWarning({
              hasPotentialDuplicates: data.hasPotentialDuplicates,
              highestScore: data.highestScore,
              isDuplicate: data.isDuplicate,
              candidates: data.candidates || [],
            });
          } else {
            setDuplicateWarning(null);
          }
        } else {
          setDuplicateWarning(null);
        }
      } catch (error) {
        console.error('Error checking duplicates:', error);
        setDuplicateWarning(null);
      } finally {
        setIsCheckingDuplicate(false);
      }
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      setIsCheckingDuplicate(false);
    };
  }, [formData.nameArabic, formData.parentMemberId]);

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

  const filteredMembers = useMemo(() => {
    return smartMemberFilter(allMembers, searchQuery, { limit: 15 });
  }, [searchQuery, allMembers]);

  const filteredParents = useMemo(() => {
    return smartMemberFilter(allMembers, parentSearchQuery, { limit: 30 });
  }, [parentSearchQuery, allMembers]);

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
    if (duplicateWarning?.isDuplicate) {
      return 'يوجد عضو مسجل بنفس الاسم تحت نفس الأب. يرجى التواصل مع المسؤول إذا كنت تعتقد أن هذا خطأ.';
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

      if (data.needsLogin) {
        setPhoneStep('complete');
        setSuccess(true);
        return;
      }

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

  // ─── SUCCESS VIEW ───
  if (success) {
    return (
      <GuestOnly redirectTo="/">
        <AuthPageLayout
          icon={<Check className="w-10 h-10 text-primary" />}
          title="تم إنشاء حسابك بنجاح!"
          subtitle="تم التحقق من رقم جوالك وإنشاء حسابك. يمكنك الآن تسجيل الدخول واستخدام شجرة العائلة."
        >
          <div className="space-y-3">
            <Link
              href="/login"
              className="flex items-center justify-center w-full h-11 px-6 text-base rounded-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-colors"
            >
              تسجيل الدخول
            </Link>
            <Link
              href="/"
              className="flex items-center justify-center w-full h-11 px-6 text-base rounded-lg font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              الصفحة الرئيسية
            </Link>
          </div>
        </AuthPageLayout>
      </GuestOnly>
    );
  }

  // ─── UNCLE VERIFICATION VIEW ───
  if (phoneStep === 'uncle_verify') {
    const selectedParentForVerify = formData.parentMemberId
      ? allMembers.find((m) => m.id === formData.parentMemberId)
      : null;

    return (
      <GuestOnly redirectTo="/">
        <AuthPageLayout
          icon={<Users className="w-8 h-8 text-primary" />}
          title="ما اسم أحد أعمامك؟"
          subtitle="أي عم من أعمامك (إخوة والدك) يساعدنا في التأكد"
          maxWidth="max-w-lg"
        >
          {selectedParentForVerify && (
            <div className="mb-4 p-3 bg-secondary rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">الوالد المحدد:</p>
              <p className="font-semibold text-foreground">{selectedParentForVerify.fullNameAr || selectedParentForVerify.firstName}</p>
            </div>
          )}

          {uncleError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{uncleError}</AlertDescription>
            </Alert>
          )}

          <div className="mb-6">
            <Input
              value={uncleName}
              onChange={(e) => setUncleName(e.target.value)}
              placeholder="مثال: سعد، عبدالله، محمد..."
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={handleSkipUncleVerification}
              disabled={isLoading}
              leftIcon={<ChevronRight size={16} />}
            >
              تخطي
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              onClick={handleVerifyUncle}
              disabled={isLoading || !uncleName.trim()}
              isLoading={isLoading}
              leftIcon={!isLoading ? <Check size={16} /> : undefined}
            >
              تأكيد
            </Button>
          </div>

          <button
            onClick={() => {
              setPhoneStep('form');
              setUncleName('');
              setUncleError(null);
              setUncleVerified(false);
            }}
            className="w-full mt-4 text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 transition-colors"
          >
            <ChevronLeft size={16} />
            الرجوع للنموذج
          </button>
        </AuthPageLayout>
      </GuestOnly>
    );
  }

  // ─── OTP VERIFICATION VIEW ───
  if (phoneStep === 'verify') {
    return (
      <GuestOnly redirectTo="/">
        <AuthPageLayout
          icon={<Phone className="w-8 h-8 text-primary" />}
          title="التحقق من رقم الجوال"
          subtitle="تم إرسال رمز التحقق إلى"
        >
          <p className="text-lg font-semibold text-foreground text-center mb-6" dir="ltr">
            {formData.countryCode} {formData.phone}
          </p>

          {otpError && (
            <Alert variant="destructive" className="mb-6" dismissible onDismiss={() => setOtpError(null)}>
              <AlertDescription>{otpError}</AlertDescription>
            </Alert>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-3 text-center">
              أدخل رمز التحقق المكون من 6 أرقام
            </label>
            <OtpInput
              value={otp}
              onChange={setOtp}
              disabled={isLoading}
            />
            {otpExpiresIn > 0 && (
              <p className="text-sm text-muted-foreground text-center mt-3">
                صالح لمدة {Math.floor(otpExpiresIn / 60)}:{(otpExpiresIn % 60).toString().padStart(2, '0')}
              </p>
            )}
          </div>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleVerifyAndCreate}
            disabled={isLoading || otp.length !== 6}
            isLoading={isLoading}
            leftIcon={!isLoading ? <Check size={18} /> : undefined}
          >
            تأكيد وإنشاء الحساب
          </Button>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground mb-2">لم تستلم الرمز؟</p>
            <button
              onClick={handleResendOtp}
              disabled={resendCooldown > 0 || isLoading}
              className="text-primary hover:text-primary/80 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {resendCooldown > 0
                ? `إعادة الإرسال بعد ${resendCooldown} ثانية`
                : 'إعادة إرسال الرمز'}
            </button>
          </div>

          <button
            onClick={() => {
              setPhoneStep('form');
              setOtp('');
              setOtpError(null);
            }}
            className="w-full mt-4 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight size={16} />
            رجوع
          </button>
        </AuthPageLayout>
      </GuestOnly>
    );
  }

  // ─── JOIN PATH SELECTION VIEW ───
  if (!joinPath) {
    return (
      <GuestOnly redirectTo="/">
        <AuthPageLayout
          icon={<Users className="w-10 h-10 text-primary" />}
          title="انضم إلى العائلة"
          subtitle="كيف تود الانضمام لشجرة آل شايع؟"
          showCard={false}
          maxWidth="max-w-2xl"
          headerLink={{ href: '/login', label: 'تسجيل الدخول' }}
        >
          <div className="space-y-4">
            <button
              onClick={() => router.push('/invite')}
              className="w-full rounded-lg border border-border bg-card shadow-soft hover:border-primary p-6 text-start transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-primary transition-colors">
                  <Mail className="w-7 h-7 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground mb-1">لدي دعوة</h3>
                  <p className="text-sm text-muted-foreground">I have an invitation</p>
                  <p className="text-muted-foreground mt-2">استلمت رمز دعوة أو رابط من أحد أفراد العائلة</p>
                </div>
                <ChevronLeft className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </button>

            <button
              onClick={() => setJoinPath('request')}
              className="w-full rounded-lg border border-border bg-card shadow-soft hover:border-blue-500 p-6 text-start transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-blue-500 transition-colors">
                  <UserPlus className="w-7 h-7 text-blue-600 group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground mb-1">أنا من العائلة</h3>
                  <p className="text-sm text-muted-foreground">I&apos;m a family member</p>
                  <p className="text-muted-foreground mt-2">أرغب في الانضمام والتحقق عبر رقم جوالي</p>
                </div>
                <ChevronLeft className="w-6 h-6 text-muted-foreground group-hover:text-blue-500 transition-colors" />
              </div>
            </button>

            <button
              onClick={() => router.push('/tree')}
              className="w-full rounded-lg border border-border bg-card shadow-soft hover:border-muted-foreground p-6 text-start transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-secondary rounded-xl flex items-center justify-center shrink-0 group-hover:bg-muted-foreground transition-colors">
                  <Eye className="w-7 h-7 text-muted-foreground group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground mb-1">أتصفح فقط</h3>
                  <p className="text-sm text-muted-foreground">Just browsing</p>
                  <p className="text-muted-foreground mt-2">أريد استكشاف الشجرة أولاً قبل الانضمام</p>
                </div>
                <ChevronLeft className="w-6 h-6 text-muted-foreground group-hover:text-muted-foreground transition-colors" />
              </div>
            </button>
          </div>

          {/* Privacy card */}
          <Card className="mt-10 bg-card/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-primary" />
                <span className="font-semibold text-foreground">خصوصيتك محمية</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  <span>فقط أفراد العائلة</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  <span>لا مشاركة للبيانات</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  <span>تحكم كامل بمعلوماتك</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  <span>إدارة موثوقة</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="text-center mt-8 text-muted-foreground">
            لديك حساب بالفعل؟{' '}
            <Link href="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
              تسجيل الدخول
            </Link>
          </p>
        </AuthPageLayout>
      </GuestOnly>
    );
  }

  // ─── MAIN REGISTRATION FORM VIEW ───
  return (
    <GuestOnly redirectTo="/">
      <AuthPageLayout
        icon={<UserPlus className="w-8 h-8 text-primary" />}
        title="الانضمام للعائلة"
        subtitle="أدخل بياناتك وسيتم التحقق من رقم جوالك عبر رسالة نصية"
        maxWidth="max-w-2xl"
        headerLink={{ href: '/login', label: 'تسجيل الدخول' }}
      >
        {/* Back button */}
        <button
          onClick={() => setJoinPath(null)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ChevronRight size={18} />
          رجوع
        </button>

        {error && (
          <Alert variant="destructive" className="mb-6" dismissible onDismiss={() => setError(null)}>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSendOtp(); }} className="space-y-6">
          {/* Section 1: Find your name */}
          <div className="border-b border-border pb-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center text-sm font-bold text-primary">1</span>
              ابحث عن اسمك في شجرة العائلة
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              ابحث عن اسمك في الشجرة لتسهيل عملية التحقق من هويتك
            </p>

            <div className="relative">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
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
                  className="w-full pe-11 ps-4 py-3 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors"
                  placeholder="ابحث بالاسم الأول أو اسم العائلة..."
                />
              </div>
              {showMemberDropdown && filteredMembers.length > 0 && (
                <div className="absolute z-20 w-full mt-2 bg-card border border-border rounded-lg shadow-lg max-h-72 overflow-auto">
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
                        className="w-full px-4 py-3 text-start hover:bg-accent border-b border-border last:border-0 transition-colors"
                      >
                        <span className="font-semibold text-foreground block">
                          {fullLineage || member.fullNameAr || member.firstName}
                        </span>
                        {member.fullNameEn && (
                          <span className="text-sm text-muted-foreground block mt-1" dir="ltr">
                            {member.fullNameEn}
                          </span>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          الجيل {member.generation}{member.branch ? ` - فرع: ${member.branch}` : ''}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
              {searchQuery && filteredMembers.length === 0 && showMemberDropdown && (
                <div className="absolute z-20 w-full mt-2 bg-card border border-border rounded-lg shadow-lg p-4 text-center text-muted-foreground">
                  لم يتم العثور على نتائج. يمكنك إدخال اسمك يدوياً أدناه.
                </div>
              )}
            </div>

            {selectedMember && (
              <Card className="mt-4 border-primary/30 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-lg">
                          {getFullLineageString(selectedMember.id, allMembers) || selectedMember.fullNameAr || selectedMember.firstName}
                        </p>
                        <p className="text-sm text-muted-foreground">
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
                      className="text-primary hover:text-primary/80 p-2 hover:bg-primary/10 rounded-lg transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Manual entry section */}
          {!selectedMember && (
            <div className="border-b border-border pb-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-7 h-7 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400">أو</span>
                أدخل معلوماتك يدوياً
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                لم تجد اسمك في الشجرة؟ أدخل بياناتك وابحث عن والدك لتحديد موقعك في الشجرة
              </p>

              <div className="grid gap-4 md:grid-cols-2 mb-4">
                <Input
                  label="الاسم بالعربي"
                  name="nameArabic"
                  value={formData.nameArabic}
                  onChange={handleChange}
                  placeholder="أحمد محمد آل شايع"
                  required={!selectedMember}
                />
                <Input
                  label="الاسم بالإنجليزي"
                  name="nameEnglish"
                  value={formData.nameEnglish}
                  onChange={handleChange}
                  placeholder="Ahmed Mohammed Al-Shaya"
                  dir="ltr"
                />
              </div>

              {isCheckingDuplicate && (
                <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner size="sm" label="" />
                  <span>جاري التحقق من التكرار...</span>
                </div>
              )}

              {duplicateWarning?.hasPotentialDuplicates && (
                <Alert
                  variant={duplicateWarning.isDuplicate ? 'destructive' : 'warning'}
                  className="mb-4"
                >
                  <AlertDescription>
                    <p className="font-semibold">
                      {duplicateWarning.isDuplicate
                        ? 'يوجد عضو مسجل بنفس الاسم تحت نفس الأب'
                        : 'يوجد أعضاء بأسماء مشابهة'}
                    </p>
                    {duplicateWarning.isDuplicate && (
                      <p className="text-sm mt-1">
                        قد يكون لديك حساب بالفعل. يرجى التواصل مع المسؤول.
                      </p>
                    )}
                    <div className="mt-3 space-y-2">
                      {duplicateWarning.candidates.map((candidate) => (
                        <div
                          key={candidate.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-background/50"
                        >
                          <span className="text-sm font-medium">
                            {candidate.fullNameAr || candidate.firstName}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-background">
                            {Math.round(candidate.similarityScore * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                    {!duplicateWarning.isDuplicate && (
                      <p className="text-sm mt-2">إذا كنت شخصاً مختلفاً، يمكنك المتابعة</p>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Gender selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-2">
                  الجنس <span className="text-destructive">*</span>
                </label>
                <div className="flex gap-4">
                  <label className={`flex-1 flex items-center justify-center gap-2 p-4 border-2 rounded-lg cursor-pointer transition-all ${isMale(formData.gender) ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-border hover:border-muted-foreground'}`}>
                    <input
                      type="radio"
                      name="gender"
                      value="Male"
                      checked={isMale(formData.gender)}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <GenderAvatarInline gender="Male" size="md" />
                    <span className="font-medium text-foreground">ذكر</span>
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 p-4 border-2 rounded-lg cursor-pointer transition-all ${isFemale(formData.gender) ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20' : 'border-border hover:border-muted-foreground'}`}>
                    <input
                      type="radio"
                      name="gender"
                      value="Female"
                      checked={isFemale(formData.gender)}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <GenderAvatarInline gender="Female" size="md" />
                    <span className="font-medium text-foreground">أنثى</span>
                  </label>
                </div>
              </div>

              {/* Birth year & occupation */}
              <div className="grid gap-4 md:grid-cols-2 mb-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    سنة الميلاد (اختياري)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      name="birthYear"
                      value={formData.birthYear}
                      onChange={handleChange}
                      className="flex-1 h-10 px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors"
                      placeholder="مثال: 1410"
                      min="1300"
                      max="1500"
                    />
                    <select
                      name="birthCalendar"
                      value={formData.birthCalendar}
                      onChange={handleChange}
                      className="h-10 px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors"
                    >
                      <option value="HIJRI">هجري</option>
                      <option value="GREGORIAN">ميلادي</option>
                    </select>
                  </div>
                </div>
                <Input
                  label="المهنة (اختياري)"
                  name="occupation"
                  value={formData.occupation}
                  onChange={handleChange}
                  placeholder="مثال: مهندس، طبيب، تاجر..."
                />
              </div>

              {/* Parent search */}
              <Card className="border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Search size={18} className="text-amber-600" />
                    ابحث عن والدك في الشجرة
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
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
                        className="w-full pe-11 ps-4 py-3 border border-amber-200 dark:border-amber-800 rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors"
                        placeholder="ابحث عن اسم الوالد..."
                      />
                    </div>
                    {showParentDropdown && filteredParents.length > 0 && (
                      <div className="absolute z-20 w-full mt-2 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
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
                              className={`w-full px-4 py-3 text-start border-b border-border last:border-0 transition-colors ${
                                isPending ? 'bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-950/40' : 'hover:bg-accent'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground">
                                  {fullLineage || parent.fullNameAr || parent.firstName}
                                </span>
                                {isPending && (
                                  <span className="text-xs px-2 py-0.5 bg-orange-500 text-white rounded-full">
                                    قيد المراجعة
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
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
                    <div className={`mt-3 p-3 bg-background rounded-lg border-2 ${
                      formData.parentPendingId ? 'border-orange-300 dark:border-orange-800' : 'border-primary/30'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            formData.parentPendingId ? 'bg-orange-500' : 'bg-primary'
                          }`}>
                            <Users className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-medium ${
                                formData.parentPendingId ? 'text-orange-600' : 'text-primary'
                              }`}>الوالد المحدد</p>
                              {formData.parentPendingId && (
                                <span className="text-xs px-2 py-0.5 bg-orange-500 text-white rounded-full">
                                  قيد المراجعة
                                </span>
                              )}
                            </div>
                            <p className={`font-bold ${
                              formData.parentPendingId ? 'text-orange-900 dark:text-orange-200' : 'text-foreground'
                            }`}>
                              {formData.parentPendingId
                                ? (selectedParent.fullNameAr || selectedParent.firstName)
                                : (getFullLineageString(selectedParent.id, allMembers) || selectedParent.fullNameAr || selectedParent.firstName)
                              }
                            </p>
                            {formData.parentPendingId && (
                              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
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
                          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Section 2: Contact info */}
          <div className="border-b border-border pb-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center text-sm font-bold text-primary">2</span>
              معلومات التواصل
            </h3>
            <Alert variant="info" className="mb-4">
              <AlertDescription>
                سيتم إرسال رمز التحقق عبر رسالة نصية للتأكد من رقم جوالك
              </AlertDescription>
            </Alert>
            <PhoneInput
              value={formData.phone}
              onChange={(phone, countryCode) => setFormData({ ...formData, phone, countryCode })}
              countryCode={formData.countryCode}
              required
            />
          </div>

          {/* Section 3: Account info */}
          <div className="border-b border-border pb-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center text-sm font-bold text-primary">3</span>
              معلومات الحساب
            </h3>
            <div className="grid gap-4">
              <Input
                type="email"
                label="البريد الإلكتروني"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="example@email.com"
                required
                dir="ltr"
                leftIcon={<Mail size={16} />}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  type="password"
                  label="كلمة المرور"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  dir="ltr"
                  helperText="8 أحرف على الأقل، حرف كبير، حرف صغير، ورقم"
                  leftIcon={<Lock size={16} />}
                />
                <Input
                  type="password"
                  label="تأكيد كلمة المرور"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  dir="ltr"
                  leftIcon={<Lock size={16} />}
                />
              </div>
            </div>
          </div>

          {/* Additional message */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              رسالة إضافية (اختياري)
            </label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors"
              placeholder="أي معلومات إضافية تود مشاركتها..."
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
            leftIcon={!isLoading ? <Phone size={18} /> : undefined}
          >
            التحقق من رقم الجوال
          </Button>
        </form>

        <p className="text-center mt-6 text-muted-foreground">
          لديك حساب بالفعل؟{' '}
          <Link href="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
            تسجيل الدخول
          </Link>
        </p>
      </AuthPageLayout>
    </GuestOnly>
  );
}
