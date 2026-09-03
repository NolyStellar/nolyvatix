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

export function createHealthRouter(
  horizonClient: StellarHorizonClient,
  sorobanClient: SorobanClient,
  cache: StellarCache,
  eventBus: StellarEventBus
): Router {
  const router = Router();
  const startTime = Date.now();

  /**
   * Basic Health Check
   * GET /api/health
   */
  router.get('/', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'Nolyvatix Stellar Data Layer',
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

    const overallStatus: 'healthy' | 'degraded' | 'down' =
      horizonStats.status === 'healthy' && sorobanStats.status === 'healthy'
        ? 'healthy'
        : horizonStats.status === 'down' && sorobanStats.status === 'down'
        ? 'down'
        : 'degraded';

    const detailedMetrics = {
      status: overallStatus,
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
      network: horizonClient.getNetwork(),
      services: {
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
