/**
 * Nolyvatix Data Engine - Soroban Routes (/api/soroban)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { SorobanService } from '../services/sorobanService.ts';
import { createSuccessResponse } from '../middleware/responseWrapper.ts';
import { ValidationError } from '../utils/errors.ts';

export function createSorobanRouter(sorobanService: SorobanService): Router {
  const router = Router();

  /**
   * GET /api/soroban/health
   */
  router.get('/health', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const health = await sorobanService.getHealth();
      res.json(createSuccessResponse(health));
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/soroban/events
   */
  router.get('/events', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contractId = req.query.contractId as string | undefined;
      const parsedLedger = req.query.startLedger ? parseInt(req.query.startLedger as string, 10) : undefined;
      const startLedger = parsedLedger && !isNaN(parsedLedger) && parsedLedger > 0 ? parsedLedger : undefined;

      const events = await sorobanService.getSorobanEvents(contractId, startLedger);
      res.json(createSuccessResponse(events));
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/soroban/contracts/:contractId
   */
  router.get('/contracts/:contractId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contractId = req.params.contractId;
      if (!contractId || contractId.length < 10) {
        throw new ValidationError('Invalid Soroban Contract ID');
      }

      const summary = await sorobanService.getContractSummary(contractId);
      res.json(createSuccessResponse(summary));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
