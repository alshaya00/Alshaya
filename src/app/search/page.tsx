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
import { normalizeForSearch } from '@/lib/search-utils';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton, SkeletonAvatar } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { Avatar, AvatarImage, AvatarFallback, getInitials } from '@/components/ui/Avatar';

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

  const normalizeArabic = normalizeForSearch;

  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = normalizeArabic(str1);
    const s2 = normalizeArabic(str2);

    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.9;

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

    const normalizedQuery = normalizeForSearch(query);
    const stopWords = ['بن', 'بنت', 'bin', 'bint', 'ibn', 'al', 'ال', 'آل'];
    const queryTerms = normalizedQuery.split(/\s+/).filter(t => t.length > 0 && !stopWords.includes(t));

    const scoredResults = membersWithAncestry.map((m) => {
      const normalizedChain = normalizeArabic(m.ancestorChain);
      const normalizedFirstName = normalizeArabic(m.firstName);
      const normalizedFullNameAr = normalizeArabic(m.fullNameAr || '');
      const normalizedFatherName = normalizeArabic(m.fatherName || '');
      const normalizedCity = normalizeArabic(m.city || '');
      const normalizedOccupation = normalizeArabic(m.occupation || '');
      const fullNameEnLower = (m.fullNameEn || '').toLowerCase();

      let score = 0;

      if (normalizedFirstName === normalizedQuery) {
        score += 100;
      } else if (normalizedFirstName.startsWith(normalizedQuery)) {
        score += 80;
      } else if (normalizedFirstName.includes(normalizedQuery)) {
        score += 60;
      }

      if (normalizedFullNameAr.includes(normalizedQuery)) {
        score += 50;
      }

      if (normalizedChain.includes(normalizedQuery)) {
        score += 40;
      }

      const matchedTerms = queryTerms.filter(term =>
        normalizedChain.includes(term) ||
        normalizedFirstName.includes(term) ||
        normalizedFatherName.includes(term)
      );
      score += matchedTerms.length * 20;

      const firstNameSimilarity = calculateSimilarity(m.firstName, query);
      if (firstNameSimilarity > 0.7) {
        score += firstNameSimilarity * 30;
      }

      if (fullNameEnLower.includes(query.toLowerCase())) {
        score += 35;
      }

      if (normalizedCity.includes(normalizedQuery)) {
        score += 15;
      }
      if (normalizedOccupation.includes(normalizedQuery)) {
        score += 10;
      }

      if (m.id.toLowerCase().includes(query.toLowerCase())) {
        score += 25;
      }

      return { member: m, score };
    });

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
        <Spinner size="md" label="جاري التحميل..." />
      </div>
    );
  }

  return (
    <PageLayout
      title="البحث في العائلة"
      description="ابحث عن أي فرد من أفراد العائلة"
      narrow
    >
      {/* Search Bar Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <Input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="ابحث بالاسم، الرقم، المدينة، المهنة..."
            leftIcon={<SearchIcon size={20} />}
            rightIcon={
              query ? (
                <button
                  onClick={clearSearch}
                  className="pointer-events-auto cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  <X size={18} />
                </button>
              ) : undefined
            }
            className="text-lg h-12"
            autoFocus
          />

          {/* Suggestions */}
          {suggestions.length > 0 && query && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">اقتراحات:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setQuery(s.ancestorChain)}
                    className="px-3 py-1 rounded-full text-sm border border-border bg-muted/50 hover:bg-muted transition-colors"
                  >
                    {s.ancestorChain}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent searches */}
          {recentSearches.length > 0 && !query && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">عمليات البحث الأخيرة:</p>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term, i) => (
                  <button
                    key={i}
                    onClick={() => setQuery(term)}
                    className="px-3 py-1 rounded-full text-sm bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {query && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <p className="text-muted-foreground mb-4">
              {searchResults.length === 0
                ? 'لم يتم العثور على نتائج'
                : `تم العثور على ${searchResults.length} نتيجة`}
            </p>

            <div className="space-y-2">
              {searchResults.slice(0, 50).map((member) => (
                <Link
                  key={member.id}
                  href={`/member/${member.id}`}
                  className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
                >
                  {/* Avatar */}
                  {member.photoUrl ? (
                    <Avatar size="lg">
                      <AvatarImage src={member.photoUrl} alt={member.firstName} />
                      <AvatarFallback>{getInitials(member.firstName)}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <GenderAvatar gender={member.gender} size="lg" />
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{member.ancestorChain}</span>
                      <span className="text-xs text-muted-foreground">({formatMemberId(member.id)})</span>
                    </div>
                    {member.fullNameAr && member.fullNameAr !== member.ancestorChain && (
                      <p className="text-sm text-muted-foreground truncate">{member.fullNameAr}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
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

                  {/* Badges */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="info"
                      size="sm"
                      className={`text-white ${getGenerationColor(member.generation)}`}
                    >
                      الجيل {member.generation}
                    </Badge>
                    <Eye size={16} className="text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!query && (
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <User size={64} className="mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">ابدأ البحث</h3>
            <p className="text-muted-foreground">
              اكتب اسم الشخص أو رقمه أو المدينة أو المهنة للبحث
            </p>
          </CardContent>
        </Card>
      )}
    </PageLayout>
  );
}

export default function SearchPage() {
  return (
    <ProtectedRoute redirectTo="/login">
      <SearchPageContent />
    </ProtectedRoute>
  );
}
