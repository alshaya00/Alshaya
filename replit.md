# شجرة عائلة آل شايع | Al-Shaye Family Tree

## Overview
This project is an interactive web application for the Al-Shaye family tree. Its purpose is to digitally preserve and display family history, provide insights through analytics, and facilitate the addition and management of family members. The application aims to be a comprehensive and user-friendly platform for the Al-Shaye family, offering features like interactive visualizations, detailed member registries, and robust administrative tools.

## User Preferences
I prefer clear and concise explanations. I value iterative development and expect the agent to ask for confirmation before implementing significant changes. I also prefer detailed explanations for complex architectural decisions.

## System Architecture
The application is built with Next.js 14 (App Router) using TypeScript and Tailwind CSS for a modern, responsive UI. D3.js is used for interactive family tree visualizations. Data persistence is handled by Prisma 5.x with PostgreSQL as the database. Authentication involves bcrypt for password hashing.

**Key Architectural Decisions & Features:**
-   **Database-Centric Operations**: All critical data, configurations, and logs are stored in PostgreSQL, eliminating reliance on local storage for persistence.
-   **Bilingual Support**: Full Arabic (RTL) and English language support.
-   **Admin & System Management**:
    -   **Startup Script**: An `ensure-admin.ts` script runs on startup to provision the admin user, site settings, privacy settings, and API service configurations, as well as manage automatic backups.
    -   **Dynamic System Configuration**: Database-persisted configuration (`SystemConfig` table) controls application behavior with server-side caching and client-side access via `useSystemConfig()` hook. Includes feature flags, validation rules, and display settings.
    -   **Audit Log System**: Tracks all significant actions in a dedicated `AuditLog` table with dependency graph and change impact tracking (`impactedIds`, `impactSummary`), accessible via an admin API and UI.
-   **Data Management & Integrity**:
    -   **Backup System**: Database-backed backup system supporting manual and automatic daily backups with configurable intervals and retention. Stores snapshots in PostgreSQL.
    -   **Transactional Restore System**: Enterprise-grade restore process ensuring zero data loss with dependency-ordered restoration, atomic transactions, pre-restore safety backups, and member count verification.
    -   **MemberRegistry Service**: Unified member creation service (`src/lib/member-registry.ts`) that centralizes ID generation, generation calculation, lineage building, duplicate detection, parent validation, children count updates, and full name generation. All member creation paths use this service for consistency.
    -   **Transactional Approval Pipeline**: Atomic member approval using Prisma SERIALIZABLE transactions (`src/lib/transactional-approval.ts`). Uses MemberRegistry functions for ID generation, generation calculation, lineage building, and parent validation. Includes duplicate detection, generation verification, children count reconciliation, and descriptive rollback reasons.
    -   **Pending Member Data Consistency**: All pending member operations are database-driven, ensuring consistent data across admin and public interfaces.
    -   **Data Integrity Validation**: Comprehensive validation system (`src/lib/data-integrity.ts`) with 12 validation checks: generations, parent relationships, orphaned members, circular ancestry, deleted references, duplicate members, children counts, lineage consistency, pending members, age-generation, birth year logic (child born after parent), and linked accounts. Available via admin API endpoint (`/api/admin/data-validation`) with type parameter for specific checks.
    -   **User-Member Link Protection**: Database-level unique constraint on `User.linkedMemberId` prevents race conditions and duplicate account linking. Members with linked accounts cannot be deleted until account is unlinked. Admin users page provides unlink action with confirmation modal.
    -   **Hijri Calendar Validation** (`src/lib/utils/calendar-utils.ts`): Detects and suggests fixes for birth years incorrectly stored with wrong calendar type (e.g., Hijri year 1424 stored as Gregorian = 600+ year age). Provides automatic suggestions to fix calendar type. Admin UI at `/admin/data-validation` shows all detected issues with one-click fixes.
    -   **Duplicate Detection & Prevention System**:
        -   **Fuzzy Matching Service** (`src/lib/fuzzy-matcher.ts`): Uses Levenshtein distance for 80%+ similarity matching on Arabic/English names with weighted scoring (firstName 40%, fatherName 25%, fatherId 20%, birthYear 15%).
        -   **Real-time Quick-Add Validation**: Non-blocking duplicate warnings with "Link to existing member" suggestions when firstName + fatherId match potential duplicates.
        -   **Access Requests Duplicate Warning**: Shows ⚠️ warning icon on pending access requests with potential duplicates, including similarity scores and match reasons in Arabic.
        -   **Public Duplicate Check API** (`/api/duplicate-check`): Allows unauthenticated duplicate checking for quick-add form.
    -   **Member Merge System**:
        -   **Merge Service** (`src/lib/merge-service.ts`): Safely merges duplicate member profiles with SERIALIZABLE transactions, transferring children, photos, and journal references.
        -   **Merge Tool UI** (`/admin/merge`): Admin interface for selecting source/target members, previewing impact (children, photos, journals), resolving field conflicts, and executing merges with required reason tracking.
        -   **Merge API** (`/api/admin/merge`): Preview and execute member merges with full audit logging and impacted IDs tracking.
    -   **MemberRegistry Duplicate Prevention**: Built-in prevention using DuplicateError class for structured error handling.
    -   **CSV Import Script**: Robust import script (`scripts/import-csv.ts`) that handles mixed Arabic/English headers, validates data, and reports issues. Run with `npm run import:csv`.
    -   **Production Data Sync**: Export development data with `npm run export:members` and sync to production with `npm run sync:prod --confirm`. Essential after CSV imports to ensure production matches development.
