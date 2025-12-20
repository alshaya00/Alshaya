/**
 * Database Access Layer using better-sqlite3
 *
 * This provides a Prisma-like interface using better-sqlite3 directly,
 * avoiding the need for Prisma binary downloads.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';

// Database path
const dbPath = process.env.DATABASE_URL?.replace('file:', '').replace('./prisma/', '') || 'family.db';
const absoluteDbPath = path.join(process.cwd(), 'prisma', dbPath);

// Types
export interface FamilyMemberRecord {
  id: string;
  firstName: string;
  fatherName: string | null;
  grandfatherName: string | null;
  greatGrandfatherName: string | null;
  familyName: string;
  fatherId: string | null;
  gender: string;
  birthYear: number | null;
  deathYear: number | null;
  sonsCount: number;
  daughtersCount: number;
  generation: number;
  branch: string | null;
  lineage: string | null;
  lineageBranchId: string | null;
  fullNameAr: string | null;
  fullNameEn: string | null;
  phone: string | null;
  city: string | null;
  status: string;
  photoUrl: string | null;
  biography: string | null;
  occupation: string | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  lastModifiedBy: string | null;
  version: number;
}

// Create database connection with error handling
function createDb(): Database.Database | null {
  try {
    const db = new Database(absoluteDbPath);
    db.pragma('foreign_keys = ON');
    return db;
  } catch (error) {
    console.warn('Could not connect to database:', error);
    return null;
  }
}

// Lazy database connection
let _db: Database.Database | null = null;
function getDb(): Database.Database | null {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}

// Prisma-like model interface with flexible types for compatibility
// Using 'any' for Prisma API compatibility
interface ModelMethods<T> {
  findMany: (args?: Record<string, unknown>) => Promise<T[]>;
  findUnique: (args: Record<string, unknown>) => Promise<T | null>;
  findFirst: (args?: Record<string, unknown>) => Promise<T | null>;
  create: (args: Record<string, unknown>) => Promise<T>;
  update: (args: Record<string, unknown>) => Promise<T>;
  upsert: (args: Record<string, unknown>) => Promise<T>;
  delete: (args: Record<string, unknown>) => Promise<T>;
  deleteMany: (args?: Record<string, unknown>) => Promise<{ count: number }>;
  count: (args?: Record<string, unknown>) => Promise<number>;
  updateMany: (args: Record<string, unknown>) => Promise<{ count: number }>;
  groupBy: (args: Record<string, unknown>) => Promise<Record<string, unknown>[]>;
}

// Build WHERE clause from object
function buildWhereClause(where: Record<string, unknown>): { clause: string; values: unknown[] } {
  const conditions: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(where)) {
    if (value !== undefined) {
      if (value === null) {
        conditions.push(`${key} IS NULL`);
      } else if (typeof value === 'object' && value !== null && 'not' in value) {
        if ((value as { not: unknown }).not === null) {
          conditions.push(`${key} IS NOT NULL`);
        } else {
          conditions.push(`${key} != ?`);
          values.push((value as { not: unknown }).not);
        }
      } else {
        conditions.push(`${key} = ?`);
        values.push(value);
      }
    }
  }

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    values
  };
}

// Create model methods for a table
function createModel<T extends { id: string }>(tableName: string): ModelMethods<T> {
  return {
    async findMany(args) {
      const db = getDb();
      if (!db) return [];

      let sql = `SELECT * FROM ${tableName}`;
      const values: unknown[] = [];

      if (args?.where && Object.keys(args.where).length > 0) {
        const { clause, values: whereValues } = buildWhereClause(args.where as Record<string, unknown>);
        sql += ` ${clause}`;
        values.push(...whereValues);
      }

      if (args?.orderBy) {
        const orderByArray = Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy];
        const orderParts = orderByArray.flatMap(ob =>
          Object.entries(ob).map(([col, dir]) => `${col} ${(dir as string).toUpperCase()}`)
        );
        sql += ` ORDER BY ${orderParts.join(', ')}`;
      }

      if (args?.take) {
        sql += ` LIMIT ${args.take}`;
      }

      if (args?.skip) {
        sql += ` OFFSET ${args.skip}`;
      }

      try {
        return db.prepare(sql).all(...values) as T[];
      } catch (error) {
        console.error(`Error in ${tableName}.findMany:`, error);
        return [];
      }
    },

    async findUnique(args) {
      const db = getDb();
      if (!db) return null;

      const { clause, values } = buildWhereClause(args.where as Record<string, unknown>);
      const sql = `SELECT * FROM ${tableName} ${clause} LIMIT 1`;

      try {
        return db.prepare(sql).get(...values) as T | undefined ?? null;
      } catch (error) {
        console.error(`Error in ${tableName}.findUnique:`, error);
        return null;
      }
    },

    async findFirst(args) {
      const db = getDb();
      if (!db) return null;

      let sql = `SELECT * FROM ${tableName}`;
      const values: unknown[] = [];

      if (args?.where && Object.keys(args.where).length > 0) {
        const { clause, values: whereValues } = buildWhereClause(args.where as Record<string, unknown>);
        sql += ` ${clause}`;
        values.push(...whereValues);
      }

      if (args?.orderBy) {
        const orderByArray = Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy];
        const orderParts = orderByArray.flatMap(ob =>
          Object.entries(ob).map(([col, dir]) => `${col} ${(dir as string).toUpperCase()}`)
        );
        sql += ` ORDER BY ${orderParts.join(', ')}`;
      }

      sql += ' LIMIT 1';

      try {
        return db.prepare(sql).get(...values) as T | undefined ?? null;
      } catch (error) {
        console.error(`Error in ${tableName}.findFirst:`, error);
        return null;
      }
    },

    async create(args) {
      const db = getDb();
      if (!db) throw new Error('Database not available');

      const inputData = args.data as Record<string, unknown>;
      const data = { ...inputData, id: inputData.id || randomUUID() };
      const columns = Object.keys(data);
      const placeholders = columns.map(() => '?').join(', ');
      const values = Object.values(data);

      const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

      try {
        db.prepare(sql).run(...values);
        return data as unknown as T;
      } catch (error) {
        console.error(`Error in ${tableName}.create:`, error);
        throw error;
      }
    },

    async update(args) {
      const db = getDb();
      if (!db) throw new Error('Database not available');

      const inputData = args.data as Record<string, unknown>;
      const data = { ...inputData, updatedAt: new Date().toISOString() };
      const setParts = Object.keys(data).map(col => `${col} = ?`);

      // Build WHERE clause from args.where
      const { clause, values: whereValues } = buildWhereClause(args.where as Record<string, unknown>);
      const values = [...Object.values(data), ...whereValues];

      const sql = `UPDATE ${tableName} SET ${setParts.join(', ')} ${clause}`;

      try {
        db.prepare(sql).run(...values);
        const whereObj = args.where as Record<string, unknown>;
        return { ...whereObj, ...data } as unknown as T;
      } catch (error) {
        console.error(`Error in ${tableName}.update:`, error);
        throw error;
      }
    },

    async upsert(args) {
      const db = getDb();
      if (!db) throw new Error('Database not available');

      const whereObj = args.where as Record<string, unknown>;

      // Check if record exists
      const existing = await this.findUnique({ where: whereObj });

      if (existing) {
        // Update existing record
        const whereId = 'id' in whereObj ? whereObj.id : Object.values(whereObj)[0];
        return this.update({ where: { id: whereId as string }, data: args.update });
      } else {
        // Create new record
        return this.create({ data: args.create });
      }
    },

    async delete(args) {
      const db = getDb();
      if (!db) throw new Error('Database not available');

      const whereObj = args.where as Record<string, unknown>;

      // Get record before delete
      const record = await this.findUnique({ where: whereObj });
      if (!record) throw new Error('Record not found');

      const sql = `DELETE FROM ${tableName} WHERE id = ?`;

      try {
        db.prepare(sql).run(whereObj.id);
        return record;
      } catch (error) {
        console.error(`Error in ${tableName}.delete:`, error);
        throw error;
      }
    },

    async deleteMany(args) {
      const db = getDb();
      if (!db) return { count: 0 };

      let sql = `DELETE FROM ${tableName}`;
      const values: unknown[] = [];

      if (args?.where && Object.keys(args.where).length > 0) {
        const { clause, values: whereValues } = buildWhereClause(args.where as Record<string, unknown>);
        sql += ` ${clause}`;
        values.push(...whereValues);
      }

      try {
        const result = db.prepare(sql).run(...values);
        return { count: result.changes };
      } catch (error) {
        console.error(`Error in ${tableName}.deleteMany:`, error);
        return { count: 0 };
      }
    },

    async count(args) {
      const db = getDb();
      if (!db) return 0;

      let sql = `SELECT COUNT(*) as count FROM ${tableName}`;
      const values: unknown[] = [];

      if (args?.where && Object.keys(args.where).length > 0) {
        const { clause, values: whereValues } = buildWhereClause(args.where as Record<string, unknown>);
        sql += ` ${clause}`;
        values.push(...whereValues);
      }

      try {
        const result = db.prepare(sql).get(...values) as { count: number };
        return result.count;
      } catch (error) {
        console.error(`Error in ${tableName}.count:`, error);
        return 0;
      }
    },

    async updateMany(args) {
      const db = getDb();
      if (!db) return { count: 0 };

      const inputData = args.data as Record<string, unknown>;
      const data = { ...inputData, updatedAt: new Date().toISOString() };
      const setParts = Object.keys(data).map(col => `${col} = ?`);
      let sql = `UPDATE ${tableName} SET ${setParts.join(', ')}`;
      const values: unknown[] = [...Object.values(data)];

      if (args?.where) {
        const whereObj = args.where as Record<string, unknown>;
        if (Object.keys(whereObj).length > 0) {
          const { clause, values: whereValues } = buildWhereClause(whereObj);
          sql += ` ${clause}`;
          values.push(...whereValues);
        }
      }

      try {
        const result = db.prepare(sql).run(...values);
        return { count: result.changes };
      } catch (error) {
        console.error(`Error in ${tableName}.updateMany:`, error);
        return { count: 0 };
      }
    },

    async groupBy(args) {
      const db = getDb();
      if (!db) return [];

      // Handle 'by' field - array of column names to group by
      const byColumns = args.by as string[];
      if (!byColumns || byColumns.length === 0) {
        return [];
      }

      // Build SELECT clause with group by columns and count
      const selectParts = [...byColumns];
      const countConfig = args._count as Record<string, boolean> | boolean | undefined;

      if (countConfig === true) {
        selectParts.push('COUNT(*) as _count');
      } else if (countConfig && typeof countConfig === 'object') {
        for (const [field, enabled] of Object.entries(countConfig)) {
          if (enabled) {
            selectParts.push(`COUNT(${field}) as _count_${field}`);
          }
        }
      }

      let sql = `SELECT ${selectParts.join(', ')} FROM ${tableName}`;
      const values: unknown[] = [];

      if (args?.where) {
        const whereObj = args.where as Record<string, unknown>;
        if (Object.keys(whereObj).length > 0) {
          const { clause, values: whereValues } = buildWhereClause(whereObj);
          sql += ` ${clause}`;
          values.push(...whereValues);
        }
      }

      sql += ` GROUP BY ${byColumns.join(', ')}`;

      try {
        const results = db.prepare(sql).all(...values) as Record<string, unknown>[];
        // Transform _count_field to _count: { field: count } format for Prisma compatibility
        return results.map(row => {
          const transformed: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(row)) {
            if (key.startsWith('_count_')) {
              const field = key.replace('_count_', '');
              if (!transformed._count) {
                transformed._count = {};
              }
              (transformed._count as Record<string, unknown>)[field] = value;
            } else if (key === '_count') {
              transformed._count = value;
            } else {
              transformed[key] = value;
            }
          }
          return transformed;
        });
      } catch (error) {
        console.error(`Error in ${tableName}.groupBy:`, error);
        return [];
      }
    }
  };
}

// Define the prisma client type
interface PrismaClient {
  familyMember: ModelMethods<FamilyMemberRecord>;
  changeHistory: ModelMethods<any>;
  user: ModelMethods<any>;
  session: ModelMethods<any>;
  snapshot: ModelMethods<any>;
  duplicateFlag: ModelMethods<any>;
  pendingMember: ModelMethods<any>;
  memberPhoto: ModelMethods<any>;
  pendingImage: ModelMethods<any>;
  familyJournal: ModelMethods<any>;
  memberBreastfeedingRelationship: ModelMethods<any>;
  breastfeedingRelationship: ModelMethods<any>;
  siteSettings: ModelMethods<any>;
  invite: ModelMethods<any>;
  accessRequest: ModelMethods<any>;
  gathering: ModelMethods<any>;
  gatheringAttendee: ModelMethods<any>;
  broadcast: ModelMethods<any>;
  broadcastRecipient: ModelMethods<any>;
  activityLog: ModelMethods<any>;
  notification: ModelMethods<any>;
  searchHistory: ModelMethods<any>;
  importJob: ModelMethods<any>;
  exportJob: ModelMethods<any>;
  branchEntryLink: ModelMethods<any>;
  apiServiceConfig: ModelMethods<any>;
  emailLog: ModelMethods<any>;
  smsLog: ModelMethods<any>;
  scheduledJob: ModelMethods<any>;
  journalMedia: ModelMethods<any>;
  journalCategory: ModelMethods<any>;
  permission: ModelMethods<any>;
  permissionCategory: ModelMethods<any>;
  roleDefaultPermission: ModelMethods<any>;
  permissionMatrix: ModelMethods<any>;
  userPermissionOverride: ModelMethods<any>;
  privacySettings: ModelMethods<any>;
  admin: ModelMethods<any>;
  adminSession: ModelMethods<any>;
  passwordReset: ModelMethods<any>;
  emailVerification: ModelMethods<any>;
  exportField: ModelMethods<any>;
  exportFieldCategory: ModelMethods<any>;
  backupConfig: ModelMethods<any>;
  eventType: ModelMethods<any>;
  $transaction: <T>(fn: (tx: PrismaClient) => Promise<T>) => Promise<T>;
  $queryRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>;
  $executeRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<number>;
  $connect: () => Promise<void>;
  $disconnect: () => Promise<void>;
}

// Prisma-like client interface
export const prisma: PrismaClient = {
  familyMember: createModel<FamilyMemberRecord>('FamilyMember'),
  changeHistory: createModel<any>('ChangeHistory'),
  user: createModel<any>('User'),
  session: createModel<any>('Session'),
  snapshot: createModel<any>('Snapshot'),
  duplicateFlag: createModel<any>('DuplicateFlag'),
  pendingMember: createModel<any>('PendingMember'),
  memberPhoto: createModel<any>('MemberPhoto'),
  pendingImage: createModel<any>('PendingImage'),
  familyJournal: createModel<any>('FamilyJournal'),
  memberBreastfeedingRelationship: createModel<any>('MemberBreastfeedingRelationship'),
  breastfeedingRelationship: createModel<any>('BreastfeedingRelationship'),
  siteSettings: createModel<any>('SiteSettings'),
  invite: createModel<any>('Invite'),
  accessRequest: createModel<any>('AccessRequest'),
  gathering: createModel<any>('Gathering'),
  gatheringAttendee: createModel<any>('GatheringAttendee'),
  broadcast: createModel<any>('Broadcast'),
  broadcastRecipient: createModel<any>('BroadcastRecipient'),
  activityLog: createModel<any>('ActivityLog'),
  notification: createModel<any>('Notification'),
  searchHistory: createModel<any>('SearchHistory'),
  importJob: createModel<any>('ImportJob'),
  exportJob: createModel<any>('ExportJob'),
  branchEntryLink: createModel<any>('BranchEntryLink'),
  apiServiceConfig: createModel<any>('ApiServiceConfig'),
  emailLog: createModel<any>('EmailLog'),
  smsLog: createModel<any>('SmsLog'),
  scheduledJob: createModel<any>('ScheduledJob'),
  journalMedia: createModel<any>('JournalMedia'),
  journalCategory: createModel<any>('JournalCategory'),
  permission: createModel<any>('Permission'),
  permissionCategory: createModel<any>('PermissionCategory'),
  roleDefaultPermission: createModel<any>('RoleDefaultPermission'),
  permissionMatrix: createModel<any>('PermissionMatrix'),
  userPermissionOverride: createModel<any>('UserPermissionOverride'),
  privacySettings: createModel<any>('PrivacySettings'),
  admin: createModel<any>('Admin'),
  adminSession: createModel<any>('AdminSession'),
  passwordReset: createModel<any>('PasswordReset'),
  emailVerification: createModel<any>('EmailVerification'),
  exportField: createModel<any>('ExportField'),
  exportFieldCategory: createModel<any>('ExportFieldCategory'),
  backupConfig: createModel<any>('BackupConfig'),
  eventType: createModel<any>('EventType'),

  // Transaction support
  async $transaction<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
    const db = getDb();
    if (!db) throw new Error('Database not available');

    return db.transaction(() => {
      return fn(prisma);
    })() as T;
  },

  // Raw query support
  async $queryRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]> {
    const db = getDb();
    if (!db) return [];

    const sql = query.reduce((acc, part, i) => acc + part + (values[i] !== undefined ? '?' : ''), '');
    try {
      return db.prepare(sql).all(...values);
    } catch (error) {
      console.error('Error in $queryRaw:', error);
      return [];
    }
  },

  async $executeRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<number> {
    const db = getDb();
    if (!db) return 0;

    const sql = query.reduce((acc, part, i) => acc + part + (values[i] !== undefined ? '?' : ''), '');
    try {
      const result = db.prepare(sql).run(...values);
      return result.changes;
    } catch (error) {
      console.error('Error in $executeRaw:', error);
      return 0;
    }
  },

  async $connect(): Promise<void> {
    getDb();
  },

  async $disconnect(): Promise<void> {
    if (_db) {
      _db.close();
      _db = null;
    }
  }
};

// Export Prisma namespace for compatibility
export const Prisma = {
  TransactionClient: prisma
};

export default prisma;
