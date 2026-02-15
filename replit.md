# Al-Shaya Family Tree

## Overview
This project is an interactive web application designed to digitally preserve and display the Al-Shaya family history. It offers features like interactive visualizations, detailed member registries, and robust administrative tools. The core purpose is to create a comprehensive, user-friendly platform that ensures the family's history is accessible, expandable, and fosters connection across generations.

## User Preferences
I prefer clear and concise explanations. I value iterative development and expect the agent to ask for confirmation before implementing significant changes. I also prefer detailed explanations for complex architectural decisions.

## System Architecture
The application is built with Next.js 14 (App Router), TypeScript, and Tailwind CSS for a modern, responsive UI. D3.js is used for interactive family tree visualizations. Data persistence is managed by Prisma 5.x with PostgreSQL. Authentication uses bcrypt for password hashing.

**UI/UX Decisions:**
The UI/UX emphasizes a clean, modern interface with bilingual support (Arabic RTL and English). Saudi cultural avatar images are used, and D3.js visualizations feature zoom/pan with distinct color coding for up to 12 generations.

**Technical Implementations & Design Patterns:**
-   **Database-Centric Operations**: All critical data, configurations, and logs are stored in PostgreSQL.
-   **Bilingual Support**: Full Arabic (RTL) and English language support.
-   **Dynamic System Configuration**: Application behavior is controlled via database-persisted configurations with caching.
-   **Audit Log System**: Comprehensive tracking of all significant actions.
-   **Data Management & Integrity**: Includes database backup and transactional restore systems, a centralized `MemberRegistry Service` for consistency, a transactional approval pipeline, and robust data integrity validation (including duplicate detection, Arabic name normalization, and phone number normalization). A `Member Merge System` allows safe merging of duplicate profiles with conflict prevention.
-   **Client/Server Module Separation**: Server-only code (crypto, bcryptjs) is isolated in `*-server.ts` files (`session-server.ts`, `admin-config-server.ts`) to prevent leaking into client bundles. Client-safe exports are in `session.ts`, `admin-config.ts`, and the `auth/index.ts` barrel.
-   **Member ID Backward Compatibility**: Production DB has mixed ID formats (P001 3-digit and P0578 4-digit). The `getMemberIdVariants(id)` utility in `src/lib/utils.ts` generates all possible ID formats (original, 3-digit padded, 4-digit padded) for lookups. Used in member page and member API route to ensure both legacy and normalized IDs resolve correctly.
-   **Security Hardening**: API rate limiting, admin session management, password strength validation, and deletion protection.
-   **Admin Tools**: Comprehensive interfaces for user management, access requests, member merging, data validation, story moderation, and tools for managing unregistered members. This includes features for manual user-member linking, an orphaned users report, and a data cleanup tool.
-   **Duplicate Detection & Resolution**: A system to scan for potential duplicates with adjustable similarity thresholds, persistent exclusion of false positives, and revert functionality. An advanced scanner uses a 3-level detection system (Exact, Suspicious, Potential) with batch scanning, side-by-side comparison, and in-page merge flows.
-   **Registration Duplicate Prevention**: Real-time duplicate checks during user registration to prevent exact matches.
-   **CRM-Style Members Hub**: A dashboard (`/admin/members-hub`) that automatically detects and prioritizes data issues (duplicates, orphaned members, missing data, generation inconsistencies) with quick action buttons for resolution.
-   **Comprehensive Member Edit Modal**: Allows editing of all member fields, supports both Hijri and Gregorian calendars, includes a change history tab with revert capabilities.
-   **Smart Member Search** (`src/lib/search-utils.ts`): Shared search utility used across all search interfaces (tree, public tree, registry, registration, admin dropdowns, search page, suggestions API). Features: comprehensive Arabic normalization (diacritics, alef/ya/ta marbuta/hamza/kaf variants, compound عبد names), stop-word stripping (بن/بنت/bin/bint), multi-word scoring (first name 100pts > father 60pts > grandfather 35pts > lineage 15pts), lineage penalty for false positives, English name and branch bonuses, ID matching.
-   **Quick-Add Smart Search**: Helper questions and filters to narrow down search results when adding members.
-   **Registration Uncle Verification**: A step during registration to verify the selected father by asking for an uncle's name, using fuzzy matching against the father's siblings.
-   **Data Quality Dashboard** (`/admin/data-quality`):
    -   Comprehensive scan of all members for 4 categories of data issues.
    -   **ID Format Issues**: Detects non-standard member IDs (P1, P01, P001 vs standard P0001) with safe normalization tool that atomically updates the ID and all references (fatherId, photos, journals, users, pending members, duplicate flags, change history, breastfeeding).
    -   **Arabic Name Issues**: Missing or incomplete fullNameAr (lineage chain too short for generation).
    -   **English Name Issues**: Arabic characters in English names or missing fullNameEn.
    -   **Missing Ancestor Fields**: fatherName/grandfatherName/greatGrandfatherName empty when they should be populated.
    -   4-tab interface with per-category tables, select/preview/execute workflow, and audit logging.
    -   Integrates with existing `/api/admin/fix-lineage` for name regeneration and new `/api/admin/data-quality/fix-ids` for ID normalization.
