'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen, Plus, Clock, Eye, ChevronLeft, Loader2,
  Scroll, Building2, Tent, Star, Heart, FileText, Feather, TreePine
} from 'lucide-react';
import { JOURNAL_CATEGORIES, HISTORICAL_ERAS, type JournalCategoryType, type FamilyJournal } from '@/lib/types';

const categoryIcons: Record<JournalCategoryType, React.ReactNode> = {
  ORAL_HISTORY: <Scroll className="w-4 h-4" />,
  TRADITION: <Building2 className="w-4 h-4" />,
  MIGRATION: <Tent className="w-4 h-4" />,
  ACHIEVEMENT: <Star className="w-4 h-4" />,
  MEMORY: <Heart className="w-4 h-4" />,
  DOCUMENT: <FileText className="w-4 h-4" />,
  POEM: <Feather className="w-4 h-4" />,
  GENEALOGY: <TreePine className="w-4 h-4" />,
};

const categoryColors: Record<JournalCategoryType, string> = {
  ORAL_HISTORY: 'bg-amber-100 text-amber-700',
  TRADITION: 'bg-purple-100 text-purple-700',
  MIGRATION: 'bg-orange-100 text-orange-700',
  ACHIEVEMENT: 'bg-yellow-100 text-yellow-700',
  MEMORY: 'bg-blue-100 text-blue-700',
  DOCUMENT: 'bg-gray-100 text-gray-700',
  POEM: 'bg-rose-100 text-rose-700',
  GENEALOGY: 'bg-green-100 text-green-700',
};

interface MemberStoriesSectionProps {
  memberId: string;
  memberName: string;
}

export default function MemberStoriesSection({ memberId, memberName }: MemberStoriesSectionProps) {
  const [stories, setStories] = useState<FamilyJournal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchMemberStories();
  }, [memberId]);

  const fetchMemberStories = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/journals?memberId=${memberId}&status=PUBLISHED`);
      const data = await response.json();
      if (data.success) {
        setStories(data.data);
      }
    } catch (error) {
      console.error('Error fetching member stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const displayedStories = showAll ? stories : stories.slice(0, 3);

  return (
    <div className="bg-amber-50 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <BookOpen className="text-amber-600" size={20} />
          قصص وتاريخ {memberName.split(' ')[0]}
        </h2>
        <Link
          href={`/journals/new?memberId=${memberId}&memberName=${encodeURIComponent(memberName)}`}
          className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors"
        >
          <Plus size={16} />
          أضف قصة
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
        </div>
      ) : stories.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-amber-400" />
          </div>
          <p className="text-gray-500 mb-4">لا توجد قصص مسجلة بعد</p>
          <p className="text-sm text-gray-400 mb-4">
            هل لديك قصة أو ذكرى عن {memberName.split(' ')[0]}؟
          </p>
          <Link
            href={`/journals/new?memberId=${memberId}&memberName=${encodeURIComponent(memberName)}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            <Plus size={18} />
            أضف أول قصة
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {displayedStories.map((story) => (
              <Link
                key={story.id}
                href={`/journals/${story.id}`}
                className="block bg-white rounded-xl p-4 hover:shadow-md transition-all group"
              >
                <div className="flex items-start gap-3">
                  {/* Category Icon */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${categoryColors[story.category]}`}>
                    {categoryIcons[story.category]}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 group-hover:text-amber-700 transition-colors line-clamp-1">
                      {story.titleAr}
                    </h3>
                    {story.excerpt && (
                      <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                        {story.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span className={`px-2 py-0.5 rounded-full ${categoryColors[story.category]}`}>
                        {JOURNAL_CATEGORIES[story.category].nameAr}
                      </span>
                      {story.era && (
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {HISTORICAL_ERAS.find(e => e.key === story.era)?.nameAr}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Eye size={12} />
                        {story.viewCount}
                      </span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronLeft className="w-5 h-5 text-gray-300 group-hover:text-amber-600 transition-colors flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>

          {/* Show More / Show All Link */}
          {stories.length > 3 && (
            <div className="mt-4 text-center">
              {!showAll ? (
                <button
                  onClick={() => setShowAll(true)}
                  className="text-amber-600 hover:text-amber-700 text-sm font-medium"
                >
                  عرض جميع القصص ({stories.length})
                </button>
              ) : (
                <Link
                  href={`/journals?memberId=${memberId}`}
                  className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700 text-sm font-medium"
                >
                  عرض في صفحة السجل التاريخي
                  <ChevronLeft size={16} />
                </Link>
              )}
            </div>
          )}

          {/* Link to all stories */}
          {stories.length > 0 && stories.length <= 3 && (
            <div className="mt-4 pt-4 border-t border-amber-200">
              <Link
                href={`/journals?memberId=${memberId}`}
                className="flex items-center justify-center gap-2 text-amber-600 hover:text-amber-700 text-sm font-medium"
              >
                <BookOpen size={16} />
                عرض في السجل التاريخي
                <ChevronLeft size={16} />
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
