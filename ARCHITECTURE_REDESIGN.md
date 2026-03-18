# Alshaya Family Tree - Architecture Redesign Plan

**Project**: Al-Shaye Family Tree (شجرة آل شايع)
**Date**: March 2026
**Target**: Production-ready for 10,000+ users on Vercel with Vercel Postgres

## Current State Assessment

| Metric | Value |
|--------|-------|
| Source files (.ts/.tsx/.js/.jsx) | 364 |
| API route files | 129 |
| Prisma models | 40+ |
| Components | 43 |
| Scripts | 20+ |
| Dependencies | 24 runtime, 16 dev |

### Critical Problems Identified

1. **Three separate rate limiters**: `src/lib/rate-limit.ts`, `src/lib/rate-limiter.ts`, `src/lib/middleware/rateLimit.ts` -- all in-memory, all slightly different
2. **Five backup-related files**: `backup.ts`, `backup-service.ts`, `backup-scheduler.ts`, `backup-notifications.ts`, `github-backup.ts` -- overlapping responsibilities
3. **Mock Prisma client**: `src/lib/prisma.ts` silently returns empty data instead of failing, masking bugs in production
4. **Dual config models**: `SiteSettings` and `SystemConfig` in Prisma schema with overlapping fields (both have `maxLoginAttempts`, `sessionTimeout` equivalents, language settings)
5. **Dual auth systems**: `Admin` + `AdminSession` models alongside `User` + `Session` models -- legacy split
6. **Replit artifacts**: `replit.md`, `replit.nix`, `REPLIT_DEPLOYMENT_GUIDE.md`, Replit-specific `next.config.js` headers, port 5000 hardcoding
7. **Inconsistent API responses**: Some routes return `{ success, message }`, others `{ success, data }`, others raw arrays
8. **No standard pagination**: Each endpoint implements its own pagination shape
9. **No design system**: 5 UI components (`Button`, `Card`, `EmptyState`, `Spinner`, `Toast`) with no theming
10. **Images stored as base64 in database**: `imageData` and `thumbnailData` fields are `String` columns holding full base64 -- will not scale
11. **`X-Frame-Options: ALLOWALL`**: Security vulnerability, Replit leftover
12. **TypeScript/ESLint errors ignored in build**: `ignoreBuildErrors: true` and `ignoreDuringBuilds: true`

---

## Phase 1: Foundation Cleanup (Week 1-2)

**Goal**: Clean codebase, remove junk, set up proper infrastructure.

### 1.1 Remove Replit Artifacts

**Delete these files:**
```
replit.md
replit.nix
REPLIT_DEPLOYMENT_GUIDE.md
Dockerfile
docker-compose.yml
.dockerignore
scripts/start-production.js
PLAN-HARDCODED-MIGRATION.md
PRODUCTION_READINESS_AUDIT.md
QA-REPORT.md
ROADMAP.md
FUNCTIONALITY_CHECKLIST.md
```

**Update `next.config.js`** -- remove Replit-specific config:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false, // FIX: Enable lint checking
  },
  typescript: {
    ignoreBuildErrors: false, // FIX: Enable type checking
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.vercel-storage.com', // Vercel Blob
      },
      {
        protocol: 'https',
        hostname: 'alshaye.family',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

**Update `package.json` scripts:**
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate deploy",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio",
    "postinstall": "prisma generate"
  }
}
```

### 1.2 Consolidate Duplicate Rate Limiters

**Keep**: `src/lib/rate-limit.ts` (the one actually imported by `login/route.ts`)
**Delete**: `src/lib/rate-limiter.ts`, `src/lib/middleware/rateLimit.ts`
**Action**: Search all imports of the deleted files and redirect to `src/lib/rate-limit.ts`

```bash
# Find all imports to update:
grep -r "rate-limiter" src/ --include="*.ts" --include="*.tsx" -l
grep -r "middleware/rateLimit" src/ --include="*.ts" --include="*.tsx" -l
```

### 1.3 Consolidate Backup System

**Keep**: `src/lib/backup-service.ts` as the single backup module
**Delete**: `src/lib/backup.ts`, `src/lib/backup-scheduler.ts`, `src/lib/backup-notifications.ts`, `src/lib/github-backup.ts`
**Rationale**: On Vercel, filesystem-based backups do not work. Backups should be PostgreSQL `pg_dump` via Vercel CLI or scheduled Vercel Cron Jobs hitting a backup API endpoint.

### 1.4 Fix Prisma Client -- Remove Mock Fallback

Replace `src/lib/prisma.ts` entirely:

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
```

