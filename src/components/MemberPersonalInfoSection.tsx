'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import {
  User,
  MapPin,
  Phone,
  Mail,
  Briefcase,
  Eye,
  EyeOff,
  Lock,
  CheckCircle,
} from 'lucide-react';
import { formatPhoneDisplay } from '@/lib/phone-utils';
import { normalizeMemberId } from '@/lib/utils';

interface MemberPersonalInfoSectionProps {
  memberId: string;
  city?: string | null;
  occupation?: string | null;
  phone?: string | null;
  email?: string | null;
  serverHidePersonalInfo?: boolean;
}

export default function MemberPersonalInfoSection({
  memberId,
  city: serverCity,
  occupation: serverOccupation,
  phone: serverPhone,
  email: serverEmail,
  serverHidePersonalInfo = false,
}: MemberPersonalInfoSectionProps) {
  const { session, isLoading: authLoading } = useAuth();
  const toast = useToast();
  const [hideInfo, setHideInfo] = useState(serverHidePersonalInfo);
  const [isLoading, setIsLoading] = useState(!serverHidePersonalInfo);
  const [isSaving, setIsSaving] = useState(false);
  const [justToggled, setJustToggled] = useState(false);
  const [personalInfo, setPersonalInfo] = useState<{
    city?: string | null;
    occupation?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null>(null);

  const normalizedLinkedId = normalizeMemberId(session?.user?.linkedMemberId);
  const normalizedMemberId = normalizeMemberId(memberId);
  const isOwner = normalizedLinkedId === normalizedMemberId || session?.user?.linkedMemberId === memberId;
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN';
  const stillLoading = isLoading || authLoading;
  const canViewInfo = !stillLoading && (isOwner || isAdmin || !hideInfo);
  const canToggle = isOwner;

  const city = personalInfo?.city ?? serverCity;
  const occupation = personalInfo?.occupation ?? serverOccupation;
  const phone = personalInfo?.phone ?? serverPhone;
  const email = personalInfo?.email ?? serverEmail;

  useEffect(() => {
    if (!serverHidePersonalInfo) {
      setIsLoading(false);
      return;
    }
    loadPrivacySetting();
  }, [memberId, serverHidePersonalInfo]);

  useEffect(() => {
    if (!authLoading && (isOwner || isAdmin) && serverHidePersonalInfo && session?.token) {
      fetchPersonalInfo();
    }
  }, [authLoading, isOwner, isAdmin, serverHidePersonalInfo, session?.token]);

  const loadPrivacySetting = async () => {
    try {
      const res = await fetch(`/api/members/${memberId}/privacy`);
      if (res.ok) {
        const data = await res.json();
        setHideInfo(data.hidePersonalInfo || false);
      }
    } catch (error) {
      console.error('Error loading privacy setting:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPersonalInfo = async () => {
    if (!session?.token) return;
    try {
      const res = await fetch(`/api/members/${memberId}/personal-info`, {
        headers: {
          'Authorization': `Bearer ${session.token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setPersonalInfo(data);
      }
    } catch (error) {
      console.error('Error fetching personal info:', error);
    }
  };

  const togglePrivacy = async () => {
    if (!session?.token || !canToggle) return;

    setIsSaving(true);
    const newHideState = !hideInfo;

    try {
      const res = await fetch(`/api/members/${memberId}/privacy`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`,
        },
        body: JSON.stringify({ hidePersonalInfo: newHideState }),
      });

      if (res.ok) {
        setHideInfo(newHideState);
        setJustToggled(true);
        setTimeout(() => setJustToggled(false), 2000);

        if (newHideState) {
          toast.success('تم إخفاء المعلومات الشخصية', 'Personal info is now hidden');
        } else {
          toast.success('تم إظهار المعلومات الشخصية', 'Personal info is now visible');
        }
      } else {
        toast.error('فشل في تحديث الإعدادات', 'Failed to update privacy settings');
      }
    } catch (error) {
      console.error('Error updating privacy:', error);
      toast.error('حدث خطأ أثناء تحديث الإعدادات', 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const hasPersonalInfo = city || occupation || phone || email;

  if (!hasPersonalInfo && !canToggle) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <User className="text-blue-500" size={20} />
          المعلومات الشخصية
        </h3>
        {canToggle && !stillLoading && (
          <Button
            variant={hideInfo ? 'outline' : 'ghost'}
            size="sm"
            onClick={togglePrivacy}
            disabled={isSaving}
            isLoading={isSaving}
            leftIcon={justToggled ? <CheckCircle size={14} className="text-emerald-600" /> : hideInfo ? <EyeOff size={14} /> : <Eye size={14} />}
            className={`${
              hideInfo
                ? 'border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400'
                : 'text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400'
            } ${justToggled ? 'ring-2 ring-offset-2 ring-emerald-400' : ''}`}
          >
            {hideInfo ? 'مخفية' : 'ظاهرة'}
          </Button>
        )}
      </div>

      {stillLoading ? (
        <Spinner size="sm" label="جاري التحميل..." />
      ) : canViewInfo ? (
        <div className="space-y-3">
          {city && (
            <div className="flex items-center gap-3">
              <MapPin className="text-muted-foreground" size={18} />
              <span className="text-muted-foreground">{city}</span>
            </div>
          )}
          {occupation && (
            <div className="flex items-center gap-3">
              <Briefcase className="text-muted-foreground" size={18} />
              <span className="text-muted-foreground">{occupation}</span>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-3">
              <Phone className="text-muted-foreground" size={18} />
              <span className="text-muted-foreground" dir="ltr">
                {formatPhoneDisplay(phone)}
              </span>
            </div>
          )}
          {email && (
            <div className="flex items-center gap-3">
              <Mail className="text-muted-foreground" size={18} />
              <span className="text-muted-foreground">{email}</span>
            </div>
          )}
          {!hasPersonalInfo && canToggle && (
            <p className="text-muted-foreground text-sm">لا توجد معلومات شخصية مضافة</p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 text-muted-foreground py-4">
          <Lock size={20} />
          <span>المعلومات الشخصية مخفية بطلب من صاحب الحساب</span>
        </div>
      )}
    </div>
  );
}
