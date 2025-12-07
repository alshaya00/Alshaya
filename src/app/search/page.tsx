'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { getAllMembers, FamilyMember } from '@/lib/data';
import { calculateAge, getGenerationColor } from '@/lib/utils';
import { Search as SearchIcon, User, Calendar, MapPin, Eye, X } from 'lucide-react';

export default function SearchPage() {
  const allMembers = getAllMembers();
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];

    const term = query.toLowerCase().trim();
    return allMembers.filter(
      (m) =>
        m.firstName.toLowerCase().includes(term) ||
        m.fullNameAr?.toLowerCase().includes(term) ||
        m.fullNameEn?.toLowerCase().includes(term) ||
        m.id.toLowerCase().includes(term) ||
        m.city?.toLowerCase().includes(term) ||
        m.occupation?.toLowerCase().includes(term) ||
        m.fatherName?.toLowerCase().includes(term)
    );
  }, [allMembers, query]);

  const handleSearch = (searchTerm: string) => {
    setQuery(searchTerm);
    if (searchTerm.trim() && !recentSearches.includes(searchTerm)) {
      setRecentSearches((prev) => [searchTerm, ...prev.slice(0, 4)]);
    }
  };

  const clearSearch = () => {
    setQuery('');
  };

  const suggestions = useMemo(() => {
    if (query.length < 2) return [];
    return allMembers
      .filter((m) => m.firstName.toLowerCase().startsWith(query.toLowerCase()))
      .slice(0, 5);
  }, [allMembers, query]);

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center justify-center gap-3">
            <SearchIcon className="text-blue-600" size={36} />
            البحث في العائلة
          </h1>
          <p className="text-gray-600 mt-2">ابحث عن أي فرد من أفراد العائلة</p>
        </div>

        {/* Search Box */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="relative">
            <SearchIcon
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={24}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="ابحث بالاسم، الرقم، المدينة، المهنة..."
              className="w-full pr-12 pl-12 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              autoFocus
            />
            {query && (
              <button
                onClick={clearSearch}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Quick Suggestions */}
          {suggestions.length > 0 && query && (
            <div className="mt-2 border-t pt-2">
              <p className="text-xs text-gray-500 mb-2">اقتراحات:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setQuery(s.firstName)}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm transition-colors"
                  >
                    {s.firstName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent Searches */}
          {recentSearches.length > 0 && !query && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2">عمليات البحث الأخيرة:</p>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term, i) => (
                  <button
                    key={i}
                    onClick={() => setQuery(term)}
                    className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-full text-sm transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Search Results */}
        {query && (
          <div className="mb-4 text-gray-600">
            تم العثور على <span className="font-bold">{searchResults.length}</span> نتيجة للبحث عن &ldquo;
            <span className="font-bold">{query}</span>&rdquo;
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="space-y-4">
            {searchResults.map((member) => (
              <div
                key={member.id}
                className={`bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-shadow ${
                  member.gender === 'Male' ? 'member-card-male' : 'member-card-female'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl shrink-0 ${
                      member.gender === 'Male'
                        ? 'bg-blue-100 border-2 border-blue-400'
                        : 'bg-pink-100 border-2 border-pink-400'
                    }`}
                  >
                    {member.gender === 'Male' ? '👨' : '👩'}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-gray-800">{member.firstName}</h3>
                      <span className="text-sm text-gray-500">({member.id})</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-white text-xs font-bold ${getGenerationColor(
                          member.generation
                        )}`}
                      >
                        ج{member.generation}
                      </span>
                    </div>

                    <p className="text-gray-600 text-sm mb-2">{member.fullNameAr}</p>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                      {member.birthYear && (
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {member.birthYear} ({calculateAge(member.birthYear)} سنة)
                        </span>
                      )}
                      {member.city && (
                        <span className="flex items-center gap-1">
                          <MapPin size={14} />
                          {member.city}
                        </span>
                      )}
                      {member.occupation && (
                        <span className="flex items-center gap-1">
                          <User size={14} />
                          {member.occupation}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action */}
                  <Link
                    href={`/member/${member.id}`}
                    className="flex items-center gap-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors shrink-0"
                  >
                    <Eye size={16} />
                    عرض
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {query && searchResults.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">لا توجد نتائج</h3>
            <p className="text-gray-600">
              لم نتمكن من العثور على أي فرد يطابق بحثك. جرب كلمات مختلفة.
            </p>
          </div>
        )}

        {/* Empty State */}
        {!query && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🔎</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">ابدأ البحث</h3>
            <p className="text-gray-600 mb-6">
              أدخل اسم الشخص أو رقمه للبحث في قاعدة بيانات العائلة
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => setQuery('محمد')}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                محمد
              </button>
              <button
                onClick={() => setQuery('الرياض')}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                الرياض
              </button>
              <button
                onClick={() => setQuery('مهندس')}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                مهندس
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
