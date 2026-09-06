/**
 * Nolyvatix Data Engine - API Response Wrapper & Global Error Handler Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { ApiResponse, ApiPaginatedResponse } from '../types/stellar.js';
import { AppError } from '../utils/errors.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('ResponseWrapper');

export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

export const formatSuccessResponse = createSuccessResponse;

export function createPaginatedResponse<T>(
  data: T[],
  pagination: {
    cursor?: string;
    nextCursor?: string;
    prevCursor?: string;
    limit: number;
    hasMore: boolean;
  }
): ApiPaginatedResponse<T> {
  return {
    success: true,
    data,
    pagination,
    timestamp: new Date().toISOString(),
  };
}

export function createErrorResponse(code: string, message: string, details?: unknown): ApiResponse<never> {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
  };
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json(createSuccessResponse(data));
}

export function sendError(res: Response, message: string, statusCode = 400, code = 'ERROR', details?: unknown): void {
  const resolvedCode = statusCode === 404 ? 'NOT_FOUND' : code;
  res.status(statusCode).json(createErrorResponse(resolvedCode, message, details));
}

/**
 * Sanitizes details objects to prevent leaking credentials, connection strings, or system paths
 */
function sanitizeErrorDetails(details: unknown): unknown {
  if (!details || typeof details !== 'object') {
    return details;
  }

  if (Array.isArray(details)) {
    return details.map(sanitizeErrorDetails);
  }

  const sensitiveKeyPatterns = [/secret/i, /key/i, /token/i, /password/i, /credential/i, /conn/i, /auth/i];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(details as Record<string, unknown>)) {
    const isSensitive = sensitiveKeyPatterns.some((p) => p.test(key));
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string') {
      // Strip internal filesystem paths
      sanitized[key] = value.replace(/(\/|\b)(node_modules|src\/server|home|usr)[\w/-]+/g, '[REDACTED_PATH]');
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeErrorDetails(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export function globalErrorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 1. Request payload exceeds size limit (from express body-parser)
  if (err?.type === 'entity.too.large' || err?.statusCode === 413) {
    logger.warn('Request body rejected: payload too large');
    res.status(413).json(createErrorResponse('PAYLOAD_TOO_LARGE', 'Request payload exceeds maximum allowed size (1MB).'));
    return;
  }

  // 2. Malformed JSON syntax error in body
  if (err instanceof SyntaxError && 'body' in err) {
    logger.warn('Request body rejected: malformed JSON syntax');
    res.status(400).json(createErrorResponse('INVALID_JSON', 'Malformed JSON in request payload.'));
    return;
  }

  // 3. Known domain AppError
  if (err instanceof AppError) {
    logger.warn(`AppError [${err.errorCode}]: ${err.message}`, { statusCode: err.statusCode, details: err.details });
    const sanitizedDetails = sanitizeErrorDetails(err.details);
    res.status(err.statusCode).json(createErrorResponse(err.errorCode, err.message, sanitizedDetails));
    return;
  }

  // 4. Unhandled server exception
  logger.error(`Unhandled Exception: ${err?.message || err}`, { stack: err?.stack });

  // In production, strictly avoid exposing internal details, message contents, or stack traces
  const isProduction = process.env.NODE_ENV === 'production';
  const errorMessage = isProduction
    ? 'An unexpected error occurred in the Stellar Data Engine.'
    : err?.message || 'An unexpected error occurred in the Stellar Data Engine.';

  res.status(500).json(createErrorResponse('INTERNAL_SERVER_ERROR', errorMessage));
}
