'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen, Clock, MapPin, User, Filter, Search, ChevronDown,
  Scroll, Tent, Heart, Feather, TreePine,
  Eye, Plus, Sparkles
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { JOURNAL_CATEGORIES, type JournalCategoryType, type FamilyJournal } from '@/lib/types';

const categoryIcons: Record<JournalCategoryType, React.ReactNode> = {
  ORAL_HISTORY: <Scroll className="w-5 h-5" />,
  MIGRATION: <Tent className="w-5 h-5" />,
  MEMORY: <Heart className="w-5 h-5" />,
  POEM: <Feather className="w-5 h-5" />,
  GENEALOGY: <TreePine className="w-5 h-5" />,
};

const categoryColors: Record<JournalCategoryType, string> = {
  ORAL_HISTORY: 'bg-amber-100 text-amber-700 border-amber-200',
  MIGRATION: 'bg-orange-100 text-orange-700 border-orange-200',
  MEMORY: 'bg-blue-100 text-blue-700 border-blue-200',
  POEM: 'bg-rose-100 text-rose-700 border-rose-200',
  GENEALOGY: 'bg-green-100 text-green-700 border-green-200',
};

export default function JournalsPage() {
  const [journals, setJournals] = useState<FamilyJournal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchJournals();
  }, [selectedCategory, searchQuery]);

  const fetchJournals = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (searchQuery) params.append('search', searchQuery);
      params.append('status', 'PUBLISHED');

      const response = await fetch(`/api/journals?${params}`);
      const data = await response.json();

      if (data.success) {
        setJournals(data.data);
      }
    } catch (error) {
      console.error('Error fetching journals:', error);
    } finally {
      setLoading(false);
    }
  };

  const featuredJournals = journals.filter(j => j.isFeatured);
  const regularJournals = journals.filter(j => !j.isFeatured);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-green-50">
      <Navigation />

      {/* Hero Section */}
      <div className="relative bg-gradient-to-l from-amber-600 via-amber-700 to-amber-800 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="container mx-auto px-4 py-12 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <BookOpen className="w-10 h-10" />
              <h1 className="text-3xl md:text-4xl font-bold">سجل العائلة</h1>
            </div>
            <p className="text-amber-100 text-lg mb-6">
              رحلة عبر الزمن في قصص وذكريات آل شايع
            </p>
            <p className="text-amber-200 text-sm">
              Family Journal - Stories & Memories of Al-Shaye
            </p>
          </div>
        </div>

        {/* Decorative wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 60L60 55C120 50 240 40 360 35C480 30 600 30 720 32.5C840 35 960 40 1080 42.5C1200 45 1320 45 1380 45L1440 45V60H1380C1320 60 1200 60 1080 60C960 60 840 60 720 60C600 60 480 60 360 60C240 60 120 60 60 60H0Z" fill="rgb(255 251 235)" />
          </svg>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4">
            {/* Search */}
            <div className="relative w-full md:w-96">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="ابحث في القصص والذكريات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
              />
            </div>

            <div className="flex items-center gap-3">
              {/* Filter Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                  showFilters
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'border-gray-200 text-gray-600 hover:border-amber-300'
                }`}
              >
                <Filter className="w-4 h-4" />
                تصفية
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>

              {/* Add New */}
              <Link
                href="/journals/new"
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                إضافة قصة
              </Link>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm animate-in slide-in-from-top-2">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">التصنيف</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                      selectedCategory === 'all'
                        ? 'bg-amber-100 border-amber-300 text-amber-700'
                        : 'border-gray-200 text-gray-600 hover:border-amber-300'
                    }`}
                  >
                    الكل
                  </button>
                  {Object.entries(JOURNAL_CATEGORIES).map(([key, cat]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedCategory(key)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-all flex items-center gap-1 ${
                        selectedCategory === key
                          ? categoryColors[key as JournalCategoryType]
                          : 'border-gray-200 text-gray-600 hover:border-amber-300'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      {cat.nameAr}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mb-4" />
            <p className="text-gray-500">جاري تحميل القصص...</p>
          </div>
        ) : journals.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 bg-amber-100 rounded-full flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">لا توجد قصص بعد</h3>
            <p className="text-gray-500 mb-6">كن أول من يضيف قصة من تاريخ العائلة</p>
            <Link
              href="/journals/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              إضافة أول قصة
            </Link>
          </div>
        ) : (
          <>
            {/* Featured Stories */}
            {featuredJournals.length > 0 && (
              <div className="mb-12">
                <div className="flex items-center gap-2 mb-6">
                  <Sparkles className="w-6 h-6 text-amber-600" />
                  <h2 className="text-xl font-bold text-gray-800">قصص مميزة</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredJournals.map((journal) => (
                    <JournalCard key={journal.id} journal={journal} featured />
                  ))}
                </div>
              </div>
            )}

            {/* Stories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularJournals.map((journal) => (
                <JournalCard key={journal.id} journal={journal} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bottom spacing for mobile nav */}
      <div className="h-20 lg:h-0" />
    </div>
  );
}

// Journal Card Component
function JournalCard({ journal, featured = false }: { journal: FamilyJournal; featured?: boolean }) {
  const category = JOURNAL_CATEGORIES[journal.category];

  return (
    <Link href={`/journals/${journal.id}`}>
      <article className={`group bg-white rounded-2xl border overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 ${
        featured ? 'border-amber-200 shadow-md' : 'border-gray-100 shadow-sm'
      }`}>
        {/* Cover Image */}
        {journal.coverImageUrl ? (
          <div className="relative h-48 overflow-hidden">
            <img
              src={journal.coverImageUrl}
              alt={journal.titleAr}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 right-4 left-4">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${categoryColors[journal.category]}`}>
                {categoryIcons[journal.category]}
                {category.nameAr}
              </span>
            </div>
          </div>
        ) : (
          <div className={`h-32 bg-gradient-to-br ${
            featured
              ? 'from-amber-100 to-amber-200'
              : 'from-gray-50 to-gray-100'
          } flex items-center justify-center`}>
            <div className="text-5xl opacity-50">{category.icon}</div>
          </div>
        )}

        {/* Content */}
        <div className="p-5">
          {!journal.coverImageUrl && (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs mb-3 ${categoryColors[journal.category]}`}>
              {categoryIcons[journal.category]}
              {category.nameAr}
            </span>
          )}

          <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2 group-hover:text-amber-700 transition-colors">
            {journal.titleAr}
          </h3>

          {journal.excerpt && (
            <p className="text-gray-500 text-sm line-clamp-3 mb-4 leading-relaxed">
              {journal.excerpt}
            </p>
          )}

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
            {journal.locationAr && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {journal.locationAr}
              </span>
            )}
            {journal.narrator && (
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {journal.narrator}
              </span>
            )}
            <span className="flex items-center gap-1 mr-auto">
              <Eye className="w-3.5 h-3.5" />
              {journal.viewCount}
            </span>
          </div>
        </div>

        {/* Featured Badge */}
        {featured && (
          <div className="absolute top-4 left-4">
            <span className="flex items-center gap-1 px-2 py-1 bg-amber-500 text-white text-xs rounded-full shadow-md">
              <Sparkles className="w-3 h-3" />
              مميزة
            </span>
          </div>
        )}
      </article>
    </Link>
  );
}
