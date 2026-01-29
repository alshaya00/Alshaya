'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Briefcase, 
  Eye, 
  EyeOff,
  Loader2,
  Lock
} from 'lucide-react';
import { formatPhoneDisplay } from '@/lib/phone-utils';

interface MemberPersonalInfoSectionProps {
  memberId: string;
  city?: string | null;
  occupation?: string | null;
  phone?: string | null;
  email?: string | null;
  serverHidePersonalInfo?: boolean; // Privacy setting from server (prevents data exposure in HTML)
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
  const [hideInfo, setHideInfo] = useState(serverHidePersonalInfo);
  const [isLoading, setIsLoading] = useState(!serverHidePersonalInfo);
  const [isSaving, setIsSaving] = useState(false);
  const [personalInfo, setPersonalInfo] = useState<{
    city?: string | null;
    occupation?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null>(null);

  const isOwner = session?.user?.linkedMemberId === memberId;
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
    try {
      const res = await fetch(`/api/members/${memberId}/privacy`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`,
        },
        body: JSON.stringify({ hidePersonalInfo: !hideInfo }),
      });
      
      if (res.ok) {
        setHideInfo(!hideInfo);
      }
    } catch (error) {
      console.error('Error updating privacy:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const hasPersonalInfo = city || occupation || phone || email;

  if (!hasPersonalInfo && !canToggle) {
    return null;
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-700 flex items-center gap-2">
          <User className="text-blue-500" size={20} />
          المعلومات الشخصية
        </h3>
        {canToggle && !stillLoading && (
          <button
            onClick={togglePrivacy}
            disabled={isSaving}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              hideInfo
                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            } disabled:opacity-50`}
            title={hideInfo ? 'المعلومات مخفية عن الآخرين' : 'المعلومات ظاهرة للجميع'}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : hideInfo ? (
              <EyeOff size={16} />
            ) : (
              <Eye size={16} />
            )}
            <span>{hideInfo ? 'مخفية' : 'ظاهرة'}</span>
          </button>
        )}
      </div>

      {stillLoading ? (
        <div className="flex items-center gap-3 text-gray-400 py-4">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>جاري التحميل...</span>
        </div>
      ) : canViewInfo ? (
        <div className="space-y-3">
          {city && (
            <div className="flex items-center gap-3">
              <MapPin className="text-gray-400" size={18} />
              <span className="text-gray-600">{city}</span>
            </div>
          )}
          {occupation && (
            <div className="flex items-center gap-3">
              <Briefcase className="text-gray-400" size={18} />
              <span className="text-gray-600">{occupation}</span>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-3">
              <Phone className="text-gray-400" size={18} />
              <span className="text-gray-600" dir="ltr">
                {formatPhoneDisplay(phone)}
              </span>
            </div>
          )}
          {email && (
            <div className="flex items-center gap-3">
              <Mail className="text-gray-400" size={18} />
              <span className="text-gray-600">{email}</span>
            </div>
          )}
          {!hasPersonalInfo && canToggle && (
            <p className="text-gray-400 text-sm">لا توجد معلومات شخصية مضافة</p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 text-gray-400 py-4">
          <Lock size={20} />
          <span>المعلومات الشخصية مخفية بطلب من صاحب الحساب</span>
        </div>
      )}
    </div>
  );
}
