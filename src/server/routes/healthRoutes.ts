/**
 * Nolyvatix Data Engine - Health & Telemetry Metrics Routes
 * Exposes detailed operational diagnostics, Horizon & Soroban latency, cache ratios, and event bus stats.
 */

import { Router, Request, Response } from 'express';
import { StellarHorizonClient } from '../services/stellar/horizonClient.js';
import { SorobanClient } from '../clients/sorobanClient.js';
import { StellarCache } from '../cache/stellarCache.js';
import { StellarEventBus } from '../services/stellar/stellarEventBus.js';
import { formatSuccessResponse } from '../middleware/responseWrapper.js';
import { checkDatabaseHealth } from '../../db/index.ts';

export function createHealthRouter(
  horizonClient: StellarHorizonClient,
  sorobanClient: SorobanClient,
  cache: StellarCache,
  eventBus: StellarEventBus,
  isShuttingDown?: () => boolean
): Router {
  const router = Router();
  const startTime = Date.now();

  /**
   * Basic Liveness Check
   * GET /api/health
   * Confirms the Express process is active and accepting connections.
   */
  router.get('/', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'Nolyvatix Stellar Data Layer',
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Application Readiness Probe
   * GET /api/health/ready
   * Determines whether the instance is ready to receive client traffic.
   * Responds with 503 if:
   * - Server is undergoing graceful shutdown
   * - REQUIRE_DB=true and PostgreSQL database is unavailable
   * Does NOT leak sensitive database credentials or infrastructure details.
   */
  router.get('/ready', async (_req: Request, res: Response) => {
    if (isShuttingDown?.()) {
      res.status(503).json({
        status: 'not_ready',
        reason: 'Server is currently shutting down',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const requireDb = process.env.REQUIRE_DB === 'true';
    const dbHealth = await checkDatabaseHealth();

    if (requireDb && dbHealth.status !== 'healthy') {
      res.status(503).json({
        status: 'not_ready',
        reason: 'Database required but unavailable',
        database: {
          status: dbHealth.status,
          mode: dbHealth.mode,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(200).json({
      status: 'ready',
      service: 'Nolyvatix Stellar Data Layer',
      database: {
        status: dbHealth.status,
        mode: dbHealth.mode,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Detailed Health & System Metrics
   * GET /api/health/detailed
   */
  router.get('/detailed', async (_req: Request, res: Response) => {
    const horizonStats = horizonClient.getHealthStats();
    const sorobanStats = sorobanClient.getHealthStats();
    const cacheMetrics = cache.getMetrics();
    const eventBusMetrics = eventBus.getMetrics();
    const dbHealth = await checkDatabaseHealth();

    const overallStatus: 'healthy' | 'degraded' | 'down' =
      horizonStats.status === 'healthy' && sorobanStats.status === 'healthy' && dbHealth.status !== 'unavailable'
        ? 'healthy'
        : (horizonStats.status === 'down' && sorobanStats.status === 'down') || dbHealth.status === 'unavailable'
        ? 'down'
        : 'degraded';

    const detailedMetrics = {
      status: overallStatus,
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
      network: horizonClient.getNetwork(),
      services: {
        database: {
          status: dbHealth.status,
          mode: dbHealth.mode,
          configured: dbHealth.configured,
          connected: dbHealth.connected,
          latencyMs: dbHealth.latencyMs,
          pool: dbHealth.pool,
          error: dbHealth.error,
        },
        horizon: {
          status: horizonStats.status,
          endpoint: horizonStats.endpoint,
          latencyMs: horizonStats.latencyMs,
          totalRequests: horizonStats.totalRequests,
          successfulRequests: horizonStats.successfulRequests,
          failedRequests: horizonStats.failedRequests,
          errorRate: horizonStats.errorRate,
          lastSuccessfulPing: horizonStats.lastSuccessfulPing,
          consecutiveErrors: horizonStats.consecutiveErrors,
        },
        sorobanRpc: {
          status: sorobanStats.status,
          endpoint: sorobanStats.endpoint,
          latencyMs: sorobanStats.latencyMs,
          totalCalls: sorobanStats.totalCalls,
          successfulCalls: sorobanStats.successfulCalls,
          failedCalls: sorobanStats.failedCalls,
          errorRate: sorobanStats.errorRate,
          lastSuccessfulPing: sorobanStats.lastSuccessfulPing,
        },
      },
      cache: cacheMetrics,
      eventBus: eventBusMetrics,
      timestamp: new Date().toISOString(),
    };

    res.json(formatSuccessResponse(detailedMetrics));
  });

  return router;
}
