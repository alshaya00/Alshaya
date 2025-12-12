// Database module for image management using better-sqlite3
import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';

// Types
export interface PendingImage {
  id: string;
  imageData: string;
  thumbnailData: string | null;
  category: 'profile' | 'memory' | 'document' | 'historical';
  title: string | null;
  titleAr: string | null;
  caption: string | null;
  captionAr: string | null;
  year: number | null;
  memberId: string | null;
  memberName: string | null;
  taggedMemberIds: string | null; // JSON array
  uploadedBy: string | null;
  uploadedByName: string;
  uploadedByEmail: string | null;
  uploadedAt: string;
  ipAddress: string | null;
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  approvedPhotoId: string | null;
}

export interface MemberPhoto {
  id: string;
  imageData: string;
  thumbnailData: string | null;
  category: 'profile' | 'memory' | 'document' | 'historical';
  title: string | null;
  titleAr: string | null;
  caption: string | null;
  captionAr: string | null;
  year: number | null;
  memberId: string | null;
  taggedMemberIds: string | null;
  isFamilyAlbum: boolean;
  uploadedBy: string | null;
  uploadedByName: string;
  originalPendingId: string | null;
  isProfilePhoto: boolean;
  displayOrder: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePendingImageInput {
  imageData: string;
  thumbnailData?: string;
  category?: 'profile' | 'memory' | 'document' | 'historical';
  title?: string;
  titleAr?: string;
  caption?: string;
  captionAr?: string;
  year?: number;
  memberId?: string;
  memberName?: string;
  taggedMemberIds?: string[];
  uploadedBy?: string;
  uploadedByName: string;
  uploadedByEmail?: string;
  ipAddress?: string;
}

export interface CreateMemberPhotoInput {
  imageData: string;
  thumbnailData?: string;
  category?: 'profile' | 'memory' | 'document' | 'historical';
  title?: string;
  titleAr?: string;
  caption?: string;
  captionAr?: string;
  year?: number;
  memberId?: string;
  taggedMemberIds?: string[];
  isFamilyAlbum?: boolean;
  uploadedBy?: string;
  uploadedByName: string;
  originalPendingId?: string;
  isProfilePhoto?: boolean;
  displayOrder?: number;
  isPublic?: boolean;
}

// Get database connection
function getDb() {
  const dbPath = path.join(process.cwd(), 'prisma', 'family.db');
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  return db;
}

// Generate CUID-like ID
function generateId(): string {
  return randomUUID();
}

// ======================
// PENDING IMAGE OPERATIONS
// ======================

export function createPendingImage(input: CreatePendingImageInput): PendingImage {
  const db = getDb();
  const id = generateId();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO PendingImage (
      id, imageData, thumbnailData, category, title, titleAr, caption, captionAr,
      year, memberId, memberName, taggedMemberIds, uploadedBy, uploadedByName,
      uploadedByEmail, uploadedAt, ipAddress, reviewStatus
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    input.imageData,
    input.thumbnailData || null,
    input.category || 'memory',
    input.title || null,
    input.titleAr || null,
    input.caption || null,
    input.captionAr || null,
    input.year || null,
    input.memberId || null,
    input.memberName || null,
    input.taggedMemberIds ? JSON.stringify(input.taggedMemberIds) : null,
    input.uploadedBy || null,
    input.uploadedByName,
    input.uploadedByEmail || null,
    now,
    input.ipAddress || null,
    'PENDING'
  );

  db.close();

  return getPendingImageById(id)!;
}

export function getPendingImageById(id: string): PendingImage | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM PendingImage WHERE id = ?');
  const row = stmt.get(id) as PendingImage | undefined;
  db.close();
  return row || null;
}

