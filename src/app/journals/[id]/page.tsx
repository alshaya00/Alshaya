'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, Clock, MapPin, User, Users, Eye, Share2,
  BookOpen, ChevronLeft, Scroll, Tent, Star,
  Heart, FileText, Feather, TreePine, Loader2, AlertCircle
} from 'lucide-react';
import { JOURNAL_CATEGORIES, type JournalCategoryType, type FamilyJournal } from '@/lib/types';

const categoryIcons: Record<JournalCategoryType, React.ReactNode> = {
  ORAL_HISTORY: <Scroll className="w-5 h-5" />,
  MIGRATION: <Tent className="w-5 h-5" />,
  MEMORY: <Heart className="w-5 h-5" />,
  POEM: <Feather className="w-5 h-5" />,
  GENEALOGY: <TreePine className="w-5 h-5" />,
};

const categoryColors: Record<JournalCategoryType, { bg: string; text: string; border: string }> = {
  ORAL_HISTORY: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  MIGRATION: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  MEMORY: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  POEM: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  GENEALOGY: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
};

export default function JournalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [journal, setJournal] = useState<FamilyJournal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relatedJournals, setRelatedJournals] = useState<FamilyJournal[]>([]);
  const [showShareMenu, setShowShareMenu] = useState(false);

  useEffect(() => {
    fetchJournal();
  }, [resolvedParams.id]);

  const fetchJournal = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/journals/${resolvedParams.id}`);
      const data = await response.json();

      if (data.success) {
        setJournal(data.data);
        // Fetch related journals from same category
        fetchRelatedJournals(data.data.category, data.data.id);
      } else {
        setError(data.error || 'فشل في تحميل القصة');
      }
    } catch (err) {
      console.error('Error fetching journal:', err);
      setError('حدث خطأ أثناء تحميل القصة');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedJournals = async (category: string, excludeId: string) => {
    try {
      const response = await fetch(`/api/journals?category=${category}&limit=3&status=PUBLISHED`);
      const data = await response.json();
      if (data.success) {
        setRelatedJournals(data.data.filter((j: FamilyJournal) => j.id !== excludeId).slice(0, 3));
      }
    } catch (err) {
      console.error('Error fetching related journals:', err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: journal?.titleAr,
          text: journal?.excerpt || '',
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      setShowShareMenu(!showShareMenu);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowShareMenu(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50">
        <div className="flex flex-col items-center justify-center py-32">
          <Loader2 className="w-12 h-12 text-amber-600 animate-spin mb-4" />
          <p className="text-gray-500">جاري تحميل القصة...</p>
        </div>
      </div>
    );
  }

  if (error || !journal) {
    return (
      <div className="min-h-screen bg-amber-50">
        <div className="flex flex-col items-center justify-center py-32">
          <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">القصة غير موجودة</h2>
          <p className="text-gray-500 mb-6">{error || 'لم نتمكن من العثور على هذه القصة'}</p>
          <Link
            href="/journals"
            className="flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
            العودة إلى سجل العائلة
          </Link>
        </div>
      </div>
    );
  }

  const category = JOURNAL_CATEGORIES[journal.category];
  const colors = categoryColors[journal.category];

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-amber-50">
      {/* Hero Section */}
      <div className="relative">
        {journal.coverImageUrl ? (
          <div className="relative h-64 md:h-96 overflow-hidden">
            <img
              src={journal.coverImageUrl}
              alt={journal.titleAr}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          </div>
        ) : (
          <div className={`h-48 md:h-64 ${colors.bg} relative overflow-hidden`}>
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-9xl opacity-30">{category.icon}</span>
            </div>
          </div>
        )}

        {/* Back Button */}
        <Link
          href="/journals"
          className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-md text-gray-700 hover:bg-white transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة</span>
        </Link>

        {/* Share Button */}
        <div className="absolute top-4 left-4">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-md text-gray-700 hover:bg-white transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>مشاركة</span>
          </button>

          {/* Share Menu */}
          {showShareMenu && (
            <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-100 py-2 min-w-[150px]">
              <button
                onClick={copyLink}
                className="w-full px-4 py-2 text-right text-sm text-gray-700 hover:bg-gray-50"
              >
                نسخ الرابط
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 -mt-16 relative z-10">
        <article className="max-w-4xl mx-auto">
          {/* Header Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-10 mb-8">
            {/* Category Badge */}
            <div className="flex items-center gap-3 mb-4">
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
                {categoryIcons[journal.category]}
                {category.nameAr}
              </span>
              {journal.isFeatured && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm">
                  <Star className="w-4 h-4" />
                  قصة مميزة
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4 leading-relaxed">
              {journal.titleAr}
            </h1>

            {journal.titleEn && (
              <p className="text-lg text-gray-500 mb-6 font-serif italic">
                {journal.titleEn}
              </p>
            )}

            {/* Meta Information */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-500 border-t border-gray-100 pt-6">
              {journal.dateDescription && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>{journal.dateDescription}</span>
                </div>
              )}
              {journal.locationAr && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-600" />
                  <span>{journal.locationAr}</span>
                </div>
              )}
              {journal.narrator && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-600" />
                  <span>راوي القصة: {journal.narrator}</span>
                </div>
              )}
              {journal.generation && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span>الجيل {journal.generation}</span>
                </div>
              )}
              <div className="flex items-center gap-2 mr-auto">
                <Eye className="w-4 h-4" />
                <span>{journal.viewCount} مشاهدة</span>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-10 mb-8">
            <div
              className="prose prose-lg prose-amber max-w-none text-gray-700 leading-loose"
              style={{ fontSize: '1.125rem', lineHeight: '2' }}
            >
              {/* Render content with preserved line breaks */}
              {journal.contentAr.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-4 text-justify">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* English Translation */}
            {journal.contentEn && (
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <span>English Translation</span>
                </h3>
                <div className="prose prose-gray max-w-none text-gray-600 font-serif italic">
                  {journal.contentEn.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-4">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Source */}
            {journal.source && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  <span className="font-medium">المصدر:</span> {journal.source}
                </p>
              </div>
            )}

            {/* Tags */}
            {journal.tags && journal.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {journal.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Media Gallery */}
          {journal.mediaItems && journal.mediaItems.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-10 mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-600" />
                الوسائط المرفقة
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {journal.mediaItems.map((media) => (
                  <div
                    key={media.id}
                    className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group"
                  >
                    {media.imageData || media.url ? (
                      <img
                        src={media.imageData || media.url || ''}
                        alt={media.titleAr || ''}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileText className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    {media.captionAr && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                        <p className="text-white text-sm">{media.captionAr}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Author Info */}
          <div className="bg-gradient-to-l from-amber-50 to-white rounded-2xl shadow-lg border border-amber-100 p-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-amber-200 rounded-full flex items-center justify-center">
                <User className="w-7 h-7 text-amber-700" />
              </div>
              <div>
                <p className="text-sm text-gray-500">كتبها</p>
                <p className="font-semibold text-gray-800">{journal.authorName}</p>
                <p className="text-xs text-gray-400">
                  {new Date(journal.createdAt).toLocaleDateString('ar-SA', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Related Journals */}
          {relatedJournals.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-600" />
                قصص مشابهة
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {relatedJournals.map((related) => (
                  <Link
                    key={related.id}
                    href={`/journals/${related.id}`}
                    className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-lg hover:-translate-y-1 transition-all group"
                  >
                    <span className="text-2xl mb-2 block">{JOURNAL_CATEGORIES[related.category].icon}</span>
                    <h4 className="font-semibold text-gray-800 group-hover:text-amber-700 transition-colors line-clamp-2">
                      {related.titleAr}
                    </h4>
                    {related.excerpt && (
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">{related.excerpt}</p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between py-8 border-t border-gray-200">
            <Link
              href="/journals"
              className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
              كل القصص
            </Link>
            <Link
              href="/journals/new"
              className="flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors"
            >
              إضافة قصة جديدة
              <ChevronLeft className="w-5 h-5" />
            </Link>
          </div>
        </article>
      </div>

      {/* Bottom spacing */}
      <div className="h-20 lg:h-0" />
    </div>
  );
}
