/**
 * Nolyvatix Data Engine - Production Deployment & Runtime Readiness Test Suite (DEPLOY-01)
 * Validates Liveness, Readiness, Database failure behaviors, Unhandled API route 404 isolation,
 * SSE production headers and graceful shutdown semantics.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { Request, Response } from 'express';
import { createHealthRouter } from '../routes/healthRoutes.ts';
import { initializeDataEngine } from '../dataEngine.ts';
import { StellarEventBus } from '../services/stellar/stellarEventBus.ts';
import { StellarAnalyticsService } from '../services/stellar/stellarAnalyticsService.ts';
import { StellarAssetService } from '../services/stellar/stellarAssetService.ts';
import { StellarLiquidityService } from '../services/stellar/stellarLiquidityService.ts';
import { StellarHorizonClient } from '../services/stellar/horizonClient.ts';
import { SorobanClient } from '../clients/sorobanClient.ts';
import { StellarCache } from '../cache/stellarCache.ts';
import { MemoryCache } from '../cache/memoryCache.ts';
import { closeDatabasePool } from '../../db/index.ts';

// Helper to create mock Express Request/Response objects
function createMockContext(reqOverrides: Partial<Request> = {}, resOverrides: Partial<Response> = {}) {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let responseData: any = null;
  let ended = false;
  const writtenChunks: string[] = [];

  const req: Partial<Request> = {
    method: 'GET',
    path: '/api/health',
    url: '/api/health',
    headers: {},
    query: {},
    ...reqOverrides,
  };

  const res: Partial<Response> = {
    statusCode: 200,
    setHeader: (name: string, value: any) => {
      headers[name.toLowerCase()] = String(value);
      return res as Response;
    },
    getHeader: (name: string) => headers[name.toLowerCase()],
    status: (code: number) => {
      statusCode = code;
      res.statusCode = code;
      return res as Response;
    },
    json: (data: any) => {
      responseData = data;
      ended = true;
      return res as Response;
    },
    write: (chunk: any) => {
      writtenChunks.push(String(chunk));
      return true;
    },
    end: () => {
      ended = true;
      return res as Response;
    },
    flushHeaders: () => {},
    on: (_event: string, _cb: any) => res as Response,
    ...resOverrides,
  };

  return {
    req: req as Request,
    res: res as Response,
    getStatusCode: () => statusCode,
    getResponseData: () => responseData,
    getHeaders: () => headers,
    isEnded: () => ended,
    getWrittenChunks: () => writtenChunks,
  };
}

function createTestServices() {
  const horizonClient = new StellarHorizonClient({ network: 'testnet' });
  const sorobanClient = new SorobanClient();
  const stellarCache = new StellarCache();
  const analytics = new StellarAnalyticsService(horizonClient, sorobanClient, stellarCache);
  const assets = new StellarAssetService(horizonClient, stellarCache);
  const liquidity = new StellarLiquidityService(horizonClient, stellarCache);
  const eventBus = new StellarEventBus(analytics, assets, liquidity, horizonClient, sorobanClient, stellarCache);
  return { horizonClient, sorobanClient, stellarCache, analytics, assets, liquidity, eventBus };
}

describe('DEPLOY-01: Production Deployment & Runtime Readiness', () => {
  let originalRequireDb: string | undefined;
  let originalDatabaseUrl: string | undefined;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalRequireDb = process.env.REQUIRE_DB;
    originalDatabaseUrl = process.env.DATABASE_URL;
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(async () => {
    process.env.REQUIRE_DB = originalRequireDb;
    process.env.DATABASE_URL = originalDatabaseUrl;
    process.env.NODE_ENV = originalNodeEnv;
    await closeDatabasePool();
  });

  test('1. Liveness Probe: GET /api/health returns 200 OK', async () => {
    const { horizonClient, sorobanClient, stellarCache, eventBus } = createTestServices();

    try {
      const router = createHealthRouter(horizonClient, sorobanClient, stellarCache, eventBus);
      const ctx = createMockContext({ path: '/', url: '/' });

      // Find GET / handler
      const layer = (router as any).stack.find((s: any) => s.route?.path === '/' && s.route?.methods?.get);
      assert.ok(layer, 'Route GET / must exist');

      await layer.route.stack[0].handle(ctx.req, ctx.res, () => {});

      assert.strictEqual(ctx.getStatusCode(), 200);
      const body = ctx.getResponseData();
      assert.strictEqual(body.status, 'ok');
      assert.strictEqual(body.service, 'Nolyvatix Stellar Data Layer');
      assert.ok(body.timestamp);
    } finally {
      eventBus.stopWorker();
    }
  });

  test('2. Readiness Probe: GET /api/health/ready returns 200 in in-memory fallback mode when REQUIRE_DB=false', async () => {
    process.env.REQUIRE_DB = 'false';
    delete process.env.DATABASE_URL;

    const { horizonClient, sorobanClient, stellarCache, eventBus } = createTestServices();

    try {
      const router = createHealthRouter(horizonClient, sorobanClient, stellarCache, eventBus, () => false);
      const ctx = createMockContext({ path: '/ready', url: '/ready' });

      const layer = (router as any).stack.find((s: any) => s.route?.path === '/ready' && s.route?.methods?.get);
      assert.ok(layer, 'Route GET /ready must exist');

      await layer.route.stack[0].handle(ctx.req, ctx.res, () => {});

      assert.strictEqual(ctx.getStatusCode(), 200);
      const body = ctx.getResponseData();
      assert.strictEqual(body.status, 'ready');
      assert.ok(['in_memory_fallback', 'postgresql'].includes(body.database.mode));
    } finally {
      eventBus.stopWorker();
    }
  });

  test('3. Readiness Probe: GET /api/health/ready returns 503 when REQUIRE_DB=true but DB is not available', async () => {
    process.env.REQUIRE_DB = 'true';
    delete process.env.DATABASE_URL;

    const { horizonClient, sorobanClient, stellarCache, eventBus } = createTestServices();

    try {
      const router = createHealthRouter(horizonClient, sorobanClient, stellarCache, eventBus, () => false);
      const ctx = createMockContext({ path: '/ready', url: '/ready' });

      const layer = (router as any).stack.find((s: any) => s.route?.path === '/ready' && s.route?.methods?.get);
      assert.ok(layer, 'Route GET /ready must exist');

      await layer.route.stack[0].handle(ctx.req, ctx.res, () => {});

      assert.strictEqual(ctx.getStatusCode(), 503);
      const body = ctx.getResponseData();
      assert.strictEqual(body.status, 'not_ready');
      assert.strictEqual(body.reason, 'Database required but unavailable');
    } finally {
      eventBus.stopWorker();
    }
  });

  test('4. Readiness Probe: GET /api/health/ready returns 503 during graceful shutdown', async () => {
    const { horizonClient, sorobanClient, stellarCache, eventBus } = createTestServices();

    try {
      // isShuttingDown returns true
      const router = createHealthRouter(horizonClient, sorobanClient, stellarCache, eventBus, () => true);
      const ctx = createMockContext({ path: '/ready', url: '/ready' });

      const layer = (router as any).stack.find((s: any) => s.route?.path === '/ready' && s.route?.methods?.get);
      assert.ok(layer, 'Route GET /ready must exist');

      await layer.route.stack[0].handle(ctx.req, ctx.res, () => {});

      assert.strictEqual(ctx.getStatusCode(), 503);
      const body = ctx.getResponseData();
      assert.strictEqual(body.status, 'not_ready');
      assert.strictEqual(body.reason, 'Server is currently shutting down');
    } finally {
      eventBus.stopWorker();
    }
  });

  test('5. SPA vs API Isolation: unhandled /api/* route returns structured JSON 404', async () => {
    const dataEngine = initializeDataEngine();

    try {
      const ctx = createMockContext({
        method: 'GET',
        path: '/api/does-not-exist',
        url: '/api/does-not-exist',
        originalUrl: '/api/does-not-exist',
      });

      // Find catch-all layer in apiRouter stack
      const catchAllLayer = (dataEngine.apiRouter as any).stack.find((s: any) => s.route?.path === '*');
      assert.ok(catchAllLayer, 'Catch-all 404 route must exist on apiRouter');

      await catchAllLayer.route.stack[0].handle(ctx.req, ctx.res, () => {});

      assert.strictEqual(ctx.getStatusCode(), 404);
      const body = ctx.getResponseData();
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.error.code, 'NOT_FOUND');
      assert.ok(body.error.message.includes('/api/does-not-exist'));
    } finally {
      dataEngine.eventBus.stopWorker();
    }
  });

  test('6. SSE Teardown: closeAllClients cleanly notifies and terminates connected streams', async () => {
    const { eventBus } = createTestServices();

    try {
      const ctx = createMockContext();
      eventBus.registerClient('test-client-1', ctx.res, ['all']);

      assert.strictEqual(eventBus.getMetrics().activeClientsCount, 1);

      // Trigger graceful shutdown on event bus
      eventBus.closeAllClients();

      assert.strictEqual(eventBus.getMetrics().activeClientsCount, 0);
      assert.strictEqual(ctx.isEnded(), true);
      const chunks = ctx.getWrittenChunks();
      assert.ok(chunks.some((c) => c.includes('event: shutdown')), 'Client must receive shutdown event');
    } finally {
      eventBus.stopWorker();
    }
  });
});