export function getPendingImages(options?: {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  category?: string;
  memberId?: string;
  limit?: number;
  offset?: number;
}): { images: PendingImage[]; total: number } {
  const db = getDb();

  let whereClause = '1=1';
  const params: unknown[] = [];

  if (options?.status) {
    whereClause += ' AND reviewStatus = ?';
    params.push(options.status);
  }
  if (options?.category) {
    whereClause += ' AND category = ?';
    params.push(options.category);
  }
  if (options?.memberId) {
    whereClause += ' AND memberId = ?';
    params.push(options.memberId);
  }

  // Get total count
  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM PendingImage WHERE ${whereClause}`);
  const countResult = countStmt.get(...params) as { count: number };
  const total = countResult.count;

  // Get images
  let query = `SELECT * FROM PendingImage WHERE ${whereClause} ORDER BY uploadedAt DESC`;
  if (options?.limit) {
    query += ` LIMIT ${options.limit}`;
    if (options?.offset) {
      query += ` OFFSET ${options.offset}`;
    }
  }

  const stmt = db.prepare(query);
  const images = stmt.all(...params) as PendingImage[];

  db.close();

  return { images, total };
}

export function approvePendingImage(
  id: string,
  reviewedBy: string,
  reviewedByName: string,
  reviewNotes?: string
): MemberPhoto | null {
  const db = getDb();

  // Get the pending image
  const pendingStmt = db.prepare('SELECT * FROM PendingImage WHERE id = ?');
  const pending = pendingStmt.get(id) as PendingImage | undefined;

  if (!pending) {
    db.close();
    return null;
  }

  const photoId = generateId();
  const now = new Date().toISOString();

  // Create the approved photo
  const insertStmt = db.prepare(`
    INSERT INTO MemberPhoto (
      id, imageData, thumbnailData, category, title, titleAr, caption, captionAr,
      year, memberId, taggedMemberIds, isFamilyAlbum, uploadedBy, uploadedByName,
      originalPendingId, isProfilePhoto, displayOrder, isPublic, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertStmt.run(
    photoId,
    pending.imageData,
    pending.thumbnailData,
    pending.category,
    pending.title,
    pending.titleAr,
    pending.caption,
    pending.captionAr,
    pending.year,
    pending.memberId,
    pending.taggedMemberIds,
    pending.memberId ? 0 : 1, // Family album if no member specified
    pending.uploadedBy,
    pending.uploadedByName,
    pending.id,
    pending.category === 'profile' ? 1 : 0,
    0,
    1,
    now,
    now
  );

  // Update pending image status
  const updateStmt = db.prepare(`
    UPDATE PendingImage
    SET reviewStatus = 'APPROVED', reviewedBy = ?, reviewedByName = ?,
        reviewedAt = ?, reviewNotes = ?, approvedPhotoId = ?
    WHERE id = ?
  `);

  updateStmt.run(reviewedBy, reviewedByName, now, reviewNotes || null, photoId, id);

  db.close();

  return getMemberPhotoById(photoId);
}

export function rejectPendingImage(
  id: string,
  reviewedBy: string,
  reviewedByName: string,
  reviewNotes: string
): PendingImage | null {
  const db = getDb();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE PendingImage
    SET reviewStatus = 'REJECTED', reviewedBy = ?, reviewedByName = ?,
        reviewedAt = ?, reviewNotes = ?
    WHERE id = ?
  `);

  stmt.run(reviewedBy, reviewedByName, now, reviewNotes, id);

  db.close();

  return getPendingImageById(id);
}

export function deletePendingImage(id: string): boolean {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM PendingImage WHERE id = ?');
  const result = stmt.run(id);
  db.close();
  return result.changes > 0;
}

// ======================
// MEMBER PHOTO OPERATIONS
// ======================

export function createMemberPhoto(input: CreateMemberPhotoInput): MemberPhoto {
  const db = getDb();
  const id = generateId();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO MemberPhoto (
      id, imageData, thumbnailData, category, title, titleAr, caption, captionAr,
      year, memberId, taggedMemberIds, isFamilyAlbum, uploadedBy, uploadedByName,
      originalPendingId, isProfilePhoto, displayOrder, isPublic, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    input.imageData,
    input.thumbnailData || null,
    input.category || 'memory',
    input.title || null,
    input.titleAr || null,
    input.caption || null,
    input.captionAr || null,
    input.year || null,
    input.memberId || null,
    input.taggedMemberIds ? JSON.stringify(input.taggedMemberIds) : null,
    input.isFamilyAlbum ? 1 : 0,
    input.uploadedBy || null,
    input.uploadedByName,
    input.originalPendingId || null,
    input.isProfilePhoto ? 1 : 0,
    input.displayOrder || 0,
    input.isPublic !== false ? 1 : 0,
    now,
    now
  );

  db.close();

  return getMemberPhotoById(id)!;
}

export function getMemberPhotoById(id: string): MemberPhoto | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM MemberPhoto WHERE id = ?');
  const row = stmt.get(id) as (MemberPhoto & { isFamilyAlbum: number; isProfilePhoto: number; isPublic: number }) | undefined;
  db.close();

  if (!row) return null;

  // Convert SQLite integers to booleans
  return {
    ...row,
    isFamilyAlbum: Boolean(row.isFamilyAlbum),
    isProfilePhoto: Boolean(row.isProfilePhoto),
    isPublic: Boolean(row.isPublic),
  };
}

export function getMemberPhotos(memberId: string, options?: {
  category?: string;
  limit?: number;
  offset?: number;
}): { photos: MemberPhoto[]; total: number } {
  const db = getDb();

  let whereClause = 'memberId = ?';
  const params: unknown[] = [memberId];

  if (options?.category) {
    whereClause += ' AND category = ?';
    params.push(options.category);
  }

  // Get total count
  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM MemberPhoto WHERE ${whereClause}`);
  const countResult = countStmt.get(...params) as { count: number };
  const total = countResult.count;

  // Get photos
  let query = `SELECT * FROM MemberPhoto WHERE ${whereClause} ORDER BY displayOrder ASC, createdAt DESC`;
  if (options?.limit) {
    query += ` LIMIT ${options.limit}`;
    if (options?.offset) {
      query += ` OFFSET ${options.offset}`;
    }
  }

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as (MemberPhoto & { isFamilyAlbum: number; isProfilePhoto: number; isPublic: number })[];

  db.close();

  const photos = rows.map(row => ({
    ...row,
    isFamilyAlbum: Boolean(row.isFamilyAlbum),
    isProfilePhoto: Boolean(row.isProfilePhoto),
    isPublic: Boolean(row.isPublic),
  }));

  return { photos, total };
}