-   **Family Tree Features**:
    -   Interactive D3.js visualization with zoom/pan.
    -   Tree editor with "Change Parent" functionality and multi-root support.
    -   Support for up to 12 generations with distinct color coding per generation.
    -   Saudi cultural avatar images (male with shemagh, female with hijab) for all member displays.
-   **Photo Management**:
    -   **Album Folder System**: Organize photos into folders (Profile Photos, Memories, Documents, Historical, Events).
    -   **Profile Pictures**: Camera icon overlay on avatars, "Set as Profile" button in galleries.
    -   **Gallery Filtering**: Filter photos by folder and category with color-coded tabs.
    -   **Self-Service Photo Upload**: Logged-in members can upload photos directly to their linked family member profile (bypasses pending approval, 5/day quota).
-   **Version History**:
    -   **Member Version History**: Admin-only timeline view showing all changes to a member with before/after snapshots and diff comparison.
    -   **Change Impact Tracking**: Audit logs track impacted descendant IDs and impact summaries for cascading changes.
-   **Localization Enhancements**:
    -   **Arabic Transliteration**: 80+ common Arabic name mappings for proper fullNameEn generation.
    -   **Branch Identification**: Recursive lookup with fuzzy Arabic name matching for pending member approvals.
-   **Phone Number Normalization**:
    -   **Centralized Utility** (`src/lib/phone-utils.ts`): All Saudi phone numbers normalized to +9665XXXXXXXX format.
    -   **Handles All Input Formats**: +9660505..., 0505..., 505..., +966505..., 00966505... all normalize correctly.
    -   **Strict Validation**: Invalid phone formats rejected with 400 error and bilingual message.
    -   **Flexible User Lookup**: findUserByPhone supports legacy formats for backward compatibility.
    -   **Database Normalized**: All User and AccessRequest phone records migrated to +9665XXXXXXXX format.
-   **Security Hardening**:
    -   **Admin credentials**: Set via Replit Secrets (ADMIN_USERNAME, ADMIN_PASSWORD).
    -   **API Rate Limiting** (`src/lib/rate-limiter.ts`): In-memory rate limiter protects public endpoints (OTP: 5/min, duplicate-check: 20/min, register: 5/min). Returns 429 with bilingual messages.
    -   **Session Timeout**: 30-minute inactivity timeout for admin sessions with activity tracking via mouse/keyboard events.
    -   **Account Lockout**: Failed login tracking with DB fields (failedLoginAttempts, lockedUntil). 5 failed attempts = 15-minute lockout.
    -   **Password Strength Validation**: Minimum 8 characters with uppercase, lowercase, and number requirements.
    -   **Deletion Protection**: Block deleting members with linked user accounts or pending merge references. Cascade warning shows affected children count before proceeding.
    -   **Deletion Impact Preview** (`/api/members/[id]/delete-preview`): API to preview deletion impact (children, photos, journals, linked users) before confirming.
    -   **Backup Integrity Verification**: Member count verification after backup creation. Size anomaly detection warns if backup is <50% of average size.
    -   **Restore Confirmation Modal**: Destructive restore operations require typing "CONFIRM" before proceeding.
    -   **Production Sync Safety**: CLI sync script (`npm run sync:prod --confirm`) requires --confirm flag to execute.
