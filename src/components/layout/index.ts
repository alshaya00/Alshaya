// Design System - Layout Components
// Tree-shakeable named exports

// Header
export { Header, HeaderTitle, HeaderActions, ThemeToggle, LanguageToggle } from './Header';
export type { HeaderProps, ThemeToggleProps, LanguageToggleProps } from './Header';

// Sidebar
export {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarItem,
  SidebarFooter,
  SidebarToggle,
  useSidebar,
} from './Sidebar';
export type { SidebarProps, SidebarGroupProps, SidebarItemProps } from './Sidebar';

// PageLayout
export { PageLayout, PageSection, Breadcrumb } from './PageLayout';
export type { PageLayoutProps, PageSectionProps, BreadcrumbProps, BreadcrumbItem } from './PageLayout';

// MobileNav
export { MobileNav, MobileNavSpacer } from './MobileNav';
export type { MobileNavProps, MobileNavItem } from './MobileNav';
