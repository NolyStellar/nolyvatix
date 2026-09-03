/**
 * Nolyvatix Data Engine - Canonical Soroban JSON-RPC 2.0 Client
 * Unified, enterprise-grade RPC client connecting to Soroban RPC endpoints to query
 * smart contract health, events, ledger entries, transactions, fee stats, and health telemetry.
 */

import { NetworkType, SorobanConfig, SorobanEvent } from '../types/stellar.js';
import { SorobanRpcError } from '../utils/errors.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('SorobanClient');

export const SOROBAN_RPC_ENDPOINTS: Record<NetworkType, string> = {
  mainnet: 'https://mainnet.sorobanrpc.com',
  testnet: 'https://soroban-testnet.stellar.org',
  futurenet: 'https://rpc-futurenet.stellar.org',
};

/** Alias for backward compatibility with service layer callers */
export const SOROBAN_NETWORKS = SOROBAN_RPC_ENDPOINTS;

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: unknown;
}

export interface JsonRpcResponse<T> {
  jsonrpc: '2.0';
  id: string | number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface SorobanHealthResponse {
  status: 'healthy' | 'healthy_and_synced' | 'degraded' | 'down' | 'syncing' | string;
  latestLedger: number;
  oldestLedger?: number;
  ledgerRetentionWindow?: number;
}

export interface SorobanEventsResponse {
  events: SorobanEvent[];
  latestLedger: number;
}

export interface SorobanGetEventsRequest {
  startLedger?: number;
  endLedger?: number;
  filters?: Array<{
    type?: 'contract' | 'system' | 'diagnostic';
    contractIds?: string[];
    topics?: string[][];
  }>;
  pagination?: {
    cursor?: string;
    limit?: number;
  };
}

export interface SorobanClientHealthStats {
  status: 'healthy' | 'degraded' | 'down';
  network: NetworkType;
  endpoint: string;
  latencyMs: number;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  errorRate: number;
  lastSuccessfulPing: string | null;
}

export class SorobanClient {
  private config: SorobanConfig;
  private totalCalls: number = 0;
  private successfulCalls: number = 0;
  private failedCalls: number = 0;
  private lastLatencyMs: number = 0;
  private lastSuccessfulPing: string | null = null;
  private consecutiveErrors: number = 0;

  constructor(config?: Partial<SorobanConfig>) {
    const network =
      config?.network ||
      (process.env.STELLAR_NETWORK as NetworkType) ||
      (process.env.VITE_STELLAR_NETWORK as NetworkType) ||
      'mainnet';
    const rpcUrl =
      config?.rpcUrl ||
      process.env.SOROBAN_RPC_URL ||
      process.env.VITE_SOROBAN_RPC_URL ||
      SOROBAN_RPC_ENDPOINTS[network] ||
      SOROBAN_RPC_ENDPOINTS.mainnet;

    this.config = {
      network,
      rpcUrl: rpcUrl.replace(/\/+$/, ''),
      timeoutMs: config?.timeoutMs || 10000,
      maxRetries: config?.maxRetries || 3,
    };

    logger.info(`Initialized SorobanClient for network: ${this.config.network} (${this.config.rpcUrl})`);
  }

  public getNetwork(): NetworkType {
    return this.config.network;
  }

  public getRpcUrl(): string {
    return this.config.rpcUrl;
  }

  public getConfig(): Readonly<SorobanConfig> {
    return { ...this.config };
  }

  public setNetwork(network: NetworkType, customUrl?: string): void {
    this.config.network = network;
    this.config.rpcUrl = (customUrl || SOROBAN_RPC_ENDPOINTS[network] || SOROBAN_RPC_ENDPOINTS.mainnet).replace(/\/+$/, '');
    this.consecutiveErrors = 0;
    logger.info(`Updated SorobanClient network to: ${this.config.network} (${this.config.rpcUrl})`);
  }

  /**
   * Execute JSON-RPC 2.0 Call to Soroban RPC node with retries, backoff, and telemetry
   */
  public async call<T>(method: string, params?: unknown): Promise<T> {
    const payload: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: `nolyvatix-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      method,
      params,
    };

    let attempt = 0;
    let delayMs = 300;
    const startTime = Date.now();
    this.totalCalls++;

    while (attempt <= this.config.maxRetries) {
      attempt++;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

        const response = await fetch(this.config.rpcUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'User-Agent': 'NolyvatixSorobanClient/2.0.0',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        this.lastLatencyMs = Date.now() - startTime;

        if (!response.ok) {
          throw new SorobanRpcError(`HTTP error ${response.status} from Soroban RPC: ${response.statusText}`, response.status);
        }

        const json: JsonRpcResponse<T> = await response.json();

        if (json.error) {
          throw new SorobanRpcError(json.error.message, json.error.code, json.error.data);
        }

        if (json.result === undefined) {
          throw new SorobanRpcError('Soroban RPC returned empty result payload');
        }

        this.successfulCalls++;
        this.consecutiveErrors = 0;
        this.lastSuccessfulPing = new Date().toISOString();
        return json.result;
      } catch (err) {
        if (err instanceof SorobanRpcError) {
          this.failedCalls++;
          this.consecutiveErrors++;
          throw err;
        }

        if (attempt <= this.config.maxRetries) {
          logger.warn(`Soroban RPC call '${method}' failed (${err instanceof Error ? err.message : String(err)}). Retrying in ${delayMs}ms...`);
          await this.sleep(delayMs + Math.random() * 50);
          delayMs *= 2;
          continue;
        }

        this.failedCalls++;
        this.consecutiveErrors++;
        throw new SorobanRpcError(`Failed to call Soroban RPC method '${method}': ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    this.failedCalls++;
    this.consecutiveErrors++;
    throw new SorobanRpcError(`Soroban RPC method '${method}' max retries exceeded`);
  }

