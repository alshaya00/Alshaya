# Replit Deployment Guide

A comprehensive guide for deploying Next.js applications on Replit with 100% reliability.

## Table of Contents

- [Recommended Tech Stack](#recommended-tech-stack)
- [File Structure](#file-structure)
- [Build Command Strategy](#build-command-strategy)
- [Database Best Practices](#database-best-practices)
- [Next.js Configuration](#nextjs-configuration)
- [Common Pitfalls](#common-pitfalls)
- [Deployment Checklist](#deployment-checklist)

---

## Recommended Tech Stack

| Layer | Recommended | Why |
|-------|-------------|-----|
| Framework | Next.js 14 (App Router) | Native support, optimized builds |
| Database | Replit PostgreSQL | Built-in, automatic connection |
| ORM | Prisma 5.x | Stable, good tooling |
| Styling | Tailwind CSS | No build complexity |
| Auth | Custom JWT or Replit Auth | Avoids external dependencies |

---

## File Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── (auth)/            # Auth pages
│   └── (main)/            # Main app pages
├── lib/
│   ├── db/                # Database utilities
│   ├── auth/              # Auth logic
│   └── validations/       # Zod schemas
├── components/            # React components

scripts/
├── ensure-admin.ts        # Startup admin creation

prisma/
├── schema.prisma
└── seed.ts
```

---

## Build Command Strategy

Keep deployment builds simple:

```json
{
  "scripts": {
    "build": "prisma generate && next build",
    "start": "tsx scripts/ensure-admin.ts && next start -H 0.0.0.0 -p 5000",
    "migrate:deploy": "prisma migrate deploy",
    "seed:prod": "tsx prisma/seed.ts"
  }
}
```

### Key Rules

1. **Never run `prisma db push` during deployment** - causes infrastructure failures
2. **Never run migrations in auto-build** - run manually when needed
3. **Keep seeding as startup script** - ensures data exists when app starts

---

## Database Best Practices

| Practice | Description |
|----------|-------------|
| Use `prisma generate` only during build | Just generates the Prisma client |
| Run migrations manually | Via Replit Shell when schema changes |
| Make seed scripts idempotent | Use `upsert` not `create` |
| Separate dev/prod seeds | Avoid test data in production |

### Migration Workflow

1. Make changes to `prisma/schema.prisma`
2. Open Replit Shell
3. Run `npx prisma migrate dev --name your_migration_name` (development)
4. Run `npx prisma migrate deploy` (production)

### Idempotent Seed Example

```typescript
// Good - Idempotent (can run multiple times safely)
await prisma.user.upsert({
  where: { email: 'admin@example.com' },
  update: {},
  create: {
    email: 'admin@example.com',
    name: 'Admin',
    role: 'ADMIN'
  }
});

// Bad - Will fail on second run
await prisma.user.create({
  data: {
    email: 'admin@example.com',
    name: 'Admin',
    role: 'ADMIN'
  }
});
```

---

## Next.js Configuration

Recommended `next.config.js` for Replit:

```javascript
// next.config.js
module.exports = {
  output: 'standalone',     // Smaller deployments
  images: {
    remotePatterns: [],     // Configure only what you need
  },
  experimental: {},         // Avoid experimental features
}
```

### Configuration Notes

| Option | Recommendation |
|--------|----------------|
| `output: 'standalone'` | Creates smaller, self-contained deployments |
| `images.remotePatterns` | Only add domains you actually need |
| `experimental` | Keep empty unless absolutely necessary |

---

## Common Pitfalls

| Problem | Solution |
|---------|----------|
| Build timeout | Simplify build command |
| DB migration fails | Run migrations manually, not in build |
| Missing admin in prod | Use startup ensure script |
| Missing exports | Check all re-exports in barrel files |
| Memory issues | Set `NODE_OPTIONS=--max-old-space-size=2048` |

### Memory Configuration

Add to your Replit environment or `.replit` file:

```bash
NODE_OPTIONS=--max-old-space-size=2048
```

### Ensure Admin Script Example

```typescript
// scripts/ensure-admin.ts
import { db } from '@/lib/db';
import { hash } from 'bcryptjs';

async function ensureAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';

  const existingAdmin = await db.user.findUnique({
    where: { email: adminEmail }
  });

  if (!existingAdmin) {
    const hashedPassword = await hash(process.env.ADMIN_PASSWORD || 'changeme', 10);
    await db.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        role: 'ADMIN'
      }
    });
    console.log('Admin user created');
  } else {
    console.log('Admin user already exists');
  }
}

ensureAdmin()
  .catch(console.error)
  .finally(() => process.exit(0));
```

---

## Deployment Checklist

Before deploying to production, verify:

- [ ] **Build command**: `prisma generate && next build` only
- [ ] **Start command**: includes startup scripts if needed
- [ ] **Database**: run migrations manually via Shell
- [ ] **Secrets**: all API keys in Replit Secrets
- [ ] **Port**: Frontend on port 5000

### Replit Secrets Configuration

Add these to your Replit Secrets (Tools > Secrets):

| Secret | Description |
|--------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (auto-set by Replit) |
| `NEXTAUTH_SECRET` | Random string for session encryption |
| `ADMIN_EMAIL` | Default admin email |
| `ADMIN_PASSWORD` | Default admin password |

### Replit Configuration File

Example `.replit` file:

```toml
run = "npm run start"
entrypoint = "src/app/page.tsx"

[nix]
channel = "stable-24_05"

[deployment]
build = ["sh", "-c", "npm run build"]
run = ["sh", "-c", "npm run start"]

[[ports]]
localPort = 5000
externalPort = 80
```

---

## Troubleshooting

### Build Fails with Timeout

1. Check that build command doesn't include migrations
2. Ensure no heavy operations during build
3. Consider splitting build steps

### Database Connection Issues

1. Verify `DATABASE_URL` is set in Secrets
2. Run `npx prisma generate` to regenerate client
3. Check if migrations are applied: `npx prisma migrate status`

### App Starts but Crashes

1. Check logs for missing environment variables
2. Verify all required secrets are configured
3. Ensure startup scripts are idempotent

---

## Quick Reference

### Development Commands

```bash
npm run dev           # Start dev server on port 5000
npm run build         # Build for production
npm run start         # Start production server
npm run db:generate   # Generate Prisma client
npm run db:push       # Push schema changes (dev only)
npm run db:seed       # Seed database
```

### Manual Migration Commands (Shell)

```bash
npx prisma migrate dev --name migration_name  # Create migration (dev)
npx prisma migrate deploy                     # Apply migrations (prod)
npx prisma migrate status                     # Check migration status
npx prisma studio                             # Open database GUI
```

---

*This guide ensures reliable, repeatable deployments on Replit. Follow these practices to minimize deployment failures and maintain stable production applications.*
