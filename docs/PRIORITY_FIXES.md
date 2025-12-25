# Priority Fixes - Immediate Action Required

## Al-Shaye Family Tree Application

**Document Classification:** CONFIDENTIAL
**Date:** December 24, 2024

---

## Critical Security Fixes (Week 1-2)

### Issue #1: Missing Authentication on Broadcast Detail

**Severity:** CRITICAL
**File:** `src/app/api/broadcasts/[id]/route.ts`
**Line:** 5-31

**Current Code (VULNERABLE):**
```typescript
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const broadcast = await prisma.broadcast.findUnique({
    where: { id: params.id },
    include: { recipients: true },
  });
  return NextResponse.json(broadcast);
}
```

**Fix Required:**
```typescript
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hasPermission = await checkPermission(session.userId, 'view_broadcasts');
  if (!hasPermission) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const broadcast = await prisma.broadcast.findUnique({
    where: { id: params.id },
    include: { recipients: true },
  });
  return NextResponse.json(broadcast);
}
```

---

### Issue #2: Missing Authorization on Broadcast Send

**Severity:** CRITICAL
**File:** `src/app/api/broadcasts/[id]/send/route.ts`

**Fix Required:**
- Add session validation
- Add permission check: `manage_broadcasts`
- Add rate limiting for send operations

---

### Issue #3: Unsanitized Data Insertion

**Severity:** CRITICAL
**File:** `src/app/api/admin/pending/route.ts`
**Lines:** 65-97

**Current Code (VULNERABLE):**
```typescript
const pendingMember = await prisma.pendingMember.create({
  data: body,  // Unsanitized!
});
```

**Fix Required:**
```typescript
import { pendingMemberSchema } from '@/lib/validations/member';

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const validation = pendingMemberSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'Validation failed',
      details: validation.error.flatten().fieldErrors
    }, { status: 400 });
  }

  const pendingMember = await prisma.pendingMember.create({
    data: {
      firstName: validation.data.firstName,
      fatherName: validation.data.fatherName,
      gender: validation.data.gender,
      // ... explicitly whitelist each field
    },
  });

  return NextResponse.json(pendingMember);
}
```

---

### Issue #4: Unauthenticated Access to Pending Images

**Severity:** CRITICAL
**File:** `src/app/api/images/pending/route.ts`

**Fix Required:**
```typescript
export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  // ... existing code
}
```

---

## High Priority Fixes (Week 3-4)

### Issue #5: Arbitrary Config Injection

**File:** `src/app/api/admin/config/route.ts`
**Lines:** 86-92

**Fix:** Add whitelist of allowed configuration keys and validate each one.

---

### Issue #6: Missing Rate Limiting

**Affected Endpoints (add rate limiting):**
- `POST /api/members`
- `POST /api/journals`
- `POST /api/broadcasts`
- `POST /api/images/upload`
- All `PUT /api/*` endpoints
- All admin mutation endpoints

**Implementation:**
```typescript
import { checkRateLimit, RATE_LIMITS } from '@/lib/middleware/rateLimit';

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const rateCheck = checkRateLimit(ip, RATE_LIMITS.dataTransfer);

  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: rateCheck.message },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(rateCheck.resetIn / 1000)),
          'X-RateLimit-Remaining': String(rateCheck.remaining),
        }
      }
    );
  }

  // ... rest of handler
}
```

---

## Medium Priority Fixes (Week 5-8)

### Issue #7: Type Safety (`as any` removal)

**Priority Order:**
1. `src/lib/postgres-db.ts` - Core database operations
2. `src/lib/import-utils.ts` - Data import
3. `src/app/api/*` - API routes
4. UI components

### Issue #8: localStorage Safety

**Create and use:**
```typescript
// src/lib/storage/safeStorage.ts
export const safeStorage = {
  getItem<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
      const item = localStorage.getItem(key);
      if (item === null) return fallback;
      return JSON.parse(item) as T;
    } catch {
      return fallback;
    }
  },
  setItem<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
};
```

### Issue #9: Error Handling Standardization

**Replace all silent catch blocks with proper logging:**

```typescript
// Before (BAD)
} catch {
  // Ignore database errors
}

// After (GOOD)
} catch (error) {
  logger.error('Database operation failed', error as Error, {
    operation: 'createSession',
    userId: user.id,
  });
  throw new AppError('Session creation failed', 'DB_ERROR', 500);
}
```

---

## Validation Schemas to Create

### Week 1-2:
1. `src/lib/validations/broadcast.ts` - Broadcast creation/update
2. `src/lib/validations/journal.ts` - Journal creation/update
3. `src/lib/validations/admin-config.ts` - Admin configuration
4. `src/lib/validations/image.ts` - Image upload validation

### Week 3-4:
5. `src/lib/validations/member-update.ts` - Member update requests
6. `src/lib/validations/gathering.ts` - Event/gathering creation
7. `src/lib/validations/search.ts` - Search parameters
8. `src/lib/validations/export.ts` - Export options

---

## File Refactoring Priority

### Phase 1 (Q1):
1. **`src/lib/data.ts` (2,718 lines)**
   - Split into: `tree-operations.ts`, `member-crud.ts`, `validation-utils.ts`, `lineage-utils.ts`

### Phase 2 (Q2):
2. **`src/lib/auth/db-store.ts` (1,450 lines)**
   - Split into: `user-store.ts`, `session-store.ts`, `access-request-store.ts`, `invite-store.ts`

### Phase 3 (Q3):
3. **`src/app/add-branch/[token]/page.tsx` (1,356 lines)**
   - Extract: `BranchMemberForm`, `BranchMemberList`, `BranchConfirmation` components

---

## Testing Infrastructure (Week 1-4)

### Create Test Utilities:

```typescript
// src/test/setup/testUtils.ts
export const createMockUser = (overrides?: Partial<User>): User => ({
  id: 'test-user-id',
  email: 'test@example.com',
  nameArabic: 'محمد تجربة',
  role: 'MEMBER',
  status: 'ACTIVE',
  passwordHash: 'hashed',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockMember = (overrides?: Partial<FamilyMember>): FamilyMember => ({
  id: 'P001',
  firstName: 'محمد',
  familyName: 'آل شايع',
  gender: 'Male',
  generation: 1,
  sonsCount: 0,
  daughtersCount: 0,
  status: 'Living',
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockSession = (userId: string): Session => ({
  id: 'test-session-id',
  userId,
  token: 'test-token-' + Math.random().toString(36),
  expiresAt: new Date(Date.now() + 86400000),
  rememberMe: false,
  createdAt: new Date(),
  lastActiveAt: new Date(),
});
```

---

## Checklist for Week 1

- [ ] Fix Issue #1: Add auth to `/api/broadcasts/[id]` GET
- [ ] Fix Issue #2: Add authz to `/api/broadcasts/[id]/send`
- [ ] Fix Issue #3: Add validation to `/api/admin/pending` POST
- [ ] Fix Issue #4: Add auth to `/api/images/pending` GET
- [ ] Create `src/lib/validations/broadcast.ts`
- [ ] Create `src/lib/validations/pending-member.ts`
- [ ] Create `src/test/setup/testUtils.ts`
- [ ] Add tests for auth fixes

## Checklist for Week 2

- [ ] Fix Issue #5: Add config whitelist
- [ ] Add rate limiting to 5 critical endpoints
- [ ] Create `src/lib/errors/AppError.ts`
- [ ] Create `src/lib/logging/logger.ts`
- [ ] Replace 20 console.log statements
- [ ] Add tests for rate limiting

---

*Document Classification: CONFIDENTIAL*
