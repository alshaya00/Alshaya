# Plan: Migrate Hardcoded Components to Dynamic Configuration

## Overview

This plan outlines the steps to make the application fully functional by migrating hardcoded components to database-driven or configuration-based solutions.

---

## Phase 1: Database Setup & Seeding (Critical)

### 1.1 Ensure Database is Properly Initialized
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed the database with initial data
npm run db:seed
```

### 1.2 Verify Database Contains Data
- The `prisma/seed.ts` already contains 99 family members
- After seeding, the database should be the source of truth
- Remove fallback to in-memory data in `src/lib/db.ts` once confirmed

---

## Phase 2: Configuration Files (High Priority)

### 2.1 Create `src/config/navigation.ts`
Move navigation items from components to a centralized config:
```typescript
export const navigationConfig = {
  mainNav: [...],
  mobileNav: [...],
  moreNav: [...],
  publicPages: [...],
  noNavPages: [...]
}
```

**Files to update:**
- `src/components/Navigation.tsx` (lines 15-43)
- `src/components/AuthenticatedLayout.tsx` (lines 13, 16)

### 2.2 Create `src/config/theme.ts`
Centralize all color schemes:
```typescript
export const themeConfig = {
  generationColors: [...],  // 8 generation color palettes
  lineageColors: [...],     // Branch colors
  genderColors: { male: {...}, female: {...} },
  statusColors: {...}
}
```

**Files to update:**
- `src/components/FamilyTreeGraph.tsx` (lines 28-53)
- `src/components/MemberMiniGraph.tsx` (lines 38-62)
- `src/lib/lineage-utils.ts` (lines 190-240)
- `src/lib/export-utils.ts` (lines 346-349)
- `src/app/tree-editor/page.tsx` (lines 82-85)

### 2.3 Create `src/config/constants.ts`
Centralize magic numbers and constants:
```typescript
export const constants = {
  MIN_SECRET_LENGTH: 32,
  DB_CHECK_INTERVAL: 30000,
  sizes: ['B', 'KB', 'MB', 'GB'],
  genIcons: ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧']
}
```

---

## Phase 3: Database-Driven Configuration (Medium Priority)

### 3.1 Use Existing `SiteSettings` Model
The schema already has `SiteSettings` - populate it:
```sql
-- Insert default site settings
INSERT INTO SiteSettings (
  id, familyNameArabic, familyNameEnglish,
  taglineArabic, taglineEnglish, ...
) VALUES ('default', 'آل شايع', 'Al-Shaye', ...);
```

### 3.2 Use Existing `PermissionMatrix` Model
Move `DEFAULT_PERMISSION_MATRIX` to database:
- Create API endpoint to fetch permissions
- Update `src/lib/auth/types.ts` to load from DB
- Add admin UI to manage permissions

### 3.3 Use Existing `ApiServiceConfig` Model
Move email/SMS provider config to database:
- Update `src/app/admin/services/page.tsx` to read from DB
- Create API to save/load provider settings

### 3.4 Use `JournalCategory` Model
The schema has `JournalCategory` - use it for image categories too:
- Seed default categories
- Update `src/components/ImageUploadForm.tsx` to fetch from DB

---

## Phase 4: Dynamic Landing Page Stats (Medium Priority)

### 4.1 Replace Hardcoded Stats
In `src/components/AuthenticatedLayout.tsx` (lines 123-133):
- Replace "99" → Fetch from `getStatisticsFromDb()`
- Replace "8" → Calculate max generation dynamically
- Replace "425+" → Calculate from oldest member's birth year

### 4.2 Create Stats API Endpoint
```typescript
// src/app/api/stats/route.ts
GET /api/stats → { members: 99, generations: 8, years: 425 }
```

---

## Phase 5: Form Field Configuration (Lower Priority)

### 5.1 Create Form Field Configuration
Move `MEMBER_FIELDS` from `src/app/admin/database/excel/page.tsx` to:
- Either a config file: `src/config/fields.ts`
- Or database table: `FieldDefinition` model

### 5.2 Dynamic Relationship Types
Move `RELATIONSHIP_TYPES` from `src/app/register/page.tsx` to config

---

## Phase 6: Remove In-Memory Fallbacks (Final)

### 6.1 Update `src/lib/db.ts`
Once database is reliable:
- Remove all fallbacks to `familyMembers` array
- Throw errors instead of silently falling back
- Keep `src/lib/data.ts` only for seeding purposes

### 6.2 Clean Up Data File
- Keep `src/lib/data.ts` minimal (types only)
- Move family data to `prisma/seed.ts` exclusively

---

## Implementation Order

```
┌─────────────────────────────────────────────────────────────┐
│  Week 1: Foundation                                          │
├─────────────────────────────────────────────────────────────┤
│  1. Run database setup commands                              │
│  2. Verify data in database                                  │
│  3. Create src/config/ directory structure                   │
│  4. Create navigation.ts config                              │
│  5. Create theme.ts config                                   │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Week 2: Database Configuration                              │
├─────────────────────────────────────────────────────────────┤
│  1. Seed SiteSettings                                        │
│  2. Seed PermissionMatrix                                    │
│  3. Seed JournalCategory                                     │
│  4. Create API endpoints for settings                        │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Week 3: Dynamic Content                                     │
├─────────────────────────────────────────────────────────────┤
│  1. Create /api/stats endpoint                               │
│  2. Update landing page to use dynamic stats                 │
│  3. Update components to use config files                    │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Week 4: Cleanup                                             │
├─────────────────────────────────────────────────────────────┤
│  1. Remove in-memory fallbacks                               │
│  2. Clean up data.ts                                         │
│  3. Update tests                                             │
│  4. Documentation                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start Commands

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
npm run db:generate

# 3. Push schema to SQLite database
npm run db:push

# 4. Seed the database
npm run db:seed

# 5. Start development server
npm run dev
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/config/navigation.ts` | Navigation menu items |
| `src/config/theme.ts` | Colors, gradients, styling |
| `src/config/constants.ts` | Magic numbers, icons, sizes |
| `src/config/fields.ts` | Form field definitions |
| `src/app/api/stats/route.ts` | Dynamic statistics API |
| `src/app/api/settings/route.ts` | Site settings API |

---

## Files to Update

| File | Changes |
|------|---------|
| `src/components/Navigation.tsx` | Import from config |
| `src/components/AuthenticatedLayout.tsx` | Use dynamic stats |
| `src/components/FamilyTreeGraph.tsx` | Import colors from config |
| `src/lib/db.ts` | Remove fallbacks |
| `src/lib/auth/types.ts` | Load permissions from DB |

---

## Database Tables Already Available

✅ `SiteSettings` - Site branding & configuration
✅ `PermissionMatrix` - Role-based permissions
✅ `ApiServiceConfig` - Email/SMS provider settings
✅ `JournalCategory` - Content categories
✅ `PrivacySettings` - Privacy controls

These just need to be **seeded with data** and **connected to the UI**.
