import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';
import { getDatabaseConfig, DatabaseConfig, isDatabaseConfigured as checkDbConfigured } from './config.ts';

// Global connection pool caching to persist across hot-reloads and module re-evaluations
declare global {
  var _postgresPool: Pool | undefined;
  var _drizzleDb: NodePgDatabase<typeof schema> | undefined;
}

const config: DatabaseConfig = getDatabaseConfig();

export const isDbConfigured = (): boolean => {
  return config.configured;
};

export const createPool = (): Pool | null => {
  if (!config.configured) {
    return null;
  }

  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      connectionString: config.url,
      max: config.maxConnections,
      idleTimeoutMillis: config.idleTimeoutMillis,
      connectionTimeoutMillis: config.connectionTimeoutMillis,
      ssl: config.ssl,
      allowExitOnIdle: true,
    });

    // Prevent unhandled pool-level errors from crashing the application
    global._postgresPool.on('error', (err) => {
      console.error('[Nolyvatix Database] Unexpected error on idle PostgreSQL pool client:', err.message);
    });
  }
  return global._postgresPool;
};

// Create or retrieve the pool instance.
export const pool = createPool();

// Initialize Drizzle with the pool and schema if pool is available.
export const db: NodePgDatabase<typeof schema> | null = pool
  ? (global._drizzleDb ??= drizzle(pool, { schema }))
  : null;

if (!config.configured) {
  if (config.requireDb) {
    throw new Error(
      '[Nolyvatix Database Fatal] REQUIRE_DB is enabled, but DATABASE_URL is not configured.'
    );
  }
  if (process.env.NODE_ENV !== 'test') {
    console.info(
      '[Nolyvatix Database] DATABASE_URL is not set. Operating in in-memory development/demo fallback mode.'
    );
  }
}

export interface DatabaseHealthStatus {
  status: 'healthy' | 'unavailable' | 'not_configured';
  mode: 'postgresql' | 'in_memory_fallback';
  configured: boolean;
  connected: boolean;
  latencyMs?: number;
  pool?: {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  };
  error?: string;
}

export async function checkDatabaseHealth(): Promise<DatabaseHealthStatus> {
  if (!config.configured || !pool) {
    return {
      status: 'not_configured',
      mode: 'in_memory_fallback',
      configured: false,
      connected: false,
    };
  }

  const start = Date.now();
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      const latencyMs = Date.now() - start;
      return {
        status: 'healthy',
        mode: 'postgresql',
        configured: true,
        connected: true,
        latencyMs,
        pool: {
          totalCount: pool.totalCount,
          idleCount: pool.idleCount,
          waitingCount: pool.waitingCount,
        },
      };
    } finally {
      client.release();
    }
  } catch (err: any) {
    const rawMsg = err?.message || String(err);
    const sanitizedMsg = rawMsg.replace(/(password=)[^& ]+/gi, '$1****');
    return {
      status: 'unavailable',
      mode: 'postgresql',
      configured: true,
      connected: false,
      error: sanitizedMsg,
    };
  }
}

export async function closeDatabasePool(): Promise<void> {
  if (global._postgresPool) {
    await global._postgresPool.end();
    global._postgresPool = undefined;
    global._drizzleDb = undefined;
  }
}

export { isDatabaseConfigured, getDatabaseConfig, sanitizeDatabaseUrl } from './config.ts';
export * from './schema.ts';

