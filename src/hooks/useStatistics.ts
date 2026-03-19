'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/* ============================================
   Types
   ============================================ */
export interface NewestMember {
  id: string;
  firstName: string;
  gender: string;
  generation: number;
  branch: string | null;
  createdAt: string;
}

export interface Statistics {
  totalMembers: number;
  males: number;
  females: number;
  generations: number;
  branches: { name: string; count: number }[];
  generationBreakdown: {
    generation: number;
    count: number;
    males: number;
    females: number;
    percentage: number;
  }[];
  registeredUsers: number;
  recentRegistrations: number;
  newestMembers: NewestMember[];
}

export interface FamilyMember {
  id: string;
  firstName: string;
  gender: 'Male' | 'Female';
  status: string;
  city: string | null;
  occupation: string | null;
  birthYear: number | null;
}

export interface AgeGroups {
  [key: string]: number;
}

export interface DerivedStats {
  livingMembers: number;
  deceasedMembers: number;
  topCities: [string, number][];
  topOccupations: { displayName: string; count: number }[];
  ageGroups: AgeGroups;
}

const DEFAULT_STATS: Statistics = {
  totalMembers: 0,
  males: 0,
  females: 0,
  generations: 0,
  branches: [],
  generationBreakdown: [],
  registeredUsers: 0,
  recentRegistrations: 0,
  newestMembers: [],
};

const AGE_GROUP_LABELS: Record<string, [number, number]> = {
  'أطفال (0-14)': [0, 14],
  'شباب (15-30)': [15, 30],
  'بالغين (31-50)': [31, 50],
  'كبار (51-70)': [51, 70],
  'كبار السن (70+)': [71, Infinity],
};

/* ============================================
   Normalization helpers
   ============================================ */
function normalizeOccupation(occ: string): string {
  return occ.trim().replace(/\s+/g, ' ').replace(/ه\b/g, 'ة');
}

function computeDerivedStats(allMembers: FamilyMember[]): DerivedStats {
  const livingMembers = allMembers.filter((m) => m.status === 'Living').length;
  const deceasedMembers = allMembers.filter((m) => m.status === 'Deceased').length;

  // Cities
  const membersByCity = allMembers
    .filter((m) => m.city)
    .reduce((acc, m) => {
      const normalizedCity = m.city!.trim().replace(/\s+/g, ' ');
      acc[normalizedCity] = (acc[normalizedCity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const topCities = Object.entries(membersByCity)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Occupations
  const occupationMap: Record<string, { count: number; displayName: string }> = {};
  allMembers
    .filter((m) => m.occupation)
    .forEach((m) => {
      const normalized = normalizeOccupation(m.occupation!);
      if (!occupationMap[normalized]) {
        occupationMap[normalized] = { count: 0, displayName: m.occupation!.trim() };
      }
      occupationMap[normalized].count++;
    });

  const topOccupations = Object.values(occupationMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Age distribution
  const currentYear = new Date().getFullYear();
  const ageGroups: AgeGroups = {};
  for (const label of Object.keys(AGE_GROUP_LABELS)) {
    ageGroups[label] = 0;
  }

  allMembers.forEach((m) => {
    if (m.birthYear && m.status === 'Living') {
      const age = currentYear - m.birthYear;
      for (const [label, [min, max]] of Object.entries(AGE_GROUP_LABELS)) {
        if (age >= min && age <= max) {
          ageGroups[label]++;
          break;
        }
      }
    }
  });

  return { livingMembers, deceasedMembers, topCities, topOccupations, ageGroups };
}

/* ============================================
   Hook
   ============================================ */
export function useStatistics() {
  const { session } = useAuth();
  const [stats, setStats] = useState<Statistics>(DEFAULT_STATS);
  const [allMembers, setAllMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const headers: HeadersInit = session?.token
        ? { Authorization: `Bearer ${session.token}` }
        : {};

      const statsRes = await fetch('/api/statistics', { headers });
      const statsData = await statsRes.json();
      setStats(statsData);

      const membersRes = await fetch('/api/members?limit=2000', { headers });
      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setAllMembers(membersData.data || []);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('فشل في تحميل البيانات');
    } finally {
      setIsLoading(false);
    }
  }, [session?.token]);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      loadData();
    }
  }, [loadData]);

  const derived = computeDerivedStats(allMembers);

  return {
    stats,
    allMembers,
    isLoading,
    error,
    refetch: loadData,
    ...derived,
  };
}