No mock. No silent failures. If `DATABASE_URL` is missing, Prisma throws at instantiation -- which is correct behavior.

### 1.5 Update `.gitignore`

Add entries for the Vercel workflow:
```gitignore
# Existing entries stay...

# Replit artifacts (legacy)
.replit
replit.nix
replit.md

# Vercel
.vercel

# Environment
.env
.env.*
!.env.example

# Data files
data/
*.csv
*.sql

# OS
Thumbs.db
```

### 1.6 Set Up GitHub Repository

```bash
git remote set-url origin https://github.com/alshaya00/alshaya-family-tree.git
# or
git remote add origin https://github.com/alshaya00/alshaya-family-tree.git
git branch -M main
git push -u origin main
```

### 1.7 Set Up Vercel Project

1. Connect GitHub repo to Vercel
2. Create Vercel Postgres database (region: `iad1` or `cdg1` closest to users)
3. Set environment variables:
   - `DATABASE_URL` -- Vercel Postgres connection string (pooled)
   - `DIRECT_DATABASE_URL` -- Direct connection for migrations
   - `JWT_SECRET` -- Generate with `openssl rand -base64 32`
   - `NEXTAUTH_URL` -- Production URL
4. Update `prisma/schema.prisma` for Vercel Postgres:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL")
}
```

---

## Phase 2: Architecture Cleanup (Week 3-5)

**Goal**: Standardize patterns, consolidate auth, clean up data models.

### 2.1 Standard API Response Format

Create `src/lib/api-response.ts`:

```typescript
import { NextResponse } from 'next/server';

// Standard success response
export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

// Standard error response
export function apiError(error: string, messageAr?: string, status = 400) {
  return NextResponse.json(
    { success: false, error, messageAr: messageAr || error },
    { status }
  );
}

// Standard paginated response
export function apiPaginated<T>(
  data: T[],
  opts: { page: number; limit: number; total: number }
) {
  return NextResponse.json({
    success: true,
    data,
    pagination: {
      page: opts.page,
      limit: opts.limit,
      total: opts.total,
      totalPages: Math.ceil(opts.total / opts.limit),
    },
  });
}

// Standard 401
export function apiUnauthorized() {
  return apiError('Unauthorized', 'غير مصرح', 401);
}

// Standard 403
export function apiForbidden() {
  return apiError('Forbidden', 'محظور', 403);
}

