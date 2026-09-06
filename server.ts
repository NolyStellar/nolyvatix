/**
 * Nolyvatix Main Express Server
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initializeDataEngine } from './src/server/dataEngine.js';
import { globalErrorHandler } from './src/server/middleware/responseWrapper.js';
import { corsMiddleware } from './src/server/middleware/corsMiddleware.js';
import { securityHeadersMiddleware } from './src/server/middleware/securityHeadersMiddleware.js';
import { globalApiRateLimiter } from './src/server/middleware/rateLimitMiddleware.js';
import { logger } from './src/server/utils/logger.js';

async function startServer(): Promise<void> {
  const app = express();
  const PORT = 3000;

  // 1. Trust Proxy Configuration
  // Configured to trust the first upstream hop (Cloud Run / nginx ingress reverse proxy).
  // Ensures accurate client IP extraction for rate limiting and secure protocol identification.
  app.set('trust proxy', 1);

  // 2. Disable Express fingerprinting
  app.disable('x-powered-by');

  // 3. Security Headers (MIME sniffing, XSS, HSTS, frame-ancestors, Request ID)
  app.use(securityHeadersMiddleware);

  // 4. Production-safe CORS with allowlist, credentials, and preflight handling
  app.use(corsMiddleware);

  // 5. Explicit Request Body Limits (prevents unbounded payload DoS attacks)
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 6. Global API Rate Limiting (protects backend while skipping health checks and SSE)
  app.use('/api', globalApiRateLimiter.middleware());

  // 7. Initialize Stellar Data Engine & mount API routes
  const dataEngine = initializeDataEngine();
  app.use('/api', dataEngine.apiRouter);

  // Vite Middleware for Dev / Static fallback for Prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global Error Handler Middleware
  app.use(globalErrorHandler);

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Nolyvatix Express Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  logger.error('Failed to start server:', { error: err });
  process.exit(1);
});
