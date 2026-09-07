import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Load environment variables from .env file if present.
dotenv.config();

let connectionUrl = process.env.DATABASE_URL || '';

if (!connectionUrl && process.env.SQL_HOST && process.env.SQL_DB_NAME) {
  const user = encodeURIComponent(process.env.SQL_ADMIN_USER || process.env.SQL_USER || 'postgres');
  const password = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD
    ? `:${encodeURIComponent(process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD || '')}`
    : '';
  const host = process.env.SQL_HOST;
  const port = process.env.SQL_PORT || '5432';
  const dbName = process.env.SQL_DB_NAME;
  if (host.startsWith('/')) {
    connectionUrl = `postgresql://${user}${password}@/${dbName}?host=${encodeURIComponent(host)}`;
  } else {
    connectionUrl = `postgresql://${user}${password}@${host}:${port}/${dbName}`;
  }
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  schemaFilter: ['public'],
  dbCredentials: {
    url: connectionUrl || 'postgresql://placeholder:placeholder@localhost:5432/nolyvatix',
  },
  verbose: true,
  strict: true,
});

