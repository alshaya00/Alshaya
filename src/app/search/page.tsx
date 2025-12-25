'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import type { FamilyMember } from '@/lib/types';
import { calculateAge, getGenerationColor } from '@/lib/utils';
import { Search as SearchIcon, User, Calendar, MapPin, Eye, X, GitBranch, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

function SearchPageContent() {
  const [allMembers, setAllMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const { session } = useAuth();

  useEffect(() => {
    async function fetchMembers() {
      try {
        const res = await fetch('/api/members?limit=500', {
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

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];

    const term = query.toLowerCase().trim();
    const terms = term.split(/\s+/).filter(t => t.length > 0);
    
    return membersWithAncestry
      .filter((m) => {
        const ancestorChainLower = m.ancestorChain.toLowerCase();
        const allTermsMatch = terms.every(t => ancestorChainLower.includes(t));
        
        return allTermsMatch ||
          m.firstName.toLowerCase().includes(term) ||
          m.fullNameAr?.toLowerCase().includes(term) ||
          m.fullNameEn?.toLowerCase().includes(term) ||
          m.id.toLowerCase().includes(term) ||
          m.city?.toLowerCase().includes(term) ||
          m.occupation?.toLowerCase().includes(term) ||
          m.fatherName?.toLowerCase().includes(term) ||
          m.lineageBranchName?.toLowerCase().includes(term) ||
          m.subBranchName?.toLowerCase().includes(term);
      })
      .sort((a, b) => {
        const aChainLower = a.ancestorChain.toLowerCase();
        const bChainLower = b.ancestorChain.toLowerCase();
        const aMatchCount = terms.filter(t => aChainLower.includes(t)).length;
        const bMatchCount = terms.filter(t => bChainLower.includes(t)).length;
        return bMatchCount - aMatchCount;
      });
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
    return membersWithAncestry
      .filter((m) => m.ancestorChain.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);
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
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-xl ${
                      member.gender === 'Male' ? 'bg-blue-500' : 'bg-pink-500'
                    }`}
                  >
                    {member.gender === 'Male' ? '👨' : '👩'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-800">{member.ancestorChain}</span>
                      <span className="text-xs text-gray-400">({member.id})</span>
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
