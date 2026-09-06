/**
 * Nolyvatix Data Engine - HTTP Security Headers Middleware
 * Protects against MIME sniffing, clickjacking, insecure referrer leakage,
 * protocol downgrade, and injects traceable request correlation IDs.
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface SecurityHeadersOptions {
  enableHsts?: boolean;
  hstsMaxAgeSeconds?: number;
  frameGuard?: 'SAMEORIGIN' | 'DENY' | 'ALLOW-FROM' | false;
  referrerPolicy?: string;
  enableRequestId?: boolean;
}

export function createSecurityHeadersMiddleware(customOptions?: Partial<SecurityHeadersOptions>) {
  const isProduction = process.env.NODE_ENV === 'production';

  const options: SecurityHeadersOptions = {
    // Only enable HSTS in production to preserve localhost development
    enableHsts: isProduction,
    hstsMaxAgeSeconds: 31536000, // 1 year
    frameGuard: 'SAMEORIGIN',
    referrerPolicy: 'strict-origin-when-cross-origin',
    enableRequestId: true,
    ...customOptions,
  };

  return (req: Request, res: Response, next: NextFunction): void => {
    // 1. MIME Sniffing Protection
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // 2. Referrer Policy
    res.setHeader('Referrer-Policy', options.referrerPolicy!);

    // 3. Modern XSS Filter standard (disables buggy legacy browser XSS filters per OWASP)
    res.setHeader('X-XSS-Protection', '0');

    // 4. DNS Prefetch Control
    res.setHeader('X-DNS-Prefetch-Control', 'off');

    // 5. Request Correlation ID
    if (options.enableRequestId) {
      const incomingId = req.headers['x-request-id'];
      const requestId =
        typeof incomingId === 'string' && incomingId.length > 0 && incomingId.length <= 64
          ? incomingId
          : crypto.randomUUID();

      (req as any).id = requestId;
      res.setHeader('X-Request-Id', requestId);
    }

    // 6. Strict Transport Security (HSTS)
    // NEVER enable for localhost development
    if (options.enableHsts && (isProduction || req.secure)) {
      res.setHeader(
        'Strict-Transport-Security',
        `max-age=${options.hstsMaxAgeSeconds}; includeSubDomains`
      );
    }

    // 7. Clickjacking Protection
    // In API responses, SAMEORIGIN protects endpoints while allowing container/preview wrappers
    if (options.frameGuard) {
      res.setHeader('X-Frame-Options', options.frameGuard);
    }

    // 8. Content Security Policy (relaxed frame-ancestors for cloud preview / developer iframe)
    res.setHeader(
      'Content-Security-Policy',
      "frame-ancestors 'self' https://*.google.com https://*.run.app https://ai.studio;"
    );

    next();
  };
}

export const securityHeadersMiddleware = createSecurityHeadersMiddleware();
