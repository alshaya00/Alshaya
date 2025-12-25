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
    -   **Audit Log System**: Tracks all significant actions in a dedicated `AuditLog` table, accessible via an admin API and UI.
-   **Data Management & Integrity**:
    -   **Backup System**: Database-backed backup system supporting manual and automatic daily backups with configurable intervals and retention. Stores snapshots in PostgreSQL.
    -   **Transactional Restore System**: Enterprise-grade restore process ensuring zero data loss with dependency-ordered restoration, atomic transactions, pre-restore safety backups, and member count verification.
    -   **Pending Member Data Consistency**: All pending member operations are database-driven, ensuring consistent data across admin and public interfaces.
    -   **Data Integrity Validation**: Comprehensive validation system (`src/lib/data-integrity.ts`) for checking generation values, parent relationships, and orphaned members. Available via admin API endpoint and runs automatically after CSV imports.
    -   **CSV Import Script**: Robust import script (`scripts/import-csv.ts`) that handles mixed Arabic/English headers, validates data, and reports issues. Run with `npm run import:csv`.
-   **Family Tree Features**:
    -   Interactive D3.js visualization with zoom/pan.
    -   Tree editor with "Change Parent" functionality and multi-root support.
    -   Support for up to 12 generations with distinct color coding per generation.
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

## External Dependencies
-   **PostgreSQL**: Primary database for all application data.
-   **Resend**: For transactional email sending (welcome, password reset, invitations) via Replit's Resend connector.
-   **Google Drive API**: For automated cloud backups (CSV export, JSON backup) to Google Drive.
-   **D3.js**: JavaScript library for data-driven documents, specifically used for the interactive family tree visualization.