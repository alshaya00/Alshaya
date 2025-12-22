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
🌳 **شجرة آل شايع** 🌳
