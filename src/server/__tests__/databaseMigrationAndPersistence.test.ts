/**
 * DB-01: Nolyvatix Database Migration, Configuration & Persistence Lifecycle Tests
 */

import { test, describe, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  sanitizeDatabaseUrl,
  getDatabaseConfig,
  isDatabaseConfigured,
} from '../../db/config.ts';
import {
  checkDatabaseHealth,
  closeDatabasePool,
  users,
  dashboards,
  reports,
  alertRules,
  bookmarks,
  savedSearches,
  workspacePreferences,
  aiConversations,
  exportedReports,
  webhookConfigurations,
  notificationHistory,
} from '../../db/index.ts';

describe('DB-01: Database Configuration & URL Sanitization', () => {
  test('sanitizeDatabaseUrl should mask plaintext passwords in standard connection strings', () => {
    const raw = 'postgresql://myuser:supersecretpassword@db.example.com:5432/nolyvatix_db';
    const sanitized = sanitizeDatabaseUrl(raw);

    assert.ok(!sanitized.includes('supersecretpassword'), 'Sanitized URL must not leak password');
    assert.ok(sanitized.includes('****'), 'Sanitized URL must replace password with asterisks');
    assert.ok(sanitized.includes('myuser'), 'Username should be preserved');
    assert.ok(sanitized.includes('db.example.com:5432'), 'Host and port should be preserved');
    assert.ok(sanitized.includes('nolyvatix_db'), 'Database name should be preserved');
  });

  test('sanitizeDatabaseUrl should handle Unix socket URLs safely without credential exposure', () => {
    const raw = 'postgresql://ai_studio_user:mySecretPass123@/cloud_sql_db?host=%2Fapp%2Fcloudsql%2Finstance';
    const sanitized = sanitizeDatabaseUrl(raw);

    assert.ok(!sanitized.includes('mySecretPass123'), 'Sanitized Unix socket URL must not leak password');
    assert.ok(sanitized.includes('****'), 'Sanitized Unix socket URL must mask password');
  });

  test('sanitizeDatabaseUrl should return empty string for empty input', () => {
    assert.strictEqual(sanitizeDatabaseUrl(''), '');
  });

  test('getDatabaseConfig should return structured configuration object', () => {
    const config = getDatabaseConfig();

    assert.strictEqual(typeof config.configured, 'boolean');
    assert.strictEqual(typeof config.url, 'string');
    assert.strictEqual(typeof config.sanitizedUrl, 'string');
    assert.strictEqual(typeof config.maxConnections, 'number');
    assert.ok(config.maxConnections > 0);
    assert.strictEqual(typeof config.requireDb, 'boolean');

    if (config.configured) {
      assert.ok(!config.sanitizedUrl.includes(process.env.SQL_PASSWORD || 'unlikely_pass'));
    }
  });

  test('isDatabaseConfigured matches config.configured', () => {
    const config = getDatabaseConfig();
    assert.strictEqual(isDatabaseConfigured(), config.configured);
  });
});

describe('DB-01: Health Check Database Diagnostic', () => {
  test('checkDatabaseHealth should return valid status report without credential leaks', async () => {
    const health = await checkDatabaseHealth();

    assert.ok(['healthy', 'unavailable', 'not_configured'].includes(health.status));
    assert.ok(['postgresql', 'in_memory_fallback'].includes(health.mode));
    assert.strictEqual(typeof health.configured, 'boolean');
    assert.strictEqual(typeof health.connected, 'boolean');

    if (health.error) {
      assert.ok(!health.error.includes(process.env.SQL_PASSWORD || 'secret'));
    }

    if (health.connected) {
      assert.strictEqual(health.status, 'healthy');
      assert.strictEqual(health.mode, 'postgresql');
      assert.strictEqual(typeof health.latencyMs, 'number');
      assert.ok(health.latencyMs >= 0);
      assert.ok(health.pool !== undefined);
    }
  });
});

describe('DB-01: Schema Integrity & Drizzle Table Definitions', () => {
  test('All 11 production tables are defined in schema', () => {
    const definedTables = [
      users,
      dashboards,
      reports,
      alertRules,
      bookmarks,
      savedSearches,
      workspacePreferences,
      aiConversations,
      exportedReports,
      webhookConfigurations,
      notificationHistory,
    ];

    assert.strictEqual(definedTables.length, 11, 'Exactly 11 core tables must be defined');
    for (const table of definedTables) {
      assert.ok(table !== undefined, 'Each table schema must be exported and valid');
    }
  });

  test('Migration artifact folder exists and contains valid journal', () => {
    const drizzleDir = path.resolve(process.cwd(), 'drizzle');
    assert.ok(fs.existsSync(drizzleDir), 'drizzle folder must exist');

    const journalPath = path.join(drizzleDir, 'meta', '_journal.json');
    assert.ok(fs.existsSync(journalPath), 'Migration journal must exist');

    const journalContent = JSON.parse(fs.readFileSync(journalPath, 'utf8'));
    assert.ok(Array.isArray(journalContent.entries), 'Journal entries must be an array');
    assert.ok(journalContent.entries.length >= 1, 'At least one migration entry must exist');

    const firstEntry = journalContent.entries[0];
    const migrationFilePath = path.join(drizzleDir, `${firstEntry.tag}.sql`);
    assert.ok(fs.existsSync(migrationFilePath), `Migration file ${firstEntry.tag}.sql must exist`);

    const sqlContent = fs.readFileSync(migrationFilePath, 'utf8');
    assert.ok(sqlContent.includes('CREATE TABLE IF NOT EXISTS "users"'));
    assert.ok(sqlContent.includes('CREATE TABLE IF NOT EXISTS "dashboards"'));
    assert.ok(sqlContent.includes('CREATE TABLE IF NOT EXISTS "reports"'));
    assert.ok(sqlContent.includes('CREATE TABLE IF NOT EXISTS "alert_rules"'));
  });

  after(async () => {
    await closeDatabasePool();
  });
});