-   **Data Validation** (13 checks via `/api/admin/data-validation`):
    1. Generations validation
    2. Parent relationships
    3. Orphaned members
    4. Circular ancestry
    5. Deleted references
    6. Duplicate members
    7. Children counts
    8. Lineage consistency
    9. Pending members
    10. Age-generation correlation
    11. Birth year logic (child born 12+ years after parent)
    12. Death year validation (not before birth, not in future)
    13. Linked accounts (orphaned/duplicate detection)
-   **Admin Tools**:
    -   **Generation Auto-Correction** (`/api/admin/fix-generations`): GET lists members with wrong generations, POST fixes them with full audit logging.
    -   **Linked Accounts Report**: Visible in data validation UI showing orphaned links and duplicate account references.
    -   **Login History Tracking** (`LoginHistory` table): Tracks all login attempts (successful and failed) with method (PASSWORD/OTP), IP address, user agent, and failure reasons in Arabic.
    -   **User Login Stats**: Admin users page shows login count, failed attempts, and last failed login for each user.
    -   **Unregistered Members Page** (`/admin/unregistered`): Shows family members without linked user accounts, with filters by branch/generation, search, and direct invitation sending.
    -   **Invitation Usage Tracking**: Invitations page shows who used each code (user name, email, phone) and when.
-   **UI/UX**: Clean, modern interface with Tailwind CSS.

**Core Pages:**
-   Home (`/`)
-   Interactive Family Tree (`/tree`)
-   Family Registry (`/registry`)
-   Quick Add Member (`/quick-add`)
-   Analytics Dashboard (`/dashboard`)
-   Advanced Search (`/search`)
-   Admin Audit Log (`/admin/audit`)
-   History (Backup Management) (`/history`)
-   Registration (`/register`) - Dual-path signup with WhatsApp OTP verification for auto-approval + "Claim Your Place" wizard (parent selection + gender)
-   Invitation Signup (`/invite`) - Code-based registration with auto-approval
-   Admin Access Requests (`/admin/access-requests`) - Approve/reject signup requests (for users who can't use WhatsApp verification)
-   Admin Invitations (`/admin/invitations`) - Generate and manage invitation codes
-   Admin User Management (`/admin/users`) - View all registered users, search/filter, block/unblock accounts, unlink from family member, login stats
-   Admin Unregistered Members (`/admin/unregistered`) - View family members without accounts, send invitations
-   Admin Album Folders (`/admin/album-folders`) - Manage photo album folders
-   Admin Merge Tool (`/admin/merge`) - Merge duplicate member profiles
-   Admin Data Validation (`/admin/data-validation`) - Detect and fix data integrity issues

## External Dependencies
-   **PostgreSQL**: Primary database for all application data.
-   **Twilio Verify**: Production-grade OTP verification service (`src/lib/otp-service.ts`):
    -   Supports SMS and WhatsApp channels via `TWILIO_VERIFY_SERVICE_SID` secret
    -   Database-backed purpose tracking (LOGIN/REGISTRATION/VERIFICATION)
    -   Single-active-verification-per-phone model: new verification requests invalidate all previous OTPs
    -   Cost: $0.05 per successful verification
    -   Error handling for invalid numbers (60200), rate limits (60203), expired codes (20404)
    -   API endpoints: `/api/auth/otp/send` (POST with channel selection), `/api/auth/otp/verify` (POST)
-   **Resend**: For transactional email sending (welcome, password reset, invitations, backup alerts) via Replit's Resend connector.
-   **Google Drive API**: For automated cloud backups (CSV export, JSON backup) to Google Drive.
-   **Google Sheets API**: For living registry export to shareable spreadsheet with rolling snapshots (30-day retention, Current + dated tabs).
-   **GitHub API**: For encrypted database backups to a private GitHub repository with versioned history.
-   **D3.js**: JavaScript library for data-driven documents, specifically used for the interactive family tree visualization.