/**
 * Nolyvatix Data Engine - Production-Grade CORS Middleware
 * Implements strict, configurable cross-origin resource sharing with allowlist validation,
 * preflight caching, and credential-safe headers.
 */

import { Request, Response, NextFunction } from 'express';
import { sendError } from './responseWrapper.ts';
import { Logger } from '../utils/logger.ts';

const logger = new Logger('CorsMiddleware');

export interface CorsOptions {
  allowedOrigins?: string[];
  allowCredentials?: boolean;
  allowedMethods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  maxAgeSeconds?: number;
}

/**
 * Parses comma-separated origin strings or returns default development origins
 */
export function resolveAllowedOrigins(): string[] {
  const envOrigins = process.env.CORS_ORIGINS;
  if (envOrigins) {
    return envOrigins
      .split(',')
      .map((o) => o.trim())
      .filter((o) => o.length > 0);
  }

  // Development defaults
  return [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ];
}

/**
 * Validates if an origin matches the configured allowlist.
 * Supports exact domain matches and wildcard subdomains (e.g., *.run.app or *.nolyvatix.io).
 */
export function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  if (!origin) return false;

  const normalizedOrigin = origin.toLowerCase().trim();

  // Allow same-origin localhost or 127.0.0.1 variations in development
  if (process.env.NODE_ENV !== 'production') {
    if (
      normalizedOrigin.startsWith('http://localhost:') ||
      normalizedOrigin.startsWith('http://127.0.0.1:') ||
      normalizedOrigin.startsWith('https://localhost:') ||
      normalizedOrigin.startsWith('https://127.0.0.1:')
    ) {
      return true;
    }
  }

  return allowedOrigins.some((allowed) => {
    const pattern = allowed.toLowerCase().trim();
    if (pattern === '*') {
      return true;
    }
    if (pattern === normalizedOrigin) {
      return true;
    }
    // Wildcard matching for subdomains: *.example.com
    if (pattern.startsWith('*.') || pattern.startsWith('https://*.')) {
      const baseDomain = pattern.replace(/^(https?:\/\/)?\*\./, '');
      const originHost = normalizedOrigin.replace(/^https?:\/\//, '').split(':')[0];
      return originHost.endsWith(`.${baseDomain}`) || originHost === baseDomain;
    }
    return false;
  });
}

/**
 * Creates the Express CORS middleware
 */
export function createCorsMiddleware(customOptions?: Partial<CorsOptions>) {
  const options: CorsOptions = {
    allowCredentials: true,
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Request-Id'],
    exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset', 'Retry-After', 'X-Request-Id'],
    maxAgeSeconds: 86400,
    ...customOptions,
  };

  return (req: Request, res: Response, next: NextFunction): void => {
    const requestOrigin = req.headers.origin;
    const allowedOrigins = options.allowedOrigins || resolveAllowedOrigins();

    // Direct server-to-server or non-browser requests without Origin header
    if (!requestOrigin) {
      return next();
    }

    const allowed = isOriginAllowed(requestOrigin, allowedOrigins);

    if (allowed) {
      // Reflect the specific allowed origin (NEVER '*' when credentials are true)
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);
      if (options.allowCredentials) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
      res.setHeader('Access-Control-Allow-Methods', options.allowedMethods!.join(', '));
      res.setHeader('Access-Control-Allow-Headers', options.allowedHeaders!.join(', '));
      res.setHeader('Access-Control-Expose-Headers', options.exposedHeaders!.join(', '));
      res.setHeader('Access-Control-Max-Age', String(options.maxAgeSeconds));
      res.setHeader('Vary', 'Origin');

      if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
      }

      return next();
    }

    // Origin is not allowed
    logger.warn(`Rejected CORS request from unauthorized origin: ${requestOrigin}`);

    if (req.method === 'OPTIONS') {
      sendError(res, 'CORS origin not allowed', 403, 'CORS_ORIGIN_DENIED');
      return;
    }

    // In production, reject unauthorized cross-origin API requests cleanly
    if (process.env.NODE_ENV === 'production') {
      sendError(res, 'Cross-Origin request forbidden: origin not in allowlist', 403, 'CORS_ORIGIN_DENIED');
      return;
    }

    // In non-production, continue without setting Access-Control headers
    next();
  };
}

export const corsMiddleware = createCorsMiddleware();
