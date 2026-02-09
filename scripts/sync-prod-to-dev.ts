import { Pool } from 'pg';

const BATCH_SIZE = 100;

const TABLES_IN_ORDER = [
  'Admin',
  'AlbumFolder',
  'ApiServiceConfig',
  'BackupConfig',
  'Blocklist',
  'Broadcast',
  'CreditsCategory',
  'EventType',
  'ExportField',
  'ExportFieldCategory',
  'ExportJob',
  'FeatureFlag',
  'Gathering',
  'ImportJob',
  'InvitationCode',
  'JournalCategory',
  'Permission',
  'PermissionCategory',
  'PermissionMatrix',
  'PrivacySettings',
  'ScheduledJob',
  'SearchHistory',
  'SiteSettings',
  'Snapshot',
  'SystemConfig',
  'AuditLog',
  'EmailLog',
  'EmailVerification',
  'PasswordReset',
  'SmsLog',
  'UserPermissionOverride',
  'FamilyMember',
  'User',
  'FamilyJournal',
  'PendingMember',
  'BranchEntryLink',
  'BreastfeedingRelationship',
  'ChangeHistory',
  'DuplicateFlag',
  'MemberPhoto',
  'PendingImage',
  'AccessRequest',
  'ActivityLog',
  'Invite',
  'LoginHistory',
  'Notification',
  'OtpCode',
  'Session',
  'AdminSession',
  'BroadcastRecipient',
  'GatheringAttendee',
  'InvitationRedemption',
  'JournalMedia',
  'RoleDefaultPermission',
];

async function main() {
  const prodUrl = process.env.PRODUCTION_DATABASE_URL;
  const devUrl = process.env.DATABASE_URL;

  if (!prodUrl) {
    console.error('❌ PRODUCTION_DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  if (!devUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('🔗 Connecting to production database (read-only)...');
  const prodPool = new Pool({ connectionString: prodUrl, ssl: { rejectUnauthorized: false } });

  console.log('🔗 Connecting to development database...');
  const devPool = new Pool({ connectionString: devUrl, ssl: { rejectUnauthorized: false } });

  try {
    await prodPool.query('SELECT 1');
    console.log('✅ Production database connected');

    await devPool.query('SELECT 1');
    console.log('✅ Development database connected');

    console.log('\n🔧 Disabling foreign key triggers on development...');
    const devClient = await devPool.connect();

    try {
      await devClient.query('BEGIN');
      await devClient.query('SET session_replication_role = replica');

      console.log('🗑️  Truncating all tables in development...');
      const reversedTables = [...TABLES_IN_ORDER].reverse();
      for (const table of reversedTables) {
        try {
          await devClient.query(`TRUNCATE TABLE "${table}" CASCADE`);
          console.log(`   ✓ Truncated "${table}"`);
        } catch (err: any) {
          if (err.code === '42P01') {
            console.log(`   ⚠ Table "${table}" does not exist, skipping`);
          } else {
            throw err;
          }
        }
      }

      console.log('\n📥 Syncing data from production to development...\n');
      const counts: Record<string, { prod: number; dev: number }> = {};

      for (const table of TABLES_IN_ORDER) {
        try {
          const countResult = await prodPool.query(`SELECT COUNT(*) as count FROM "${table}"`);
          const totalRows = parseInt(countResult.rows[0].count, 10);
          counts[table] = { prod: totalRows, dev: 0 };

          if (totalRows === 0) {
            console.log(`   📋 "${table}": 0 rows (empty)`);
            continue;
          }

          const colResult = await prodPool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = $1 
            ORDER BY ordinal_position
          `, [table]);
          const columns = colResult.rows.map((r: any) => r.column_name);

          if (columns.length === 0) {
            console.log(`   ⚠ "${table}": no columns found, skipping`);
            continue;
          }

          const quotedColumns = columns.map((c: string) => `"${c}"`).join(', ');

          let offset = 0;
          let inserted = 0;

          while (offset < totalRows) {
            const dataResult = await prodPool.query(
              `SELECT ${quotedColumns} FROM "${table}" LIMIT ${BATCH_SIZE} OFFSET ${offset}`
            );
            const rows = dataResult.rows;

            if (rows.length === 0) break;

            for (const row of rows) {
              const values = columns.map((_: string, i: number) => `$${i + 1}`).join(', ');
              const params = columns.map((col: string) => row[col]);

              await devClient.query(
                `INSERT INTO "${table}" (${quotedColumns}) VALUES (${values})`,
                params
              );
              inserted++;
            }

            offset += BATCH_SIZE;
          }

          counts[table].dev = inserted;
          console.log(`   ✅ "${table}": ${inserted} rows synced`);
        } catch (err: any) {
          if (err.code === '42P01') {
            console.log(`   ⚠ "${table}" does not exist in one of the databases, skipping`);
            counts[table] = { prod: -1, dev: -1 };
          } else {
            console.error(`   ❌ Error syncing "${table}": ${err.message}`);
            throw err;
          }
        }
      }

      console.log('\n🔧 Re-enabling foreign key triggers...');
      await devClient.query('SET session_replication_role = DEFAULT');

      await devClient.query('COMMIT');
      console.log('✅ Transaction committed successfully');

      console.log('\n📊 Sync Summary:');
      console.log('─'.repeat(55));
      console.log(`${'Table'.padEnd(35)} ${'Prod'.padStart(8)} ${'Dev'.padStart(8)}`);
      console.log('─'.repeat(55));
      let totalProd = 0;
      let totalDev = 0;
      for (const [table, { prod, dev }] of Object.entries(counts)) {
        if (prod === -1) {
          console.log(`${table.padEnd(35)} ${'N/A'.padStart(8)} ${'N/A'.padStart(8)}`);
        } else {
          console.log(`${table.padEnd(35)} ${String(prod).padStart(8)} ${String(dev).padStart(8)}`);
          totalProd += prod;
          totalDev += dev;
        }
      }
      console.log('─'.repeat(55));
      console.log(`${'TOTAL'.padEnd(35)} ${String(totalProd).padStart(8)} ${String(totalDev).padStart(8)}`);
      console.log('─'.repeat(55));

      if (totalProd === totalDev) {
        console.log('\n✅ All rows synced successfully!');
      } else {
        console.log(`\n⚠ Row count mismatch: ${totalProd} in prod vs ${totalDev} in dev`);
      }

    } catch (err) {
      console.error('\n❌ Error during sync, rolling back...');
      await devClient.query('ROLLBACK');
      throw err;
    } finally {
      devClient.release();
    }

  } catch (err: any) {
    console.error('\n❌ Sync failed:', err.message);
    process.exit(1);
  } finally {
    await prodPool.end();
    await devPool.end();
    console.log('\n🔌 Database connections closed');
  }
}

main();
