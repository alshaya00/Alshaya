'use client';

import { Loader2, Search } from 'lucide-react';

interface NavSearchProps {
  /** Desktop global search bar */
  variant: 'desktop' | 'mobile';
  searchQuery: string;
  isSearching: boolean;
  onSearchQueryChange: (query: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  searchInputRef?: React.RefObject<HTMLInputElement>;
}

export function NavSearch({
  variant,
  searchQuery,
  isSearching,
  onSearchQueryChange,
  onSubmit,
  searchInputRef,
}: NavSearchProps) {
  if (variant === 'desktop') {
    return (
      <form
        onSubmit={onSubmit}
        className="hidden md:flex flex-1 max-w-md mx-4"
        role="search"
      >
        <div className="relative w-full">
          <label htmlFor="global-search" className="sr-only">البحث عن أفراد العائلة</label>
          <input
            ref={searchInputRef}
            id="global-search"
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="ابحث عن أفراد العائلة... (⌘K)"
            className="w-full px-4 py-2 pr-10 rounded-lg bg-white/20 backdrop-blur-sm text-white placeholder-green-200 border border-white/30 focus:bg-white/30 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
            aria-describedby="search-hint"
          />
          <button
            type="submit"
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/20 rounded-md transition-colors"
            aria-label="بحث"
            disabled={isSearching}
          >
            {isSearching ? (
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
            ) : (
              <Search size={18} aria-hidden="true" />
            )}
          </button>
          <span id="search-hint" className="sr-only">اضغط Enter للبحث أو استخدم Ctrl+K للتركيز على البحث</span>
        </div>
      </form>
    );
  }

  // Mobile search (inside drawer)
  return (
    <form onSubmit={onSubmit} role="search">
      <label htmlFor="mobile-search" className="sr-only">البحث</label>
      <div className="relative">
        <input
          id="mobile-search"
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder="ابحث عن أفراد العائلة..."
          className="w-full px-4 py-2 pr-10 rounded-lg bg-white/20 text-white placeholder-green-200 border border-white/30 focus:bg-white/30 focus:outline-none text-sm"
        />
        <button
          type="submit"
          className="absolute left-2 top-1/2 -translate-y-1/2 p-1"
          aria-label="بحث"
        >
          <Search size={16} aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
