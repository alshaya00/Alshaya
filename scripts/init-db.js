#!/usr/bin/env node

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Path to database
const dbPath = path.join(__dirname, '..', 'prisma', 'family.db');

console.log('Initializing database at:', dbPath);

// Remove existing db if exists
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('Removed existing database');
}

// Create database connection
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Execute each table creation separately for better error handling

const createStatements = [
  // User table
  `CREATE TABLE IF NOT EXISTS User (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    nameArabic TEXT NOT NULL,
    nameEnglish TEXT,
    phone TEXT,
    avatarUrl TEXT,
    role TEXT DEFAULT 'MEMBER',
    status TEXT DEFAULT 'PENDING',
    linkedMemberId TEXT,
    assignedBranch TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now')),
    lastLoginAt TEXT,
    emailVerifiedAt TEXT,
    twoFactorSecret TEXT,
    twoFactorEnabled INTEGER DEFAULT 0,
    twoFactorBackupCodes TEXT,
    oauthProvider TEXT,
    oauthId TEXT
  )`,

  // Session table
  `CREATE TABLE IF NOT EXISTS Session (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expiresAt TEXT NOT NULL,
    rememberMe INTEGER DEFAULT 0,
    ipAddress TEXT,
    userAgent TEXT,
    deviceName TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    lastActiveAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
  )`,

  // Invite table
  `CREATE TABLE IF NOT EXISTS Invite (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'MEMBER',
    branch TEXT,
    sentById TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    usedAt TEXT,
    usedById TEXT UNIQUE,
    message TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (sentById) REFERENCES User(id),
    FOREIGN KEY (usedById) REFERENCES User(id)
  )`,

  // AccessRequest table
  `CREATE TABLE IF NOT EXISTS AccessRequest (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    nameArabic TEXT NOT NULL,
    nameEnglish TEXT,
    phone TEXT,
    claimedRelation TEXT NOT NULL,
    relatedMemberId TEXT,
    relationshipType TEXT,
    message TEXT,
    status TEXT DEFAULT 'PENDING',
    reviewedById TEXT,
    reviewedAt TEXT,
    reviewNote TEXT,
    userId TEXT UNIQUE,
    approvedRole TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES User(id)
  )`,

  // PasswordReset table
  `CREATE TABLE IF NOT EXISTS PasswordReset (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expiresAt TEXT NOT NULL,
    usedAt TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
  )`,

  // EmailVerification table
  `CREATE TABLE IF NOT EXISTS EmailVerification (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expiresAt TEXT NOT NULL,
    usedAt TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
  )`,

  // PermissionMatrix table
  `CREATE TABLE IF NOT EXISTS PermissionMatrix (
    id TEXT PRIMARY KEY,
    permissions TEXT DEFAULT '{}',
    updatedAt TEXT DEFAULT (datetime('now')),
    updatedBy TEXT
  )`,

  // UserPermissionOverride table
  `CREATE TABLE IF NOT EXISTS UserPermissionOverride (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    permissionKey TEXT NOT NULL,
    allowed INTEGER NOT NULL,
    setBy TEXT NOT NULL,
    setAt TEXT DEFAULT (datetime('now')),
    reason TEXT,
    UNIQUE(userId, permissionKey)
  )`,

  // SiteSettings table
  `CREATE TABLE IF NOT EXISTS SiteSettings (
    id TEXT PRIMARY KEY,
    familyNameArabic TEXT DEFAULT 'آل شايع',
    familyNameEnglish TEXT DEFAULT 'Al-Shaye',
    taglineArabic TEXT DEFAULT 'نحفظ إرثنا، نربط أجيالنا',
    taglineEnglish TEXT DEFAULT 'Preserving Our Legacy, Connecting Generations',
    logoUrl TEXT,
    defaultLanguage TEXT DEFAULT 'ar',
    sessionDurationDays INTEGER DEFAULT 7,
    rememberMeDurationDays INTEGER DEFAULT 30,
    allowSelfRegistration INTEGER DEFAULT 1,
    requireEmailVerification INTEGER DEFAULT 0,
    requireApprovalForRegistration INTEGER DEFAULT 1,
    maxLoginAttempts INTEGER DEFAULT 5,
    lockoutDurationMinutes INTEGER DEFAULT 15,
    require2FAForAdmins INTEGER DEFAULT 0,
    minPasswordLength INTEGER DEFAULT 8,
    allowGuestPreview INTEGER DEFAULT 1,
    guestPreviewMemberCount INTEGER DEFAULT 20,
    updatedAt TEXT DEFAULT (datetime('now'))
  )`,

  // PrivacySettings table
  `CREATE TABLE IF NOT EXISTS PrivacySettings (
    id TEXT PRIMARY KEY,
    profileVisibility TEXT DEFAULT '{}',
    showPhoneToRoles TEXT DEFAULT '[]',
    showEmailToRoles TEXT DEFAULT '[]',
    showBirthYearToRoles TEXT DEFAULT '[]',
    showAgeForLiving INTEGER DEFAULT 0,
    showOccupation INTEGER DEFAULT 1,
    showCity INTEGER DEFAULT 1,
    showBiography INTEGER DEFAULT 1,
    showPhotosToRoles TEXT DEFAULT '[]',
    showDeathYear INTEGER DEFAULT 1,
    showFullDeathDate INTEGER DEFAULT 0,
    updatedAt TEXT DEFAULT (datetime('now'))
  )`,

  // ActivityLog table
  `CREATE TABLE IF NOT EXISTS ActivityLog (
    id TEXT PRIMARY KEY,
    userId TEXT,
    userEmail TEXT,
    userName TEXT,
    action TEXT NOT NULL,
    category TEXT NOT NULL,
    targetType TEXT,
    targetId TEXT,
    targetName TEXT,
    details TEXT,
    ipAddress TEXT,
    userAgent TEXT,
    success INTEGER DEFAULT 1,
    errorMessage TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE SET NULL
  )`,

  // Notification table
  `CREATE TABLE IF NOT EXISTS Notification (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    type TEXT NOT NULL,
    titleAr TEXT NOT NULL,
    titleEn TEXT NOT NULL,
    messageAr TEXT NOT NULL,
    messageEn TEXT NOT NULL,
    linkUrl TEXT,
    linkType TEXT,
    linkId TEXT,
    read INTEGER DEFAULT 0,
    readAt TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
  )`,

  // ApiServiceConfig table
  `CREATE TABLE IF NOT EXISTS ApiServiceConfig (
    id TEXT PRIMARY KEY,
    emailProvider TEXT DEFAULT 'none',
    emailApiKey TEXT,
    emailFromAddress TEXT,
    emailFromName TEXT,
    smtpHost TEXT,
    smtpPort INTEGER,
    smtpUser TEXT,
    smtpPassword TEXT,
    smtpSecure INTEGER DEFAULT 1,
    otpProvider TEXT DEFAULT 'none',
    otpApiKey TEXT,
    otpApiSecret TEXT,
    otpFromNumber TEXT,
    enableEmailNotifications INTEGER DEFAULT 0,
    enableSMSNotifications INTEGER DEFAULT 0,
    testMode INTEGER DEFAULT 1,
    updatedAt TEXT DEFAULT (datetime('now')),
    updatedBy TEXT
  )`,

  // EmailLog table
  `CREATE TABLE IF NOT EXISTS EmailLog (
    id TEXT PRIMARY KEY,
    toAddr TEXT NOT NULL,
    fromAddr TEXT NOT NULL,
    subject TEXT NOT NULL,
    templateName TEXT,
    templateData TEXT,
    status TEXT DEFAULT 'PENDING',
    provider TEXT NOT NULL,
    providerMessageId TEXT,
    errorMessage TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    sentAt TEXT
  )`,

  // FeatureFlag table
  `CREATE TABLE IF NOT EXISTS FeatureFlag (
    id TEXT PRIMARY KEY,
    familyTree INTEGER DEFAULT 1,
    registry INTEGER DEFAULT 1,
    journals INTEGER DEFAULT 1,
    gallery INTEGER DEFAULT 1,
    gatherings INTEGER DEFAULT 1,
    dashboard INTEGER DEFAULT 1,
    search INTEGER DEFAULT 1,
    branches INTEGER DEFAULT 1,
    quickAdd INTEGER DEFAULT 1,
    importData INTEGER DEFAULT 1,
    exportData INTEGER DEFAULT 1,
    treeEditor INTEGER DEFAULT 1,
    duplicates INTEGER DEFAULT 1,
    changeHistory INTEGER DEFAULT 1,
    registration INTEGER DEFAULT 1,
    invitations INTEGER DEFAULT 1,
    accessRequests INTEGER DEFAULT 1,
    profiles INTEGER DEFAULT 1,
    breastfeeding INTEGER DEFAULT 1,
    branchEntries INTEGER DEFAULT 1,
    onboarding INTEGER DEFAULT 1,
    imageModeration INTEGER DEFAULT 1,
    broadcasts INTEGER DEFAULT 1,
    reports INTEGER DEFAULT 1,
    audit INTEGER DEFAULT 1,
    apiServices INTEGER DEFAULT 1,
    updatedAt TEXT DEFAULT (datetime('now')),
    updatedBy TEXT
  )`
];

