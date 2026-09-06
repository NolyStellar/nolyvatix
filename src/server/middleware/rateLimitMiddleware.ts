/**
 * Nolyvatix Data Engine - Memory-Efficient Rate Limiting Middleware
 * Implements sliding-window counter rate limiting with per-route tiering,
 * standard RFC headers, and automatic cleanup.
 */

import { Request, Response, NextFunction } from 'express';
import { sendError } from './responseWrapper.ts';
import { Logger } from '../utils/logger.ts';

const logger = new Logger('RateLimiter');

interface RateLimitRecord {
  timestamps: number[];
}

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  name?: string;
  skip?: (req: Request) => boolean;
}

export class InMemoryRateLimiter {
  private store: Map<string, RateLimitRecord> = new Map();
  private cleanupTimer: NodeJS.Timeout | null = null;
  private options: Required<RateLimitOptions>;

  constructor(options: RateLimitOptions) {
    this.options = {
      windowMs: options.windowMs,
      maxRequests: options.maxRequests,
      message: options.message || 'Too many requests, please slow down.',
      name: options.name || 'default',
      skip: options.skip || (() => false),
    };

    // Periodically sweep expired keys every 60s
    this.cleanupTimer = setInterval(() => {
      this.prune();
    }, 60000);

    // Unref timer so it doesn't hold tests open
    if (this.cleanupTimer && typeof this.cleanupTimer.unref === 'function') {
      this.cleanupTimer.unref();
    }
  }

  public middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (process.env.RATE_LIMIT_ENABLED === 'false' || this.options.skip(req)) {
        return next();
      }

      const clientIp = (req.ip || req.socket.remoteAddress || '127.0.0.1').toString();
      const key = `${this.options.name}:${clientIp}`;
      const now = Date.now();
      const windowStart = now - this.options.windowMs;

      let record = this.store.get(key);
      if (!record) {
        record = { timestamps: [] };
        this.store.set(key, record);
      }

      // Filter timestamps within current sliding window
      record.timestamps = record.timestamps.filter((t) => t > windowStart);

      const currentCount = record.timestamps.length;
      const remaining = Math.max(0, this.options.maxRequests - currentCount - 1);
      const resetTimeSeconds = Math.ceil((this.options.windowMs - (now - (record.timestamps[0] || now))) / 1000);

      // Set standard RateLimit headers
      res.setHeader('RateLimit-Limit', String(this.options.maxRequests));
      res.setHeader('RateLimit-Remaining', String(remaining));
      res.setHeader('RateLimit-Reset', String(Math.max(1, resetTimeSeconds)));

      if (currentCount >= this.options.maxRequests) {
        logger.warn(`Rate limit exceeded for IP ${clientIp} on bucket [${this.options.name}] (${currentCount}/${this.options.maxRequests})`);
        res.setHeader('Retry-After', String(Math.max(1, resetTimeSeconds)));
        sendError(res, this.options.message, 429, 'RATE_LIMIT_EXCEEDED', {
          bucket: this.options.name,
          retryAfterSeconds: Math.max(1, resetTimeSeconds),
          maxRequests: this.options.maxRequests,
          windowSeconds: Math.floor(this.options.windowMs / 1000),
        });
        return;
      }

      record.timestamps.push(now);
      next();
    };
  }

  public prune(): void {
    const now = Date.now();
    const windowStart = now - this.options.windowMs;

    for (const [key, record] of this.store.entries()) {
      record.timestamps = record.timestamps.filter((t) => t > windowStart);
      if (record.timestamps.length === 0) {
        this.store.delete(key);
      }
    }
  }

  public reset(): void {
    this.store.clear();
  }

  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.store.clear();
  }
}

/**
 * Global API rate limiter (generous ceiling for normal dashboard polling)
 */
export const globalApiRateLimiter = new InMemoryRateLimiter({
  name: 'global-api',
  windowMs: Number(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS) || 60000,
  maxRequests: Number(process.env.RATE_LIMIT_GLOBAL_MAX) || 300,
  message: 'Global API rate limit exceeded. Please throttle your requests.',
  skip: (req) => {
    // Health checks and SSE streams are not subject to the global request count limit
    const path = req.path || '';
    return path.startsWith('/health') || path.startsWith('/stream');
  },
});

/**
 * AI Copilot rate limiter (protects expensive Gemini and LLM analysis endpoints)
 */
export const aiRateLimiter = new InMemoryRateLimiter({
  name: 'ai-copilot',
  windowMs: 60000,
  maxRequests: Number(process.env.RATE_LIMIT_AI_MAX) || 30,
  message: 'AI Copilot query limit reached. Please wait before generating additional reports or chat queries.',
});

/**
 * Soroban RPC & contract telemetry rate limiter
 */
export const sorobanRateLimiter = new InMemoryRateLimiter({
  name: 'soroban-rpc',
  windowMs: 60000,
  maxRequests: Number(process.env.RATE_LIMIT_SOROBAN_MAX) || 120,
  message: 'Soroban contract RPC rate limit exceeded. Please reduce querying frequency.',
});

/**
 * Universal Search rate limiter
 */
export const searchRateLimiter = new InMemoryRateLimiter({
  name: 'search',
  windowMs: 60000,
  maxRequests: Number(process.env.RATE_LIMIT_SEARCH_MAX) || 60,
  message: 'Search query rate limit exceeded. Please wait a moment.',
});