-   **Data Repair Tools**: Admin dashboard (`/admin/data-repair`) for finding and fixing orphaned members, with rollback capabilities.
-   **Name Fix Tool**: Admin tool (`/admin/fix-names`) to detect and repair name issues (Arabic characters in English names, incomplete lineage) by regenerating full names and ancestor fields from the lineage.
-   **Gallery with Video Support**: Supports both images and videos (up to 50MB) with play button overlays and lightbox functionality.
-   **PDF Support in Journals**: Family journals/stories support PDF attachments (up to 20MB). PDFs are stored as base64 in the `FamilyJournal` table (`pdfData`, `pdfFileName` fields). Served via `/api/journals/[id]/pdf` endpoint. Embedded PDF viewer on journal detail pages. Content text is optional when PDF is attached.
-   **Conditional Approval System**: Allows family members to register even if their parent is pending approval, using `parentPendingId`. Includes sequential chain approval, enhanced admin review with pending warnings, and a dedicated admin page (`/admin/conditional-approvals`) to manage and visualize these relationships.
-   **Robust Delete & Merge System**: Complete member deletion and merge system with full ID variant support (P227/P0227). Delete endpoint transfers ALL related data (children, photos, journals, breastfeeding, linked accounts, pending members) to the merge target. Admin force-override capability for pending DuplicateFlags and linked user blocks. Full merge snapshots saved in ChangeHistory for undo operations.
-   **Undo Delete & Merge**: Admin page (`/admin/deleted-members`) shows all deleted/merged members with one-click restore and undo-merge capabilities. Undo merge restores the source member and moves children back to their original parent. API endpoints: `/api/admin/deleted-members` (GET), `/api/admin/undo-merge` (POST), `/api/members/[id]/restore` (POST).
-   **Unified Merge Flow**: Both `/duplicates` page and `/admin/duplicate-scanner` now use the same full merge service (`/api/admin/merge`) that handles all data transfers in a serializable transaction.
-   **Smart Name Editing with Cascade**: When editing a member's firstName, gender, or fatherId, the system automatically regenerates fullNameAr, fullNameEn, fatherName, grandfatherName, and greatGrandfatherName. Changes cascade to all descendants (children, grandchildren, etc.), updating their fatherName, fullNameAr, fullNameEn. All changes share a single batchId for grouped revert.
-   **Name Change Preview**: Before saving name changes, a preview endpoint (`/api/members/[id]/name-preview`) shows all affected members and before/after comparisons. The edit modal shows this as a confirmation dialog before applying.
-   **Batch Revert**: All cascaded name changes can be reverted together via `/api/members/batch-revert` using the shared batchId. Supports preview mode and actual revert. Accessible from the change history tab in the edit modal.
-   **ID Variant Safety in Lineage Functions**: All lineage-traversing functions (generateFullNamesFromLineage, getAncestorNamesFromLineage, buildLineageInfo, calculateGeneration, validateParent, checkCircularAncestry) use `findFirst` with `getMemberIdVariants` to handle mixed 3-digit/4-digit ID formats.

## External Dependencies
-   **PostgreSQL**: Primary database.
-   **Twilio Verify**: OTP verification.
-   **Resend**: Transactional email sending.
-   **Google Drive API**: Automated cloud backups.
-   **Google Sheets API**: Living registry export.
-   **GitHub API**: Encrypted database backups.
-   **D3.js**: Interactive family tree visualizations.