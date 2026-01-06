-- CreateTable
CREATE TABLE "FamilyMember" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "fatherName" TEXT,
    "grandfatherName" TEXT,
    "greatGrandfatherName" TEXT,
    "familyName" TEXT NOT NULL DEFAULT 'آل شايع',
    "fatherId" TEXT,
    "gender" TEXT NOT NULL,
    "birthYear" INTEGER,
    "birthCalendar" TEXT NOT NULL DEFAULT 'GREGORIAN',
    "deathYear" INTEGER,
    "deathCalendar" TEXT NOT NULL DEFAULT 'GREGORIAN',
    "sonsCount" INTEGER NOT NULL DEFAULT 0,
    "daughtersCount" INTEGER NOT NULL DEFAULT 0,
    "generation" INTEGER NOT NULL DEFAULT 1,
    "branch" TEXT,
    "fullNameAr" TEXT,
    "fullNameEn" TEXT,
    "lineageBranchId" TEXT,
    "lineageBranchName" TEXT,
    "subBranchId" TEXT,
    "subBranchName" TEXT,
    "lineagePath" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Living',
    "photoUrl" TEXT,
    "biography" TEXT,
    "occupation" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "lastModifiedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deletedReason" TEXT,

    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeHistory" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changeType" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changedByName" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "batchId" TEXT,
    "fullSnapshot" TEXT,
    "reason" TEXT,
    "ipAddress" TEXT,

    CONSTRAINT "ChangeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "treeData" TEXT NOT NULL,
    "memberCount" INTEGER NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snapshotType" TEXT NOT NULL DEFAULT 'MANUAL',

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuplicateFlag" (
    "id" TEXT NOT NULL,
    "sourceMemberId" TEXT NOT NULL,
    "targetMemberId" TEXT NOT NULL,
    "matchScore" DOUBLE PRECISION NOT NULL,
    "matchReasons" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detectedBy" TEXT NOT NULL DEFAULT 'SYSTEM',

    CONSTRAINT "DuplicateFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nameArabic" TEXT NOT NULL,
    "nameEnglish" TEXT,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "linkedMemberId" TEXT,
    "assignedBranch" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "emailVerifiedAt" TIMESTAMP(3),
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "twoFactorBackupCodes" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "rememberMe" BOOLEAN NOT NULL DEFAULT false,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "branch" TEXT,
    "sentById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedById" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessRequest" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nameArabic" TEXT NOT NULL,
    "nameEnglish" TEXT,
    "phone" TEXT,
    "gender" TEXT,
    "claimedRelation" TEXT NOT NULL,
    "relatedMemberId" TEXT,
    "relationshipType" TEXT,
    "parentMemberId" TEXT,
    "message" TEXT,
    "passwordHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "userId" TEXT,
    "approvedRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordReset" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerification" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionMatrix" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "permissions" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "PermissionMatrix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPermissionOverride" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL,
    "setBy" TEXT NOT NULL,
    "setAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "UserPermissionOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "familyNameArabic" TEXT NOT NULL DEFAULT 'آل شايع',
    "familyNameEnglish" TEXT NOT NULL DEFAULT 'Al-Shaye',
    "taglineArabic" TEXT NOT NULL DEFAULT 'نحفظ إرثنا، نربط أجيالنا',
    "taglineEnglish" TEXT NOT NULL DEFAULT 'Preserving Our Legacy, Connecting Generations',
    "logoUrl" TEXT,
    "defaultLanguage" TEXT NOT NULL DEFAULT 'ar',
    "sessionDurationDays" INTEGER NOT NULL DEFAULT 7,
    "rememberMeDurationDays" INTEGER NOT NULL DEFAULT 30,
    "allowSelfRegistration" BOOLEAN NOT NULL DEFAULT true,
    "requireEmailVerification" BOOLEAN NOT NULL DEFAULT false,
    "requireApprovalForRegistration" BOOLEAN NOT NULL DEFAULT true,
    "maxLoginAttempts" INTEGER NOT NULL DEFAULT 5,
    "lockoutDurationMinutes" INTEGER NOT NULL DEFAULT 15,
    "require2FAForAdmins" BOOLEAN NOT NULL DEFAULT false,
    "minPasswordLength" INTEGER NOT NULL DEFAULT 8,
    "allowGuestPreview" BOOLEAN NOT NULL DEFAULT true,
    "guestPreviewMemberCount" INTEGER NOT NULL DEFAULT 20,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacySettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "profileVisibility" TEXT NOT NULL DEFAULT '{"GUEST":false,"MEMBER":true,"BRANCH_LEADER":true,"ADMIN":true,"SUPER_ADMIN":true}',
    "showPhoneToRoles" TEXT NOT NULL DEFAULT '["ADMIN","SUPER_ADMIN"]',
    "showEmailToRoles" TEXT NOT NULL DEFAULT '["ADMIN","SUPER_ADMIN"]',
    "showBirthYearToRoles" TEXT NOT NULL DEFAULT '["MEMBER","BRANCH_LEADER","ADMIN","SUPER_ADMIN"]',
    "showAgeForLiving" BOOLEAN NOT NULL DEFAULT false,
    "showOccupation" BOOLEAN NOT NULL DEFAULT true,
    "showCity" BOOLEAN NOT NULL DEFAULT true,
    "showBiography" BOOLEAN NOT NULL DEFAULT true,
    "showPhotosToRoles" TEXT NOT NULL DEFAULT '["MEMBER","BRANCH_LEADER","ADMIN","SUPER_ADMIN"]',
    "showDeathYear" BOOLEAN NOT NULL DEFAULT true,
    "showFullDeathDate" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivacySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "defaultLanguage" TEXT NOT NULL DEFAULT 'ar',
    "dateFormat" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
    "treeDisplayMode" TEXT NOT NULL DEFAULT 'vertical',
    "showDeceasedMembers" BOOLEAN NOT NULL DEFAULT true,
    "minBirthYear" INTEGER NOT NULL DEFAULT 1400,
    "maxBirthYear" INTEGER NOT NULL DEFAULT 2025,
    "requirePhone" BOOLEAN NOT NULL DEFAULT false,
    "requireEmail" BOOLEAN NOT NULL DEFAULT false,
    "allowDuplicateNames" BOOLEAN NOT NULL DEFAULT true,
    "sessionTimeout" INTEGER NOT NULL DEFAULT 60,
    "maxLoginAttempts" INTEGER NOT NULL DEFAULT 20,
    "requireStrongAccessCode" BOOLEAN NOT NULL DEFAULT false,
    "enableBranchEntries" BOOLEAN NOT NULL DEFAULT true,
    "enablePublicRegistry" BOOLEAN NOT NULL DEFAULT true,
    "enableExport" BOOLEAN NOT NULL DEFAULT true,
    "enableImport" BOOLEAN NOT NULL DEFAULT true,
    "autoBackup" BOOLEAN NOT NULL DEFAULT true,
    "autoBackupInterval" INTEGER NOT NULL DEFAULT 24,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "userName" TEXT,
    "action" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "targetName" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "messageAr" TEXT NOT NULL,
    "messageEn" TEXT NOT NULL,
    "linkUrl" TEXT,
    "linkType" TEXT,
    "linkId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "accessCode" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'EDITOR',
    "permissions" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "migratedToUserId" TEXT,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "query" TEXT NOT NULL,
    "searchType" TEXT NOT NULL DEFAULT 'member',
    "filters" TEXT,
    "resultsCount" INTEGER NOT NULL DEFAULT 0,
    "clickedResultId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "searchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "totalRecords" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "conflictCount" INTEGER NOT NULL DEFAULT 0,
    "conflicts" TEXT,
    "conflictResolutions" TEXT,
    "importedIds" TEXT,
    "errorLog" TEXT,
    "importedBy" TEXT NOT NULL,
    "importedByName" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "snapshotId" TEXT,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportJob" (
    "id" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "memberCount" INTEGER NOT NULL,
    "fieldsIncluded" TEXT NOT NULL,
    "filters" TEXT,
    "exportedBy" TEXT NOT NULL,
    "exportedByName" TEXT NOT NULL,
    "exportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileSize" INTEGER,
    "downloadUrl" TEXT,

    CONSTRAINT "ExportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingMember" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "fatherName" TEXT,
    "grandfatherName" TEXT,
    "greatGrandfatherName" TEXT,
    "familyName" TEXT NOT NULL DEFAULT 'آل شايع',
    "proposedFatherId" TEXT,
    "gender" TEXT NOT NULL,
    "birthYear" INTEGER,
    "birthCalendar" TEXT NOT NULL DEFAULT 'GREGORIAN',
    "generation" INTEGER NOT NULL DEFAULT 1,
    "branch" TEXT,
    "fullNameAr" TEXT,
    "fullNameEn" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Living',
    "occupation" TEXT,
    "email" TEXT,
    "submittedVia" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "approvedMemberId" TEXT,

    CONSTRAINT "PendingMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchEntryLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "branchName" TEXT NOT NULL,
    "branchHeadId" TEXT NOT NULL,
    "branchHeadName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BranchEntryLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiServiceConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "emailProvider" TEXT NOT NULL DEFAULT 'none',
    "emailApiKey" TEXT,
    "emailFromAddress" TEXT,
    "emailFromName" TEXT,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpUser" TEXT,
    "smtpPassword" TEXT,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT true,
    "otpProvider" TEXT NOT NULL DEFAULT 'none',
    "otpApiKey" TEXT,
    "otpApiSecret" TEXT,
    "otpFromNumber" TEXT,
    "enableEmailNotifications" BOOLEAN NOT NULL DEFAULT false,
    "enableSMSNotifications" BOOLEAN NOT NULL DEFAULT false,
    "testMode" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "ApiServiceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "templateName" TEXT,
    "templateData" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Broadcast" (
    "id" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT,
    "contentAr" TEXT NOT NULL,
    "contentEn" TEXT,
    "type" TEXT NOT NULL DEFAULT 'ANNOUNCEMENT',
    "meetingDate" TIMESTAMP(3),
    "meetingLocation" TEXT,
    "meetingUrl" TEXT,
    "rsvpRequired" BOOLEAN NOT NULL DEFAULT false,
    "rsvpDeadline" TIMESTAMP(3),
    "targetAudience" TEXT NOT NULL DEFAULT 'ALL',
    "targetBranch" TEXT,
    "targetGeneration" INTEGER,
    "targetMemberIds" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "rsvpYesCount" INTEGER NOT NULL DEFAULT 0,
    "rsvpNoCount" INTEGER NOT NULL DEFAULT 0,
    "rsvpMaybeCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BroadcastRecipient" (
    "id" TEXT NOT NULL,
    "broadcastId" TEXT NOT NULL,
    "memberId" TEXT,
    "memberName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "rsvpResponse" TEXT,
    "rsvpRespondedAt" TIMESTAMP(3),
    "rsvpNote" TEXT,

    CONSTRAINT "BroadcastRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsLog" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'OTP',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "SmsLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledJob" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cronExpression" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Riyadh',
    "jobType" TEXT NOT NULL,
    "jobConfig" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "lastRunStatus" TEXT,
    "lastRunDuration" INTEGER,
    "lastRunError" TEXT,
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlbumFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "description" TEXT,
    "descriptionAr" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "icon" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlbumFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingImage" (
    "id" TEXT NOT NULL,
    "imageData" TEXT NOT NULL,
    "thumbnailData" TEXT,
    "category" TEXT NOT NULL DEFAULT 'memory',
    "title" TEXT,
    "titleAr" TEXT,
    "caption" TEXT,
    "captionAr" TEXT,
    "year" INTEGER,
    "memberId" TEXT,
    "memberName" TEXT,
    "taggedMemberIds" TEXT,
    "uploadedBy" TEXT,
    "uploadedByName" TEXT NOT NULL,
    "uploadedByEmail" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedByName" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "approvedPhotoId" TEXT,
    "folderId" TEXT,

    CONSTRAINT "PendingImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberPhoto" (
    "id" TEXT NOT NULL,
    "imageData" TEXT NOT NULL,
    "thumbnailData" TEXT,
    "category" TEXT NOT NULL DEFAULT 'memory',
    "title" TEXT,
    "titleAr" TEXT,
    "caption" TEXT,
    "captionAr" TEXT,
    "year" INTEGER,
    "memberId" TEXT,
    "taggedMemberIds" TEXT,
    "isFamilyAlbum" BOOLEAN NOT NULL DEFAULT false,
    "uploadedBy" TEXT,
    "uploadedByName" TEXT NOT NULL,
    "originalPendingId" TEXT,
    "isProfilePhoto" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "folderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BreastfeedingRelationship" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "nurseId" TEXT,
    "externalNurseName" TEXT,
    "milkFatherId" TEXT,
    "externalMilkFatherName" TEXT,
    "notes" TEXT,
    "breastfeedingYear" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "BreastfeedingRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyJournal" (
    "id" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT,
    "contentAr" TEXT NOT NULL,
    "contentEn" TEXT,
    "excerpt" TEXT,
    "category" TEXT NOT NULL DEFAULT 'ORAL_HISTORY',
    "tags" TEXT,
    "era" TEXT,
    "yearFrom" INTEGER,
    "yearTo" INTEGER,
    "dateDescription" TEXT,
    "location" TEXT,
    "locationAr" TEXT,
    "primaryMemberId" TEXT,
    "relatedMemberIds" TEXT,
    "generation" INTEGER,
    "coverImageUrl" TEXT,
    "narrator" TEXT,
    "narratorId" TEXT,
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyJournal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalMedia" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT,
    "imageData" TEXT,
    "thumbnailData" TEXT,
    "titleAr" TEXT,
    "titleEn" TEXT,
    "captionAr" TEXT,
    "captionEn" TEXT,
    "year" INTEGER,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isHero" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalCategory" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "descriptionAr" TEXT,
    "descriptionEn" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "JournalCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "labelAr" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "description" TEXT,
    "descriptionAr" TEXT,
    "category" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionCategory" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "labelAr" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "descriptionAr" TEXT,
    "descriptionEn" TEXT,
    "icon" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PermissionCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleDefaultPermission" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleDefaultPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportField" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelAr" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "selectedByDefault" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ExportField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportFieldCategory" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelAr" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ExportFieldCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gathering" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "description" TEXT,
    "descriptionAr" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "time" TEXT,
    "location" TEXT,
    "locationAr" TEXT,
    "locationUrl" TEXT,
    "type" TEXT NOT NULL DEFAULT 'gathering',
    "coverImage" TEXT,
    "organizerId" TEXT,
    "organizerName" TEXT NOT NULL,
    "organizerNameAr" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gathering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GatheringAttendee" (
    "id" TEXT NOT NULL,
    "gatheringId" TEXT NOT NULL,
    "userId" TEXT,
    "memberId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "rsvpStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "rsvpNote" TEXT,
    "rsvpAt" TIMESTAMP(3),
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "attendedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GatheringAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackupConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "intervalHours" INTEGER NOT NULL DEFAULT 24,
    "maxBackups" INTEGER NOT NULL DEFAULT 10,
    "retentionDays" INTEGER NOT NULL DEFAULT 30,
    "lastBackupAt" TIMESTAMP(3),
    "lastBackupStatus" TEXT,
    "lastBackupError" TEXT,
    "lastBackupSize" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "BackupConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventType" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelAr" TEXT NOT NULL,
    "color" TEXT,
    "bgColor" TEXT,
    "icon" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EventType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "familyTree" BOOLEAN NOT NULL DEFAULT true,
    "registry" BOOLEAN NOT NULL DEFAULT true,
    "journals" BOOLEAN NOT NULL DEFAULT true,
    "gallery" BOOLEAN NOT NULL DEFAULT true,
    "gatherings" BOOLEAN NOT NULL DEFAULT true,
    "dashboard" BOOLEAN NOT NULL DEFAULT true,
    "search" BOOLEAN NOT NULL DEFAULT true,
    "branches" BOOLEAN NOT NULL DEFAULT true,
    "quickAdd" BOOLEAN NOT NULL DEFAULT true,
    "importData" BOOLEAN NOT NULL DEFAULT true,
    "exportData" BOOLEAN NOT NULL DEFAULT true,
    "treeEditor" BOOLEAN NOT NULL DEFAULT true,
    "duplicates" BOOLEAN NOT NULL DEFAULT true,
    "changeHistory" BOOLEAN NOT NULL DEFAULT true,
    "registration" BOOLEAN NOT NULL DEFAULT true,
    "invitations" BOOLEAN NOT NULL DEFAULT true,
    "accessRequests" BOOLEAN NOT NULL DEFAULT true,
    "profiles" BOOLEAN NOT NULL DEFAULT true,
    "breastfeeding" BOOLEAN NOT NULL DEFAULT true,
    "branchEntries" BOOLEAN NOT NULL DEFAULT true,
    "onboarding" BOOLEAN NOT NULL DEFAULT true,
    "imageModeration" BOOLEAN NOT NULL DEFAULT true,
    "broadcasts" BOOLEAN NOT NULL DEFAULT true,
    "reports" BOOLEAN NOT NULL DEFAULT true,
    "audit" BOOLEAN NOT NULL DEFAULT true,
    "apiServices" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvitationCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "linkedMemberId" TEXT,
    "linkedMemberName" TEXT,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "InvitationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvitationRedemption" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvitationRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "userId" TEXT,
    "userName" TEXT,
    "userRole" TEXT,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "targetName" TEXT,
    "description" TEXT NOT NULL,
    "details" JSONB,
    "previousState" JSONB,
    "newState" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "sessionId" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "impactedIds" TEXT,
    "impactSummary" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FamilyMember_generation_idx" ON "FamilyMember"("generation");

-- CreateIndex
CREATE INDEX "FamilyMember_branch_idx" ON "FamilyMember"("branch");

-- CreateIndex
CREATE INDEX "FamilyMember_gender_idx" ON "FamilyMember"("gender");

-- CreateIndex
CREATE INDEX "FamilyMember_fatherId_idx" ON "FamilyMember"("fatherId");

-- CreateIndex
CREATE INDEX "FamilyMember_status_idx" ON "FamilyMember"("status");

-- CreateIndex
CREATE INDEX "FamilyMember_firstName_idx" ON "FamilyMember"("firstName");

-- CreateIndex
CREATE INDEX "FamilyMember_lineageBranchId_idx" ON "FamilyMember"("lineageBranchId");

-- CreateIndex
CREATE INDEX "FamilyMember_subBranchId_idx" ON "FamilyMember"("subBranchId");

-- CreateIndex
CREATE INDEX "FamilyMember_deletedAt_idx" ON "FamilyMember"("deletedAt");

-- CreateIndex
CREATE INDEX "FamilyMember_fatherId_deletedAt_idx" ON "FamilyMember"("fatherId", "deletedAt");

-- CreateIndex
CREATE INDEX "ChangeHistory_memberId_idx" ON "ChangeHistory"("memberId");

-- CreateIndex
CREATE INDEX "ChangeHistory_changedAt_idx" ON "ChangeHistory"("changedAt");

-- CreateIndex
CREATE INDEX "ChangeHistory_changedBy_idx" ON "ChangeHistory"("changedBy");

-- CreateIndex
CREATE INDEX "ChangeHistory_batchId_idx" ON "ChangeHistory"("batchId");

-- CreateIndex
CREATE INDEX "ChangeHistory_changeType_idx" ON "ChangeHistory"("changeType");

-- CreateIndex
CREATE INDEX "Snapshot_createdAt_idx" ON "Snapshot"("createdAt");

-- CreateIndex
CREATE INDEX "Snapshot_snapshotType_idx" ON "Snapshot"("snapshotType");

-- CreateIndex
CREATE INDEX "DuplicateFlag_status_idx" ON "DuplicateFlag"("status");

-- CreateIndex
CREATE INDEX "DuplicateFlag_matchScore_idx" ON "DuplicateFlag"("matchScore");

-- CreateIndex
CREATE UNIQUE INDEX "DuplicateFlag_sourceMemberId_targetMemberId_key" ON "DuplicateFlag"("sourceMemberId", "targetMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_linkedMemberId_idx" ON "User"("linkedMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_code_key" ON "Invite"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_usedById_key" ON "Invite"("usedById");

-- CreateIndex
CREATE INDEX "Invite_code_idx" ON "Invite"("code");

-- CreateIndex
CREATE INDEX "Invite_email_idx" ON "Invite"("email");

-- CreateIndex
CREATE INDEX "Invite_sentById_idx" ON "Invite"("sentById");

-- CreateIndex
CREATE UNIQUE INDEX "AccessRequest_userId_key" ON "AccessRequest"("userId");

-- CreateIndex
CREATE INDEX "AccessRequest_email_idx" ON "AccessRequest"("email");

-- CreateIndex
CREATE INDEX "AccessRequest_status_idx" ON "AccessRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_token_key" ON "PasswordReset"("token");

-- CreateIndex
CREATE INDEX "PasswordReset_token_idx" ON "PasswordReset"("token");

-- CreateIndex
CREATE INDEX "PasswordReset_email_idx" ON "PasswordReset"("email");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerification_token_key" ON "EmailVerification"("token");

-- CreateIndex
CREATE INDEX "EmailVerification_token_idx" ON "EmailVerification"("token");

-- CreateIndex
CREATE INDEX "EmailVerification_email_idx" ON "EmailVerification"("email");

-- CreateIndex
CREATE INDEX "UserPermissionOverride_userId_idx" ON "UserPermissionOverride"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermissionOverride_userId_permissionKey_key" ON "UserPermissionOverride"("userId", "permissionKey");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE INDEX "ActivityLog_action_idx" ON "ActivityLog"("action");

-- CreateIndex
CREATE INDEX "ActivityLog_category_idx" ON "ActivityLog"("category");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_targetType_targetId_idx" ON "ActivityLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_read_idx" ON "Notification"("read");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE INDEX "Admin_email_idx" ON "Admin"("email");

-- CreateIndex
CREATE INDEX "Admin_isActive_idx" ON "Admin"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AdminSession_token_key" ON "AdminSession"("token");

-- CreateIndex
CREATE INDEX "AdminSession_token_idx" ON "AdminSession"("token");

-- CreateIndex
CREATE INDEX "AdminSession_adminId_idx" ON "AdminSession"("adminId");

-- CreateIndex
CREATE INDEX "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt");

-- CreateIndex
CREATE INDEX "SearchHistory_userId_idx" ON "SearchHistory"("userId");

-- CreateIndex
CREATE INDEX "SearchHistory_query_idx" ON "SearchHistory"("query");

-- CreateIndex
CREATE INDEX "SearchHistory_searchedAt_idx" ON "SearchHistory"("searchedAt");

-- CreateIndex
CREATE INDEX "SearchHistory_searchType_idx" ON "SearchHistory"("searchType");

-- CreateIndex
CREATE INDEX "ImportJob_status_idx" ON "ImportJob"("status");

-- CreateIndex
CREATE INDEX "ImportJob_importedBy_idx" ON "ImportJob"("importedBy");

-- CreateIndex
CREATE INDEX "ExportJob_exportedBy_idx" ON "ExportJob"("exportedBy");

-- CreateIndex
CREATE INDEX "ExportJob_exportedAt_idx" ON "ExportJob"("exportedAt");

-- CreateIndex
CREATE INDEX "PendingMember_reviewStatus_idx" ON "PendingMember"("reviewStatus");

-- CreateIndex
CREATE INDEX "PendingMember_branch_idx" ON "PendingMember"("branch");

-- CreateIndex
CREATE UNIQUE INDEX "BranchEntryLink_token_key" ON "BranchEntryLink"("token");

-- CreateIndex
CREATE INDEX "BranchEntryLink_token_idx" ON "BranchEntryLink"("token");

-- CreateIndex
CREATE INDEX "BranchEntryLink_isActive_idx" ON "BranchEntryLink"("isActive");

-- CreateIndex
CREATE INDEX "EmailLog_to_idx" ON "EmailLog"("to");

-- CreateIndex
CREATE INDEX "EmailLog_status_idx" ON "EmailLog"("status");

-- CreateIndex
CREATE INDEX "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");

-- CreateIndex
CREATE INDEX "Broadcast_status_idx" ON "Broadcast"("status");

-- CreateIndex
CREATE INDEX "Broadcast_type_idx" ON "Broadcast"("type");

-- CreateIndex
CREATE INDEX "Broadcast_createdAt_idx" ON "Broadcast"("createdAt");

-- CreateIndex
CREATE INDEX "Broadcast_scheduledAt_idx" ON "Broadcast"("scheduledAt");

-- CreateIndex
CREATE INDEX "BroadcastRecipient_broadcastId_idx" ON "BroadcastRecipient"("broadcastId");

-- CreateIndex
CREATE INDEX "BroadcastRecipient_status_idx" ON "BroadcastRecipient"("status");

-- CreateIndex
CREATE INDEX "BroadcastRecipient_memberId_idx" ON "BroadcastRecipient"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "BroadcastRecipient_broadcastId_email_key" ON "BroadcastRecipient"("broadcastId", "email");

-- CreateIndex
CREATE INDEX "SmsLog_to_idx" ON "SmsLog"("to");

-- CreateIndex
CREATE INDEX "SmsLog_status_idx" ON "SmsLog"("status");

-- CreateIndex
CREATE INDEX "SmsLog_createdAt_idx" ON "SmsLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledJob_name_key" ON "ScheduledJob"("name");

-- CreateIndex
CREATE INDEX "ScheduledJob_isEnabled_idx" ON "ScheduledJob"("isEnabled");

-- CreateIndex
CREATE INDEX "ScheduledJob_nextRunAt_idx" ON "ScheduledJob"("nextRunAt");

-- CreateIndex
CREATE INDEX "AlbumFolder_isSystem_idx" ON "AlbumFolder"("isSystem");

-- CreateIndex
CREATE INDEX "AlbumFolder_displayOrder_idx" ON "AlbumFolder"("displayOrder");

-- CreateIndex
CREATE INDEX "PendingImage_reviewStatus_idx" ON "PendingImage"("reviewStatus");

-- CreateIndex
CREATE INDEX "PendingImage_category_idx" ON "PendingImage"("category");

-- CreateIndex
CREATE INDEX "PendingImage_memberId_idx" ON "PendingImage"("memberId");

-- CreateIndex
CREATE INDEX "PendingImage_uploadedBy_idx" ON "PendingImage"("uploadedBy");

-- CreateIndex
CREATE INDEX "PendingImage_uploadedAt_idx" ON "PendingImage"("uploadedAt");

-- CreateIndex
CREATE INDEX "PendingImage_folderId_idx" ON "PendingImage"("folderId");

-- CreateIndex
CREATE INDEX "MemberPhoto_memberId_idx" ON "MemberPhoto"("memberId");

-- CreateIndex
CREATE INDEX "MemberPhoto_category_idx" ON "MemberPhoto"("category");

-- CreateIndex
CREATE INDEX "MemberPhoto_isFamilyAlbum_idx" ON "MemberPhoto"("isFamilyAlbum");

-- CreateIndex
CREATE INDEX "MemberPhoto_year_idx" ON "MemberPhoto"("year");

-- CreateIndex
CREATE INDEX "MemberPhoto_uploadedBy_idx" ON "MemberPhoto"("uploadedBy");

-- CreateIndex
CREATE INDEX "MemberPhoto_isProfilePhoto_idx" ON "MemberPhoto"("isProfilePhoto");

-- CreateIndex
CREATE INDEX "MemberPhoto_folderId_idx" ON "MemberPhoto"("folderId");

-- CreateIndex
CREATE INDEX "BreastfeedingRelationship_childId_idx" ON "BreastfeedingRelationship"("childId");

-- CreateIndex
CREATE INDEX "BreastfeedingRelationship_nurseId_idx" ON "BreastfeedingRelationship"("nurseId");

-- CreateIndex
CREATE INDEX "BreastfeedingRelationship_milkFatherId_idx" ON "BreastfeedingRelationship"("milkFatherId");

-- CreateIndex
CREATE INDEX "FamilyJournal_category_idx" ON "FamilyJournal"("category");

-- CreateIndex
CREATE INDEX "FamilyJournal_status_idx" ON "FamilyJournal"("status");

-- CreateIndex
CREATE INDEX "FamilyJournal_isFeatured_idx" ON "FamilyJournal"("isFeatured");

-- CreateIndex
CREATE INDEX "FamilyJournal_primaryMemberId_idx" ON "FamilyJournal"("primaryMemberId");

-- CreateIndex
CREATE INDEX "FamilyJournal_generation_idx" ON "FamilyJournal"("generation");

-- CreateIndex
CREATE INDEX "FamilyJournal_yearFrom_idx" ON "FamilyJournal"("yearFrom");

-- CreateIndex
CREATE INDEX "FamilyJournal_reviewStatus_idx" ON "FamilyJournal"("reviewStatus");

-- CreateIndex
CREATE INDEX "FamilyJournal_createdAt_idx" ON "FamilyJournal"("createdAt");

-- CreateIndex
CREATE INDEX "JournalMedia_journalId_idx" ON "JournalMedia"("journalId");

-- CreateIndex
CREATE INDEX "JournalMedia_type_idx" ON "JournalMedia"("type");

-- CreateIndex
CREATE UNIQUE INDEX "JournalCategory_key_key" ON "JournalCategory"("key");

-- CreateIndex
CREATE INDEX "JournalCategory_key_idx" ON "JournalCategory"("key");

-- CreateIndex
CREATE INDEX "JournalCategory_displayOrder_idx" ON "JournalCategory"("displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "Permission_key_idx" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "Permission_category_idx" ON "Permission"("category");

-- CreateIndex
CREATE INDEX "Permission_displayOrder_idx" ON "Permission"("displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PermissionCategory_key_key" ON "PermissionCategory"("key");

-- CreateIndex
CREATE INDEX "PermissionCategory_key_idx" ON "PermissionCategory"("key");

-- CreateIndex
CREATE INDEX "PermissionCategory_displayOrder_idx" ON "PermissionCategory"("displayOrder");

-- CreateIndex
CREATE INDEX "RoleDefaultPermission_role_idx" ON "RoleDefaultPermission"("role");

-- CreateIndex
CREATE INDEX "RoleDefaultPermission_permissionId_idx" ON "RoleDefaultPermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "RoleDefaultPermission_role_permissionId_key" ON "RoleDefaultPermission"("role", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "ExportField_key_key" ON "ExportField"("key");

-- CreateIndex
CREATE INDEX "ExportField_key_idx" ON "ExportField"("key");

-- CreateIndex
CREATE INDEX "ExportField_category_idx" ON "ExportField"("category");

-- CreateIndex
CREATE INDEX "ExportField_displayOrder_idx" ON "ExportField"("displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ExportFieldCategory_key_key" ON "ExportFieldCategory"("key");

-- CreateIndex
CREATE INDEX "ExportFieldCategory_key_idx" ON "ExportFieldCategory"("key");

-- CreateIndex
CREATE INDEX "ExportFieldCategory_displayOrder_idx" ON "ExportFieldCategory"("displayOrder");

-- CreateIndex
CREATE INDEX "Gathering_date_idx" ON "Gathering"("date");

-- CreateIndex
CREATE INDEX "Gathering_type_idx" ON "Gathering"("type");

-- CreateIndex
CREATE INDEX "Gathering_status_idx" ON "Gathering"("status");

-- CreateIndex
CREATE INDEX "Gathering_organizerId_idx" ON "Gathering"("organizerId");

-- CreateIndex
CREATE INDEX "GatheringAttendee_gatheringId_idx" ON "GatheringAttendee"("gatheringId");

-- CreateIndex
CREATE INDEX "GatheringAttendee_userId_idx" ON "GatheringAttendee"("userId");

-- CreateIndex
CREATE INDEX "GatheringAttendee_rsvpStatus_idx" ON "GatheringAttendee"("rsvpStatus");

-- CreateIndex
CREATE UNIQUE INDEX "GatheringAttendee_gatheringId_userId_key" ON "GatheringAttendee"("gatheringId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "EventType_key_key" ON "EventType"("key");

-- CreateIndex
CREATE INDEX "EventType_key_idx" ON "EventType"("key");

-- CreateIndex
CREATE INDEX "EventType_displayOrder_idx" ON "EventType"("displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "InvitationCode_code_key" ON "InvitationCode"("code");

-- CreateIndex
CREATE INDEX "InvitationCode_code_idx" ON "InvitationCode"("code");

-- CreateIndex
CREATE INDEX "InvitationCode_status_idx" ON "InvitationCode"("status");

-- CreateIndex
CREATE INDEX "InvitationCode_linkedMemberId_idx" ON "InvitationCode"("linkedMemberId");

-- CreateIndex
CREATE INDEX "InvitationCode_expiresAt_idx" ON "InvitationCode"("expiresAt");

-- CreateIndex
CREATE INDEX "InvitationRedemption_invitationId_idx" ON "InvitationRedemption"("invitationId");

-- CreateIndex
CREATE INDEX "InvitationRedemption_userId_idx" ON "InvitationRedemption"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_idx" ON "AuditLog"("targetType");

-- CreateIndex
CREATE INDEX "AuditLog_targetId_idx" ON "AuditLog"("targetId");

-- CreateIndex
CREATE INDEX "AuditLog_severity_idx" ON "AuditLog"("severity");

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_fatherId_fkey" FOREIGN KEY ("fatherId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeHistory" ADD CONSTRAINT "ChangeHistory_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicateFlag" ADD CONSTRAINT "DuplicateFlag_sourceMemberId_fkey" FOREIGN KEY ("sourceMemberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicateFlag" ADD CONSTRAINT "DuplicateFlag_targetMemberId_fkey" FOREIGN KEY ("targetMemberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BroadcastRecipient" ADD CONSTRAINT "BroadcastRecipient_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "Broadcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingImage" ADD CONSTRAINT "PendingImage_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "AlbumFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberPhoto" ADD CONSTRAINT "MemberPhoto_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberPhoto" ADD CONSTRAINT "MemberPhoto_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "AlbumFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreastfeedingRelationship" ADD CONSTRAINT "BreastfeedingRelationship_childId_fkey" FOREIGN KEY ("childId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreastfeedingRelationship" ADD CONSTRAINT "BreastfeedingRelationship_nurseId_fkey" FOREIGN KEY ("nurseId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreastfeedingRelationship" ADD CONSTRAINT "BreastfeedingRelationship_milkFatherId_fkey" FOREIGN KEY ("milkFatherId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalMedia" ADD CONSTRAINT "JournalMedia_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "FamilyJournal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleDefaultPermission" ADD CONSTRAINT "RoleDefaultPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatheringAttendee" ADD CONSTRAINT "GatheringAttendee_gatheringId_fkey" FOREIGN KEY ("gatheringId") REFERENCES "Gathering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitationRedemption" ADD CONSTRAINT "InvitationRedemption_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "InvitationCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

