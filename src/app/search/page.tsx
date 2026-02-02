'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import type { FamilyMember } from '@/lib/types';
import { calculateAge, getGenerationColor, formatMemberId } from '@/lib/utils';
import { Search as SearchIcon, User, Calendar, MapPin, Eye, X, GitBranch, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import GenderAvatar from '@/components/GenderAvatar';
import Image from 'next/image';

function SearchPageContent() {
  const [allMembers, setAllMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const { session } = useAuth();

  useEffect(() => {
    async function fetchMembers() {
      try {
        const res = await fetch('/api/members?limit=2000', {
          headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setAllMembers(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching members:', error);
      } finally {
        setIsLoading(false);
      }
    }
    if (session?.token) {
      fetchMembers();
    }
  }, [session?.token]);

  const buildAncestorChain = (member: FamilyMember, membersMap: Map<string, FamilyMember>, maxDepth = 10): string => {
    const ancestors: string[] = [member.firstName];
    let currentId = member.fatherId;
    let depth = 0;
    
    while (currentId && depth < maxDepth) {
      const father = membersMap.get(currentId);
      if (father) {
        ancestors.push(father.firstName);
        currentId = father.fatherId;
      } else {
        break;
      }
      depth++;
    }
    
    return ancestors.join(' بن ');
  };

  const membersMap = useMemo(() => {
    const map = new Map<string, FamilyMember>();
    allMembers.forEach(m => map.set(m.id, m));
    return map;
  }, [allMembers]);

  const membersWithAncestry = useMemo(() => {
    return allMembers.map(m => ({
      ...m,
      ancestorChain: buildAncestorChain(m, membersMap)
    }));
  }, [allMembers, membersMap]);

  // Normalize Arabic text for flexible matching
  const normalizeArabic = (text: string): string => {
    if (!text) return '';
    return text
      // Remove diacritics (tashkeel)
      .replace(/[\u064B-\u065F\u0670]/g, '')
      // Normalize alef variations (أ إ آ ا)
      .replace(/[أإآا]/g, 'ا')
      // Normalize ya variations (ي ى)
      .replace(/[ىي]/g, 'ي')
      // Normalize ta marbuta to ha (ة → ه)
      .replace(/ة/g, 'ه')
      // Normalize hamza variations
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/ء/g, '')
      // Remove common connectors for flexible matching
      .replace(/\s+بن\s+/g, ' ')
      .replace(/\s+بنت\s+/g, ' ')
      .replace(/\s+ال/g, ' ')
      .replace(/^ال/, '')
      // Normalize spaces
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  };

  // Calculate similarity score between two strings (0-1)
  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = normalizeArabic(str1);
    const s2 = normalizeArabic(str2);
    
    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.9;
    
    // Check if all characters of shorter string exist in longer
    const shorter = s1.length < s2.length ? s1 : s2;
    const longer = s1.length < s2.length ? s2 : s1;
    
    let matchCount = 0;
    for (const char of shorter) {
      if (longer.includes(char)) matchCount++;
    }
    
    return matchCount / shorter.length;
  };

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];

    const normalizedQuery = normalizeArabic(query);
    const queryTerms = normalizedQuery.split(/\s+/).filter(t => t.length > 0);
    
    // Score each member based on match quality
    const scoredResults = membersWithAncestry.map((m) => {
      const normalizedChain = normalizeArabic(m.ancestorChain);
      const normalizedFirstName = normalizeArabic(m.firstName);
      const normalizedFullNameAr = normalizeArabic(m.fullNameAr || '');
      const normalizedFatherName = normalizeArabic(m.fatherName || '');
      const normalizedCity = normalizeArabic(m.city || '');
      const normalizedOccupation = normalizeArabic(m.occupation || '');
      const fullNameEnLower = (m.fullNameEn || '').toLowerCase();
      
      let score = 0;
      
      // Exact match on first name (highest priority)
      if (normalizedFirstName === normalizedQuery) {
        score += 100;
      } else if (normalizedFirstName.startsWith(normalizedQuery)) {
        score += 80;
      } else if (normalizedFirstName.includes(normalizedQuery)) {
        score += 60;
      }
      
      // Match on full Arabic name
      if (normalizedFullNameAr.includes(normalizedQuery)) {
        score += 50;
      }
      
      // Match on ancestor chain
      if (normalizedChain.includes(normalizedQuery)) {
        score += 40;
      }
      
      // Match individual terms (for multi-word queries)
      const matchedTerms = queryTerms.filter(term => 
        normalizedChain.includes(term) ||
        normalizedFirstName.includes(term) ||
        normalizedFatherName.includes(term)
      );
      score += matchedTerms.length * 20;
      
      // Fuzzy match on first name (for typos)
      const firstNameSimilarity = calculateSimilarity(m.firstName, query);
      if (firstNameSimilarity > 0.7) {
        score += firstNameSimilarity * 30;
      }
      
      // Match on English name
      if (fullNameEnLower.includes(query.toLowerCase())) {
        score += 35;
      }
      
      // Match on city or occupation
      if (normalizedCity.includes(normalizedQuery)) {
        score += 15;
      }
      if (normalizedOccupation.includes(normalizedQuery)) {
        score += 10;
      }
      
      // Match on ID
      if (m.id.toLowerCase().includes(query.toLowerCase())) {
        score += 25;
      }
      
      return { member: m, score };
    });
    
    // Filter members with any match and sort by score
    return scoredResults
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(r => r.member);
  }, [membersWithAncestry, query]);

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
    const normalizedQuery = normalizeArabic(query);
    return membersWithAncestry
      .filter((m) => {
        const normalizedChain = normalizeArabic(m.ancestorChain);
        const normalizedFirstName = normalizeArabic(m.firstName);
        return normalizedChain.includes(normalizedQuery) || 
               normalizedFirstName.includes(normalizedQuery) ||
               calculateSimilarity(m.firstName, query) > 0.7;
      })
      .slice(0, 8);
  }, [membersWithAncestry, query]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 pb-24 lg:pb-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center justify-center gap-3">
            <SearchIcon className="text-blue-600" size={36} />
            البحث في العائلة
          </h1>
          <p className="text-gray-600 mt-2">ابحث عن أي فرد من أفراد العائلة</p>
        </div>

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

          {suggestions.length > 0 && query && (
            <div className="mt-2 border-t pt-2">
              <p className="text-xs text-gray-500 mb-2">اقتراحات:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setQuery(s.ancestorChain)}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm transition-colors"
                  >
                    {s.ancestorChain}
                  </button>
                ))}
              </div>
            </div>
          )}

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

        {query && (
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
            <p className="text-gray-600 mb-4">
              {searchResults.length === 0
                ? 'لم يتم العثور على نتائج'
                : `تم العثور على ${searchResults.length} نتيجة`}
            </p>

            <div className="space-y-3">
              {searchResults.slice(0, 50).map((member) => (
                <Link
                  key={member.id}
                  href={`/member/${member.id}`}
                  className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  {member.photoUrl ? (
                    <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
                      <Image
                        src={member.photoUrl}
                        alt={member.firstName}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <GenderAvatar gender={member.gender} size="lg" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-800">{member.ancestorChain}</span>
                      <span className="text-xs text-gray-400">({formatMemberId(member.id)})</span>
                    </div>
                    {member.fullNameAr && member.fullNameAr !== member.ancestorChain && (
                      <p className="text-sm text-gray-500">{member.fullNameAr}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      {member.branch && (
                        <span className="flex items-center gap-1">
                          <GitBranch size={12} />
                          {member.branch}
                        </span>
                      )}
                      {member.city && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {member.city}
                        </span>
                      )}
                      {member.birthYear && (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {member.birthYear}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 text-xs rounded-full text-white ${getGenerationColor(
                        member.generation
                      )}`}
                    >
                      الجيل {member.generation}
                    </span>
                    <Eye size={16} className="text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {!query && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <User size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">ابدأ البحث</h3>
            <p className="text-gray-500">
              اكتب اسم الشخص أو رقمه أو المدينة أو المهنة للبحث
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <ProtectedRoute redirectTo="/login">
      <SearchPageContent />
    </ProtectedRoute>
  );
}
