# Al-Shaya Family Tree

## Overview
This project is an interactive web application for the Al-Shaya family tree. Its purpose is to digitally preserve and display family history, provide insights through analytics, and facilitate the addition and management of family members. The application aims to be a comprehensive and user-friendly platform, offering features like interactive visualizations, detailed member registries, and robust administrative tools. The business vision is to create a digital legacy for the Al-Shaya family, ensuring their history is accessible and expandable for future generations, fostering connection and understanding within the family.

## User Preferences
I prefer clear and concise explanations. I value iterative development and expect the agent to ask for confirmation before implementing significant changes. I also prefer detailed explanations for complex architectural decisions.

## System Architecture
The application is built with Next.js 14 (App Router), TypeScript, and Tailwind CSS for a modern, responsive UI. D3.js is used for interactive family tree visualizations. Data persistence is managed by Prisma 5.x with PostgreSQL. Authentication uses bcrypt for password hashing.

**UI/UX Decisions:**
The UI/UX emphasizes a clean, modern interface with bilingual support (Arabic RTL and English). Saudi cultural avatar images (male with shemagh, female with hijab) are used for all member displays. Interactive D3.js visualizations feature zoom/pan and distinct color coding for up to 12 generations.

**Technical Implementations & Design Patterns:**
-   **Database-Centric Operations**: All critical data, configurations, and logs are stored in PostgreSQL.
-   **Bilingual Support**: Full Arabic (RTL) and English language support across the application.
-   **Dynamic System Configuration**: Application behavior is controlled via database-persisted configurations with server-side caching and client-side access.
-   **Audit Log System**: Comprehensive tracking of all significant actions with dependency graph and change impact tracking.
-   **Data Management & Integrity**:
    -   **Backup System**: Database-backed manual and automatic daily backups with configurable retention.
    -   **Transactional Restore System**: Enterprise-grade, zero data loss restore process with dependency-ordered, atomic transactions.
    -   **MemberRegistry Service**: Centralized service for member creation, ID generation, lineage building, and duplicate detection, ensuring data consistency.
    -   **Transactional Approval Pipeline**: Atomic member approval using Prisma SERIALIZABLE transactions.
    -   **Data Integrity Validation**: Comprehensive validation system with 13 checks (generations, parent relationships, circular ancestry, duplicates, etc.).
    -   **Simplified Duplicate Detection**: A member is only considered a duplicate if they have the **same fatherId AND same firstName**. This is the only valid duplicate scenario (same person registered twice under the same parent).
    -   **Father ID-Based Detection**: If two members have different fatherId values, they are NEVER considered duplicates, regardless of how similar their names are. Different fathers = different people.
    -   **Comprehensive Arabic Name Normalization**: Name comparison includes:
        - حركات (Tashkeel/Diacritics): فَتْحة، ضَمّة، كَسْرة، سُكون، شدّة، تنوين
        - همزات (Hamza variations): أ، إ، آ، ٱ، ء → ا
        - تاء مربوطة (Taa Marbouta): ة → ه
        - ألف مقصورة (Alef Maqsoura): ى → ي
        - همزة على واو/ياء: ؤ → و، ئ → ي
        - تطويل (Kashida): ـ → removed
        - Common variations: عبد الله = عبدالله
    -   **Member Merge System**: Safely merges duplicate member profiles with transactional integrity, transferring related data. Server-side blocking prevents merges between members with:
        - Different fathers (highest priority block)
        - Critical generation mismatch (>=2 generations apart)
        - Both members having linked user accounts
    -   **Phone Number Normalization**: Centralized utility for normalizing Saudi phone numbers to a standard format (+9665XXXXXXXX) with strict validation.
-   **Security Hardening**:
    -   API Rate Limiting for public endpoints.
    -   Admin session timeout and account lockout mechanisms.
    -   Password strength validation.
    -   Deletion protection for members with linked accounts or pending references.
    -   Backup integrity verification and destructive action confirmations.
-   **Admin Tools**:
    -   Comprehensive admin interfaces for user management, access requests, invitations, photo album folders, member merging, data validation, and story moderation.
    -   Login history tracking and user login statistics.
    -   Tools for managing unregistered members and sending invitations.
    -   **Manual User-Member Linking**: Admin can manually link orphaned user accounts to existing family members via search interface.
    -   **Orphaned Users Report** (`/admin/orphaned`): Dashboard showing users without linked members, with auto-suggested matches based on name similarity.
    -   **Data Cleanup Tool** (`/admin/data-cleanup`): Dashboard to scan and review potential false duplicates (same name, different fathers/generations). Allows marking pairs as "verified different people" with full audit logging and ability to revert.
-   **Quick-Add Smart Search**:
    -   Helper questions automatically triggered when multiple matches found.
    -   Branch selection (Ibrahim/Abdulkarim/Fawzan) and uncle name filters to narrow down search results.
    -   Fallback to full results when filters yield no matches.
-   **Registration Uncle Verification**:
    -   When a user selects their father during registration, a verification step asks for an uncle's name.
    -   System validates the entered name against the father's actual siblings using fuzzy matching.
    -   Skip option available for users who cannot provide uncle name.
    -   Privacy-safe API only returns sibling count (not names) to unauthenticated users.
    -   Verification state resets when parent selection changes.
-   **Data Repair Tools**:
    -   Admin dashboard at `/admin/data-repair` for finding and fixing orphaned members.
    -   Three repair actions: link user to member, set member's parent, create member for user.
    -   Full audit logging with before/after state tracking.
    -   Rollback capability: any repair can be safely reverted using the change ID.

## External Dependencies
-   **PostgreSQL**: Primary database.
-   **Twilio Verify**: OTP verification service for user registration and authentication.
-   **Resend**: Transactional email sending.
-   **Google Drive API**: Automated cloud backups (CSV, JSON).
-   **Google Sheets API**: Living registry export to shareable spreadsheets.
-   **GitHub API**: Encrypted database backups to a private repository.
-   **D3.js**: JavaScript library for interactive family tree visualizations.