export function getFamilyAlbumPhotos(options?: {
  category?: string;
  year?: number;
  limit?: number;
  offset?: number;
}): { photos: MemberPhoto[]; total: number } {
  const db = getDb();

  let whereClause = 'isFamilyAlbum = 1';
  const params: unknown[] = [];

  if (options?.category) {
    whereClause += ' AND category = ?';
    params.push(options.category);
  }
  if (options?.year) {
    whereClause += ' AND year = ?';
    params.push(options.year);
  }

  // Get total count
  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM MemberPhoto WHERE ${whereClause}`);
  const countResult = countStmt.get(...params) as { count: number };
  const total = countResult.count;

  // Get photos
  let query = `SELECT * FROM MemberPhoto WHERE ${whereClause} ORDER BY year DESC, createdAt DESC`;
  if (options?.limit) {
    query += ` LIMIT ${options.limit}`;
    if (options?.offset) {
      query += ` OFFSET ${options.offset}`;
    }
  }

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as (MemberPhoto & { isFamilyAlbum: number; isProfilePhoto: number; isPublic: number })[];

  db.close();

  const photos = rows.map(row => ({
    ...row,
    isFamilyAlbum: Boolean(row.isFamilyAlbum),
    isProfilePhoto: Boolean(row.isProfilePhoto),
    isPublic: Boolean(row.isPublic),
  }));

  return { photos, total };
}

export function getAllPhotos(options?: {
  category?: string;
  year?: number;
  uploadedBy?: string;
  limit?: number;
  offset?: number;
}): { photos: MemberPhoto[]; total: number } {
  const db = getDb();

  let whereClause = '1=1';
  const params: unknown[] = [];

  if (options?.category) {
    whereClause += ' AND category = ?';
    params.push(options.category);
  }
  if (options?.year) {
    whereClause += ' AND year = ?';
    params.push(options.year);
  }
  if (options?.uploadedBy) {
    whereClause += ' AND uploadedBy = ?';
    params.push(options.uploadedBy);
  }

  // Get total count
  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM MemberPhoto WHERE ${whereClause}`);
  const countResult = countStmt.get(...params) as { count: number };
  const total = countResult.count;

  // Get photos
  let query = `SELECT * FROM MemberPhoto WHERE ${whereClause} ORDER BY createdAt DESC`;
  if (options?.limit) {
    query += ` LIMIT ${options.limit}`;
    if (options?.offset) {
      query += ` OFFSET ${options.offset}`;
    }
  }

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as (MemberPhoto & { isFamilyAlbum: number; isProfilePhoto: number; isPublic: number })[];

  db.close();

  const photos = rows.map(row => ({
    ...row,
    isFamilyAlbum: Boolean(row.isFamilyAlbum),
    isProfilePhoto: Boolean(row.isProfilePhoto),
    isPublic: Boolean(row.isPublic),
  }));

  return { photos, total };
}

