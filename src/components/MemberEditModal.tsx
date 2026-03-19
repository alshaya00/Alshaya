'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Save,
  History,
  RotateCcw,
  AlertTriangle,
  Check,
  User,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Briefcase,
  FileText,
  ChevronRight,
  Users,
  Eye,
} from 'lucide-react';
import GenderAvatar from '@/components/GenderAvatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/Dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';
import { Spinner } from '@/components/ui/Spinner';

interface ChangeHistoryItem {
  id: string;
  timestamp: string;
  action: string;
  userName: string;
  description: string;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
  details: Record<string, unknown> | null;
}

interface MemberData {
  id: string;
  firstName: string;
  fatherName?: string;
  grandfatherName?: string;
  greatGrandfatherName?: string;
  fullNameAr?: string;
  fatherId?: string;
  gender: string;
  generation: number;
  branch?: string;
  birthYear?: number;
  birthCalendar?: string;
  deathYear?: number;
  deathCalendar?: string;
  status: string;
  phone?: string;
  email?: string;
  city?: string;
  occupation?: string;
  biography?: string;
}

interface MemberEditModalProps {
  member: MemberData;
  onClose: () => void;
  onSave: (updatedMember: MemberData) => Promise<void>;
  authToken?: string;
}

export default function MemberEditModal({
  member,
  onClose,
  onSave,
  authToken,
}: MemberEditModalProps) {
  const [activeTab, setActiveTab] = useState('data');
  const [editedMember, setEditedMember] = useState<MemberData>({ ...member });
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<ChangeHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [showNamePreview, setShowNamePreview] = useState(false);
  const [namePreview, setNamePreview] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  useEffect(() => {
    const changed = JSON.stringify(member) !== JSON.stringify(editedMember);
    setHasChanges(changed);
  }, [member, editedMember]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  const loadHistory = async () => {
    if (!authToken) return;
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/members/${member.id}/history`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.logs || []);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSave = async () => {
    const nameAffectingFields = ['firstName', 'gender', 'fatherId'];
    const hasNameChanges = nameAffectingFields.some(
      (field) => editedMember[field as keyof MemberData] !== member[field as keyof MemberData]
    );

    if (hasNameChanges && !showNamePreview) {
      setIsLoadingPreview(true);
      try {
        const res = await fetch(`/api/members/${member.id}/name-preview`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            firstName: editedMember.firstName,
            gender: editedMember.gender,
            fatherId: editedMember.fatherId,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setNamePreview(data.preview);
          setShowNamePreview(true);
        } else {
          await performSave();
        }
      } catch (error) {
        console.error('Error loading preview:', error);
        await performSave();
      } finally {
        setIsLoadingPreview(false);
      }
      return;
    }

    await performSave();
  };

  const performSave = async () => {
    setIsSaving(true);
    setShowNamePreview(false);
    setNamePreview(null);
    try {
      await onSave(editedMember);
      onClose();
    } catch (error) {
      console.error('Error saving:', error);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevert = async (historyItem: ChangeHistoryItem) => {
    if (!historyItem.previousState) {
      alert('لا توجد حالة سابقة للتراجع إليها');
      return;
    }

    setRevertingId(historyItem.id);

    try {
      const checkRes = await fetch(`/api/members/${member.id}/revert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          changeId: historyItem.id,
          checkOnly: true,
        }),
      });

      if (checkRes.ok) {
        const checkData = await checkRes.json();

        if (checkData.hasConflicts && checkData.affectedChanges?.length > 0) {
          const affectedList = checkData.affectedChanges
            .slice(0, 5)
            .map((c: { fieldName: string; changedByName: string }) =>
              `- ${c.fieldName} بواسطة ${c.changedByName}`
            )
            .join('\n');

          const confirmMsg = `تنبيه: هذا التراجع قد يؤثر على ${checkData.affectedChanges.length} تغيير(ات) لاحقة:\n\n${affectedList}\n\nهل تريد المتابعة؟`;

          if (!window.confirm(confirmMsg)) {
            setRevertingId(null);
            return;
          }
        } else {
          if (!window.confirm(`هل تريد التراجع عن هذا التغيير؟\n${historyItem.description}`)) {
            setRevertingId(null);
            return;
          }
        }
      }

      const revertData = { ...editedMember };
      for (const [key, value] of Object.entries(historyItem.previousState)) {
        if (key in revertData) {
          (revertData as Record<string, unknown>)[key] = value;
        }
      }

      const revertRes = await fetch(`/api/members/${member.id}/revert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          changeId: historyItem.id,
          revertData: historyItem.previousState,
        }),
      });

      if (!revertRes.ok) {
        throw new Error('Failed to revert');
      }

      setEditedMember(revertData);
      await loadHistory();
    } catch (error) {
      console.error('Error reverting:', error);
      alert('حدث خطأ أثناء التراجع');
    } finally {
      setRevertingId(null);
    }
  };

  const handleBatchRevert = async (batchId: string) => {
    try {
      const previewRes = await fetch('/api/members/batch-revert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ batchId, preview: true }),
      });

      if (!previewRes.ok) throw new Error('Preview failed');
      const previewData = await previewRes.json();

      const confirmMsg = `هل تريد التراجع عن التغيير المجموعي؟\n\nسيتم تراجع التغييرات على ${previewData.revertedMembers} عضو (${previewData.revertedFields} حقل):\n${previewData.details.map((d: any) => `- ${d.firstName}: ${d.fields.join(', ')}`).join('\n')}`;

      if (!window.confirm(confirmMsg)) return;

      const revertRes = await fetch('/api/members/batch-revert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ batchId, preview: false }),
      });

      if (!revertRes.ok) throw new Error('Revert failed');

      alert('تم التراجع بنجاح');
      await loadHistory();
    } catch (error) {
      console.error('Batch revert error:', error);
      alert('حدث خطأ أثناء التراجع');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderFieldChange = (prev: unknown, next: unknown, field: string) => {
    const fieldNames: Record<string, string> = {
      firstName: 'الاسم الأول',
      fatherName: 'اسم الأب',
      gender: 'الجنس',
      generation: 'الجيل',
      branch: 'الفرع',
      birthYear: 'سنة الميلاد',
      birthCalendar: 'تقويم الميلاد',
      deathYear: 'سنة الوفاة',
      deathCalendar: 'تقويم الوفاة',
      status: 'الحالة',
      phone: 'الهاتف',
      email: 'البريد',
      city: 'المدينة',
      occupation: 'المهنة',
      biography: 'السيرة الذاتية',
    };

    return (
      <div key={field} className="flex items-center gap-2 text-sm rounded-md border border-border bg-muted/50 px-2 py-1">
        <span className="text-muted-foreground">{fieldNames[field] || field}:</span>
        <span className="text-destructive line-through">{String(prev || '-')}</span>
        <ChevronRight className="w-3 h-3 text-muted-foreground" />
        <span className="text-emerald-600 dark:text-emerald-400">{String(next || '-')}</span>
      </div>
    );
  };

  return (
    <>
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent size="xl" onClose={onClose} className="max-w-4xl max-h-[90vh] flex flex-col" dir="rtl">
        {/* Header */}
        <DialogHeader className="bg-gradient-to-l from-blue-600 to-blue-800 text-white rounded-t-lg -mx-0 -mt-0 px-6 py-4">
          <div className="flex items-center gap-4">
            <GenderAvatar gender={member.gender} size="md" />
            <div>
              <DialogTitle className="text-white text-xl">{member.fullNameAr || member.firstName}</DialogTitle>
              <p className="text-blue-200 text-sm mt-1">تعديل بيانات العضو</p>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full rounded-none border-b bg-transparent p-0 h-auto">
            <TabsTrigger value="data" className="flex-1 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/5">
              <User className="w-4 h-4 me-2" />
              البيانات الأساسية
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/5">
              <History className="w-4 h-4 me-2" />
              سجل التغييرات
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto p-6">
            <TabsContent value="data">
              <div className="space-y-6">
                {/* Name fields */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="الاسم الأول"
                    leftIcon={<User className="w-4 h-4" />}
                    value={editedMember.firstName}
                    onChange={(e) => setEditedMember({ ...editedMember, firstName: e.target.value })}
                  />
                  <Input
                    label="اسم الأب"
                    value={editedMember.fatherName || ''}
                    onChange={(e) => setEditedMember({ ...editedMember, fatherName: e.target.value })}
                  />
                </div>

                {/* Gender, Generation, Status */}
                <div className="grid md:grid-cols-3 gap-4">
                  <Select
                    label="الجنس"
                    value={editedMember.gender}
                    onChange={(e) => setEditedMember({ ...editedMember, gender: e.target.value })}
                    options={[
                      { value: 'Male', label: 'ذكر' },
                      { value: 'Female', label: 'أنثى' },
                    ]}
                  />
                  <Input
                    label="الجيل"
                    type="number"
                    value={editedMember.generation}
                    onChange={(e) => setEditedMember({ ...editedMember, generation: parseInt(e.target.value) || 1 })}
                    min={1}
                    max={15}
                  />
                  <Select
                    label="الحالة"
                    value={editedMember.status}
                    onChange={(e) => setEditedMember({ ...editedMember, status: e.target.value })}
                    options={[
                      { value: 'Living', label: 'على قيد الحياة' },
                      { value: 'Deceased', label: 'متوفى' },
                    ]}
                  />
                </div>

                {/* Branch */}
                <Input
                  label="الفرع"
                  value={editedMember.branch || ''}
                  onChange={(e) => setEditedMember({ ...editedMember, branch: e.target.value })}
                />

                <Separator />

                {/* Date info */}
                <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                  <Calendar className="w-5 h-5 text-primary" />
                  معلومات التاريخ
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="border-blue-200 dark:border-blue-800/50">
                    <CardHeader className="bg-blue-50 dark:bg-blue-950/20 pb-3">
                      <CardTitle className="text-sm text-blue-800 dark:text-blue-300">الميلاد</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="السنة"
                          type="number"
                          value={editedMember.birthYear || ''}
                          onChange={(e) => setEditedMember({ ...editedMember, birthYear: e.target.value ? parseInt(e.target.value) : undefined })}
                          placeholder="1400"
                        />
                        <Select
                          label="التقويم"
                          value={editedMember.birthCalendar || 'GREGORIAN'}
                          onChange={(e) => setEditedMember({ ...editedMember, birthCalendar: e.target.value })}
                          options={[
                            { value: 'HIJRI', label: 'هجري' },
                            { value: 'GREGORIAN', label: 'ميلادي' },
                          ]}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {editedMember.status === 'Deceased' && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">الوفاة</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-3">
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            label="السنة"
                            type="number"
                            value={editedMember.deathYear || ''}
                            onChange={(e) => setEditedMember({ ...editedMember, deathYear: e.target.value ? parseInt(e.target.value) : undefined })}
                            placeholder="1445"
                          />
                          <Select
                            label="التقويم"
                            value={editedMember.deathCalendar || 'GREGORIAN'}
                            onChange={(e) => setEditedMember({ ...editedMember, deathCalendar: e.target.value })}
                            options={[
                              { value: 'HIJRI', label: 'هجري' },
                              { value: 'GREGORIAN', label: 'ميلادي' },
                            ]}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <Separator />

                {/* Contact info */}
                <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  معلومات التواصل
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="الهاتف"
                    leftIcon={<Phone className="w-4 h-4" />}
                    type="tel"
                    value={editedMember.phone || ''}
                    onChange={(e) => setEditedMember({ ...editedMember, phone: e.target.value })}
                    dir="ltr"
                  />
                  <Input
                    label="البريد الإلكتروني"
                    leftIcon={<Mail className="w-4 h-4" />}
                    type="email"
                    value={editedMember.email || ''}
                    onChange={(e) => setEditedMember({ ...editedMember, email: e.target.value })}
                    dir="ltr"
                  />
                  <Input
                    label="المدينة"
                    leftIcon={<MapPin className="w-4 h-4" />}
                    value={editedMember.city || ''}
                    onChange={(e) => setEditedMember({ ...editedMember, city: e.target.value })}
                  />
                  <Input
                    label="المهنة"
                    leftIcon={<Briefcase className="w-4 h-4" />}
                    value={editedMember.occupation || ''}
                    onChange={(e) => setEditedMember({ ...editedMember, occupation: e.target.value })}
                  />
                </div>

                <Separator />

                {/* Biography */}
                <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                  <FileText className="w-5 h-5 text-purple-600" />
                  السيرة الذاتية
                </h3>
                <textarea
                  value={editedMember.biography || ''}
                  onChange={(e) => setEditedMember({ ...editedMember, biography: e.target.value })}
                  rows={4}
                  placeholder="أدخل نبذة عن العضو..."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </TabsContent>

            <TabsContent value="history">
              <div className="space-y-4">
                {isLoadingHistory ? (
                  <div className="py-12">
                    <Spinner size="md" label="جاري تحميل السجل..." />
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-muted-foreground">لا توجد تغييرات مسجلة</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <Card key={item.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-foreground">{item.description}</p>
                            <p className="text-sm text-muted-foreground">
                              بواسطة {item.userName} - {formatDate(item.timestamp)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.previousState && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRevert(item)}
                                isLoading={revertingId === item.id}
                                leftIcon={<RotateCcw className="w-4 h-4" />}
                                className="text-amber-700 border-amber-300 hover:bg-amber-50"
                              >
                                تراجع
                              </Button>
                            )}
                            {item.details && (item.details as any).batchId && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleBatchRevert((item.details as any).batchId)}
                                leftIcon={<RotateCcw className="w-4 h-4" />}
                                className="text-purple-700 border-purple-300 hover:bg-purple-50"
                              >
                                تراجع مجموعي
                              </Button>
                            )}
                          </div>
                        </div>
                        {item.previousState && item.newState && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {Object.keys(item.newState).map((key) => {
                              const prev = (item.previousState as Record<string, unknown>)?.[key];
                              const next = (item.newState as Record<string, unknown>)?.[key];
                              if (prev !== next) {
                                return renderFieldChange(prev, next, key);
                              }
                              return null;
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <DialogFooter className="border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground me-auto">
            {hasChanges && (
              <span className="flex items-center gap-1 text-amber-600">
                <AlertTriangle className="w-4 h-4" />
                توجد تغييرات غير محفوظة
              </span>
            )}
          </div>
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!hasChanges}
            isLoading={isSaving || isLoadingPreview}
            leftIcon={<Save className="w-5 h-5" />}
          >
            {isLoadingPreview ? 'جاري معاينة التأثيرات...' : 'حفظ التغييرات'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Name Preview Dialog */}
    {showNamePreview && namePreview && (
      <Dialog open={true} onOpenChange={() => { setShowNamePreview(false); setNamePreview(null); }}>
        <DialogContent size="lg" className="max-w-2xl" dir="rtl">
          <DialogHeader className="bg-gradient-to-l from-amber-500 to-amber-600 text-white rounded-t-lg -mx-0 -mt-0 px-6 py-4">
            <div className="flex items-center gap-3">
              <Eye className="w-6 h-6" />
              <div>
                <DialogTitle className="text-white">معاينة تأثير التغييرات</DialogTitle>
                <p className="text-amber-100 text-sm mt-1">
                  {namePreview.totalAffected > 1
                    ? `سيتأثر ${namePreview.totalAffected} عضو بهذا التغيير`
                    : 'سيتأثر عضو واحد بهذا التغيير'}
                </p>
              </div>
            </div>
          </DialogHeader>

          <DialogBody className="space-y-4 max-h-[60vh] overflow-auto">
            {/* Member changes */}
            <Card className="border-blue-200 dark:border-blue-800/50">
              <CardHeader className="bg-blue-50 dark:bg-blue-950/20">
                <CardTitle className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-300">
                  <User className="w-5 h-5" />
                  التغييرات على العضو: {namePreview.member.firstName}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="space-y-2">
                  {Object.entries(namePreview.member.changes).map(([field, change]: [string, any]) => {
                    if (!change || change.old === change.new) return null;
                    const fieldLabels: Record<string, string> = {
                      fullNameAr: 'الاسم الكامل (عربي)',
                      fullNameEn: 'الاسم الكامل (إنجليزي)',
                      fatherName: 'اسم الأب',
                      grandfatherName: 'اسم الجد',
                      greatGrandfatherName: 'اسم الجد الأعلى',
                    };
                    return (
                      <div key={field} className="flex items-center gap-2 text-sm rounded-md border border-border bg-background px-3 py-2">
                        <span className="text-muted-foreground font-medium min-w-[120px]">{fieldLabels[field] || field}:</span>
                        <span className="text-destructive line-through">{change.old || '-'}</span>
                        <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">{change.new || '-'}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Affected descendants */}
            {namePreview.affectedDescendants && namePreview.affectedDescendants.length > 0 && (
              <Card className="border-amber-200 dark:border-amber-800/50">
                <CardHeader className="bg-amber-50 dark:bg-amber-950/20">
                  <CardTitle className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
                    <Users className="w-5 h-5" />
                    الأعضاء المتأثرون ({namePreview.affectedDescendants.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3">
                  <div className="space-y-3 max-h-[300px] overflow-auto">
                    {namePreview.affectedDescendants.map((desc: any) => (
                      <div key={desc.id} className="rounded-md border border-border bg-background p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-foreground">{desc.firstName}</span>
                          <Badge variant="warning" size="sm">{desc.relationship}</Badge>
                          <span className="text-xs text-muted-foreground">الجيل {desc.generation}</span>
                        </div>
                        <div className="space-y-1">
                          {Object.entries(desc.changes).map(([field, change]: [string, any]) => {
                            if (!change || change.old === change.new) return null;
                            const fieldLabels: Record<string, string> = {
                              fullNameAr: 'الاسم الكامل (عربي)',
                              fullNameEn: 'الاسم الكامل (إنجليزي)',
                              fatherName: 'اسم الأب',
                              grandfatherName: 'اسم الجد',
                              greatGrandfatherName: 'اسم الجد الأعلى',
                            };
                            return (
                              <div key={field} className="flex items-center gap-2 text-xs bg-muted/50 px-2 py-1 rounded">
                                <span className="text-muted-foreground min-w-[100px]">{fieldLabels[field] || field}:</span>
                                <span className="text-destructive line-through">{change.old || '-'}</span>
                                <ChevronRight className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0" />
                                <span className="text-emerald-600 dark:text-emerald-400">{change.new || '-'}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </DialogBody>

          <DialogFooter className="border-t">
            <p className="text-sm text-muted-foreground me-auto">يمكنك التراجع عن هذه التغييرات لاحقاً من سجل التغييرات</p>
            <Button variant="outline" onClick={() => { setShowNamePreview(false); setNamePreview(null); }}>
              رجوع
            </Button>
            <Button
              variant="primary"
              onClick={performSave}
              isLoading={isSaving}
              leftIcon={<Check className="w-5 h-5" />}
            >
              تأكيد وحفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )}
    </>
  );
}
