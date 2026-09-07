/**
 * Nolyvatix Database Configuration & Validation
 * Centralized, secure environment parsing, URL sanitization, and pooling options.
 */

export interface DatabaseConfig {
  configured: boolean;
  url: string;
  sanitizedUrl: string;
  maxConnections: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  ssl: boolean | { rejectUnauthorized: boolean } | undefined;
  requireDb: boolean;
}

/**
 * Strips user credentials and passwords from database URLs for safe logging.
 */
export function sanitizeDatabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  try {
    const parsed = new URL(rawUrl);
    if (parsed.password) {
      parsed.password = '****';
    }
    return parsed.toString();
  } catch {
    // If it doesn't parse as a standard URL, mask credentials matching regex
    return rawUrl.replace(/(:\/\/[^:]+:)([^@]+)(@)/, '$1****$3');
  }
}

/**
 * Reads, validates, and parses database connection configuration.
 */
export function getDatabaseConfig(): DatabaseConfig {
  let connectionString = (process.env.DATABASE_URL || '').trim();

  // Backward compatibility: assemble from SQL_* environment variables if DATABASE_URL is not set
  if (!connectionString && process.env.SQL_HOST && process.env.SQL_DB_NAME) {
    const user = encodeURIComponent(process.env.SQL_USER || 'postgres');
    const password = process.env.SQL_PASSWORD ? `:${encodeURIComponent(process.env.SQL_PASSWORD)}` : '';
    const host = process.env.SQL_HOST;
    const port = process.env.SQL_PORT || '5432';
    const dbName = process.env.SQL_DB_NAME;

    if (host.startsWith('/')) {
      // Unix domain socket (e.g., Google Cloud SQL Proxy socket)
      connectionString = `postgresql://${user}${password}@/${dbName}?host=${encodeURIComponent(host)}`;
    } else {
      connectionString = `postgresql://${user}${password}@${host}:${port}/${dbName}`;
    }
  }

  const isConfigured = Boolean(connectionString && connectionString.length > 0);
  const sanitized = isConfigured ? sanitizeDatabaseUrl(connectionString) : '';

  const requireDb = process.env.REQUIRE_DB === 'true';

  const sslEnabled =
    process.env.DB_SSL === 'true' ||
    connectionString.includes('sslmode=require') ||
    (process.env.NODE_ENV === 'production' &&
      !connectionString.includes('sslmode=disable') &&
      !connectionString.includes('localhost') &&
      !connectionString.includes('127.0.0.1'));

  return {
    configured: isConfigured,
    url: connectionString,
    sanitizedUrl: sanitized,
    maxConnections: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 10,
    idleTimeoutMillis: process.env.NODE_ENV === 'test' ? 1000 : 30000,
    connectionTimeoutMillis: 5000,
    ssl: sslEnabled
      ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
      : undefined,
    requireDb,
  };
}

export function isDatabaseConfigured(): boolean {
  return getDatabaseConfig().configured;
}
