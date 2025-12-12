// Migration script to create image tables
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'family.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create PendingImage table
db.exec(`
CREATE TABLE IF NOT EXISTS "PendingImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedByName" TEXT,
    "reviewedAt" DATETIME,
    "reviewNotes" TEXT,
    "approvedPhotoId" TEXT
);
`);

// Create indexes for PendingImage
db.exec(`
CREATE INDEX IF NOT EXISTS "PendingImage_reviewStatus_idx" ON "PendingImage"("reviewStatus");
CREATE INDEX IF NOT EXISTS "PendingImage_category_idx" ON "PendingImage"("category");
CREATE INDEX IF NOT EXISTS "PendingImage_memberId_idx" ON "PendingImage"("memberId");
CREATE INDEX IF NOT EXISTS "PendingImage_uploadedBy_idx" ON "PendingImage"("uploadedBy");
CREATE INDEX IF NOT EXISTS "PendingImage_uploadedAt_idx" ON "PendingImage"("uploadedAt");
`);

// Create MemberPhoto table
db.exec(`
CREATE TABLE IF NOT EXISTS "MemberPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "isFamilyAlbum" INTEGER NOT NULL DEFAULT 0,
    "uploadedBy" TEXT,
    "uploadedByName" TEXT NOT NULL,
    "originalPendingId" TEXT,
    "isProfilePhoto" INTEGER NOT NULL DEFAULT 0,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublic" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MemberPhoto_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "FamilyMember" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
`);

// Create indexes for MemberPhoto
db.exec(`
CREATE INDEX IF NOT EXISTS "MemberPhoto_memberId_idx" ON "MemberPhoto"("memberId");
CREATE INDEX IF NOT EXISTS "MemberPhoto_category_idx" ON "MemberPhoto"("category");
CREATE INDEX IF NOT EXISTS "MemberPhoto_isFamilyAlbum_idx" ON "MemberPhoto"("isFamilyAlbum");
CREATE INDEX IF NOT EXISTS "MemberPhoto_year_idx" ON "MemberPhoto"("year");
CREATE INDEX IF NOT EXISTS "MemberPhoto_uploadedBy_idx" ON "MemberPhoto"("uploadedBy");
CREATE INDEX IF NOT EXISTS "MemberPhoto_isProfilePhoto_idx" ON "MemberPhoto"("isProfilePhoto");
`);

// Verify tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND (name='PendingImage' OR name='MemberPhoto')").all();
console.log('Created tables:', tables.map(t => t.name).join(', '));

db.close();
console.log('Migration completed successfully!');
