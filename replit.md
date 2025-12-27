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
    -   **Data Integrity Validation**: Comprehensive validation system (`src/lib/data-integrity.ts`) with 9 validation checks: generations, parent relationships, orphaned members, circular ancestry, deleted references, duplicate members, children counts, lineage consistency, and pending members. Available via admin API endpoint (`/api/admin/data-validation`) with type parameter for specific checks.
    -   **Duplicate Detection**: Built into MemberRegistry - prevents adding members with same firstName + fatherId combination. Uses DuplicateError class for structured error handling.
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
-   **Security**: Admin credentials are set via Replit Secrets.
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
-   Registration (`/register`) - Dual-path signup with "Claim Your Place" wizard (parent selection + gender)
-   Invitation Signup (`/invite`) - Code-based registration with auto-approval
-   Admin Access Requests (`/admin/access-requests`) - Approve/reject signup requests
-   Admin Invitations (`/admin/invitations`) - Generate and manage invitation codes
-   Admin Album Folders (`/admin/album-folders`) - Manage photo album folders

## External Dependencies
-   **PostgreSQL**: Primary database for all application data.
-   **Resend**: For transactional email sending (welcome, password reset, invitations, backup alerts) via Replit's Resend connector.
-   **Google Drive API**: For automated cloud backups (CSV export, JSON backup) to Google Drive.
-   **Google Sheets API**: For living registry export to shareable spreadsheet with rolling snapshots (30-day retention, Current + dated tabs).
-   **GitHub API**: For encrypted database backups to a private GitHub repository with versioned history.
-   **D3.js**: JavaScript library for data-driven documents, specifically used for the interactive family tree visualization.