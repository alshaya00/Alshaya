'use client';

import Link from 'next/link';
import { Menu, X, Search } from 'lucide-react';
import { useNavigation } from '@/hooks/useNavigation';
import { DesktopNav, MobileBottomNav, MobileDrawer, UserMenu, NavSearch } from './nav';

export function Navigation() {
  const { user, hasPermission, isFeatureEnabled, state, actions, refs, data } = useNavigation();

  return (
    <>
      <header className="bg-gradient-to-l from-green-600 to-green-700 text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-3 md:py-4 gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 md:gap-3 shrink-0">
              <span className="text-2xl md:text-3xl" role="img" aria-label="شجرة العائلة">🌳</span>
              <div className="hidden sm:block">
                <h1 className="text-lg md:text-xl font-bold">شجرة آل شايع</h1>
                <p className="text-[10px] md:text-xs text-green-200">Al-Shaya Family Tree</p>
              </div>
            </Link>

            {/* Desktop Search */}
            <NavSearch
              variant="desktop"
              searchQuery={state.searchQuery}
              isSearching={state.isSearching}
              onSearchQueryChange={actions.setSearchQuery}
              onSubmit={actions.handleSearch}
              searchInputRef={refs.searchInputRef}
            />

            {/* Desktop Navigation Links */}
            <DesktopNav
              pathname={state.pathname}
              filteredNavItems={data.filteredNavItems}
              filteredMoreNavItems={data.filteredMoreNavItems}
              isMoreOpen={state.isMoreOpen}
              onMoreToggle={() => actions.setIsMoreOpen(!state.isMoreOpen)}
              moreMenuRef={refs.moreMenuRef}
            />

            {/* Desktop User Menu */}
            <div className="hidden lg:flex items-center gap-4">
              {user && (
                <UserMenu
                  user={user}
                  isOpen={state.isUserMenuOpen}
                  onToggle={() => actions.setIsUserMenuOpen(!state.isUserMenuOpen)}
                  onClose={() => actions.setIsUserMenuOpen(false)}
                  onLogout={actions.handleLogout}
                  hasPermission={hasPermission}
                />
              )}
            </div>

            {/* Mobile: Search & Menu buttons */}
            <div className="flex items-center gap-2 lg:hidden">
              <Link
                href="/search"
                className="p-2 rounded-lg hover:bg-green-500 transition-colors"
                aria-label="البحث"
              >
                <Search size={22} aria-hidden="true" />
              </Link>
              <button
                onClick={() => actions.setIsMenuOpen(!state.isMenuOpen)}
                className="p-2 rounded-lg hover:bg-green-500 transition-colors"
                aria-label={state.isMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
                aria-expanded={state.isMenuOpen}
              >
                {state.isMenuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav
          pathname={state.pathname}
          filteredMobileNavItems={data.filteredMobileNavItems}
          filteredMoreNavItems={data.filteredMoreNavItems}
          isMobileMoreOpen={state.isMobileMoreOpen}
          onMobileMoreToggle={() => actions.setIsMobileMoreOpen(!state.isMobileMoreOpen)}
          onMobileMoreClose={() => actions.setIsMobileMoreOpen(false)}
          mobileMoreRef={refs.mobileMoreRef}
        />
      </header>

      {/* Mobile Slide-out Drawer */}
      <MobileDrawer
        isOpen={state.isMenuOpen}
        onClose={() => actions.setIsMenuOpen(false)}
        pathname={state.pathname}
        filteredNavItems={data.filteredNavItems}
        filteredMoreNavItems={data.filteredMoreNavItems}
        user={user}
        isFeatureEnabled={isFeatureEnabled}
        searchQuery={state.searchQuery}
        onSearchQueryChange={actions.setSearchQuery}
        onSearch={actions.handleSearch}
        onLogout={actions.handleLogout}
      />

      {/* Spacer for bottom nav on mobile */}
      <div className="lg:hidden h-16" />
    </>
  );
}