export function getPhotoTimeline(options?: {
  memberId?: string;
  limit?: number;
}): { year: number; count: number; photos: MemberPhoto[] }[] {
  const db = getDb();

  let whereClause = 'year IS NOT NULL';
  const params: unknown[] = [];

  if (options?.memberId) {
    whereClause += ' AND memberId = ?';
    params.push(options.memberId);
  }

  // Get photos grouped by year
  const query = `
    SELECT * FROM MemberPhoto
    WHERE ${whereClause}
    ORDER BY year DESC, createdAt DESC
  `;

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as (MemberPhoto & { isFamilyAlbum: number; isProfilePhoto: number; isPublic: number })[];

  db.close();

  // Group by year
  const yearMap = new Map<number, MemberPhoto[]>();

  for (const row of rows) {
    const year = row.year!;
    const photo: MemberPhoto = {
      ...row,
      isFamilyAlbum: Boolean(row.isFamilyAlbum),
      isProfilePhoto: Boolean(row.isProfilePhoto),
      isPublic: Boolean(row.isPublic),
    };

    if (!yearMap.has(year)) {
      yearMap.set(year, []);
    }
    yearMap.get(year)!.push(photo);
  }

  const timeline = Array.from(yearMap.entries()).map(([year, photos]) => ({
    year,
    count: photos.length,
    photos: options?.limit ? photos.slice(0, options.limit) : photos,
  }));

  return timeline;
}