// Standard 404
export function apiNotFound(resource = 'Resource') {
  return apiError(`${resource} not found`, `${resource} غير موجود`, 404);
}
```

**Migration strategy**: Update routes in batches. Start with `auth/*` routes, then `members/*`, then `admin/*`. Each batch is a separate PR.

### 2.2 Consolidate Auth System

The codebase has two parallel auth systems:
- `User` + `Session` (newer, used by most routes)
- `Admin` + `AdminSession` (legacy, used by some admin routes)

**Plan**:
1. Ensure all admin users exist in the `User` table with `role = 'ADMIN'` or `'SUPER_ADMIN'`
2. Create a migration script to port any `Admin`-only accounts to `User`
3. Update all admin routes to use `User` + `Session` auth
4. Deprecate `Admin` and `AdminSession` models (keep in schema with `@@map("_deprecated_admin")` for safety, remove in Phase 5)

Create `src/lib/auth/get-auth-user.ts` -- single auth helper used everywhere:

```typescript
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export type AuthUser = {
  id: string;
  email: string;
  nameArabic: string;
  nameEnglish: string | null;
  role: string;
  linkedMemberId: string | null;
};

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) return null;
  if (session.user.status !== 'ACTIVE') return null;

  // Touch last active
  await prisma.session.update({
    where: { id: session.id },
    data: { lastActiveAt: new Date() },
  });

  return {
    id: session.user.id,
    email: session.user.email,
    nameArabic: session.user.nameArabic,
    nameEnglish: session.user.nameEnglish,
    role: session.user.role,
    linkedMemberId: session.user.linkedMemberId,
  };
}

export function requireRole(user: AuthUser, roles: string[]): boolean {
  return roles.includes(user.role);
}
```

### 2.3 Consolidate Settings Models

Merge `SiteSettings` + `SystemConfig` into a single `AppConfig` model:

```prisma
model AppConfig {
  id    String @id @default("default")
  key   String @unique
  value String
  type  String @default("string") // string, number, boolean, json
  group String @default("general") // general, auth, display, features, notifications

  @@index([group])
  @@index([key])
}
```

Create `src/lib/config-service.ts`:

```typescript
import { prisma } from '@/lib/prisma';

// In-memory cache with TTL
let configCache: Map<string, string> | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 60_000; // 1 minute

export async function getConfig(key: string, defaultValue?: string): Promise<string | null> {
  if (!configCache || Date.now() > cacheExpiry) {
    const rows = await prisma.appConfig.findMany();
    configCache = new Map(rows.map(r => [r.key, r.value]));
    cacheExpiry = Date.now() + CACHE_TTL;
  }
  return configCache.get(key) ?? defaultValue ?? null;
}

export async function setConfig(key: string, value: string, group = 'general'): Promise<void> {
  await prisma.appConfig.upsert({
    where: { key },
    create: { key, value, group },
    update: { value },
  });
  configCache = null; // Invalidate cache
}

export async function getConfigGroup(group: string): Promise<Record<string, string>> {
  const rows = await prisma.appConfig.findMany({ where: { group } });
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}
```

**Migration**: Write a seed script that reads existing `SiteSettings` and `SystemConfig` rows and inserts them as `AppConfig` key-value pairs. Keep old tables for rollback safety.

### 2.4 Standardize Pagination

Create `src/lib/pagination.ts`:

```typescript
export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
```

Every list endpoint uses this:

```typescript
export async function GET(request: NextRequest) {
  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);

  const [data, total] = await Promise.all([
    prisma.familyMember.findMany({ skip, take: limit }),
    prisma.familyMember.count(),
  ]);

  return apiPaginated(data, { page, limit, total });
}
```

### 2.5 Add Error Boundaries

Create `src/app/error.tsx` (app-level error boundary):

```tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center" dir="rtl">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-red-600">حدث خطأ</h2>
        <p className="text-gray-600">Something went wrong</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          حاول مرة أخرى
        </button>
      </div>
    </div>
  );
}
```

Create `src/app/not-found.tsx`, `src/app/loading.tsx` similarly.

### 2.6 Type-Safe API Layer

Create `src/lib/types/api.ts`:

```typescript
// Standard API response types
export type ApiResponse<T = unknown> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  messageAr?: string;
};

export type PaginatedResponse<T> = {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
```

---

## Phase 3: UI Redesign (Week 6-10)

**Goal**: Build a modern, RTL-first design system and overhaul all pages.

### 3.1 Install Design System Dependencies

```bash
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu \
  @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-tooltip \
  @radix-ui/react-popover @radix-ui/react-switch @radix-ui/react-avatar \
  @radix-ui/react-checkbox @radix-ui/react-separator \
  class-variance-authority tailwindcss-animate \
  framer-motion recharts
```

Remove: `xlsx` (use streaming CSV instead for export).

### 3.2 Tailwind Configuration Overhaul

Replace `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Neutral palette
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',

        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        // Semantic colors
        male: { light: '#DBEEF3', DEFAULT: '#3B82F6', dark: '#1D4ED8' },
        female: { light: '#FCE7F3', DEFAULT: '#EC4899', dark: '#BE185D' },
        success: { DEFAULT: '#22C55E', light: '#DCFCE7' },
        warning: { DEFAULT: '#F59E0B', light: '#FEF3C7' },

        // Brand
        gold: '#D4AF37',
        palm: '#228B22',
      },
      fontFamily: {
        sans: ['IBM Plex Sans Arabic', 'Inter', 'sans-serif'],
        display: ['Noto Kufi Arabic', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'slide-in-left': 'slide-in-left 0.3s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

### 3.3 CSS Variables for Theming

Add to `src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 7%;
    --card-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
  }
}

/* RTL-first: Arabic is the default direction */
html {
  direction: rtl;
}

