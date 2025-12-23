'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Plus,
  Check,
  HelpCircle,
  X,
  Search,
  Camera,
  MessageCircle,
  Share2,
  Sparkles,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { EmptyGatherings } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';

// ============================================
// TYPES
// ============================================

interface Gathering {
  id: string;
  title: string;
  titleAr: string;
  description: string | null;
  descriptionAr: string | null;
  date: string;
  time: string | null;
  location: string | null;
  locationAr: string | null;
  locationUrl?: string | null;
  type: 'gathering' | 'wedding' | 'eid' | 'memorial' | 'celebration';
  coverImage?: string | null;
  organizer: {
    id?: string | null;
    name: string;
    nameAr: string;
  };
  attendees: {
    confirmed: number;
    maybe: number;
    total: number;
  };
  userRsvp?: 'yes' | 'maybe' | 'no' | null;
  isPast: boolean;
  status: string;
  isPublic: boolean;
  photos?: number;
  comments?: number;
}

type FilterTab = 'all' | 'upcoming' | 'past' | 'mine';
type RsvpStatus = 'yes' | 'maybe' | 'no';

// ============================================
// EVENT TYPE CONFIG
// ============================================

const eventTypeConfig: Record<Gathering['type'], { label: string; labelAr: string; color: string; bgColor: string }> = {
  gathering: { label: 'Gathering', labelAr: 'لقاء', color: 'text-green-700', bgColor: 'bg-green-100' },
  wedding: { label: 'Wedding', labelAr: 'زفاف', color: 'text-pink-700', bgColor: 'bg-pink-100' },
  eid: { label: 'Eid', labelAr: 'عيد', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  memorial: { label: 'Memorial', labelAr: 'ذكرى', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  celebration: { label: 'Celebration', labelAr: 'احتفال', color: 'text-purple-700', bgColor: 'bg-purple-100' },
};

// ============================================
// COMPONENT
// ============================================

export default function GatheringsPage() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [gatherings, setGatherings] = useState<Gathering[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch gatherings from API
  const fetchGatherings = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const params = new URLSearchParams();
      if (user?.id) {
        params.set('userId', user.id);
      }

      const response = await fetch(`/api/gatherings?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setGatherings(data.data || []);
      } else {
        console.error('Failed to fetch gatherings:', data.error);
        showError('فشل في تحميل اللقاءات', 'Failed to load gatherings');
      }
    } catch (err) {
      console.error('Error fetching gatherings:', err);
      showError('فشل في تحميل اللقاءات', 'Failed to load gatherings');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id, showError]);

  // Initial fetch
  useEffect(() => {
    fetchGatherings();
  }, [fetchGatherings]);

  // Filter gatherings based on active tab and search
  const filteredGatherings = gatherings.filter((g) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        g.title.toLowerCase().includes(query) ||
        g.titleAr.includes(query) ||
        (g.location?.toLowerCase().includes(query) || false) ||
        (g.locationAr?.includes(query) || false);
      if (!matchesSearch) return false;
    }

    // Tab filter
    switch (activeTab) {
      case 'upcoming':
        return !g.isPast;
      case 'past':
        return g.isPast;
      case 'mine':
        return g.userRsvp === 'yes' || g.userRsvp === 'maybe';
      default:
        return true;
    }
  });

  // Handle RSVP
  const handleRsvp = async (gatheringId: string, status: RsvpStatus) => {
    if (!user) {
      showError('يجب تسجيل الدخول أولاً', 'Please login first');
      return;
    }

    // Optimistic update
    const oldGatherings = [...gatherings];
    setGatherings((prev) =>
      prev.map((g) => {
        if (g.id !== gatheringId) return g;

        const oldStatus = g.userRsvp;
        const newAttendees = { ...g.attendees };

        // Remove from old status
        if (oldStatus === 'yes') newAttendees.confirmed--;
        if (oldStatus === 'maybe') newAttendees.maybe--;

        // Toggle off if clicking same status
        if (status === oldStatus) {
          return { ...g, userRsvp: null };
        } else {
          if (status === 'yes') newAttendees.confirmed++;
          if (status === 'maybe') newAttendees.maybe++;
          return { ...g, userRsvp: status, attendees: newAttendees };
        }
      })
    );

    try {
      const response = await fetch(`/api/gatherings/${gatheringId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          name: user.nameArabic || user.nameEnglish || user.email,
          email: user.email,
          rsvpStatus: status.toUpperCase(),
        }),
      });

      const data = await response.json();

      if (!data.success) {
        // Rollback on failure
        setGatherings(oldGatherings);
        showError(data.error || 'فشل في تسجيل الحضور', 'Failed to RSVP');
        return;
      }

      // Show success toast
      const messages: Record<RsvpStatus, { en: string; ar: string }> = {
        yes: { en: "You're attending!", ar: 'تم تأكيد حضورك!' },
        maybe: { en: 'Marked as maybe', ar: 'تم التسجيل كمحتمل' },
        no: { en: "Can't attend", ar: 'لن تتمكن من الحضور' },
      };
      success(messages[status].ar, messages[status].en);
    } catch (err) {
      console.error('Error RSVPing:', err);
      setGatherings(oldGatherings);
      showError('فشل في تسجيل الحضور', 'Failed to RSVP');
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return date.toLocaleDateString('ar-SA', options);
  };

  // Days until event
  const getDaysUntil = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-8" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-600 via-green-500 to-emerald-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold mb-2">اللقاءات العائلية</h1>
              <p className="text-green-100">اجتمعوا، احتفلوا، واصنعوا ذكريات</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchGatherings(true)}
                disabled={isRefreshing}
                className="p-2.5 bg-white/10 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-colors disabled:opacity-50"
                title="تحديث"
              >
                <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
              {user && (
                <button className="flex items-center gap-2 bg-white text-green-600 px-4 py-2.5 rounded-xl font-medium hover:bg-green-50 transition-colors shadow-lg">
                  <Plus size={20} />
                  <span className="hidden sm:inline">إنشاء لقاء</span>
                </button>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="ابحث عن لقاء..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl py-3 pr-12 pl-4 text-white placeholder-green-200 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2 -mx-4 px-4 scrollbar-hide">
            {[
              { id: 'all' as FilterTab, label: 'الكل', labelEn: 'All' },
              { id: 'upcoming' as FilterTab, label: 'القادمة', labelEn: 'Upcoming' },
              { id: 'past' as FilterTab, label: 'السابقة', labelEn: 'Past' },
              { id: 'mine' as FilterTab, label: 'لقاءاتي', labelEn: 'My Events' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          </div>
        ) : filteredGatherings.length === 0 ? (
          <EmptyGatherings actionHref="#" />
        ) : (
          <div className="space-y-4">
            {/* Upcoming highlight */}
            {activeTab !== 'past' && filteredGatherings.some((g) => !g.isPast) && (
              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Sparkles className="text-amber-500" size={20} />
                  قريباً
                </h2>
              </div>
            )}

            {/* Event Cards */}
            {filteredGatherings.map((gathering) => (
              <GatheringCard
                key={gathering.id}
                gathering={gathering}
                onRsvp={handleRsvp}
                formatDate={formatDate}
                getDaysUntil={getDaysUntil}
                isLoggedIn={!!user}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button (Mobile) */}
      {user && (
        <button className="lg:hidden fixed left-4 bottom-20 w-14 h-14 bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-green-700 active:scale-95 transition-all z-20">
          <Plus size={24} />
        </button>
      )}
    </div>
  );
}

// ============================================
// GATHERING CARD COMPONENT
// ============================================

interface GatheringCardProps {
  gathering: Gathering;
  onRsvp: (id: string, status: RsvpStatus) => void;
  formatDate: (date: string) => string;
  getDaysUntil: (date: string) => number;
  isLoggedIn: boolean;
}

function GatheringCard({ gathering, onRsvp, formatDate, getDaysUntil, isLoggedIn }: GatheringCardProps) {
  const typeConfig = eventTypeConfig[gathering.type] || eventTypeConfig.gathering;
  const daysUntil = getDaysUntil(gathering.date);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      {/* Card Header */}
      <div className="p-4 lg:p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            {/* Event Type Badge */}
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${typeConfig.bgColor} ${typeConfig.color} mb-2`}>
              {typeConfig.labelAr}
            </span>

            {/* Title */}
            <h3 className="text-lg lg:text-xl font-bold text-gray-800 mb-1">
              {gathering.titleAr}
            </h3>

            {/* Description */}
            {gathering.descriptionAr && (
              <p className="text-gray-500 text-sm line-clamp-2">
                {gathering.descriptionAr}
              </p>
            )}
          </div>

          {/* Days Until Badge */}
          {!gathering.isPast && daysUntil > 0 && (
            <div className="text-center bg-green-50 rounded-xl px-3 py-2 min-w-[60px]">
              <div className="text-2xl font-bold text-green-600">{daysUntil}</div>
              <div className="text-xs text-green-600">يوم</div>
            </div>
          )}
        </div>

        {/* Event Details */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-1.5">
            <Calendar size={16} className="text-gray-400" />
            <span>{formatDate(gathering.date)}</span>
          </div>
          {gathering.time && (
            <div className="flex items-center gap-1.5">
              <Clock size={16} className="text-gray-400" />
              <span>{gathering.time}</span>
            </div>
          )}
          {gathering.locationAr && (
            <div className="flex items-center gap-1.5">
              <MapPin size={16} className="text-gray-400" />
              <span>{gathering.locationAr}</span>
            </div>
          )}
        </div>

        {/* Organizer */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
            <Users size={12} className="text-gray-500" />
          </div>
          <span>المنظم: {gathering.organizer.nameAr}</span>
        </div>

        {/* Attendees */}
        <div className="flex items-center gap-4 text-sm mb-4">
          <div className="flex items-center gap-1.5 text-green-600">
            <Check size={16} />
            <span>{gathering.attendees.confirmed} مؤكد</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-600">
            <HelpCircle size={16} />
            <span>{gathering.attendees.maybe} محتمل</span>
          </div>
        </div>

        {/* RSVP Buttons or Past Event Actions */}
        {gathering.isPast ? (
          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors">
              <Camera size={18} />
              <span>{gathering.photos || 0} صورة</span>
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors">
              <MessageCircle size={18} />
              <span>{gathering.comments || 0} تعليق</span>
            </button>
            <button className="flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors">
              <Share2 size={18} />
            </button>
          </div>
        ) : isLoggedIn ? (
          <div className="flex gap-2">
            <button
              onClick={() => onRsvp(gathering.id, 'yes')}
              className={`rsvp-btn rsvp-yes ${gathering.userRsvp === 'yes' ? 'selected' : ''}`}
            >
              <Check size={18} />
              <span>سأحضر</span>
            </button>
            <button
              onClick={() => onRsvp(gathering.id, 'maybe')}
              className={`rsvp-btn rsvp-maybe ${gathering.userRsvp === 'maybe' ? 'selected' : ''}`}
            >
              <HelpCircle size={18} />
              <span>ربما</span>
            </button>
            <button
              onClick={() => onRsvp(gathering.id, 'no')}
              className={`rsvp-btn rsvp-no ${gathering.userRsvp === 'no' ? 'selected' : ''}`}
            >
              <X size={18} />
              <span>لا</span>
            </button>
          </div>
        ) : (
          <div className="text-center py-2 text-sm text-gray-500">
            سجل الدخول للمشاركة في هذا اللقاء
          </div>
        )}
      </div>
    </div>
  );
}