export function updateMemberPhoto(
  id: string,
  updates: Partial<Omit<CreateMemberPhotoInput, 'imageData' | 'uploadedBy' | 'uploadedByName'>>
): MemberPhoto | null {
  const db = getDb();
  const now = new Date().toISOString();

  const fields: string[] = ['updatedAt = ?'];
  const params: unknown[] = [now];

  if (updates.category !== undefined) {
    fields.push('category = ?');
    params.push(updates.category);
  }
  if (updates.title !== undefined) {
    fields.push('title = ?');
    params.push(updates.title);
  }
  if (updates.titleAr !== undefined) {
    fields.push('titleAr = ?');
    params.push(updates.titleAr);
  }
  if (updates.caption !== undefined) {
    fields.push('caption = ?');
    params.push(updates.caption);
  }
  if (updates.captionAr !== undefined) {
    fields.push('captionAr = ?');
    params.push(updates.captionAr);
  }
  if (updates.year !== undefined) {
    fields.push('year = ?');
    params.push(updates.year);
  }
  if (updates.memberId !== undefined) {
    fields.push('memberId = ?');
    params.push(updates.memberId);
  }
  if (updates.taggedMemberIds !== undefined) {
    fields.push('taggedMemberIds = ?');
    params.push(JSON.stringify(updates.taggedMemberIds));
  }
  if (updates.isFamilyAlbum !== undefined) {
    fields.push('isFamilyAlbum = ?');
    params.push(updates.isFamilyAlbum ? 1 : 0);
  }
  if (updates.isProfilePhoto !== undefined) {
    fields.push('isProfilePhoto = ?');
    params.push(updates.isProfilePhoto ? 1 : 0);
  }
  if (updates.displayOrder !== undefined) {
    fields.push('displayOrder = ?');
    params.push(updates.displayOrder);
  }
  if (updates.isPublic !== undefined) {
    fields.push('isPublic = ?');
    params.push(updates.isPublic ? 1 : 0);
  }

  params.push(id);

  const stmt = db.prepare(`UPDATE MemberPhoto SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...params);

  db.close();

  return getMemberPhotoById(id);
}

export function deleteMemberPhoto(id: string): boolean {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM MemberPhoto WHERE id = ?');
  const result = stmt.run(id);
  db.close();
  return result.changes > 0;
}

export function setProfilePhoto(memberId: string, photoId: string): boolean {
  const db = getDb();

  // First, unset any existing profile photos for this member
  const unsetStmt = db.prepare('UPDATE MemberPhoto SET isProfilePhoto = 0 WHERE memberId = ?');
  unsetStmt.run(memberId);

  // Set the new profile photo
  const setStmt = db.prepare('UPDATE MemberPhoto SET isProfilePhoto = 1 WHERE id = ? AND memberId = ?');
  const result = setStmt.run(photoId, memberId);

  db.close();
  return result.changes > 0;
}

export function getProfilePhoto(memberId: string): MemberPhoto | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM MemberPhoto WHERE memberId = ? AND isProfilePhoto = 1 LIMIT 1');
  const row = stmt.get(memberId) as (MemberPhoto & { isFamilyAlbum: number; isProfilePhoto: number; isPublic: number }) | undefined;
  db.close();

  if (!row) return null;

  return {
    ...row,
    isFamilyAlbum: Boolean(row.isFamilyAlbum),
    isProfilePhoto: Boolean(row.isProfilePhoto),
    isPublic: Boolean(row.isPublic),
  };
}

// ======================
// STATISTICS
// ======================

export function getImageStats(): {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalPhotos: number;
  familyAlbumCount: number;
  byCategory: { category: string; count: number }[];
} {
  const db = getDb();

  const pendingCount = (db.prepare('SELECT COUNT(*) as count FROM PendingImage WHERE reviewStatus = ?').get('PENDING') as { count: number }).count;
  const approvedCount = (db.prepare('SELECT COUNT(*) as count FROM PendingImage WHERE reviewStatus = ?').get('APPROVED') as { count: number }).count;
  const rejectedCount = (db.prepare('SELECT COUNT(*) as count FROM PendingImage WHERE reviewStatus = ?').get('REJECTED') as { count: number }).count;
  const totalPhotos = (db.prepare('SELECT COUNT(*) as count FROM MemberPhoto').get() as { count: number }).count;
  const familyAlbumCount = (db.prepare('SELECT COUNT(*) as count FROM MemberPhoto WHERE isFamilyAlbum = 1').get() as { count: number }).count;

  const byCategory = db.prepare(`
    SELECT category, COUNT(*) as count FROM MemberPhoto GROUP BY category
  `).all() as { category: string; count: number }[];

  db.close();

  return {
    pendingCount,
    approvedCount,
    rejectedCount,
    totalPhotos,
    familyAlbumCount,
    byCategory,
  };
}