html[dir="ltr"] {
  direction: ltr;
}
```

### 3.4 Component Library

Build these components in `src/components/ui/`:

| Component | File | Notes |
|-----------|------|-------|
| Button | `button.tsx` | Variants: default, destructive, outline, ghost, link. Sizes: sm, md, lg. Loading state. |
| Card | `card.tsx` | Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter |
| Input | `input.tsx` | RTL-aware, error states, with label |
| Select | `select.tsx` | Radix-based, searchable |
| Dialog/Modal | `dialog.tsx` | Radix-based, RTL-aware animations |
| Sheet | `sheet.tsx` | Slide-in panel (right for RTL, left for LTR) |
| Dropdown Menu | `dropdown-menu.tsx` | Radix-based |
| Tabs | `tabs.tsx` | Radix-based |
| Table | `table.tsx` | Sortable, with pagination built-in |
| DataTable | `data-table.tsx` | Full-featured table with search, filter, sort, pagination |
| Badge | `badge.tsx` | Status badges with semantic colors |
| Avatar | `avatar.tsx` | With fallback initials, gender-colored border |
| Toast | `toast.tsx` | Non-blocking notifications, RTL-positioned |
| Skeleton | `skeleton.tsx` | Loading skeletons |
| Separator | `separator.tsx` | Horizontal/vertical |
| Switch | `switch.tsx` | Toggle with RTL support |
| Tooltip | `tooltip.tsx` | Radix-based |
| Alert | `alert.tsx` | Info, success, warning, error variants |
| Breadcrumb | `breadcrumb.tsx` | RTL-aware with Arabic separators |
| Empty State | `empty-state.tsx` | Illustration + message + action |
| Stat Card | `stat-card.tsx` | Dashboard stats with icon, value, trend |
| Search Input | `search-input.tsx` | Debounced search with RTL layout |

### 3.5 Layout System

**Sidebar Layout** (`src/components/layout/sidebar-layout.tsx`):
- Collapsible sidebar on desktop (240px expanded, 64px collapsed)
- Bottom navigation on mobile
- RTL-first with proper icon flipping
- Dark mode toggle in sidebar footer

**Navigation Items:**
```
- الرئيسية (Dashboard)
- شجرة العائلة (Family Tree)
- السجل (Registry)
- البحث (Search)
- المعرض (Gallery)
- المجلة (Journal)
- التجمعات (Gatherings)
---
Admin Section (role-gated):
- إدارة الأعضاء (Members Hub)
- إدارة المستخدمين (Users)
- الطلبات المعلقة (Pending Requests)
- الإعدادات (Settings)
- التقارير (Reports)
- سجل التدقيق (Audit Log)
```

### 3.6 Page Redesigns

**Dashboard** (`src/app/(main)/page.tsx`):
- 4 stat cards: Total Members, Living, Branches, Generations
- Family tree mini-preview (clickable to full tree)
- Recent activity feed
- Upcoming gatherings
- Quick search bar

**Family Tree** (`src/app/(main)/tree/page.tsx`):
- Full-screen D3 visualization
- Floating toolbar: zoom, reset, search, filter by branch
- Member tooltip on hover
- Click to open member sheet (slide-in panel)
- Branch coloring with legend
- Performance: virtualize nodes, lazy-load deep branches

**Member Profile** (`src/app/(main)/members/[id]/page.tsx`):
- Hero section with avatar, name (Arabic primary), generation badge
- Tab layout: Overview, Family Connections, Photos, History
- Family connections: mini tree graph showing parents/children/siblings
- Edit button (role-gated)
- RTL-first text layout

**Login Page** (`src/app/(auth)/login/page.tsx`):
- Centered card with family logo
- Arabic-first bilingual form
- Gradient background with subtle pattern
- Remember me checkbox
- Forgot password link
- Register link

**Admin Dashboard** (`src/app/admin/page.tsx`):
- System health cards
- User registration chart (Recharts)
- Pending approvals count with action buttons
- Recent audit log entries

### 3.7 D3 Tree Visualization Improvements

Current: `src/components/FamilyTreeGraph.tsx` -- single monolithic component.

**Refactor into:**

```
src/components/tree/
  TreeCanvas.tsx          -- Main SVG/Canvas container
  TreeNode.tsx            -- Individual node rendering
  TreeLink.tsx            -- Connection lines
  TreeControls.tsx        -- Zoom, pan, filter controls
  TreeMinimap.tsx         -- Overview minimap
  TreeSearch.tsx          -- Search overlay
  useTreeLayout.ts        -- D3 layout hook (tree layout computation)
  useTreeInteraction.ts   -- Pan, zoom, click handlers
  useTreeData.ts          -- Data fetching + transformation
  tree-constants.ts       -- Node sizes, colors, spacing
