'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureFlags, routeToFeature } from '@/contexts/FeatureFlagsContext';
import { mainNavItems, mobileNavItems, moreNavItems as configMoreNavItems, NavItem } from '@/config/navigation';

export interface NavigationState {
  pathname: string;
  isMenuOpen: boolean;
  isMoreOpen: boolean;
  isMobileMoreOpen: boolean;
  isUserMenuOpen: boolean;
  searchQuery: string;
  isSearching: boolean;
}

export interface NavigationActions {
  setIsMenuOpen: (open: boolean) => void;
  setIsMoreOpen: (open: boolean) => void;
  setIsMobileMoreOpen: (open: boolean) => void;
  setIsUserMenuOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  handleSearch: (e: React.FormEvent) => void;
  handleLogout: () => Promise<void>;
}

export interface NavigationRefs {
  moreMenuRef: React.RefObject<HTMLDivElement>;
  mobileMoreRef: React.RefObject<HTMLDivElement>;
  searchInputRef: React.RefObject<HTMLInputElement>;
}

export interface NavigationData {
  filteredNavItems: NavItem[];
  filteredMobileNavItems: NavItem[];
  filteredMoreNavItems: NavItem[];
}

export function useNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, hasPermission } = useAuth();
  const { isFeatureEnabled } = useFeatureFlags();

  // State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Refs
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const mobileMoreRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Helper to check if a nav item should be visible based on feature flags
  const isNavItemEnabled = useCallback(
    (item: NavItem): boolean => {
      const featureKey = routeToFeature[item.href];
      if (!featureKey) return true;
      return isFeatureEnabled(featureKey);
    },
    [isFeatureEnabled]
  );

  // Filtered navigation items
  const filteredNavItems = mainNavItems.filter(isNavItemEnabled);
  const filteredMobileNavItems = mobileNavItems.filter(isNavItemEnabled);
  const filteredMoreNavItems = configMoreNavItems.filter((item) => {
    if (!isNavItemEnabled(item)) return false;
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  // Close menus on route change
  useEffect(() => {
    setIsMenuOpen(false);
    setIsMoreOpen(false);
    setIsMobileMoreOpen(false);
    setIsUserMenuOpen(false);
    setSearchQuery('');
  }, [pathname]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
      if (mobileMoreRef.current && !mobileMoreRef.current.contains(event.target as Node)) {
        setIsMobileMoreOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  // Ctrl+K search shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handlers
  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) {
        setIsSearching(true);
        router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        setTimeout(() => setIsSearching(false), 500);
      }
    },
    [searchQuery, router]
  );

  const handleLogout = useCallback(async () => {
    await logout();
    router.push('/login');
  }, [logout, router]);

  return {
    // Auth
    user,
    hasPermission,
    isFeatureEnabled,

    // State
    state: {
      pathname,
      isMenuOpen,
      isMoreOpen,
      isMobileMoreOpen,
      isUserMenuOpen,
      searchQuery,
      isSearching,
    } as NavigationState,

    // Actions
    actions: {
      setIsMenuOpen,
      setIsMoreOpen,
      setIsMobileMoreOpen,
      setIsUserMenuOpen,
      setSearchQuery,
      handleSearch,
      handleLogout,
    } as NavigationActions,

    // Refs
    refs: {
      moreMenuRef,
      mobileMoreRef,
      searchInputRef,
    } as NavigationRefs,

    // Data
    data: {
      filteredNavItems,
      filteredMobileNavItems,
      filteredMoreNavItems,
    } as NavigationData,
  };
}
