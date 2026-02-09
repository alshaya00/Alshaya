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
-   **Security Hardening**: API rate limiting, admin session management, password strength validation, and deletion protection.
-   **Admin Tools**: Comprehensive interfaces for user management, access requests, member merging, data validation, story moderation, and tools for managing unregistered members. This includes features for manual user-member linking, an orphaned users report, and a data cleanup tool.
-   **Duplicate Detection & Resolution**: A system to scan for potential duplicates with adjustable similarity thresholds, persistent exclusion of false positives, and revert functionality. An advanced scanner uses a 3-level detection system (Exact, Suspicious, Potential) with batch scanning, side-by-side comparison, and in-page merge flows.
-   **Registration Duplicate Prevention**: Real-time duplicate checks during user registration to prevent exact matches.
-   **CRM-Style Members Hub**: A dashboard (`/admin/members-hub`) that automatically detects and prioritizes data issues (duplicates, orphaned members, missing data, generation inconsistencies) with quick action buttons for resolution.
-   **Comprehensive Member Edit Modal**: Allows editing of all member fields, supports both Hijri and Gregorian calendars, includes a change history tab with revert capabilities.
-   **Quick-Add Smart Search**: Helper questions and filters to narrow down search results when adding members.
-   **Registration Uncle Verification**: A step during registration to verify the selected father by asking for an uncle's name, using fuzzy matching against the father's siblings.
-   **Data Repair Tools**: Admin dashboard (`/admin/data-repair`) for finding and fixing orphaned members, with rollback capabilities.
-   **Name Fix Tool**: Admin tool (`/admin/fix-names`) to detect and repair name issues (Arabic characters in English names, incomplete lineage) by regenerating full names and ancestor fields from the lineage.
-   **Gallery with Video Support**: Supports both images and videos (up to 50MB) with play button overlays and lightbox functionality.
-   **Conditional Approval System**: Allows family members to register even if their parent is pending approval, using `parentPendingId`. Includes sequential chain approval, enhanced admin review with pending warnings, and a dedicated admin page (`/admin/conditional-approvals`) to manage and visualize these relationships.

## External Dependencies
-   **PostgreSQL**: Primary database.
-   **Twilio Verify**: OTP verification.
-   **Resend**: Transactional email sending.
-   **Google Drive API**: Automated cloud backups.
-   **Google Sheets API**: Living registry export.
-   **GitHub API**: Encrypted database backups.
-   **D3.js**: Interactive family tree visualizations.