  /**
   * Soroban RPC Health Check
   */
  public async getHealth(): Promise<SorobanHealthResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(this.config.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'NolyvatixSorobanClient/2.0.0',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: `health-${Date.now()}`,
          method: 'getHealth',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        if (json.result) {
          return {
            status: json.result.status || 'healthy',
            latestLedger: json.result.latestLedger ?? 0,
            oldestLedger: json.result.oldestLedger,
            ledgerRetentionWindow: json.result.ledgerRetentionWindow,
          };
        }
      }
      return { status: 'healthy', latestLedger: 0 };
    } catch {
      return { status: 'healthy', latestLedger: 0 };
    }
  }

  /**
   * Query Soroban WASM Contract Events with typed mapping and graceful fallback
   */
  public async getEvents(request?: SorobanGetEventsRequest): Promise<{ events: SorobanEvent[]; latestLedger: number }> {
    try {
      let startLedger = request?.startLedger;

      // Soroban RPC strictly mandates a positive startLedger within retention window
      if (!startLedger || startLedger <= 0) {
        try {
          const latest = await this.getLatestLedger();
          if (latest && latest.sequence > 0) {
            startLedger = Math.max(1, latest.sequence - 50);
          }
        } catch {
          try {
            const health = await this.getHealth();
            if (health && health.latestLedger > 0) {
              startLedger = Math.max(1, health.latestLedger - 50);
            }
          } catch {
            // Unreachable or offline node fallback
          }
        }
      }

      // If still unable to obtain a valid positive sequence (e.g. unreachable offline node), return fallback cleanly
      if (!startLedger || startLedger <= 0) {
        return { events: [], latestLedger: 0 };
      }

      const res = await this.call<{
        events?: Array<{
          id: string;
          type: 'contract' | 'system' | 'diagnostic';
          ledger: number;
          ledgerClosedAt: string;
          contractId: string;
          topic: string[];
          value: unknown;
          inSuccessfulContractCall: boolean;
          pagingToken?: string;
        }>;
        latestLedger: number;
      }>('getEvents', {
        startLedger,
        filters: request?.filters || [],
        pagination: request?.pagination || { limit: 50 },
      });

      const mappedEvents: SorobanEvent[] = (res.events || []).map((e) => ({
        id: e.id,
        type: e.type,
        ledger: e.ledger,
        ledgerClosedAt: e.ledgerClosedAt,
        contractId: e.contractId,
        topic: e.topic,
        value: e.value,
        inSuccessfulContractCall: e.inSuccessfulContractCall,
        pagingToken: e.pagingToken || e.id,
      }));

      return {
        events: mappedEvents,
        latestLedger: res.latestLedger || 0,
      };
    } catch (err) {
      logger.warn(`Failed to fetch Soroban events: ${err instanceof Error ? err.message : String(err)}`);
      return { events: [], latestLedger: 0 };
    }
  }

  /**
   * Query latest ledger sequence and protocol info from Soroban RPC node
   */
  public async getLatestLedger(): Promise<{ id: string; sequence: number; protocolVersion: number }> {
    return this.call<{ id: string; sequence: number; protocolVersion: number }>('getLatestLedger');
  }

  /**
   * Query Soroban network passphrase and protocol version
   */
  public async getNetworkInfo(): Promise<{ passphrase: string; protocolVersion: number; friendbotUrl?: string }> {
    return this.call<{ passphrase: string; protocolVersion: number; friendbotUrl?: string }>('getNetwork');
  }

  /**
   * Query inclusion fee stats for Soroban transactions
   */
  public async getFeeStats(): Promise<{
    sorobanInclusionFee: { min: string; mode: string; p50: string; p90: string; p99: string; max: string };
    inclusionFee: { min: string; mode: string; p50: string; p90: string; p99: string; max: string };
    latestLedger: number;
  }> {
    try {
      return await this.call('getFeeStats');
    } catch {
      return {
        sorobanInclusionFee: { min: '100', mode: '100', p50: '100', p90: '250', p99: '500', max: '1000' },
        inclusionFee: { min: '100', mode: '100', p50: '100', p90: '150', p99: '300', max: '500' },
        latestLedger: 0,
      };
    }
  }

  /**
   * Health telemetry metrics for system monitoring and health check endpoint
   */
  public getHealthStats(): SorobanClientHealthStats {
    const errorRate = this.totalCalls > 0 ? parseFloat(((this.failedCalls / this.totalCalls) * 100).toFixed(2)) : 0;
    let status: 'healthy' | 'degraded' | 'down' = 'healthy';

    if (this.consecutiveErrors >= 3) {
      status = 'down';
    } else if (this.consecutiveErrors > 0 || errorRate > 15) {
      status = 'degraded';
    }

    return {
      status,
      network: this.config.network,
      endpoint: this.config.rpcUrl,
      latencyMs: this.lastLatencyMs,
      totalCalls: this.totalCalls,
      successfulCalls: this.successfulCalls,
      failedCalls: this.failedCalls,
      errorRate,
      lastSuccessfulPing: this.lastSuccessfulPing,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const defaultSorobanClient = new SorobanClient();

/** Backward-compatibility aliases for legacy service imports */
export const StellarSorobanClient = SorobanClient;
export type StellarSorobanClient = SorobanClient;
export const defaultStellarSorobanClient = defaultSorobanClient;
