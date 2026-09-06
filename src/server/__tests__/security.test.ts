/**
 * Nolyvatix Data Engine - Production Security Test Suite (SEC-02)
 * Tests CORS allowlisting, Security Headers, Rate Limiting tiers,
 * Error sanitization, and Request payload limits.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { Request, Response } from 'express';
import {
  isOriginAllowed,
  createCorsMiddleware,
  resolveAllowedOrigins,
} from '../middleware/corsMiddleware.ts';
import {
  createSecurityHeadersMiddleware,
} from '../middleware/securityHeadersMiddleware.ts';
import {
  InMemoryRateLimiter,
} from '../middleware/rateLimitMiddleware.ts';
import {
  globalErrorHandler,
} from '../middleware/responseWrapper.ts';
import { AppError } from '../utils/errors.ts';

// Helper to create mock Express Request/Response objects
function createMockContext(reqOverrides: Partial<Request> = {}, resOverrides: Partial<Response> = {}) {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let responseData: any = null;
  let ended = false;

  const req: Partial<Request> = {
    method: 'GET',
    path: '/api/ledgers',
    headers: {},
    ip: '192.168.1.100',
    socket: { remoteAddress: '192.168.1.100' } as any,
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
    end: () => {
      ended = true;
      return res as Response;
    },
    ...resOverrides,
  };

  return {
    req: req as Request,
    res: res as Response,
    getHeaders: () => headers,
    getStatusCode: () => statusCode,
    getResponseData: () => responseData,
    isEnded: () => ended,
  };
}

describe('SEC-02: CORS Policy & Allowlist', () => {
  const defaultOrigins = [
    'https://nolyvatix.io',
    'https://app.nolyvatix.io',
    'https://*.run.app',
  ];

  test('isOriginAllowed matches exact allowed origins', () => {
    assert.strictEqual(isOriginAllowed('https://nolyvatix.io', defaultOrigins), true);
    assert.strictEqual(isOriginAllowed('https://app.nolyvatix.io', defaultOrigins), true);
    assert.strictEqual(isOriginAllowed('https://evil-hacker.com', defaultOrigins), false);
  });

  test('isOriginAllowed correctly matches wildcard subdomains (*.run.app)', () => {
    assert.strictEqual(isOriginAllowed('https://nolyvatix-preview-xyz.run.app', defaultOrigins), true);
    assert.strictEqual(isOriginAllowed('https://my-app.aistudio.run.app', defaultOrigins), true);
    assert.strictEqual(isOriginAllowed('https://run.app.evil.com', defaultOrigins), false);
  });

  test('corsMiddleware sets specific Origin header (never wildcard "*") with credentials', (t, done) => {
    const middleware = createCorsMiddleware({
      allowedOrigins: ['https://nolyvatix.io'],
    });

    const ctx = createMockContext({
      headers: { origin: 'https://nolyvatix.io' },
    });

    middleware(ctx.req, ctx.res, () => {
      const headers = ctx.getHeaders();
      assert.strictEqual(headers['access-control-allow-origin'], 'https://nolyvatix.io');
      assert.strictEqual(headers['access-control-allow-credentials'], 'true');
      assert.notStrictEqual(headers['access-control-allow-origin'], '*');
      assert.ok(headers['access-control-allow-methods']);
      done();
    });
  });

  test('corsMiddleware cleanly rejects unauthorized preflight OPTIONS request with 403', () => {
    const middleware = createCorsMiddleware({
      allowedOrigins: ['https://nolyvatix.io'],
    });

    const ctx = createMockContext({
      method: 'OPTIONS',
      headers: { origin: 'https://attacker.site' },
    });

    middleware(ctx.req, ctx.res, () => {});

    assert.strictEqual(ctx.getStatusCode(), 403);
    assert.strictEqual(ctx.getResponseData()?.error?.code, 'CORS_ORIGIN_DENIED');
  });

  test('corsMiddleware handles valid OPTIONS preflight with 204 No Content', () => {
    const middleware = createCorsMiddleware({
      allowedOrigins: ['https://nolyvatix.io'],
    });

    const ctx = createMockContext({
      method: 'OPTIONS',
      headers: { origin: 'https://nolyvatix.io' },
    });

    middleware(ctx.req, ctx.res, () => {});

    assert.strictEqual(ctx.getStatusCode(), 204);
    assert.strictEqual(ctx.isEnded(), true);
  });
});

describe('SEC-02: Security Headers Middleware', () => {
  test('injects anti-sniffing, XSS protection, and referrer headers', (t, done) => {
    const middleware = createSecurityHeadersMiddleware({ enableHsts: false });
    const ctx = createMockContext();

    middleware(ctx.req, ctx.res, () => {
      const headers = ctx.getHeaders();
      assert.strictEqual(headers['x-content-type-options'], 'nosniff');
      assert.strictEqual(headers['x-xss-protection'], '0');
      assert.strictEqual(headers['referrer-policy'], 'strict-origin-when-cross-origin');
      assert.strictEqual(headers['x-dns-prefetch-control'], 'off');
      assert.strictEqual(headers['x-frame-options'], 'SAMEORIGIN');
      assert.ok(headers['x-request-id']);
      done();
    });
  });

  test('preserves incoming X-Request-Id if provided', (t, done) => {
    const middleware = createSecurityHeadersMiddleware();
    const ctx = createMockContext({
      headers: { 'x-request-id': 'custom-trace-uuid-12345' },
    });

    middleware(ctx.req, ctx.res, () => {
      assert.strictEqual(ctx.getHeaders()['x-request-id'], 'custom-trace-uuid-12345');
      done();
    });
  });

  test('does not enable HSTS when enableHsts is false (development mode)', (t, done) => {
    const middleware = createSecurityHeadersMiddleware({ enableHsts: false });
    const ctx = createMockContext();

    middleware(ctx.req, ctx.res, () => {
      assert.strictEqual(ctx.getHeaders()['strict-transport-security'], undefined);
      done();
    });
  });

  test('enables HSTS in production mode with secure transport', (t, done) => {
    const middleware = createSecurityHeadersMiddleware({ enableHsts: true });
    const ctx = createMockContext({ secure: true } as any);

    middleware(ctx.req, ctx.res, () => {
      assert.ok(ctx.getHeaders()['strict-transport-security']);
      assert.ok(ctx.getHeaders()['strict-transport-security'].includes('max-age=31536000'));
      done();
    });
  });
});

describe('SEC-02: Memory-Efficient Tiered Rate Limiting', () => {
  let limiter: InMemoryRateLimiter;

  beforeEach(() => {
    limiter = new InMemoryRateLimiter({
      name: 'test-limiter',
      windowMs: 5000,
      maxRequests: 3,
      message: 'Rate limit hit in test',
    });
  });

  afterEach(() => {
    limiter.destroy();
  });

  test('permits requests within quota and emits standard RateLimit headers', () => {
    const middleware = limiter.middleware();
    const ctx1 = createMockContext({ ip: '10.0.0.1' });
    let nextCalled1 = false;
    middleware(ctx1.req, ctx1.res, () => { nextCalled1 = true; });

    assert.strictEqual(nextCalled1, true);
    assert.strictEqual(ctx1.getHeaders()['ratelimit-limit'], '3');
    assert.strictEqual(ctx1.getHeaders()['ratelimit-remaining'], '2');

    const ctx2 = createMockContext({ ip: '10.0.0.1' });
    let nextCalled2 = false;
    middleware(ctx2.req, ctx2.res, () => { nextCalled2 = true; });

    assert.strictEqual(nextCalled2, true);
    assert.strictEqual(ctx2.getHeaders()['ratelimit-remaining'], '1');
  });

  test('blocks requests exceeding limit with 429 Too Many Requests and Retry-After', () => {
    const middleware = limiter.middleware();

    // Consume all 3 tokens
    for (let i = 0; i < 3; i++) {
      const ctx = createMockContext({ ip: '10.0.0.2' });
      middleware(ctx.req, ctx.res, () => {});
    }

    // 4th request must be rejected
    const blockedCtx = createMockContext({ ip: '10.0.0.2' });
    let blockedNextCalled = false;
    middleware(blockedCtx.req, blockedCtx.res, () => { blockedNextCalled = true; });

    assert.strictEqual(blockedNextCalled, false);
    assert.strictEqual(blockedCtx.getStatusCode(), 429);
    assert.strictEqual(blockedCtx.getResponseData()?.error?.code, 'RATE_LIMIT_EXCEEDED');
    assert.ok(blockedCtx.getHeaders()['retry-after']);
  });

  test('different client IPs have independent quotas', () => {
    const middleware = limiter.middleware();

    // Max out IP 10.0.0.3
    for (let i = 0; i < 3; i++) {
      const ctx = createMockContext({ ip: '10.0.0.3' });
      middleware(ctx.req, ctx.res, () => {});
    }

    // IP 10.0.0.4 should still succeed
    const freshCtx = createMockContext({ ip: '10.0.0.4' });
    let freshNextCalled = false;
    middleware(freshCtx.req, freshCtx.res, () => { freshNextCalled = true; });

    assert.strictEqual(freshNextCalled, true);
    assert.strictEqual(freshCtx.getStatusCode(), 200);
  });
});

describe('SEC-02: Error Response Sanitization & Payload Limits', () => {
  test('handles 413 Payload Too Large from body parser', () => {
    const ctx = createMockContext();
    const payloadError = new Error('request entity too large');
    (payloadError as any).type = 'entity.too.large';
    (payloadError as any).statusCode = 413;

    globalErrorHandler(payloadError, ctx.req, ctx.res, () => {});

    assert.strictEqual(ctx.getStatusCode(), 413);
    assert.strictEqual(ctx.getResponseData()?.error?.code, 'PAYLOAD_TOO_LARGE');
  });

  test('handles 400 Malformed JSON from body parser', () => {
    const ctx = createMockContext();
    const syntaxError = new SyntaxError('Unexpected token in JSON at position 12');
    (syntaxError as any).body = '{ invalid json';

    globalErrorHandler(syntaxError, ctx.req, ctx.res, () => {});

    assert.strictEqual(ctx.getStatusCode(), 400);
    assert.strictEqual(ctx.getResponseData()?.error?.code, 'INVALID_JSON');
  });

  test('sanitizes sensitive keys and internal paths in AppError details', () => {
    const ctx = createMockContext();
    const sensitiveError = new AppError('Operation failed', 400, 'OPERATION_FAILED', {
      userApiKey: 'secret_live_key_999',
      dbPassword: 'super_secret_pw',
      authSecret: 'jwt_signing_token',
      filePath: '/home/usr/src/server/repositories/secret.ts',
      publicInfo: 'valid_asset_code_USDC',
    });

    globalErrorHandler(sensitiveError, ctx.req, ctx.res, () => {});

    assert.strictEqual(ctx.getStatusCode(), 400);
    const details = ctx.getResponseData()?.error?.details;
    assert.strictEqual(details.userApiKey, '[REDACTED]');
    assert.strictEqual(details.dbPassword, '[REDACTED]');
    assert.strictEqual(details.authSecret, '[REDACTED]');
    assert.ok(!details.filePath.includes('/home/usr/src/server'));
    assert.strictEqual(details.publicInfo, 'valid_asset_code_USDC');
  });

  test('unhandled 500 error returns generic error message without stack traces', () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const ctx = createMockContext();
    const unexpectedError = new Error('Fatal database connection failed at postgres://user:secret@db.internal');

    globalErrorHandler(unexpectedError, ctx.req, ctx.res, () => {});

    process.env.NODE_ENV = origEnv;

    assert.strictEqual(ctx.getStatusCode(), 500);
    const data = ctx.getResponseData();
    assert.strictEqual(data.error?.code, 'INTERNAL_SERVER_ERROR');
    assert.strictEqual(data.error?.message, 'An unexpected error occurred in the Stellar Data Engine.');
    assert.strictEqual(data.error?.stack, undefined);
  });
});