// Create all tables
for (const sql of createStatements) {
  try {
    db.exec(sql);
    const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
    console.log(`Created table: ${tableName}`);
  } catch (error) {
    console.error('Error creating table:', error.message);
    console.error('SQL:', sql.substring(0, 100) + '...');
  }
}

// Create indexes
const indexes = [
  'CREATE INDEX IF NOT EXISTS idx_user_email ON User(email)',
  'CREATE INDEX IF NOT EXISTS idx_user_role ON User(role)',
  'CREATE INDEX IF NOT EXISTS idx_user_status ON User(status)',
  'CREATE INDEX IF NOT EXISTS idx_session_token ON Session(token)',
  'CREATE INDEX IF NOT EXISTS idx_session_userId ON Session(userId)',
  'CREATE INDEX IF NOT EXISTS idx_session_expiresAt ON Session(expiresAt)',
  'CREATE INDEX IF NOT EXISTS idx_invite_code ON Invite(code)',
  'CREATE INDEX IF NOT EXISTS idx_invite_email ON Invite(email)',
  'CREATE INDEX IF NOT EXISTS idx_accessrequest_email ON AccessRequest(email)',
  'CREATE INDEX IF NOT EXISTS idx_accessrequest_status ON AccessRequest(status)',
  'CREATE INDEX IF NOT EXISTS idx_passwordreset_token ON PasswordReset(token)',
  'CREATE INDEX IF NOT EXISTS idx_passwordreset_email ON PasswordReset(email)',
  'CREATE INDEX IF NOT EXISTS idx_emailverification_token ON EmailVerification(token)',
  'CREATE INDEX IF NOT EXISTS idx_emailverification_email ON EmailVerification(email)',
  'CREATE INDEX IF NOT EXISTS idx_activitylog_userId ON ActivityLog(userId)',
  'CREATE INDEX IF NOT EXISTS idx_activitylog_action ON ActivityLog(action)',
  'CREATE INDEX IF NOT EXISTS idx_activitylog_createdAt ON ActivityLog(createdAt)',
  'CREATE INDEX IF NOT EXISTS idx_notification_userId ON Notification(userId)',
  'CREATE INDEX IF NOT EXISTS idx_notification_read ON Notification(read)',
  'CREATE INDEX IF NOT EXISTS idx_emaillog_status ON EmailLog(status)'
];

for (const sql of indexes) {
  try {
    db.exec(sql);
  } catch (error) {
    console.error('Index error:', error.message);
  }
}

console.log('\nCreated indexes');

// Insert default settings
const inserts = [
  "INSERT OR IGNORE INTO SiteSettings (id) VALUES ('default')",
  "INSERT OR IGNORE INTO PrivacySettings (id) VALUES ('default')",
  "INSERT OR IGNORE INTO ApiServiceConfig (id) VALUES ('default')",
  "INSERT OR IGNORE INTO FeatureFlag (id) VALUES ('default')",
  "INSERT OR IGNORE INTO PermissionMatrix (id) VALUES ('default')"
];

for (const sql of inserts) {
  try {
    db.exec(sql);
  } catch (error) {
    console.error('Insert error:', error.message);
  }
}

console.log('Inserted default settings');

// Verify tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('\nTables in database:');
tables.forEach(t => console.log('  -', t.name));

db.close();
console.log('\nDatabase initialization complete!');
