'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { isMale, normalizeMemberId } from '@/lib/utils';
import {
  ArrowRight,
  Save,
  AlertTriangle,
  CheckCircle,
  User,
  Users,
  Calendar,
  ChevronDown,
  ChevronUp,
  History,
  RefreshCw,
  Eye,
  Phone,
} from 'lucide-react';
import PhoneInput from '@/components/PhoneInput';
import {
  validateEdit,
  validateParentChange,
  generateFullName,
  calculateCascadeUpdates,
  CascadeUpdate,
} from '@/lib/edit-utils';
import type { FamilyMember, ValidationError } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import MemberPhotoSection from '@/components/MemberPhotoSection';
import { getYearRange, CalendarType } from '@/lib/utils/hijri-calendar';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';
import { Spinner } from '@/components/ui/Spinner';

type EditSection = 'identity' | 'family' | 'personal' | 'contact';

export default function EditMemberPage() {
  const { session } = useAuth();
  const params = useParams();
  const router = useRouter();
  const memberId = normalizeMemberId(params.id as string) || (params.id as string);

  const [allMembers, setAllMembers] = useState<FamilyMember[]>([]);
  const [originalMember, setOriginalMember] = useState<FamilyMember | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<'unauthorized' | 'not_found' | 'error' | null>(null);

  const [formData, setFormData] = useState<Partial<FamilyMember>>({});
  const [expandedSections, setExpandedSections] = useState<EditSection[]>(['identity', 'family']);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [warnings, setWarnings] = useState<{ field: string; message: string; suggestion?: string }[]>([]);
  const [cascadeUpdates, setCascadeUpdates] = useState<CascadeUpdate[]>([]);
  const [showCascadePreview, setShowCascadePreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [changeReason, setChangeReason] = useState('');

  useEffect(() => {
    async function fetchData() {
      if (!session?.token) {
        return;
      }

      setLoadError(null);
      setIsLoadingData(true);

      try {
        const headers: HeadersInit = { Authorization: `Bearer ${session.token}` };
        const [memberRes, allRes] = await Promise.all([
          fetch(`/api/members/${memberId}`, { headers }),
          fetch('/api/members?limit=2000', { headers })
        ]);

        if (memberRes.status === 401) {
          setLoadError('unauthorized');
          return;
        }

        if (memberRes.status === 404) {
          setLoadError('not_found');
          return;
        }

        if (!memberRes.ok) {
          setLoadError('error');
          return;
        }

        const memberData = await memberRes.json();
        const member = memberData.data || memberData;
        setOriginalMember(member);
        setFormData({ ...member });

        if (allRes.ok) {
          const allData = await allRes.json();
          setAllMembers(allData.data || []);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setLoadError('error');
      } finally {
        setIsLoadingData(false);
      }
    }
    fetchData();
  }, [memberId, session?.token]);

  const potentialFathers = useMemo(() => {
    return allMembers.filter(m =>
      isMale(m.gender) && m.id !== memberId
    ).sort((a, b) => a.generation - b.generation);
  }, [allMembers, memberId]);

  const changedFields = useMemo(() => {
    if (!originalMember) return [];
    const changed: string[] = [];
    const originalRecord = originalMember as unknown as Record<string, unknown>;
    for (const key of Object.keys(formData)) {
      const formValue = formData[key as keyof FamilyMember];
      const originalValue = originalRecord[key];
      if (formValue !== originalValue) {
        changed.push(key);
      }
    }
    return changed;
  }, [formData, originalMember]);

  useEffect(() => {
    if (!originalMember || changedFields.length === 0) {
      setErrors([]);
      setWarnings([]);
      setCascadeUpdates([]);
      return;
    }

    const changes: Partial<FamilyMember> = {};
    for (const field of changedFields) {
      (changes as any)[field] = formData[field as keyof FamilyMember];
    }

    const validation = validateEdit(memberId, changes, allMembers);
    setErrors(validation.errors);
    setWarnings(validation.warnings);

    const cascades = calculateCascadeUpdates(memberId, changes, allMembers);
    setCascadeUpdates(cascades);
  }, [formData, originalMember, changedFields, memberId]);

  const updateField = (field: keyof FamilyMember, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
  };

  const toggleSection = (section: EditSection) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleParentChange = (newParentId: string | null) => {
    const validation = validateParentChange(memberId, newParentId, allMembers);

    if (!validation.valid) {
      alert(validation.errors.join('\n'));
      return;
    }

    if (validation.wouldCreateCycle) {
      alert('هذا التغيير سيخلق دورة في الشجرة ولا يمكن تطبيقه');
      return;
    }

    updateField('fatherId', newParentId);

    if (newParentId) {
      const newParent = allMembers.find(m => m.id === newParentId);
      if (newParent) {
        updateField('fatherName', newParent.firstName);
        updateField('generation', newParent.generation + 1);
        updateField('branch', newParent.branch);

        const grandparent = allMembers.find(m => m.id === newParent.fatherId);
        if (grandparent) {
          updateField('grandfatherName', grandparent.firstName);
          const greatGrandparent = allMembers.find(m => m.id === grandparent.fatherId);
          if (greatGrandparent) {
            updateField('greatGrandfatherName', greatGrandparent.firstName);
          }
        }
      }
    } else {
      updateField('fatherName', null);
      updateField('generation', 1);
    }
  };

  const regenerateFullName = () => {
    const names = generateFullName(formData, allMembers);
    updateField('fullNameAr', names.fullNameAr);
    updateField('fullNameEn', names.fullNameEn);
  };

  const handleSave = async () => {
    if (errors.length > 0) {
      alert('يرجى تصحيح الأخطاء قبل الحفظ');
      return;
    }

    setIsSaving(true);

    try {
      const changes = changedFields.reduce((acc, field) => {
        acc[field] = formData[field as keyof FamilyMember];
        return acc;
      }, {} as Record<string, unknown>);

      const headers: HeadersInit = session?.token ? {
        Authorization: `Bearer ${session.token}`,
        'Content-Type': 'application/json'
      } : { 'Content-Type': 'application/json' };

      const res = await fetch(`/api/members/${memberId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          ...changes,
          reason: changeReason || undefined
        }),
      });

      if (!res.ok) {
        let errorMessage = 'فشل في حفظ التغييرات';
        try {
          const text = await res.text();
          if (text) {
            const err = JSON.parse(text);
            errorMessage = err.messageAr || err.message || err.error || errorMessage;
          }
        } catch {
          errorMessage = `خطأ في الخادم: ${res.status} ${res.statusText || ''}`.trim();
        }
        throw new Error(errorMessage);
      }

      setSaveSuccess(true);
      setTimeout(() => {
        router.push(`/member/${memberId}`);
      }, 1500);
    } catch (error) {
      console.error('Save failed:', error);
      alert(error instanceof Error ? error.message : 'حدث خطأ أثناء الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (originalMember) {
      setFormData({ ...originalMember });
    }
    setChangeReason('');
    setSaveSuccess(false);
  };

  // Loading state
  if (isLoadingData || !session?.token) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <Spinner size="lg" label="جاري تحميل بيانات العضو..." />
      </div>
    );
  }

  // Error states
  if (loadError === 'unauthorized') {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">غير مصرح</h2>
            <p className="text-muted-foreground mb-4">يجب تسجيل الدخول للوصول لهذه الصفحة</p>
            <Link href="/login" className="text-primary hover:underline underline-offset-4">
              تسجيل الدخول
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadError === 'not_found' || !originalMember) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">العضو غير موجود</h2>
            <Link href="/tree" className="text-primary hover:underline underline-offset-4">
              العودة للشجرة
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadError === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">حدث خطأ أثناء التحميل</h2>
            <Button variant="link" onClick={() => window.location.reload()}>
              إعادة المحاولة
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sections: { key: EditSection; title: string; icon: React.ElementType }[] = [
    { key: 'identity', title: 'الهوية', icon: User },
    { key: 'family', title: 'العائلة', icon: Users },
    { key: 'personal', title: 'شخصي', icon: Calendar },
    { key: 'contact', title: 'التواصل', icon: Phone },
  ];

  return (
    <div className="min-h-screen" dir="rtl">
      {/* Header */}
      <header className="bg-gradient-to-l from-[#1E3A5F] to-[#2D5A87] text-white py-4 lg:py-6">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/member/${memberId}`}
                className="p-2 hover:bg-white/10 rounded-md transition-colors"
              >
                <ArrowRight className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold">تعديل العضو</h1>
                <p className="text-white/80 text-sm">
                  {originalMember.fullNameAr || originalMember.firstName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {changedFields.length > 0 && (
                <Badge variant="warning" size="lg">
                  {changedFields.length} تغييرات
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-white hover:bg-white/10"
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                إعادة تعيين
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSave}
                disabled={errors.length > 0 || changedFields.length === 0}
                isLoading={isSaving}
                leftIcon={saveSuccess ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Save className="w-4 h-4" />}
                className="bg-white text-[#1E3A5F] hover:bg-gray-100"
              >
                {isSaving ? 'جاري الحفظ...' : saveSuccess ? 'تم الحفظ!' : 'حفظ التغييرات'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6 lg:py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Errors & Warnings */}
            {errors.length > 0 && errors.map((error, i) => (
              <Alert key={`err-${i}`} variant="destructive">
                <AlertDescription>
                  <strong>{error.field}:</strong> {error.message}
                </AlertDescription>
              </Alert>
            ))}
            {warnings.length > 0 && warnings.map((warning, i) => (
              <Alert key={`warn-${i}`} variant="warning">
                <AlertDescription>
                  <strong>{warning.field}:</strong> {warning.message}
                  {warning.suggestion && (
                    <p className="text-sm mt-1 opacity-80">{warning.suggestion}</p>
                  )}
                </AlertDescription>
              </Alert>
            ))}

            {/* Form sections */}
            {sections.map(({ key, title, icon: Icon }) => {
              const isExpanded = expandedSections.includes(key);

              return (
                <Card key={key}>
                  <button
                    onClick={() => toggleSection(key)}
                    className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors rounded-t-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-primary" />
                      <span className="font-semibold text-foreground">{title}</span>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                  </button>

                  {isExpanded && (
                    <CardContent className="pt-0">
                      <Separator className="mb-4" />

                      {/* Identity Section */}
                      {key === 'identity' && (
                        <div className="space-y-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <Input
                              label="الرقم التعريفي"
                              value={formData.id || ''}
                              disabled
                            />
                            <Input
                              label="الاسم الأول *"
                              value={formData.firstName || ''}
                              onChange={(e) => updateField('firstName', e.target.value)}
                              className={changedFields.includes('firstName') ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' : ''}
                            />
                          </div>

                          <div>
                            <label className="text-sm font-medium text-foreground mb-2 block">
                              الجنس <span className="text-destructive">*</span>
                            </label>
                            <div className="flex gap-4">
                              {(['Male', 'Female'] as const).map(gender => (
                                <label
                                  key={gender}
                                  className={`flex-1 p-3 border rounded-md cursor-pointer transition-colors ${
                                    formData.gender === gender
                                      ? isMale(gender)
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                                        : 'border-pink-500 bg-pink-50 dark:bg-pink-950/30'
                                      : 'border-input hover:bg-accent'
                                  } ${changedFields.includes('gender') ? 'ring-2 ring-amber-400' : ''}`}
                                >
                                  <input
                                    type="radio"
                                    name="gender"
                                    value={gender}
                                    checked={formData.gender === gender}
                                    onChange={(e) => updateField('gender', e.target.value)}
                                    className="sr-only"
                                  />
                                  <span className="font-medium text-foreground">
                                    {isMale(gender) ? 'ذكر' : 'أنثى'}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-foreground mb-2 block">الاسم الكامل (عربي)</label>
                              <div className="flex gap-2">
                                <Input
                                  value={formData.fullNameAr || ''}
                                  onChange={(e) => updateField('fullNameAr', e.target.value)}
                                  className={changedFields.includes('fullNameAr') ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' : ''}
                                />
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={regenerateFullName}
                                  title="إنشاء تلقائي"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            <Input
                              label="الاسم الكامل (إنجليزي)"
                              value={formData.fullNameEn || ''}
                              onChange={(e) => updateField('fullNameEn', e.target.value)}
                              className={changedFields.includes('fullNameEn') ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' : ''}
                              dir="ltr"
                            />
                          </div>
                        </div>
                      )}

                      {/* Family Section */}
                      {key === 'family' && (
                        <div className="space-y-4">
                          <Select
                            label="الأب"
                            value={formData.fatherId || ''}
                            onChange={(e) => handleParentChange(e.target.value || null)}
                            options={[
                              { value: '', label: 'بدون أب (جذر)' },
                              ...potentialFathers.map(father => ({
                                value: father.id,
                                label: `${father.fullNameAr || father.firstName} (${father.id}) - الجيل ${father.generation}`
                              }))
                            ]}
                            className={changedFields.includes('fatherId') ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' : ''}
                          />

                          <div className="grid md:grid-cols-3 gap-4">
                            <Input
                              label="الجيل"
                              type="number"
                              value={formData.generation || 1}
                              onChange={(e) => updateField('generation', parseInt(e.target.value))}
                              min={1}
                              max={20}
                              className={changedFields.includes('generation') ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' : ''}
                            />
                            <Input
                              label="الفرع"
                              value={formData.branch || ''}
                              onChange={(e) => updateField('branch', e.target.value)}
                              className={changedFields.includes('branch') ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' : ''}
                            />
                            <Input
                              label="اسم العائلة"
                              value={formData.familyName || 'آل شايع'}
                              onChange={(e) => updateField('familyName', e.target.value)}
                              className={changedFields.includes('familyName') ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' : ''}
                            />
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <Input
                              label="عدد الأبناء"
                              type="number"
                              value={formData.sonsCount || 0}
                              onChange={(e) => updateField('sonsCount', parseInt(e.target.value))}
                              min={0}
                              className={changedFields.includes('sonsCount') ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' : ''}
                            />
                            <Input
                              label="عدد البنات"
                              type="number"
                              value={formData.daughtersCount || 0}
                              onChange={(e) => updateField('daughtersCount', parseInt(e.target.value))}
                              min={0}
                              className={changedFields.includes('daughtersCount') ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' : ''}
                            />
                          </div>
                        </div>
                      )}

                      {/* Personal Section */}
                      {key === 'personal' && (
                        <div className="space-y-4">
                          <div className="grid md:grid-cols-3 gap-4">
                            <div>
                              <label className="text-sm font-medium text-foreground mb-2 block">سنة الميلاد</label>
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  value={formData.birthYear || ''}
                                  onChange={(e) => updateField('birthYear', e.target.value ? parseInt(e.target.value) : null)}
                                  min={getYearRange((formData.birthCalendar as CalendarType) || 'GREGORIAN').min}
                                  max={getYearRange((formData.birthCalendar as CalendarType) || 'GREGORIAN').max}
                                  className={changedFields.includes('birthYear') ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' : ''}
                                />
                                <Select
                                  value={(formData.birthCalendar as string) || 'GREGORIAN'}
                                  onChange={(e) => updateField('birthCalendar', e.target.value)}
                                  options={[
                                    { value: 'HIJRI', label: 'هجري' },
                                    { value: 'GREGORIAN', label: 'ميلادي' },
                                  ]}
                                  className={changedFields.includes('birthCalendar') ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' : ''}
                                  fullWidth={false}
                                />
                              </div>
                              {formData.birthYear && (() => {
                                const year = formData.birthYear as number;
                                const calendar = (formData.birthCalendar as string) || 'GREGORIAN';
                                if (calendar === 'HIJRI' && year >= 1900 && year <= 2030) {
                                  return (
                                    <Alert variant="warning" className="mt-2 py-2">
                                      <AlertDescription className="text-xs">
                                        هل تقصد السنة الميلادية؟ {year} تبدو ميلادية
                                      </AlertDescription>
                                    </Alert>
                                  );
                                }
                                if (calendar === 'GREGORIAN' && year >= 1300 && year <= 1500) {
                                  return (
                                    <Alert variant="warning" className="mt-2 py-2">
                                      <AlertDescription className="text-xs">
                                        هل تقصد السنة الهجرية؟ {year} تبدو هجرية
                                      </AlertDescription>
                                    </Alert>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                            <Input
                              label="سنة الوفاة"
                              type="number"
                              value={formData.deathYear || ''}
                              onChange={(e) => updateField('deathYear', e.target.value ? parseInt(e.target.value) : null)}
                              className={changedFields.includes('deathYear') ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' : ''}
                            />
                            <Select
                              label="الحالة"
                              value={formData.status || 'Living'}
                              onChange={(e) => updateField('status', e.target.value)}
                              options={[
                                { value: 'Living', label: 'على قيد الحياة' },
                                { value: 'Deceased', label: 'متوفى' },
                              ]}
                              className={changedFields.includes('status') ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' : ''}
                            />
                          </div>

                          <Input
                            label="المهنة"
                            value={formData.occupation || ''}
                            onChange={(e) => updateField('occupation', e.target.value)}
                            className={changedFields.includes('occupation') ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' : ''}
                          />

                          <div>
                            <label className="text-sm font-medium text-foreground mb-2 block">السيرة</label>
                            <textarea
                              value={formData.biography || ''}
                              onChange={(e) => updateField('biography', e.target.value)}
                              rows={4}
                              className={`flex w-full rounded-md border bg-background px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                                changedFields.includes('biography') ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' : 'border-input'
                              }`}
                            />
                          </div>
                        </div>
                      )}

                      {/* Contact Section */}
                      {key === 'contact' && (
                        <div className="space-y-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <PhoneInput
                                value={(formData.phone || '').replace(/^\+\d+/, '')}
                                onChange={(newPhone, newCountryCode) => {
                                  updateField('phone', newPhone ? `${newCountryCode}${newPhone}` : '');
                                }}
                                countryCode={(formData.phone || '').match(/^\+\d+/)?.[0] || '+966'}
                                label="الهاتف"
                              />
                            </div>
                            <Input
                              label="البريد الإلكتروني"
                              type="email"
                              value={formData.email || ''}
                              onChange={(e) => updateField('email', e.target.value)}
                              className={changedFields.includes('email') ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' : ''}
                              dir="ltr"
                            />
                          </div>

                          <Input
                            label="المدينة"
                            value={formData.city || ''}
                            onChange={(e) => updateField('city', e.target.value)}
                            className={changedFields.includes('city') ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' : ''}
                          />
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}

            {/* Change reason */}
            {changedFields.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    سبب التعديل (اختياري)
                  </label>
                  <textarea
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    placeholder="أدخل سبب التعديل للتوثيق..."
                    rows={2}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Eye className="w-5 h-5" />
                  معاينة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`p-4 rounded-md border-r-4 ${
                  isMale(formData.gender) ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : 'border-pink-500 bg-pink-50 dark:bg-pink-950/20'
                }`}>
                  <div className="font-bold text-lg mb-2 text-foreground">
                    {formData.fullNameAr || formData.firstName || 'بدون اسم'}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>الرقم: {formData.id}</div>
                    <div>الجيل: {formData.generation}</div>
                    <div>الفرع: {formData.branch || '-'}</div>
                    <div>الحالة: {formData.status === 'Living' ? 'حي' : 'متوفى'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Photo Section */}
            <MemberPhotoSection
              memberId={memberId}
              memberName={formData.fullNameAr || formData.firstName || 'العضو'}
            />

            {/* Changed fields summary */}
            {changedFields.length > 0 && (
              <Card className="border-amber-200 dark:border-amber-800/50">
                <CardHeader className="bg-amber-50 dark:bg-amber-950/20">
                  <CardTitle className="flex items-center gap-2 text-base text-amber-800 dark:text-amber-300">
                    <History className="w-5 h-5" />
                    التغييرات ({changedFields.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-2 max-h-60 overflow-auto">
                    {changedFields.map(field => {
                      const originalRecord = originalMember as unknown as Record<string, unknown>;
                      const formRecord = formData as unknown as Record<string, unknown>;
                      return (
                        <div key={field} className="text-sm">
                          <span className="font-medium text-foreground">{field}:</span>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-destructive line-through">
                              {String(originalRecord[field] ?? '-')}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {String(formRecord[field] ?? '-')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cascade updates preview */}
            {cascadeUpdates.length > 0 && (
              <Card className="border-blue-200 dark:border-blue-800/50">
                <button
                  onClick={() => setShowCascadePreview(!showCascadePreview)}
                  className="w-full"
                >
                  <CardHeader className="bg-blue-50 dark:bg-blue-950/20">
                    <CardTitle className="flex items-center justify-between text-base text-blue-800 dark:text-blue-300">
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-5 h-5" />
                        تحديثات متتالية ({cascadeUpdates.length})
                      </span>
                      {showCascadePreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </CardTitle>
                  </CardHeader>
                </button>
                {showCascadePreview && (
                  <CardContent className="pt-4">
                    <div className="space-y-2 max-h-40 overflow-auto">
                      {cascadeUpdates.map((update, i) => {
                        const member = allMembers.find(m => m.id === update.memberId);
                        return (
                          <div key={i} className="text-sm rounded-md border border-border bg-background p-2">
                            <span className="font-medium text-foreground">{member?.firstName || update.memberId}</span>
                            <p className="text-xs text-muted-foreground">{update.reason}</p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
