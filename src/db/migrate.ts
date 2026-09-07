/**
 * Nolyvatix Explicit Database Migration Runner
 * Applies versioned migrations generated in ./drizzle/ to the target PostgreSQL database.
 */

import path from 'path';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { getDatabaseConfig } from './config.ts';

export async function runMigrations(): Promise<void> {
  const config = getDatabaseConfig();

  if (!config.configured) {
    console.error(
      '\n[Nolyvatix Migration Error] DATABASE_URL is not configured.' +
      '\nPlease set the DATABASE_URL environment variable (e.g., in your .env file or deployment secrets)' +
      '\nbefore executing migrations.\nExample: DATABASE_URL="postgresql://user:password@localhost:5432/nolyvatix"\n'
    );
    throw new Error('DATABASE_URL is not configured');
  }

  console.log(`[Nolyvatix Migration] Target database: ${config.sanitizedUrl}`);
  console.log('[Nolyvatix Migration] Starting migration execution...');

  const startTime = Date.now();

  const migrationPool = new Pool({
    connectionString: config.url,
    max: 1, // Dedicated single connection for DDL migrations
    connectionTimeoutMillis: 10000,
    ssl: config.ssl,
  });

  try {
    const migrationDb = drizzle(migrationPool);
    const migrationsFolder = path.resolve(process.cwd(), 'drizzle');

    console.log(`[Nolyvatix Migration] Reading migrations from: ${migrationsFolder}`);
    await migrate(migrationDb, { migrationsFolder });

    const duration = Date.now() - startTime;
    console.log(`[Nolyvatix Migration] ✓ All migrations applied successfully in ${duration}ms.\n`);
  } catch (error: any) {
    const rawMsg = error?.message || String(error);
    const sanitizedMsg = rawMsg.replace(/(password=)[^& ]+/gi, '$1****');
    console.error(`[Nolyvatix Migration Failed] Error executing migration: ${sanitizedMsg}`);
    throw new Error(sanitizedMsg);
  } finally {
    await migrationPool.end().catch(() => {});
  }
}

// Execute immediately when invoked directly via CLI (tsx src/db/migrate.ts or npm run db:migrate)
const isMainModule =
  process.argv[1] &&
  (process.argv[1].endsWith('migrate.ts') || process.argv[1].endsWith('migrate.js'));

if (isMainModule) {
  runMigrations()
    .then(() => {
      process.exit(0);
    })
    .catch(() => {
      process.exit(1);
    });
}
