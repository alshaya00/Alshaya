# شجرة عائلة آل شايع | Al-Shaye Family Tree

A modern, interactive family tree web application for the آل شايع (Al-Shaye) family.

## Quick Start

Click the **Run** button to start the development server. The application will be available at the Webview URL.

## Features

- 🌳 **Interactive Family Tree** - D3.js visualization with zoom/pan
- 📊 **Analytics Dashboard** - Statistics and insights
- ⚡ **Quick Add** - Smart auto-fill forms
- 📋 **Family Registry** - Searchable member list
- 🔍 **Advanced Search** - Search by name, city, occupation
- 🌐 **Bilingual** - Arabic (RTL) and English support

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Home | `/` | Overview and statistics |
| Tree | `/tree` | Interactive family tree |
| Registry | `/registry` | Complete member list |
| Quick Add | `/quick-add` | Add new members |
| Dashboard | `/dashboard` | Analytics |
| Search | `/search` | Search members |

## Tech Stack

- Next.js 14 (App Router) with `standalone` output
- TypeScript
- Tailwind CSS
- D3.js
- Prisma 5.x with PostgreSQL
- bcrypt for password hashing

---

## Replit Deployment Guide

### Build Commands

| Script | Command | When to Use |
|--------|---------|-------------|
| `npm run build` | `prisma generate && next build` | Production build (auto in deployment) |
| `npm run start` | `tsx scripts/ensure-admin.ts && next start` | Start production server |
| `npm run dev` | `next dev` | Development server |
| `npm run migrate:deploy` | `prisma migrate deploy` | Apply migrations (manual in Shell) |
| `npm run db:seed` | `tsx prisma/seed.ts` | Seed database (idempotent) |

### Database Management

**IMPORTANT:** Never run `prisma db push` or migrations during deployment build.

#### Manual Migration Steps (via Shell)
```bash
# Check migration status
npx prisma migrate status

# Apply pending migrations
npx prisma migrate deploy

# Create new migration (development only)
npx prisma migrate dev --name migration_name

# Open Prisma Studio (database GUI)
npx prisma studio
```

### Environment Variables

Required in Replit Secrets (Tools > Secrets):

| Secret | Description | Example |
|--------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | Auto-set by Replit PostgreSQL |
| `ADMIN_EMAIL` | Default admin email | `admin@alshaye.family` |
| `ADMIN_PASSWORD` | Default admin password | `YourSecurePassword123!` |

### Startup Script

The `scripts/ensure-admin.ts` script runs on every startup to:
- Create admin user if not exists
- Ensure site settings exist
- Ensure privacy settings exist
- Ensure API service config exists
- Check and run automatic backup if 24 hours have passed since last backup
- Cleanup old backups (keeps max 10)

### Backup System (Dec 2024)

Database-backed backup system with automatic daily backups:
- **Backup Types**: MANUAL (user-created), AUTO_BACKUP (daily), PRE_RESTORE (before restoring), PRE_IMPORT (before bulk import)
- **Automatic Backups**: Created on server startup if 24 hours have passed since last backup
- **Config**: 24-hour interval, max 10 backups, 30-day retention
- **Storage**: Snapshots table in PostgreSQL (not localStorage)
- **API**: `/api/admin/snapshots` for CRUD operations (requires authentication)
- **UI**: History page (`/history`) for viewing and restoring backups

### Common Issues

| Problem | Solution |
|---------|----------|
| Build timeout | Build command is simplified (no migrations) |
| DB migration fails | Run migrations manually via Shell |
| Missing admin in prod | ensure-admin.ts handles this at startup |
| Missing exports | Check all re-exports in barrel files |
| Memory issues | `NODE_OPTIONS=--max-old-space-size=2048` is set |

### Deployment Checklist

Before deploying:
- [ ] All changes committed
- [ ] Migrations applied manually (if schema changed)
- [ ] Environment secrets configured
- [ ] Build completes without errors
- [ ] Admin credentials set in Secrets

---

## Development

```bash
npm install    # Install dependencies
npm run dev    # Start dev server on port 5000
npm run build  # Production build
npm run start  # Start production server
```

---

## Recent Changes (Dec 2024)

### Database Migration Complete - No Static Fallbacks
All pages and API routes now fetch exclusively from PostgreSQL:
- **389 family members** in production database
- **10 generations** of family history preserved
- All API routes (`/api/members`, `/api/statistics`, `/api/tree`, etc.) use Prisma queries
- **No static data fallbacks** - database errors throw immediately (no silent failures)
- Frontend pages fetch from APIs using `useEffect` hooks
- Server components use direct database functions from `src/lib/db.ts`

### Data Layer Architecture
- `src/lib/db.ts` - Thin wrapper over postgres-db.ts, throws errors on failure
- `src/lib/postgres-db.ts` - Direct Prisma queries, no try/catch fallbacks
- `src/lib/data.ts` - Type definitions only (no longer used for data)

### Pending Member Data Consistency (Dec 2024)
All pending member operations now use the database API instead of localStorage:
- **Admin Pending Page** - Fetches from `/api/admin/pending` using `reviewStatus` field
- **Branches Page** - Pending counts calculated from database API data
- **Add-Branch Page** - Submits new entries via POST to `/api/admin/pending`
- **Public Access** - Branch entry forms can submit/delete via `submittedVia` token parameter
- **Unified Source** - All dashboards and pages show consistent pending counts

### Tree Editor Features (Dec 2024)
- **Change Parent dropdown** - In edit mode, select new parent from dropdown for any member
- **Multi-root support** - Virtual root created when multiple founders exist
- **Parent changes** - Saved via PATCH /api/members/[id] with { fatherId: newParentId }
- **Public fallback** - Falls back to /api/tree when not authenticated

### Updated Files
- `src/app/tree/page.tsx` - Fetches members from API
- `src/app/search/page.tsx` - Fetches from API with loading states
- `src/app/member/[id]/page.tsx` - Server component using database functions
- `src/app/registry/page.tsx` - Fetches from API
- `src/app/branches/page.tsx` - Fetches from API
- `src/app/edit/[id]/page.tsx` - Fetches from API
- `src/app/register/page.tsx` - Fetches from API
- `src/app/import/page.tsx` - Fetches from API
- `src/app/export/page.tsx` - Fetches from API
- `src/app/duplicates/page.tsx` - Fetches from API
- `src/app/history/page.tsx` - Fetches from API
- `src/app/tree-editor/page.tsx` - Fetches from API
- All breastfeeding API routes - Use database functions

---
🌳 **شجرة آل شايع** 🌳