```

**Key improvements:**
- Use `d3.tree()` with proper RTL layout (flip x-axis)
- Canvas rendering for 500+ nodes (fall back from SVG)
- Semantic zoom: show more detail as user zooms in
- Cluster by branch with color coding
- Animated transitions when expanding/collapsing branches
- Export tree as PNG/PDF

---

## Phase 4: Production Hardening (Week 11-13)

### 4.1 Vercel Postgres Connection Pooling

Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")       // Pooled connection (for queries)
  directUrl = env("DIRECT_DATABASE_URL") // Direct connection (for migrations)
}
```

In Vercel, `DATABASE_URL` uses `?pgbouncer=true&connection_limit=1` for serverless.

### 4.2 Rate Limiting with Vercel KV (Redis)

Replace in-memory rate limiter with Vercel KV:

```bash
npm install @vercel/kv
```

```typescript
// src/lib/rate-limit.ts
import { kv } from '@vercel/kv';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;
}

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);
  const windowKey = `rl:${key}:${Math.floor(now / windowSeconds)}`;

  const count = await kv.incr(windowKey);

  if (count === 1) {
    await kv.expire(windowKey, windowSeconds);
  }

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    reset: (Math.floor(now / windowSeconds) + 1) * windowSeconds,
  };
}
```

### 4.3 Image Storage Migration (Vercel Blob)

The current system stores images as base64 strings in PostgreSQL `String` columns. This must change.

```bash
npm install @vercel/blob
```

Create `src/lib/storage.ts`:

```typescript
import { put, del, list } from '@vercel/blob';

export async function uploadImage(
  file: Buffer,
  filename: string,
  folder = 'members'
): Promise<string> {
  const blob = await put(`${folder}/${filename}`, file, {
    access: 'public',
    contentType: 'image/jpeg',
  });
  return blob.url;
}

export async function deleteImage(url: string): Promise<void> {
  await del(url);
}
```

**Migration plan:**
1. Add `photoUrlBlob` field to `MemberPhoto` (nullable)
2. Write a migration script that:
   - Reads each `imageData` base64 string
   - Decodes and uploads to Vercel Blob
   - Stores the returned URL in `photoUrlBlob`
3. Once verified, drop `imageData` column
4. Rename `photoUrlBlob` to `imageUrl`

### 4.4 Caching Strategy

| Content Type | Strategy | TTL |
|-------------|----------|-----|
| Public tree data | ISR (`revalidate = 300`) | 5 min |
| Member profile (public) | ISR (`revalidate = 60`) | 1 min |
| Search results | SWR client-side | 30 sec stale |
| Admin dashboards | No cache (dynamic) | -- |
| Static assets | Immutable | 1 year |
| API list endpoints | `Cache-Control: s-maxage=60, stale-while-revalidate=300` | 1 min |

Implement via `next.config.js` headers and per-route `revalidate` exports.

### 4.5 Monitoring

1. **Vercel Analytics**: Add `@vercel/analytics` for Core Web Vitals
2. **Vercel Speed Insights**: Add `@vercel/speed-insights`
3. **Error tracking**: Add `src/instrumentation.ts` for server-side error logging

```bash
npm install @vercel/analytics @vercel/speed-insights
```

```typescript
// src/app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

// Add <Analytics /> and <SpeedInsights /> to root layout
```

### 4.6 Security Hardening

**CSRF Protection:**
- All state-changing API routes must verify `Origin` header matches allowed origins
- Add `SameSite=Strict` to session cookies

**XSS Prevention:**
- The existing `sanitizeString` utility in `src/lib/sanitize.ts` should be applied consistently
- All user inputs must be sanitized before database write
- Add Content Security Policy header

**SQL Injection:**
- Prisma parameterizes queries by default -- verify no raw SQL usage with string interpolation
- Audit all `$queryRaw` and `$executeRaw` calls

