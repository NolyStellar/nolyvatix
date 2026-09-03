/**
 * Nolyvatix Data Engine - Soroban RPC Production Client
 * Connects to Soroban RPC endpoints to query smart contract health, events,
 * ledger entries, transactions, gas consumption, and simulate operations.
 */

import { SorobanConfig, NetworkType } from '../../types/stellar.js';
import { SorobanRpcError } from '../../utils/errors.js';
import { Logger } from '../../utils/logger.js';

export interface SorobanHealthResponse {
  status: 'healthy' | 'healthy_and_synced' | 'degraded' | 'down' | 'syncing';
  latestLedger?: number;
  oldestLedger?: number;
  ledgerRetentionWindow?: number;
}

export interface SorobanEventsResponse {
  events: Array<{
    type: 'contract' | 'system' | 'diagnostic';
    ledger: number;
    ledgerClosedAt: string;
    contractId: string;
    id: string;
    pagingToken: string;
    topic: string[];
    value: any;
    inSuccessfulContractCall: boolean;
  }>;
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

const logger = new Logger('StellarSorobanClient');

export const SOROBAN_NETWORKS: Record<NetworkType, string> = {
  mainnet: 'https://mainnet.sorobanrpc.com',
  testnet: 'https://soroban-testnet.stellar.org',
  futurenet: 'https://rpc-futurenet.stellar.org',
};

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

export class StellarSorobanClient {
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
      SOROBAN_NETWORKS[network] ||
      SOROBAN_NETWORKS.mainnet;

    this.config = {
      network,
      rpcUrl: rpcUrl.replace(/\/+$/, ''),
      timeoutMs: config?.timeoutMs || 10000,
      maxRetries: config?.maxRetries || 3,
    };

    logger.info(`Soroban RPC Client initialized for [${this.config.network}] -> ${this.config.rpcUrl}`);
  }

  public getNetwork(): NetworkType {
    return this.config.network;
  }

  public getRpcUrl(): string {
    return this.config.rpcUrl;
  }

  public setNetwork(network: NetworkType, customUrl?: string): void {
    this.config.network = network;
    this.config.rpcUrl = (customUrl || SOROBAN_NETWORKS[network] || SOROBAN_NETWORKS.mainnet).replace(/\/+$/, '');
    this.consecutiveErrors = 0;
    logger.info(`Soroban RPC client network updated to: ${this.config.network} (${this.config.rpcUrl})`);
  }

  /**
   * JSON-RPC 2.0 Request Dispatcher
   */
  public async call<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const id = Math.floor(Math.random() * 1000000);
    const body = {
      jsonrpc: '2.0',
      id,
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
            'User-Agent': 'NolyvatixSorobanClient/2.0.0',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        this.lastLatencyMs = Date.now() - startTime;

        if (!response.ok) {
          throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
        }

        const data: any = await response.json();

        if (data.error) {
          throw new SorobanRpcError(
            `Soroban RPC Error (${data.error.code}): ${data.error.message}`,
            data.error.code,
            data.error.data
          );
        }

        this.successfulCalls++;
        this.consecutiveErrors = 0;
        this.lastSuccessfulPing = new Date().toISOString();
        return data.result as T;
      } catch (err: any) {
        if (err instanceof SorobanRpcError) {
          this.failedCalls++;
          throw err;
        }

        if (attempt <= this.config.maxRetries) {
          logger.warn(`Soroban RPC attempt ${attempt} failed: ${err.message}. Retrying in ${delayMs}ms...`);
          await this.sleep(delayMs + Math.random() * 100);
          delayMs *= 2;
        } else {
          this.failedCalls++;
          this.consecutiveErrors++;
          throw new SorobanRpcError(
            `Soroban RPC invocation failed after ${this.config.maxRetries} attempts on ${this.config.rpcUrl}: ${err.message}`,
            -32000
          );
        }
      }
    }

    this.failedCalls++;
    this.consecutiveErrors++;
    throw new SorobanRpcError(`Soroban RPC timeout for method '${method}'`, -32000);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Common Soroban Methods
  public async getHealth(): Promise<SorobanHealthResponse> {
    return this.call<SorobanHealthResponse>('getHealth');
  }

  public async getEvents(request: SorobanGetEventsRequest): Promise<SorobanEventsResponse> {
    return this.call<SorobanEventsResponse>('getEvents', request as unknown as Record<string, unknown>);
  }

  public async getLatestLedger(): Promise<{ id: string; sequence: number; protocolVersion: number }> {
    return this.call<{ id: string; sequence: number; protocolVersion: number }>('getLatestLedger');
  }

  public async getNetworkInfo(): Promise<{ passphrase: string; protocolVersion: number; friendbotUrl?: string }> {
    return this.call<{ passphrase: string; protocolVersion: number; friendbotUrl?: string }>('getNetwork');
  }

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
}

export const defaultStellarSorobanClient = new StellarSorobanClient();
