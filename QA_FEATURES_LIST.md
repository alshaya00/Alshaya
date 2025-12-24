# QA Features List - Al-Shaye Family Tree Application

> Complete feature inventory for Quality Assurance testing

---

## Table of Contents

1. [Authentication & User Management](#1-authentication--user-management)
2. [Home Page & Navigation](#2-home-page--navigation)
3. [Family Tree Viewing & Interaction](#3-family-tree-viewing--interaction)
4. [Member Profile & Detail View](#4-member-profile--detail-view)
5. [Search & Filtering](#5-search--filtering)
6. [Data Management](#6-data-management)
7. [Journals & Stories](#7-journals--stories)
8. [Events & Gatherings](#8-events--gatherings)
9. [Broadcasts & Communications](#9-broadcasts--communications)
10. [Images & Media](#10-images--media)
11. [Breastfeeding Relationships](#11-breastfeeding-relationships)
12. [Admin Panel & Management](#12-admin-panel--management)
13. [User Profile & Account](#13-user-profile--account)
14. [Validations & Data Integrity](#14-validations--data-integrity)
15. [API Endpoints & Operations](#15-api-endpoints--operations)
16. [Error Handling & Edge Cases](#16-error-handling--edge-cases)
17. [Performance & Loading States](#17-performance--loading-states)
18. [Accessibility & Internationalization](#18-accessibility--internationalization)
19. [Responsive Design](#19-responsive-design)
20. [Database Models](#20-database-models)
21. [Component Testing](#21-component-testing)
22. [Utility Functions & Hooks](#22-utility-functions--hooks)
23. [Special Features & Integrations](#23-special-features--integrations)
24. [Edge Cases & Boundary Conditions](#24-edge-cases--boundary-conditions)

---

## 1. Authentication & User Management

### 1.1 Login Page (`/login`)

#### Form Validation
- [ ] Email validation (required, valid format)
- [ ] Password validation (required, minimum length)
- [ ] Remember me checkbox functionality

#### Login Flows
- [ ] Successful login with valid credentials
- [ ] Failed login with invalid email
- [ ] Failed login with wrong password
- [ ] Login attempt counter (max 5 attempts)
- [ ] Account lockout after max attempts (15 minutes)
- [ ] Remaining attempts display

#### 2FA (Two-Factor Authentication)
- [ ] Prompt display when 2FA enabled
- [ ] TOTP code entry (6 digits)
- [ ] Backup code entry (8 characters with hyphen)
- [ ] Backup code toggle
- [ ] Invalid code error handling
- [ ] Code expiration handling

#### OAuth Integration
- [ ] Google OAuth login
- [ ] GitHub OAuth login
- [ ] OAuth failure error messages
- [ ] OAuth denied error
- [ ] OAuth missing email error
- [ ] OAuth invalid state error

#### Session Management
- [ ] Session creation on successful login
- [ ] Token generation
- [ ] Session persistence with remember me
- [ ] Redirect to home on login success
- [ ] Error parameter parsing from URL

#### UI Elements
- [ ] Loading state during login
- [ ] Error message display
- [ ] Back button to initial login form from 2FA
- [ ] Link to forgot password
- [ ] Link to register/invite
- [ ] Footer information

---

### 1.2 Register Page (`/register`)

#### Three-Path Registration
- [ ] Path 1: Invitation code path (redirects to /invite)
- [ ] Path 2: Access request path (family member registration)
- [ ] Path 3: Browse path (redirect to tree)

#### Access Request Form - Step 1 (Personal Info)
- [ ] Arabic name (required, Arabic characters only)
- [ ] English name (optional)
- [ ] Phone number (required, valid format)

#### Access Request Form - Step 2 (Account Info)
- [ ] Email (required, valid format, unique)
- [ ] Password (required, 8+ chars, uppercase, lowercase, number)
- [ ] Confirm password (must match)
- [ ] Password strength indicators

#### Access Request Form - Step 3 (Family Relation)
- [ ] Family member search dropdown
- [ ] Member selection and display
- [ ] Relationship type dropdown
- [ ] Relationship description (required)
- [ ] Optional message field

#### Form Validation
- [ ] All required fields validation
- [ ] Email format validation
- [ ] Phone format validation
- [ ] Password complexity validation
- [ ] Password match validation
- [ ] Claimed relation requirement

#### Success State
- [ ] Success message display
- [ ] Request ID display
- [ ] Link to login
- [ ] Link to home

#### Error Handling
- [ ] Duplicate email error
- [ ] Invalid input errors
- [ ] Server error display
- [ ] Validation error display

---

### 1.3 Forgot Password Page (`/forgot-password`)
- [ ] Email submission
- [ ] Token generation
- [ ] Email delivery (if configured)
- [ ] Success/error states

### 1.4 Reset Password Page (`/reset-password`)
- [ ] Token validation
- [ ] New password entry
- [ ] Password confirmation
- [ ] Password complexity validation
- [ ] Success state after reset

### 1.5 Invite Page (`/invite`)
- [ ] Invite code input
- [ ] Email validation
- [ ] Registration flow after code verification
- [ ] Expired code handling
- [ ] Invalid code handling
- [ ] Role assignment from invite

### 1.6 Email Verification (`/verify-email`)
- [ ] Token validation
- [ ] Email verification status
- [ ] Verification link expiration

---

### 1.7 Registration Access Control
- [ ] Self-registration toggle (SiteSettings.allowSelfRegistration)
- [ ] Email verification requirement toggle
- [ ] Admin approval requirement toggle
- [ ] Access request submission
- [ ] Access request review workflow
- [ ] Access request approval/rejection
- [ ] Automatic user creation on approval
- [ ] Role assignment on approval

### 1.8 Password Security
- [ ] Password minimum length (8 characters)
- [ ] Password complexity requirements (uppercase, lowercase, number)
- [ ] Password reset token generation
- [ ] Password reset token expiration
- [ ] Password hashing/verification
- [ ] Password strength validation

### 1.9 2FA/TOTP Setup
- [ ] QR code generation
- [ ] Manual entry code display
- [ ] Secret key storage
- [ ] 2FA enablement toggle
- [ ] Backup code generation
- [ ] Backup code backup/download
- [ ] Code verification during login

### 1.10 Session Management
- [ ] Session token generation
- [ ] Session expiration (configurable days)
- [ ] Remember me functionality (configurable days)
- [ ] Session invalidation on logout
- [ ] Device tracking (user agent, IP address)
- [ ] Multiple session support per user

### 1.11 User Roles & Permissions

#### Roles
- [ ] SUPER_ADMIN (full access)
- [ ] ADMIN (most operations except member deletion, import, restore)
- [ ] BRANCH_LEADER (branch-specific operations)
- [ ] MEMBER (view, suggest edits)
- [ ] GUEST (limited view)

#### Permission Matrix
- [ ] View family tree
- [ ] View member profiles
- [ ] View contact info
- [ ] View photos
- [ ] View analytics
- [ ] View change history
- [ ] Add members
- [ ] Edit members
- [ ] Delete members (SUPER_ADMIN only)
- [ ] Suggest edits
- [ ] Approve pending members
- [ ] Export data
- [ ] Import data (SUPER_ADMIN only)
- [ ] Create snapshots
- [ ] Restore snapshots (SUPER_ADMIN only)
- [ ] View/manage users
- [ ] Invite users
- [ ] Approve access requests
- [ ] Change user roles
- [ ] Disable users (SUPER_ADMIN only)
- [ ] Manage site settings
- [ ] Manage privacy settings
- [ ] Manage permission matrix
- [ ] View audit logs
- [ ] Manage branch links

---

## 2. Home Page & Navigation

### 2.1 Home Page (`/`)

#### Guest View
- [ ] Hero section display
- [ ] Family name and tagline
- [ ] Family statistics (members, generations)
- [ ] Register button (Sign up for family)
- [ ] Explore tree button
- [ ] Project overview section
- [ ] Phase 2 announcement section
- [ ] Future phases roadmap
- [ ] Roadmap expansion toggle
- [ ] Contact section
- [ ] WhatsApp link
- [ ] Contributors link
- [ ] Navigation to login/register

#### Authenticated User View
- [ ] Welcome header with user name
- [ ] Quick action cards (Tree, Search, Gallery, Journals)
- [ ] Statistics cards (total members, generations, males, females)
- [ ] Contributors link
- [ ] Profile section access
- [ ] Responsive mobile layout

### 2.2 Navigation Components

#### Main Navigation
- [ ] Home
- [ ] Tree (Family Tree)
- [ ] Branches
- [ ] Journals
- [ ] Registry (Members)
- [ ] Profile (user-specific)
- [ ] Logout

#### Mobile Bottom Navigation
- [ ] Home
- [ ] Tree
- [ ] Journals
- [ ] Members
- [ ] Statistics

#### More Dropdown Menu
- [ ] Search
- [ ] Add Member
- [ ] Statistics
- [ ] Branches
- [ ] Tree Editor
- [ ] Export
- [ ] Import
- [ ] Duplicates
- [ ] History
- [ ] Admin Panel

### 2.3 Navigation Features
- [ ] RTL direction support
- [ ] Active page highlighting
- [ ] Permission-based menu item visibility
- [ ] Responsive design (desktop/mobile)
- [ ] Breadcrumb navigation on detail pages

---

## 3. Family Tree Viewing & Interaction

### 3.1 Tree Page (`/tree`)

#### Multiple View Modes
- [ ] Tree view (hierarchical)
- [ ] Generation view (grid by generation)
- [ ] List view (table format)
- [ ] Graph view (visual diagram)

#### Tree View Features
- [ ] Expandable/collapsible nodes
- [ ] Expand all functionality
- [ ] Collapse all functionality
- [ ] Member search highlighting
- [ ] Automatic path expansion to found member
- [ ] Generational color coding
- [ ] Gender indicators (male/female)
- [ ] Children count display
- [ ] Hover effects
- [ ] Click to view details

#### Generation View
- [ ] Generation grouping
- [ ] Member count per generation
- [ ] Gender color coding
- [ ] Grid layout with member cards
- [ ] Member click handling

#### List View
- [ ] Table with sortable columns
- [ ] Name, generation, gender, branch, children count
- [ ] Gender indicators
- [ ] Generation badges
- [ ] View detail button

#### Graph View
- [ ] Visual network diagram
- [ ] Interactive node selection
- [ ] Relationship visualization
- [ ] Member highlight on select

#### Search Functionality
- [ ] Real-time search as user types
- [ ] Search results dropdown
- [ ] Result limit (10 results)
- [ ] Member highlighting on selection
- [ ] Highlight auto-dismiss (4 seconds)

#### Member Detail Sidebar (Desktop)
- [ ] Avatar with gender indicator
- [ ] Full name display
- [ ] Member ID
- [ ] Generation badge
- [ ] Branch information
- [ ] Children counts (sons/daughters)
- [ ] Birth year display
- [ ] City display
- [ ] View full profile button
- [ ] Close button

#### Mobile Member Modal
- [ ] Modal display on member select
- [ ] Same info as desktop sidebar
- [ ] Swipe to close or button
- [ ] Responsive layout

#### Legend
- [ ] Generation color key
- [ ] Member count per generation

---

## 4. Member Profile & Detail View

### 4.1 Member Detail Page (`/member/[id]`)

#### Member Information Display
- [ ] Avatar/photo
- [ ] Full name (Arabic and English)
- [ ] Member ID
- [ ] Gender indicator
- [ ] Status (Living/Deceased)
- [ ] Generation
- [ ] Branch
- [ ] Birth year
- [ ] Death year (if deceased)
- [ ] City
- [ ] Occupation
- [ ] Phone number (if visible per privacy settings)
- [ ] Email (if visible per privacy settings)
- [ ] Biography

#### Family Relationships
- [ ] Father name and link
- [ ] Grandfather name and link
- [ ] Great-grandfather name and link
- [ ] Children list with links
- [ ] Spouse information (if applicable)
- [ ] Breastfeeding relationships (if applicable)

#### Photos Section
- [ ] Photo gallery
- [ ] Profile photo indicator
- [ ] Photo captions
- [ ] Photo upload option (if permissions allow)
- [ ] Photo deletion (if permissions allow)

#### Stories/Journals Section
- [ ] Related journals list
- [ ] Journal links
- [ ] Story snippets

#### Edit Capability
- [ ] Edit button for authorized users
- [ ] Quick edit fields
- [ ] Validation
- [ ] Change history link
- [ ] Suggest edit button (for members without edit permission)

#### Privacy Controls
- [ ] Phone visibility based on role
- [ ] Email visibility based on role
- [ ] Birth year visibility based on role
- [ ] Contact info visibility based on role

---

## 5. Search & Filtering

### 5.1 Search Page (`/search`)

#### Search Functionality
- [ ] Real-time search input
- [ ] Search by first name
- [ ] Search by full Arabic name
- [ ] Search by member ID
- [ ] Search result display (max results)
- [ ] Result highlighting

#### Advanced Filters
- [ ] Filter by gender (Male/Female)
- [ ] Filter by generation (dropdown)
- [ ] Filter by branch
- [ ] Filter by status (Living/Deceased)
- [ ] Multiple filter combination
- [ ] Filter reset

#### Search Results
- [ ] Member cards with key info
- [ ] Click to view profile
- [ ] Result count display
- [ ] No results message

#### Search History
- [ ] Recent searches display
- [ ] Search history tracking (if logged in)
- [ ] Clear history option
- [ ] History suggestions

---

## 6. Data Management

### 6.1 Gallery Page (`/gallery`)

#### Photo Gallery
- [ ] Photo grid display
- [ ] Photo filtering by category
- [ ] Photo filtering by member
- [ ] Lightbox view
- [ ] Photo upload (if permissions allow)
- [ ] Photo deletion (if permissions allow)
- [ ] Photo metadata (title, caption, year)
- [ ] Family album view (photos not tied to member)

#### Photo Categories
- [ ] Profile pictures
- [ ] Memories
- [ ] Documents
- [ ] Historical photos

### 6.2 Branches Page (`/branches`)

#### Branch Listing
- [ ] List of family branches
- [ ] Branch head information
- [ ] Member count per branch
- [ ] Branch description
- [ ] Branch location (if applicable)

#### Branch Details
- [ ] Member list in branch
- [ ] Branch head profile link
- [ ] Generation distribution
- [ ] Branch statistics

### 6.3 Quick Add Member (`/quick-add`)

#### Form Steps
- [ ] Personal information
- [ ] Family relationship
- [ ] Contact information
- [ ] Confirmation

#### Matching Algorithm
- [ ] Suggested duplicate detection
- [ ] Match confidence display
- [ ] Match reason display
- [ ] Merge existing member option
- [ ] Create new member option

### 6.4 Import Data (`/import`)

#### Import Options
- [ ] File type selection (JSON/CSV/EXCEL)
- [ ] Conflict strategy selection (SKIP/OVERWRITE/MERGE/ASK)
- [ ] Validate only toggle
- [ ] File upload

#### Import Process
- [ ] Progress display
- [ ] Processing status
- [ ] Success/error count
- [ ] Conflict resolution interface
- [ ] Import results summary

#### Error Handling
- [ ] Invalid file format error
- [ ] Missing required fields error
- [ ] Duplicate ID conflict
- [ ] Validation error details

### 6.5 Export Data (`/export`)

#### Export Options
- [ ] Format selection (JSON/CSV/EXCEL/PDF)
- [ ] Field selection (checkbox tree)
- [ ] Filter options (generation, branch, gender, status)
- [ ] Export filename customization

#### Export Formats
- [ ] JSON export
- [ ] CSV export
- [ ] Excel export
- [ ] PDF export with tree visualization

#### Filters Applied
- [ ] Generation filter
- [ ] Branch filter
- [ ] Gender filter
- [ ] Status filter
- [ ] Search query filter
- [ ] Group by generation option

### 6.6 Tree Editor (`/tree-editor`)

#### Member Editing
- [ ] Search member to edit
- [ ] Edit form for member fields
- [ ] Parent reassignment
- [ ] Inline validation
- [ ] Save changes
- [ ] Cancel edit

#### Change Tracking
- [ ] Change history display
- [ ] Change timestamp
- [ ] Changed by user
- [ ] Change reason (optional)

### 6.7 Duplicates Detection (`/duplicates`)

#### Duplicate Flags
- [ ] Duplicate pair display
- [ ] Match score display
- [ ] Match reasons list
- [ ] Status (PENDING/CONFIRMED/NOT_DUPLICATE/MERGED)

#### Resolution Actions
- [ ] Mark as duplicate
- [ ] Mark as not duplicate
- [ ] Merge members
- [ ] Merge options
- [ ] Merge confirmation

#### Merge Process
- [ ] Select primary member
- [ ] Field conflict resolution
- [ ] Photo consolidation
- [ ] Change history update
- [ ] Relationship update

---

## 7. Journals & Stories

### 7.1 Journals List Page (`/journals`)

#### Journal Listing
- [ ] Journal cards with cover image
- [ ] Title (Arabic and English)
- [ ] Category badge
- [ ] Story excerpt
- [ ] Date/era information
- [ ] Author name
- [ ] View count
- [ ] Featured indicator
- [ ] Read more link

#### Filtering
- [ ] Filter by category (Oral History, Migration, Memory, Poem, Genealogy)
- [ ] Filter by generation
- [ ] Filter by time period
- [ ] Featured journals highlight

#### Sorting
- [ ] Sort by date
- [ ] Sort by view count
- [ ] Sort by category

### 7.2 Create Journal (`/journals/new`)

#### Journal Form
- [ ] Title (Arabic and English)
- [ ] Content (Arabic and English, rich text editor)
- [ ] Excerpt/summary
- [ ] Category selection
- [ ] Time period (era description)
- [ ] Year from/to
- [ ] Location (Arabic and English)
- [ ] Primary member link
- [ ] Related members selection
- [ ] Cover image upload
- [ ] Media attachments (images, documents, audio, video)
- [ ] Tags/keywords
- [ ] Narrator information
- [ ] Source information
- [ ] Status (DRAFT/PUBLISHED/ARCHIVED)
- [ ] Featured toggle

### 7.3 Edit Journal (`/journals/[id]`)

#### Journal Editing
- [ ] Same form as create
- [ ] Pre-populated fields
- [ ] Delete option
- [ ] Publication status change
- [ ] Publish/draft toggle
- [ ] Archive option

### 7.4 Journal Detail Page (`/journals/[id]`)

#### Journal Display
- [ ] Full title and content
- [ ] Cover image
- [ ] Author name and date
- [ ] Category badge
- [ ] Time period information
- [ ] Location information
- [ ] Related members list with links
- [ ] Media gallery
- [ ] View count
- [ ] Related journals section
- [ ] Comments section (if enabled)

---

## 8. Events & Gatherings

### 8.1 Gatherings Page (`/gatherings`)

#### Event Listing
- [ ] Event cards
- [ ] Event title and date
- [ ] Event type (gathering, wedding, eid, memorial, celebration)
- [ ] Location
- [ ] Event organizer
- [ ] Status (UPCOMING/ONGOING/COMPLETED/CANCELLED)
- [ ] RSVP status (if user attending)

#### Event Filtering
- [ ] Filter by type
- [ ] Filter by status
- [ ] Upcoming events highlight

### 8.2 Event Detail Page (`/gatherings/[id]`)

#### Event Information
- [ ] Title and description (Arabic and English)
- [ ] Date and time
- [ ] Duration (if multi-day)
- [ ] Location and map link
- [ ] Event type
- [ ] Organizer information
- [ ] Cover image

#### RSVP Functionality
- [ ] RSVP status options (YES/MAYBE/NO)
- [ ] RSVP note field
- [ ] RSVP count by status
- [ ] Attendee list
- [ ] RSVP deadline

#### Event Management (for organizers)
- [ ] Edit event
- [ ] Cancel event
- [ ] View attendee responses
- [ ] Send reminder email/SMS (if configured)

---

## 9. Broadcasts & Communications

### 9.1 Broadcasts Admin (`/admin/broadcasts`)

#### Broadcast Listing
- [ ] Broadcast title
- [ ] Type (MEETING/ANNOUNCEMENT/REMINDER/UPDATE)
- [ ] Status (DRAFT/SCHEDULED/SENDING/SENT/CANCELLED)
- [ ] Target audience
- [ ] Send date/time
- [ ] Recipient count
- [ ] Sent count
- [ ] Open/click statistics

### 9.2 Create/Edit Broadcast (`/admin/broadcasts/[id]`)

#### Broadcast Form
- [ ] Title (Arabic and English)
- [ ] Content (Arabic and English, HTML editor)
- [ ] Type selection
- [ ] Target audience (ALL/BRANCH/GENERATION/CUSTOM)
- [ ] Target specification (branch/generation selection, member multi-select)
- [ ] Meeting-specific fields (date, location, meeting link, RSVP required, RSVP deadline)
- [ ] Schedule options (send immediately or schedule for later)
- [ ] Draft/schedule save

#### Broadcast Management
- [ ] Send broadcast (from DRAFT or SCHEDULED state)
- [ ] Cancel broadcast
- [ ] View statistics
- [ ] View recipient list
- [ ] View RSVP responses
- [ ] Resend to non-responders

### 9.3 Broadcast Recipient Tracking
- [ ] Delivery status (PENDING/SENT/FAILED/BOUNCED)
- [ ] Open tracking
- [ ] Click tracking
- [ ] RSVP response and date
- [ ] RSVP note display

---

## 10. Images & Media

### 10.1 Image Upload (`/api/images/upload`)

#### Upload Process
- [ ] File selection
- [ ] Image preview
- [ ] Category selection
- [ ] Title and caption (Arabic and English)
- [ ] Year metadata
- [ ] Member linking
- [ ] Member tagging (for group photos)
- [ ] Upload submission
- [ ] Progress indicator

#### Validation
- [ ] File type validation (image only)
- [ ] File size validation
- [ ] Image dimension validation
- [ ] Duplicate detection

### 10.2 Pending Images (`/admin/database/images`)

#### Image Review Workflow
- [ ] Pending images list
- [ ] Image thumbnail preview
- [ ] Image metadata display
- [ ] Uploader information
- [ ] Approve button
- [ ] Reject button
- [ ] Rejection reason (optional)

#### Approval Process
- [ ] Mark as approved
- [ ] Move to member photo gallery
- [ ] Update member profile photo
- [ ] Category assignment
- [ ] Visibility settings (public/private)

### 10.3 Member Photo Gallery

#### Photo Display
- [ ] Grid or list view
- [ ] Photo categories
- [ ] Sort options (date, upload date, category)
- [ ] Profile photo indicator
- [ ] Photo editing (for authorized users)
- [ ] Photo deletion (for authorized users)

#### Photo Details
- [ ] Title and caption
- [ ] Year taken
- [ ] Upload date and uploader
- [ ] Tagged members

---

## 11. Breastfeeding Relationships

### 11.1 Breastfeeding Section (Member Detail)

#### Breastfeeding Information Display
- [ ] Wet nurse/milk mother information
- [ ] Milk father information
- [ ] Breastfeeding year
- [ ] Related notes
- [ ] Link to related members

### 11.2 Add/Edit Breastfeeding Relationship

#### Form Fields
- [ ] Child selection (member being breastfed)
- [ ] Wet nurse selection or external name
- [ ] Milk father selection or external name
- [ ] Breastfeeding year
- [ ] Additional notes
- [ ] Save/delete options

### 11.3 Breastfeeding Validation
- [ ] Child must exist
- [ ] Valid year range
- [ ] Prevent duplicate relationships
- [ ] Marriage prohibition calculations (if applicable)

---

## 12. Admin Panel & Management

### 12.1 Admin Dashboard (`/admin`)

#### Statistics Cards
- [ ] Total members
- [ ] Pending approvals
- [ ] Recent changes
- [ ] Active admins
- [ ] Database size
- [ ] Duplicates count
- [ ] Branch links count
- [ ] Pending images count
- [ ] Access requests count

#### Last Backup Info
- [ ] Last backup timestamp
- [ ] Backup status
- [ ] Backup size

#### Action Items (Priority List)
- [ ] Pending members to approve
- [ ] Pending images to review
- [ ] Duplicates to resolve
- [ ] Access requests to review
- [ ] Backup status
- [ ] Priority color coding (high/medium/low)

#### Recent Activity Log
- [ ] Activity type
- [ ] Description
- [ ] User who performed action
- [ ] Timestamp

### 12.2 Admin Users Management (`/admin/permissions`)

#### User Listing
- [ ] User email
- [ ] Role
- [ ] Status
- [ ] Last login
- [ ] Created date
- [ ] Edit/delete buttons

#### User Management Actions
- [ ] Create new user
- [ ] Edit user role
- [ ] Edit user status
- [ ] Disable user
- [ ] Reset password
- [ ] View user activity

#### Role Assignment
- [ ] Assign SUPER_ADMIN (SUPER_ADMIN only)
- [ ] Assign ADMIN
- [ ] Assign BRANCH_LEADER (with branch selection)
- [ ] Assign MEMBER
- [ ] Revoke roles

### 12.3 Settings Management (`/admin/settings`)

#### Site Settings
- [ ] Family name (Arabic and English)
- [ ] Tagline (Arabic and English)
- [ ] Logo upload
- [ ] Default language
- [ ] Session duration
- [ ] Remember me duration
- [ ] Self-registration toggle
- [ ] Email verification requirement
- [ ] Admin approval requirement
- [ ] Max login attempts
- [ ] Lockout duration
- [ ] 2FA requirement for admins
- [ ] Min password length
- [ ] Guest preview toggle
- [ ] Guest preview member count

#### Privacy Settings
- [ ] Profile visibility per role
- [ ] Phone visibility per role
- [ ] Email visibility per role
- [ ] Birth year visibility per role
- [ ] Age display toggle
- [ ] Occupation visibility
- [ ] City visibility
- [ ] Biography visibility
- [ ] Photo visibility per role
- [ ] Death year visibility
- [ ] Full death date visibility toggle

### 12.4 Database Management (`/admin/database`)

#### Members Management
- [ ] View all members
- [ ] Filter options
- [ ] Search members
- [ ] Edit member
- [ ] Delete member
- [ ] View member history

#### Pending Members
- [ ] Pending member list
- [ ] Review pending member
- [ ] Approve member
- [ ] Reject member
- [ ] Rejection reason

#### Branch Management
- [ ] View all branches
- [ ] Edit branch info
- [ ] Create new branch
- [ ] Delete branch

#### Snapshots
- [ ] List database snapshots
- [ ] Create new snapshot
- [ ] Snapshot name and description
- [ ] Restore from snapshot
- [ ] Delete snapshot
- [ ] Snapshot timestamp
- [ ] Snapshot creator
- [ ] Snapshot member count

#### Change History
- [ ] View all changes
- [ ] Filter by member
- [ ] Filter by user
- [ ] Filter by change type (CREATE/UPDATE/DELETE/PARENT_CHANGE/RESTORE)
- [ ] Filter by date range
- [ ] View change details
- [ ] Change reason display
- [ ] Rollback option (if applicable)

#### Excel/CSV View
- [ ] All members in spreadsheet view
- [ ] Inline editing
- [ ] Bulk import from spreadsheet
- [ ] Column customization
- [ ] Download spreadsheet

### 12.5 Images Management (`/admin/database/images`)

#### Pending Images
- [ ] Image preview
- [ ] Metadata display
- [ ] Approve button
- [ ] Reject button

### 12.6 Duplicates Management (`/admin/database/branches`)

#### Duplicate Listing
- [ ] Duplicate pair display
- [ ] Match score
- [ ] Match reasons
- [ ] Resolution options
- [ ] Merge duplicates
- [ ] Mark as not duplicate

### 12.7 Services Configuration (`/admin/services`)

#### Email Provider Settings
- [ ] Provider selection (resend, sendgrid, mailgun, smtp, none)
- [ ] API key input
- [ ] From address
- [ ] From name
- [ ] SMTP configuration (if provider is smtp)
- [ ] Test email send

#### SMS/OTP Provider Settings
- [ ] Provider selection (twilio, vonage, messagebird, none)
- [ ] API key input
- [ ] API secret input
- [ ] From number

#### Service Toggles
- [ ] Enable email notifications
- [ ] Enable SMS notifications
- [ ] Test mode toggle

### 12.8 Backup Management (`/admin/settings`)

#### Backup Configuration
- [ ] Enable/disable backups
- [ ] Backup interval (hours)
- [ ] Max backups to keep
- [ ] Retention days
- [ ] Last backup status
- [ ] Manual backup button
- [ ] Backup list with size and date

### 12.9 Audit Logs (`/admin/audit`)

#### Activity Log Listing
- [ ] User name/email
- [ ] Action type (LOGIN, LOGOUT, CREATE_MEMBER, EDIT_MEMBER, DELETE_MEMBER, etc.)
- [ ] Category (AUTH, MEMBER, USER, SETTINGS, EXPORT, etc.)
- [ ] Target (member ID, user ID, etc.)
- [ ] Timestamp
- [ ] IP address
- [ ] Success/failure status
- [ ] Error message (if failed)

#### Filtering
- [ ] Filter by user
- [ ] Filter by action type
- [ ] Filter by category
- [ ] Filter by date range
- [ ] Filter by success/failure

#### Reporting
- [ ] Activity report export
- [ ] Suspicious activity alert
- [ ] User activity summary
- [ ] Change summary by member

### 12.10 Feature Flags (`/admin/features`)

#### Feature Toggle Management
- [ ] Toggle family tree feature
- [ ] Toggle registry feature
- [ ] Toggle journals feature
- [ ] Toggle gallery feature
- [ ] Toggle gatherings feature
- [ ] Toggle dashboard feature
- [ ] Toggle search feature
- [ ] Toggle branches feature
- [ ] Toggle quick add feature
- [ ] Toggle import/export features
- [ ] Toggle tree editor feature
- [ ] Toggle duplicate detection
- [ ] Toggle change history
- [ ] Toggle registration feature
- [ ] Toggle invitations
- [ ] Toggle access requests
- [ ] Toggle profiles
- [ ] Toggle breastfeeding relationships
- [ ] Toggle branch entry links
- [ ] Toggle onboarding
- [ ] Toggle image moderation
- [ ] Toggle broadcasts
- [ ] Toggle reports
- [ ] Toggle audit
- [ ] Toggle API services

### 12.11 Permission Matrix Configuration

#### Role-Based Permissions
- [ ] View permission matrix
- [ ] Edit permission matrix
- [ ] Add/remove permissions per role
- [ ] Custom permission per user
- [ ] Save and activate changes

### 12.12 Branch Links Management (`/admin/database/branches`)

#### Branch Entry Link Management
- [ ] Create new branch link
- [ ] Select branch head
- [ ] Set expiration date
- [ ] Set max uses
- [ ] Generate unique token/code
- [ ] Share link
- [ ] Deactivate link
- [ ] View link statistics (uses, creation date)
- [ ] Delete link

### 12.13 API Configuration (`/admin/services`)

#### API Keys Management
- [ ] Generate API key
- [ ] View API keys (partial display for security)
- [ ] Revoke API key
- [ ] Set API key permissions
- [ ] View API key usage
- [ ] Rotation policy

---

## 13. User Profile & Account

### 13.1 Profile Page (`/profile`)

#### Profile Information Display
- [ ] User name (Arabic and English)
- [ ] Email
- [ ] Phone
- [ ] Avatar
- [ ] City
- [ ] Birth date
- [ ] Linked family member (if applicable)
- [ ] Role display
- [ ] Status
- [ ] Account created date
- [ ] Last login date

### 13.2 Profile Editing

#### Editable Fields
- [ ] Name (Arabic and English)
- [ ] Phone
- [ ] Avatar upload
- [ ] City
- [ ] Birth date
- [ ] Linked member selection (optional)

#### Validation
- [ ] Email cannot be changed (already unique)
- [ ] Name required
- [ ] Phone format validation
- [ ] Avatar size and format validation

### 13.3 Security Settings (`/settings/security`)

#### Password Management
- [ ] Change password form
- [ ] Current password verification
- [ ] New password entry
- [ ] Password confirmation
- [ ] Password strength validation
- [ ] Change password button

#### 2FA Management
- [ ] View 2FA status
- [ ] Enable 2FA button (if not enabled)
- [ ] Generate new QR code
- [ ] Show manual entry code
- [ ] Backup codes display
- [ ] Disable 2FA (if enabled, with password confirmation)
- [ ] Download backup codes

#### Sessions Management
- [ ] Active sessions list
- [ ] Device name (browser/OS)
- [ ] Last activity timestamp
- [ ] IP address
- [ ] Sign out from device option
- [ ] Sign out all other sessions button

#### Login History
- [ ] Recent login list
- [ ] Login timestamp
- [ ] Device information
- [ ] IP address
- [ ] Location (if available)

---

## 14. Validations & Data Integrity

### 14.1 Form Validations

#### Email Validation
- [ ] Required field
- [ ] Valid email format
- [ ] Unique email (on registration)
- [ ] Already registered check

#### Password Validation
- [ ] Minimum 8 characters
- [ ] At least one uppercase letter
- [ ] At least one lowercase letter
- [ ] At least one number
- [ ] Confirmation match

#### Arabic Name Validation
- [ ] Required field
- [ ] Minimum 2 characters
- [ ] Arabic characters only (U+0600 to U+06FF range)

#### English Name Validation
- [ ] Optional field
- [ ] Minimum 2 characters (if provided)
- [ ] English letters only (A-Z, a-z, spaces)

#### Phone Validation
- [ ] Optional field
- [ ] Valid international format
- [ ] Minimum 7 digits
- [ ] Accepts +, -, (), spaces

#### Gender Validation
- [ ] Required field
- [ ] Only Male or Female

#### Generation Validation
- [ ] Required field
- [ ] Integer between 1-20
- [ ] Must be >= parent's generation

#### Birth Year Validation
- [ ] Optional field
- [ ] Integer between 1800-current year
- [ ] Cannot be after death year

#### Death Year Validation
- [ ] Optional field
- [ ] Integer between 1800-current year
- [ ] Cannot be before birth year
- [ ] Only if status is Deceased

#### Member ID Validation
- [ ] Required field
- [ ] Unique ID
- [ ] Format: P + 3 digits (P001)
- [ ] Cannot be changed after creation

#### Father ID Validation
- [ ] Optional field
- [ ] Must reference existing member
- [ ] Cannot be a child of this member (prevent cycles)
- [ ] Cannot be the same as member ID

#### Branch Name Validation
- [ ] Optional field
- [ ] Alphanumeric and spaces

### 14.2 Data Integrity Checks

#### Circular Reference Prevention
- [ ] Prevent member from being their own parent
- [ ] Prevent member from being ancestor of their parent

#### Relationship Validation
- [ ] Prevent duplicate parent assignments
- [ ] Prevent invalid gender combinations (if applicable)
- [ ] Prevent chronological inconsistencies (child born before parent)

#### Photo Validation
- [ ] Image file type validation
- [ ] Image size limits
- [ ] Image dimension validation

#### Member Search Validation
- [ ] Minimum search length (2 characters)
- [ ] Case-insensitive matching
- [ ] Partial name matching

---

## 15. API Endpoints & Operations

### 15.1 Authentication APIs
- [ ] `POST /api/auth/register` - Register/submit access request
- [ ] `POST /api/auth/login` - User login
- [ ] `POST /api/auth/logout` - User logout
- [ ] `GET /api/auth/me` - Get current user
- [ ] `POST /api/auth/verify-email` - Verify email address
- [ ] `POST /api/auth/forgot-password` - Request password reset
- [ ] `POST /api/auth/reset-password` - Reset password with token
- [ ] `POST /api/auth/2fa/setup` - Setup 2FA
- [ ] `POST /api/auth/2fa/verify` - Verify 2FA code
- [ ] `GET /api/auth/oauth/[provider]` - OAuth initiation (Google, GitHub)
- [ ] `GET /api/auth/oauth/callback` - OAuth callback

### 15.2 Member APIs
- [ ] `GET /api/members` - Get all members (paginated)
- [ ] `POST /api/members` - Create new member
- [ ] `GET /api/members/[id]` - Get member details
- [ ] `PUT /api/members/[id]` - Update member
- [ ] `DELETE /api/members/[id]` - Delete member
- [ ] `POST /api/members/match` - Find duplicate/matching members
- [ ] `GET /api/members/[id]/breastfeeding` - Get breastfeeding relationships
- [ ] `POST /api/members/[id]/breastfeeding` - Add breastfeeding relationship

### 15.3 Breastfeeding APIs
- [ ] `GET /api/breastfeeding` - Get all breastfeeding relationships
- [ ] `POST /api/breastfeeding` - Create relationship
- [ ] `GET /api/breastfeeding/[id]` - Get relationship details
- [ ] `PUT /api/breastfeeding/[id]` - Update relationship
- [ ] `DELETE /api/breastfeeding/[id]` - Delete relationship

### 15.4 Tree APIs
- [ ] `GET /api/tree` - Get full family tree structure
- [ ] `POST /api/tree/move` - Move member in tree (change parent)

### 15.5 Search APIs
- [ ] `GET /api/search/suggestions` - Get search suggestions
- [ ] `GET /api/search/history` - Get user's search history
- [ ] `POST /api/search/history` - Save search to history

### 15.6 Statistics APIs
- [ ] `GET /api/statistics` - Get family statistics

### 15.7 User APIs
- [ ] `GET /api/users` - Get all users (admin only)
- [ ] `POST /api/users` - Create new user (admin)
- [ ] `GET /api/profile` - Get current user profile
- [ ] `PUT /api/profile` - Update current user profile
- [ ] `DELETE /api/profile` - Delete current user

### 15.8 Image APIs
- [ ] `GET /api/images/gallery` - Get gallery images
- [ ] `GET /api/images/member/[memberId]` - Get member photos
- [ ] `POST /api/images/upload` - Upload new image
- [ ] `GET /api/images/pending` - Get pending images (admin)
- [ ] `POST /api/images/pending/[id]` - Approve/reject pending image
- [ ] `GET /api/images/photo/[id]` - Get photo details
- [ ] `PUT /api/images/photo/[id]` - Update photo metadata
- [ ] `DELETE /api/images/photo/[id]` - Delete photo

### 15.9 Journal APIs
- [ ] `GET /api/journals` - Get all journals
- [ ] `POST /api/journals` - Create new journal
- [ ] `GET /api/journals/[id]` - Get journal details
- [ ] `PUT /api/journals/[id]` - Update journal
- [ ] `DELETE /api/journals/[id]` - Delete journal

### 15.10 Gathering APIs
- [ ] `GET /api/gatherings` - Get all gatherings
- [ ] `POST /api/gatherings` - Create gathering
- [ ] `GET /api/gatherings/[id]` - Get gathering details
- [ ] `PUT /api/gatherings/[id]` - Update gathering
- [ ] `DELETE /api/gatherings/[id]` - Delete gathering

### 15.11 Broadcast APIs
- [ ] `GET /api/broadcasts` - Get all broadcasts
- [ ] `POST /api/broadcasts` - Create broadcast
- [ ] `GET /api/broadcasts/[id]` - Get broadcast details
- [ ] `PUT /api/broadcasts/[id]` - Update broadcast
- [ ] `POST /api/broadcasts/[id]/send` - Send broadcast
- [ ] `POST /api/broadcasts/[id]/cancel` - Cancel broadcast
- [ ] `GET /api/broadcasts/[id]/recipients` - Get recipient list
- [ ] `POST /api/broadcasts/[id]/rsvp` - Submit RSVP

### 15.12 Member Update Request APIs
- [ ] `GET /api/member-update-requests` - Get all update requests (admin)
- [ ] `POST /api/member-update-requests` - Submit update request
- [ ] `GET /api/member-update-requests/[id]` - Get request details
- [ ] `PUT /api/member-update-requests/[id]` - Review request (approve/reject)

### 15.13 Access Request APIs
- [ ] `GET /api/access-requests` - Get pending requests (admin)
- [ ] `POST /api/access-requests` - Submit access request
- [ ] `PUT /api/access-requests/[id]` - Review request (approve/reject)

### 15.14 Admin APIs
- [ ] `GET /api/admin/pending` - Get pending members
- [ ] `POST /api/admin/pending/[id]` - Approve/reject pending member
- [ ] `GET /api/admin/duplicates` - Get duplicate flags
- [ ] `POST /api/admin/duplicates/[id]` - Resolve duplicate
- [ ] `GET /api/admin/snapshots` - Get database snapshots
- [ ] `POST /api/admin/snapshots` - Create snapshot
- [ ] `POST /api/admin/snapshots/[id]` - Restore snapshot
- [ ] `DELETE /api/admin/snapshots/[id]` - Delete snapshot
- [ ] `GET /api/admin/history` - Get change history
- [ ] `GET /api/admin/audit` - Get audit logs
- [ ] `POST /api/admin/rollback` - Rollback changes
- [ ] `GET /api/admin/config` - Get site configuration
- [ ] `PUT /api/admin/config` - Update site configuration
- [ ] `GET /api/admin/features` - Get feature flags
- [ ] `PUT /api/admin/features` - Update feature flags
- [ ] `GET /api/admin/services` - Get services config
- [ ] `PUT /api/admin/services` - Update services config
- [ ] `GET /api/admin/branch-links` - Get branch entry links
- [ ] `POST /api/admin/branch-links` - Create branch link
- [ ] `DELETE /api/admin/branch-links/[id]` - Delete branch link
- [ ] `GET /api/admin/api-keys` - Get API keys
- [ ] `POST /api/admin/api-keys` - Generate API key
- [ ] `DELETE /api/admin/api-keys/[id]` - Revoke API key
- [ ] `GET /api/admin/backup-config` - Get backup configuration
- [ ] `PUT /api/admin/backup-config` - Update backup configuration

### 15.15 Settings APIs
- [ ] `GET /api/settings` - Get site settings
- [ ] `PUT /api/settings` - Update site settings

### 15.16 Health Check
- [ ] `GET /api/health` - Health check endpoint

---

## 16. Error Handling & Edge Cases

### 16.1 Network Errors
- [ ] Connection timeout
- [ ] Server error (500)
- [ ] Not found error (404)
- [ ] Unauthorized error (401)
- [ ] Forbidden error (403)
- [ ] Bad request error (400)
- [ ] Conflict error (409)
- [ ] Rate limit error (429)
- [ ] Service unavailable (503)

### 16.2 Validation Errors
- [ ] Missing required field
- [ ] Invalid field format
- [ ] Field too long
- [ ] Field too short
- [ ] Invalid data type
- [ ] Duplicate entry
- [ ] Reference not found
- [ ] Circular reference

### 16.3 Authentication Errors
- [ ] Invalid credentials
- [ ] Account locked (too many attempts)
- [ ] Account disabled
- [ ] Account pending approval
- [ ] Session expired
- [ ] Invalid token
- [ ] 2FA code invalid
- [ ] 2FA code expired
- [ ] Backup code invalid
- [ ] OAuth provider error
- [ ] Email not verified

### 16.4 Permission Errors
- [ ] Insufficient permissions for operation
- [ ] Role not authorized
- [ ] User disabled
- [ ] Access denied to member data

### 16.5 Data Errors
- [ ] Member ID already exists
- [ ] Invalid parent relationship
- [ ] Parent/child in same generation
- [ ] Circular reference in parent
- [ ] Invalid gender combination
- [ ] Birth year after death year
- [ ] Photo too large
- [ ] Invalid image format
- [ ] Member not found
- [ ] Branch not found
- [ ] User not found

### 16.6 Business Logic Errors
- [ ] Cannot delete member with children
- [ ] Cannot change parent to child
- [ ] Cannot duplicate member
- [ ] Cannot merge into same member
- [ ] Invalid status transition
- [ ] Invalid workflow state

---

## 17. Performance & Loading States

### 17.1 Loading States
- [ ] Page loading spinner
- [ ] Data fetch loading indicator
- [ ] Form submission loading state
- [ ] Button disabled during submission
- [ ] Skeleton screens
- [ ] Lazy loading of images
- [ ] Pagination for large datasets
- [ ] Search result lazy loading

### 17.2 Caching
- [ ] Member data caching
- [ ] Search result caching
- [ ] Session caching
- [ ] Image caching
- [ ] Statistics caching

### 17.3 Performance Features
- [ ] Optimized tree rendering
- [ ] Virtual scrolling for large lists
- [ ] Image lazy loading
- [ ] Debounced search
- [ ] Pagination of results
- [ ] Database indexes on frequently queried fields

---

## 18. Accessibility & Internationalization

### 18.1 Accessibility
- [ ] RTL (Right-to-Left) language support
- [ ] ARIA labels on interactive elements
- [ ] Keyboard navigation support
- [ ] Tab order
- [ ] Focus indicators
- [ ] Alt text for images
- [ ] Semantic HTML
- [ ] Color contrast compliance
- [ ] Screen reader compatibility

### 18.2 Internationalization
- [ ] Arabic (ar) language support
- [ ] English (en) language support
- [ ] Bilingual form labels
- [ ] Bilingual member names
- [ ] Bilingual journal content
- [ ] Date/time localization
- [ ] Number formatting
- [ ] Currency (if applicable)

---

## 19. Responsive Design

### 19.1 Desktop View
- [ ] Full-width layout
- [ ] Multi-column layout
- [ ] Sidebar navigation
- [ ] Member detail sidebar
- [ ] Table views

### 19.2 Tablet View
- [ ] Optimized layout
- [ ] Touch-friendly buttons
- [ ] Responsive grid

### 19.3 Mobile View
- [ ] Single column layout
- [ ] Bottom navigation bar
- [ ] Modal for details instead of sidebar
- [ ] Touch-optimized controls
- [ ] Mobile-specific navigation
- [ ] Responsive forms
- [ ] Mobile-friendly modals

---

## 20. Database Models

### 20.1 FamilyMember Model

#### Required Fields
- [ ] id (unique)
- [ ] firstName
- [ ] gender
- [ ] familyName (default: "آل شايع")
- [ ] generation (default: 1)

#### Optional Fields
- [ ] fatherName
- [ ] grandfatherName
- [ ] greatGrandfatherName
- [ ] fatherId (parent reference)
- [ ] birthYear
- [ ] deathYear
- [ ] sonsCount
- [ ] daughtersCount
- [ ] branch
- [ ] fullNameAr
- [ ] fullNameEn
- [ ] phone
- [ ] city
- [ ] status (default: "Living")
- [ ] photoUrl
- [ ] biography
- [ ] occupation
- [ ] email
- [ ] lineageBranchId
- [ ] lineageBranchName
- [ ] subBranchId
- [ ] subBranchName
- [ ] lineagePath (JSON)

#### Metadata
- [ ] createdAt
- [ ] updatedAt
- [ ] createdBy
- [ ] lastModifiedBy
- [ ] version (for optimistic locking)

### 20.2 User Model

#### Required Fields
- [ ] id
- [ ] email (unique)
- [ ] passwordHash
- [ ] nameArabic
- [ ] role (default: "MEMBER")
- [ ] status (default: "PENDING")

#### Optional Fields
- [ ] nameEnglish
- [ ] phone
- [ ] avatarUrl
- [ ] city
- [ ] birthDate
- [ ] linkedMemberId
- [ ] assignedBranch

#### Metadata
- [ ] createdAt
- [ ] updatedAt
- [ ] lastLoginAt
- [ ] emailVerifiedAt

### 20.3 Session Model
- [ ] id
- [ ] userId
- [ ] token (unique)
- [ ] expiresAt
- [ ] rememberMe
- [ ] ipAddress
- [ ] userAgent
- [ ] deviceName
- [ ] createdAt
- [ ] lastActiveAt

### 20.4 ChangeHistory Model
- [ ] id
- [ ] memberId
- [ ] fieldName
- [ ] oldValue
- [ ] newValue
- [ ] changeType (CREATE, UPDATE, DELETE, PARENT_CHANGE, RESTORE)
- [ ] changedBy
- [ ] changedByName
- [ ] changedAt
- [ ] batchId (for grouped changes)
- [ ] fullSnapshot (JSON before change)
- [ ] reason
- [ ] ipAddress

### 20.5 MemberPhoto Model
- [ ] id
- [ ] memberId
- [ ] imageData (base64)
- [ ] thumbnailData
- [ ] category (profile, memory, document, historical)
- [ ] title
- [ ] titleAr
- [ ] caption
- [ ] captionAr
- [ ] year
- [ ] taggedMemberIds (JSON)
- [ ] uploadedBy
- [ ] uploadedByName
- [ ] isProfilePhoto
- [ ] displayOrder
- [ ] isPublic
- [ ] isFamilyAlbum

### 20.6 PendingImage Model
- [ ] id
- [ ] imageData (base64)
- [ ] thumbnailData
- [ ] category
- [ ] title/titleAr
- [ ] caption/captionAr
- [ ] year
- [ ] memberId
- [ ] taggedMemberIds (JSON)
- [ ] uploadedBy
- [ ] uploadedByName
- [ ] uploadedByEmail
- [ ] uploadedAt
- [ ] reviewStatus (PENDING, APPROVED, REJECTED)
- [ ] reviewedBy
- [ ] reviewedAt
- [ ] reviewNotes
- [ ] approvedPhotoId

### 20.7 BreastfeedingRelationship Model
- [ ] id
- [ ] childId
- [ ] nurseId
- [ ] externalNurseName
- [ ] milkFatherId
- [ ] externalMilkFatherName
- [ ] notes
- [ ] breastfeedingYear
- [ ] createdAt
- [ ] updatedAt
- [ ] createdBy

### 20.8 FamilyJournal Model
- [ ] id
- [ ] titleAr
- [ ] titleEn
- [ ] contentAr
- [ ] contentEn
- [ ] excerpt
- [ ] category (ORAL_HISTORY, MIGRATION, MEMORY, POEM, GENEALOGY)
- [ ] tags (JSON)
- [ ] era
- [ ] yearFrom
- [ ] yearTo
- [ ] dateDescription
- [ ] location
- [ ] locationAr
- [ ] primaryMemberId
- [ ] relatedMemberIds (JSON)
- [ ] generation
- [ ] coverImageUrl
- [ ] mediaItems (JournalMedia relation)
- [ ] narrator
- [ ] narratorId
- [ ] source
- [ ] status (DRAFT, PUBLISHED, ARCHIVED)
- [ ] isFeatured
- [ ] displayOrder
- [ ] authorId
- [ ] authorName
- [ ] reviewStatus (PENDING, APPROVED, REJECTED)
- [ ] reviewedBy
- [ ] reviewedAt
- [ ] reviewNotes
- [ ] viewCount
- [ ] createdAt
- [ ] updatedAt

### 20.9 Broadcast Model
- [ ] id
- [ ] titleAr
- [ ] titleEn
- [ ] contentAr
- [ ] contentEn
- [ ] type (MEETING, ANNOUNCEMENT, REMINDER, UPDATE)
- [ ] meetingDate
- [ ] meetingLocation
- [ ] meetingUrl
- [ ] rsvpRequired
- [ ] rsvpDeadline
- [ ] targetAudience (ALL, BRANCH, GENERATION, CUSTOM)
- [ ] targetBranch
- [ ] targetGeneration
- [ ] targetMemberIds (JSON)
- [ ] status (DRAFT, SCHEDULED, SENDING, SENT, CANCELLED)
- [ ] scheduledAt
- [ ] sentAt
- [ ] totalRecipients
- [ ] sentCount
- [ ] failedCount
- [ ] openCount
- [ ] rsvpYesCount
- [ ] rsvpNoCount
- [ ] rsvpMaybeCount
- [ ] createdBy
- [ ] createdByName
- [ ] createdAt
- [ ] updatedAt
- [ ] recipients (BroadcastRecipient relation)

---

## 21. Component Testing

### 21.1 Core Components
- [ ] **FamilyTreeGraph** - Tree visualization component
- [ ] **BranchTreeViewer** - Branch-specific tree view
- [ ] **PhotoGallery** - Photo grid display
- [ ] **PhotoUpload** - Photo upload form
- [ ] **SearchableDropdown** - Searchable dropdown component
- [ ] **Navigation** - Main navigation component
- [ ] **AdminSidebar** - Admin navigation sidebar
- [ ] **AuthenticatedLayout** - Layout wrapper for authenticated pages
- [ ] **ProtectedRoute** - Route protection component
- [ ] **FeatureGate** - Feature flag component
- [ ] **Breadcrumb** - Breadcrumb navigation
- [ ] **Card** - Card container component
- [ ] **Button** - Reusable button component
- [ ] **Toast** - Notification component
- [ ] **Spinner** - Loading spinner
- [ ] **EmptyState** - Empty state display
- [ ] **Onboarding** - Onboarding component

---

## 22. Utility Functions & Hooks

### 22.1 Utility Functions
- [ ] `getStatistics()` - Get family statistics
- [ ] `getAllMembers()` - Get all family members
- [ ] `getMemberById(id)` - Get member by ID
- [ ] `getMembersByGeneration(gen)` - Get members by generation
- [ ] `getMembersByBranch(branch)` - Get members by branch
- [ ] `formatFileSize(bytes)` - Format bytes to human-readable
- [ ] `generateNextId(maxId)` - Generate next member ID
- [ ] `parseIdNumber(id)` - Parse member ID to number
- [ ] `validateEmail(email)` - Validate email format
- [ ] `validatePassword(password)` - Validate password strength
- [ ] `encryptData(data)` - Encrypt sensitive data
- [ ] `decryptData(data)` - Decrypt data
- [ ] `generateQRCode(data)` - Generate QR code
- [ ] `sanitizeHTML(html)` - Sanitize HTML input

### 22.2 Custom Hooks
- [ ] `useAuth()` - Authentication context hook
- [ ] `useQueries()` - React Query wrapper hook
- [ ] `useTheme()` - Theme context hook
- [ ] `useKeyboardShortcuts()` - Keyboard shortcut handling
- [ ] `useFeatureFlag(feature)` - Feature flag hook
- [ ] `usePermissions()` - Permission checking hook

---

## 23. Special Features & Integrations

### 23.1 OAuth Integration
- [ ] Google OAuth login
- [ ] GitHub OAuth login
- [ ] OAuth session creation
- [ ] OAuth error handling

### 23.2 Email Services
- [ ] Email verification
- [ ] Password reset emails
- [ ] Broadcast email sending
- [ ] Email delivery tracking
- [ ] Email template system

### 23.3 Backup & Restore
- [ ] Database snapshots
- [ ] Snapshot scheduling
- [ ] Snapshot restoration
- [ ] Rollback functionality
- [ ] Pre-import backups

### 23.4 Activity Tracking
- [ ] User login/logout tracking
- [ ] Member edit tracking
- [ ] Member creation tracking
- [ ] Member deletion tracking
- [ ] Admin action tracking
- [ ] IP address tracking
- [ ] Device tracking

### 23.5 Audit Logging
- [ ] Comprehensive audit trail
- [ ] Change history with snapshots
- [ ] User activity logs
- [ ] Admin action logs
- [ ] Batch change grouping
- [ ] Change reason tracking

### 23.6 Duplicate Detection
- [ ] Automatic duplicate suggestion
- [ ] Match score calculation
- [ ] Manual duplicate marking
- [ ] Merge functionality
- [ ] Duplicate confirmation

---

## 24. Edge Cases & Boundary Conditions

### 24.1 Empty States
- [ ] No members in database
- [ ] No family photos
- [ ] No journals/stories
- [ ] No pending approvals
- [ ] No access requests
- [ ] No duplicates
- [ ] Empty search results
- [ ] Empty generation (no members in generation)
- [ ] Empty branch (no members in branch)

### 24.2 Boundary Conditions
- [ ] Maximum generation number
- [ ] Maximum member count
- [ ] Maximum file upload size
- [ ] Maximum password length
- [ ] Minimum password length
- [ ] Maximum search query length
- [ ] Minimum search query length
- [ ] Maximum name length
- [ ] Maximum bio length
- [ ] Year boundaries (1800-current year)
- [ ] Age calculation edge cases (birth year = current year)

### 24.3 Special Cases
- [ ] Member with no children
- [ ] Member with no parent (root node)
- [ ] Member with only sons or only daughters
- [ ] Member with deceased status
- [ ] User with no email verified
- [ ] User account pending approval
- [ ] User account disabled
- [ ] User with no linked member
- [ ] Multiple users pointing to same member
- [ ] Circular parent-child relationships
- [ ] Member editing while another user edits
- [ ] Concurrent session handling

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Major Feature Areas | 24 |
| Total Test Scenarios | 500+ |
| API Endpoints | 60+ |
| Database Models | 20+ |
| Pages/Routes | 25+ |
| UI Components | 17+ |
| Utility Functions | 14+ |
| Custom Hooks | 6+ |

---

*Document generated: 2024-12-24*
*Application: Al-Shaye Family Tree (شجرة آل شايع)*
*Version: 1.0*