**Auth token security:**
- Session tokens should be cryptographically random (use `crypto.randomBytes(32).toString('hex')`)
- Set proper token expiry (7 days default, 30 days with "remember me")
- Invalidate all sessions on password change

**Headers** (add to `next.config.js`):
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### 4.7 Performance Optimization

**Code Splitting:**
- Lazy-load D3 tree component: `const TreeCanvas = dynamic(() => import('./tree/TreeCanvas'), { ssr: false })`
- Lazy-load admin pages: use Next.js route-level code splitting (automatic)
- Lazy-load Recharts in dashboard

**Bundle Analysis:**
```bash
npm install @next/bundle-analyzer
```

**Database Query Optimization:**
- Add compound indexes where queries filter on multiple fields
- Use `select` in Prisma queries to fetch only needed fields
- Add database connection pooling limits

**Image Optimization:**
- Use Next.js `<Image>` component with Vercel Image Optimization
- Generate thumbnails on upload (already using `sharp`)
- Serve WebP format

---

## Phase 5: Deployment Pipeline (Week 14-15)

### 5.1 GitHub Actions CI/CD

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx prisma generate
      - run: npm run lint
      - run: npm run type-check

  test:
    runs-on: ubuntu-latest
    needs: lint-and-type-check
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      DATABASE_URL: postgresql://test:test@localhost:5432/test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx prisma generate
      - run: npx prisma db push
      - run: npm test

  build:
    runs-on: ubuntu-latest
    needs: lint-and-type-check
    env:
      DATABASE_URL: "postgresql://fake:fake@localhost:5432/fake"
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run build
```

### 5.2 Preview Deployments

Vercel automatically creates preview deployments for every PR when connected to GitHub. No additional configuration needed. Each PR gets a unique URL for testing.

### 5.3 Database Migrations Strategy

**Development workflow:**
```bash
# After schema changes:
npx prisma migrate dev --name descriptive-name

