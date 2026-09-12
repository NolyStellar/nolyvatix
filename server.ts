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
import { closeDatabasePool } from './src/db/index.js';

let isShuttingDown = false;

export function getIsShuttingDown(): boolean {
  return isShuttingDown;
}

async function startServer(): Promise<void> {
  const app = express();
  const PORT = Number(process.env.APP_PORT) || 3000;

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
  const dataEngine = initializeDataEngine(undefined, undefined, undefined, {
    isShuttingDown: () => isShuttingDown,
  });
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

  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Nolyvatix Express Server running on http://0.0.0.0:${PORT}`);
  });

  // Graceful Shutdown Handler (SIGTERM & SIGINT)
  const shutdown = (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`Received ${signal}. Initiating orderly graceful shutdown...`);

    // 1. Stop accepting new HTTP connections
    server.close((err) => {
      if (err) {
        logger.error('Error while closing HTTP server listener:', { error: err });
      } else {
        logger.info('HTTP listener closed.');
      }
    });

    // 2. Stop event bus worker and disconnect active SSE clients
    try {
      dataEngine.eventBus.stopWorker();
      dataEngine.eventBus.closeAllClients();
      logger.info('Event bus background workers stopped and SSE clients drained.');
    } catch (err) {
      logger.warn('Error during event bus shutdown:', { error: err });
    }

    // 3. Close PostgreSQL pool
    closeDatabasePool()
      .then(() => {
        logger.info('Database connection pool closed successfully.');
      })
      .catch((err) => {
        logger.warn('Error closing database connection pool:', { error: err });
      })
      .finally(() => {
        logger.info('Graceful shutdown completed successfully. Exiting process.');
        process.exit(0);
      });

    // 4. Force exit timeout after 10s if graceful shutdown hangs
    const forceExitTimer = setTimeout(() => {
      logger.error('Graceful shutdown timed out after 10s. Forcing process exit.');
      process.exit(1);
    }, 10000);
    forceExitTimer.unref();
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((err) => {
  logger.error('Failed to start server:', { error: err });
  process.exit(1);
});
