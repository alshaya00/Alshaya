# CLAUDE.md

This file provides guidance for AI assistants working with this repository.

## Repository Overview

- **Name**: Al-Shaye Family Tree (شجرة آل شايع)
- **Owner**: alshaya00
- **Type**: Family tree web application
- **Platform**: Replit (optimized for Replit deployment)
- **Tech Stack**: Next.js 14, TypeScript, Prisma, PostgreSQL, Tailwind CSS

## Project Structure (Replit Architecture)

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── (auth)/            # Auth pages (login, register, etc.)
│   └── (main)/            # Main app pages
├── lib/
│   ├── db/                # Database utilities
│   ├── auth/              # Auth logic (session, password, TOTP)
│   └── validations/       # Zod schemas
├── components/            # React components
├── config/                # App configuration

scripts/
├── ensure-admin.ts        # Startup admin creation (runs on every start)
├── seed-admin.js          # Legacy admin seeding
└── init-db.js             # Database initialization

prisma/
├── schema.prisma          # Database schema
└── seed.ts                # Database seeding (idempotent)
```

## Development Commands

```bash
npm run dev           # Start dev server on port 5000
npm run build         # Production build (prisma generate && next build)
npm run start         # Start production (ensure-admin && next start)
npm run lint          # Run ESLint
npm run test          # Run Jest tests
npm run type-check    # TypeScript type checking
```

## Database Commands (Manual via Shell)

```bash
npm run db:generate    # Generate Prisma client
npm run db:seed        # Seed database (idempotent with upsert)
npm run migrate:deploy # Apply migrations (NEVER in build)
npx prisma studio      # Open database GUI
```

**IMPORTANT**: Never run `prisma db push` or migrations during deployment.

## Replit Deployment Rules

1. **Build command**: `prisma generate && next build` only
2. **Start command**: Runs `ensure-admin.ts` before starting server
3. **Migrations**: Run manually via Replit Shell
4. **Port**: Frontend runs on port 5000
5. **Memory**: `NODE_OPTIONS=--max-old-space-size=2048`

## Key Files

| File | Purpose |
|------|---------|
| `next.config.js` | Next.js config with `standalone` output |
| `.replit` | Replit deployment configuration |
| `scripts/ensure-admin.ts` | Startup admin/settings creation |
| `prisma/seed.ts` | Idempotent database seeding |
| `REPLIT_DEPLOYMENT_GUIDE.md` | Full deployment documentation |

## Code Conventions

- **File naming**: `kebab-case` for files
- **Components**: `PascalCase`
- **Variables/Functions**: `camelCase`
- **Styling**: Tailwind CSS utility classes
- **Validation**: Zod schemas in `lib/validations/`
- **Auth**: bcrypt for passwords, JWT-like sessions

## For AI Assistants

### When Working on This Repository

1. **Read before modifying**: Always read existing code first
2. **Follow Replit patterns**: Maintain compatibility with Replit deployment
3. **Idempotent operations**: Use upsert instead of delete+create
4. **No build-time DB ops**: Never add DB operations to build command
5. **Port 5000**: Always use port 5000 for the server

### Key Patterns

- Database operations use Prisma client from `src/lib/prisma.ts`
- Auth utilities in `src/lib/auth/` (password, session, TOTP)
- All seed scripts use `upsert` for idempotency
- Startup script ensures admin exists on every boot

---

*Last updated: 2025-12-22*
*Optimized for Replit deployment architecture*
