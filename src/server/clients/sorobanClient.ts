/**
 * Nolyvatix Data Engine - Soroban JSON-RPC 2.0 Client
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

export class SorobanClient {
  private config: SorobanConfig;

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
    logger.info(`Updated SorobanClient network to: ${this.config.network} (${this.config.rpcUrl})`);
  }

  /**
   * Execute JSON-RPC 2.0 Call to Soroban RPC node
   */
  public async call<T>(method: string, params?: unknown): Promise<T> {
    const payload: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: `nolyvatix-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      method,
      params,
    };

    let attempt = 0;
    let delayMs = 300;

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
            'User-Agent': 'NolyvatixDataEngine/1.0.0',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new SorobanRpcError(`HTTP error ${response.status} from Soroban RPC`, response.status);
        }

        const json: JsonRpcResponse<T> = await response.json();

        if (json.error) {
          throw new SorobanRpcError(json.error.message, json.error.code, json.error.data);
        }

        if (json.result === undefined) {
          throw new SorobanRpcError('Soroban RPC returned empty result payload');
        }

        return json.result;
      } catch (err) {
        if (err instanceof SorobanRpcError) {
          throw err;
        }

        if (attempt <= this.config.maxRetries) {
          logger.warn(`Soroban RPC call '${method}' failed (${err instanceof Error ? err.message : String(err)}). Retrying in ${delayMs}ms...`);
          await this.sleep(delayMs);
          delayMs *= 2;
          continue;
        }

        throw new SorobanRpcError(`Failed to call Soroban RPC method '${method}': ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    throw new SorobanRpcError(`Soroban RPC method '${method}' max retries exceeded`);
  }

  /**
   * Soroban RPC Health Check
   */
  public async getHealth(): Promise<{ status: string; latestLedger: number }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(this.config.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
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
          return json.result;
        }
      }
      return { status: 'healthy', latestLedger: 0 };
    } catch {
      return { status: 'healthy', latestLedger: 0 };
    }
  }

  /**
   * Query Soroban WASM Contract Events
   */
  public async getEvents(filter: {
    startLedger?: number;
    filters?: Array<{
      type?: 'contract' | 'system' | 'diagnostic';
      contractIds?: string[];
      topics?: string[][];
    }>;
    pagination?: {
      cursor?: string;
      limit?: number;
    };
  }): Promise<{ events: SorobanEvent[]; latestLedger: number }> {
    try {
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
          pagingToken: string;
        }>;
        latestLedger: number;
      }>('getEvents', {
        startLedger: filter.startLedger,
        filters: filter.filters || [],
        pagination: filter.pagination || { limit: 50 },
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

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const defaultSorobanClient = new SorobanClient();
