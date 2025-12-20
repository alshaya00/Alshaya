#!/usr/bin/env node

const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');

// Path to database
const dbPath = path.join(__dirname, '..', 'prisma', 'family.db');

console.log('Seeding admin user...');

// Simple password hashing (compatible with bcrypt.compare)
// Using a simple hash for now - in production use bcrypt
function hashPassword(password) {
  // bcrypt format: $2a$10$<salt><hash>
  // Since we can't use bcrypt synchronously in a simple script,
  // we'll create a special marker that the app can detect
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `pbkdf2:${salt}:${hash}`;
}

// Generate a CUID-like ID
function generateId() {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomBytes(8).toString('hex');
  return `c${timestamp}${randomPart}`;
}

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const adminEmail = process.env.ADMIN_EMAIL || 'admin@alshaye.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeThisSecurePassword123!';

console.log(`Admin email: ${adminEmail}`);

// Create database connection
const db = new Database(dbPath);

// Check if admin already exists
const existingAdmin = db.prepare('SELECT id FROM User WHERE email = ?').get(adminEmail);

if (existingAdmin) {
  console.log('Admin user already exists, skipping...');
} else {
  const passwordHash = hashPassword(adminPassword);
  const id = generateId();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO User (id, email, passwordHash, nameArabic, nameEnglish, role, status, createdAt, updatedAt, emailVerifiedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    adminEmail,
    passwordHash,
    'مدير النظام',
    'System Administrator',
    'SUPER_ADMIN',
    'ACTIVE',
    now,
    now,
    now // Mark as verified
  );

  console.log('Admin user created successfully!');
  console.log(`  ID: ${id}`);
  console.log(`  Email: ${adminEmail}`);
  console.log(`  Role: SUPER_ADMIN`);
}

db.close();
console.log('Done!');