# Creates migration SQL in prisma/migrations/
# Commit the migration files to git
```

**Production deployment:**
- Vercel runs `prisma migrate deploy` automatically via the build command
- Update build script: `"build": "prisma generate && prisma migrate deploy && next build"`
- Or use Vercel's build command override: `prisma generate && prisma migrate deploy && next build`

**Rollback plan:**
- Keep migration SQL files in git
- For emergency rollback, create a new "down" migration
- Never use `prisma migrate reset` in production

### 5.4 Environment Variable Management

**Required variables (set in Vercel Dashboard):**

| Variable | Environment | Description |
|----------|-------------|-------------|
| `DATABASE_URL` | All | Vercel Postgres pooled URL |
| `DIRECT_DATABASE_URL` | All | Vercel Postgres direct URL |
| `JWT_SECRET` | All | Session signing key |
| `KV_URL` | All | Vercel KV connection URL |
| `KV_REST_API_URL` | All | Vercel KV REST URL |
| `KV_REST_API_TOKEN` | All | Vercel KV token |
| `KV_REST_API_READ_ONLY_TOKEN` | All | Vercel KV read-only token |
| `BLOB_READ_WRITE_TOKEN` | All | Vercel Blob token |
| `RESEND_API_KEY` | Production | Email sending |
| `NEXT_PUBLIC_APP_URL` | All | Public app URL |

**Local development:**
- Copy `.env.example` to `.env.local`
- Use `vercel env pull` to sync Vercel env vars locally

### 5.5 Automated Testing Strategy

**Unit tests** (existing Jest setup):
- Test utility functions: `src/lib/matching/`, `src/lib/phone-utils.ts`, etc.
- Test API response helpers

**Integration tests** (new):
- Test API routes with a test database
- Use Prisma's test setup pattern with transaction rollback

**E2E tests** (future, Phase 6):
- Playwright for critical user flows: login, search, tree navigation, member add
- Run in CI against preview deployments

---

## Migration Priority Order

The phases above are sequential, but within each phase, prioritize by impact:

### Immediate (before first Vercel deploy):
1. Remove mock Prisma client (Phase 1.4)
2. Fix `next.config.js` security headers (Phase 1.1)
3. Set up Vercel Postgres + env vars (Phase 1.7)
4. Update Prisma schema for `directUrl` (Phase 4.1)

### High Priority (first week on Vercel):
5. Consolidate rate limiters (Phase 1.2)
6. Standardize API responses -- start with auth routes (Phase 2.1)
7. Consolidate auth to single User model (Phase 2.2)
8. Fix TypeScript/ESLint build errors (turn off `ignoreBuildErrors`)

### Medium Priority (weeks 2-4):
9. Consolidate settings models (Phase 2.3)
10. Build component library (Phase 3.4)
11. Implement sidebar layout (Phase 3.5)
12. Set up CI pipeline (Phase 5.1)

### Lower Priority (weeks 5+):
13. Image migration to Vercel Blob (Phase 4.3)
14. Rate limiting with Vercel KV (Phase 4.2)
15. Page redesigns (Phase 3.6)
16. D3 tree refactor (Phase 3.7)
17. E2E testing

---

## Files to Create (New)

| Path | Purpose |
|------|---------|
| `src/lib/api-response.ts` | Standard API response helpers |
| `src/lib/auth/get-auth-user.ts` | Unified auth middleware |
| `src/lib/config-service.ts` | App config service (replaces dual settings) |
| `src/lib/pagination.ts` | Standard pagination parser |
| `src/lib/storage.ts` | Vercel Blob image storage |
| `src/lib/types/api.ts` | API type definitions |
| `src/app/error.tsx` | Global error boundary |
| `src/app/not-found.tsx` | 404 page |
| `src/app/loading.tsx` | Global loading state |
| `src/components/layout/sidebar-layout.tsx` | Main layout with sidebar |
| `src/components/layout/mobile-nav.tsx` | Mobile bottom navigation |
| `src/components/tree/TreeCanvas.tsx` | Refactored tree visualization |
| `.github/workflows/ci.yml` | CI pipeline |

## Files to Delete

| Path | Reason |
|------|--------|
| `replit.md` | Replit artifact |
| `replit.nix` | Replit artifact |
| `REPLIT_DEPLOYMENT_GUIDE.md` | Replit artifact |
| `Dockerfile` | Not needed on Vercel |
| `docker-compose.yml` | Not needed on Vercel |
| `.dockerignore` | Not needed on Vercel |
| `scripts/start-production.js` | Replit startup script |
| `src/lib/rate-limiter.ts` | Duplicate rate limiter |
| `src/lib/middleware/rateLimit.ts` | Duplicate rate limiter |
| `src/lib/backup.ts` | Replaced by backup-service.ts |
| `src/lib/backup-scheduler.ts` | Not viable on Vercel serverless |
| `src/lib/backup-notifications.ts` | Merged into backup-service |
| `src/lib/github-backup.ts` | Replaced by Vercel backup strategy |
| `PLAN-HARDCODED-MIGRATION.md` | Stale planning doc |
| `PRODUCTION_READINESS_AUDIT.md` | Stale audit doc |
| `QA-REPORT.md` | Stale QA doc |
| `ROADMAP.md` | Replaced by this plan |
| `FUNCTIONALITY_CHECKLIST.md` | Stale checklist |

## Files to Heavily Modify

| Path | Changes |
|------|---------|
| `src/lib/prisma.ts` | Remove mock client, simplify |
| `next.config.js` | Remove Replit config, add security headers |
| `tailwind.config.ts` | Full redesign with CSS variables |
| `src/app/globals.css` | Add CSS variable theming |
| `package.json` | Clean scripts, add new deps |
| `prisma/schema.prisma` | Add `directUrl`, new `AppConfig` model |
| `.gitignore` | Add Vercel + data exclusions |
| `CLAUDE.md` | Update for Vercel deployment |

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Lighthouse Performance | ~50 | 90+ |
| Lighthouse Accessibility | ~60 | 95+ |
| Time to Interactive | ~8s | <3s |
| API response time (p95) | Unknown | <500ms |
| Build time | ~90s | <60s |
| Bundle size (JS) | Unknown | <200KB first load |
| TypeScript errors | Ignored | 0 |
| ESLint errors | Ignored | 0 |
| Rate limiter implementations | 3 | 1 |
| Auth systems | 2 | 1 |
| Config models | 2 | 1 |
| Backup implementations | 5 | 1 |
