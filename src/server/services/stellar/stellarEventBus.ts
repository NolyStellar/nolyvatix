/**
 * Nolyvatix Data Engine - Unified Stellar Event Bus & Real-Time SSE Streamer
 * Manages Server-Sent Events (SSE) subscriptions, eliminates duplicate upstream queries,
 * aggregates live on-chain feeds, and broadcasts real-time updates to all connected dashboards.
 */

import { Response } from 'express';
import { EventEmitter } from 'events';
import { StellarAnalyticsService } from './stellarAnalyticsService.js';
import { StellarAssetService } from './stellarAssetService.js';
import { StellarLiquidityService } from './stellarLiquidityService.js';
import { StellarHorizonClient } from './horizonClient.js';
import { SorobanClient } from '../../clients/sorobanClient.js';
import { StellarCache } from '../../cache/stellarCache.js';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('StellarEventBus');

export type StellarEventTopic =
  | 'ledgers'
  | 'transactions'
  | 'tps'
  | 'prices'
  | 'pools'
  | 'contracts'
  | 'health'
  | 'all';

export interface SSEClientConnection {
  id: string;
  response: Response;
  topics: Set<string>;
  connectedAt: number;
  lastEventAt: number;
}

export interface EventBusMetrics {
  activeClientsCount: number;
  totalEventsDispatched: number;
  eventsPerMinute: number;
  lastLedgerSequenceBroadcasted: number;
  topicsSubscriptionCounts: Record<string, number>;
  uptimeSeconds: number;
}

export class StellarEventBus extends EventEmitter {
  private clients: Map<string, SSEClientConnection> = new Map();
  private analyticsService: StellarAnalyticsService;
  private assetService: StellarAssetService;
  private liquidityService: StellarLiquidityService;
  private horizonClient: StellarHorizonClient;
  private sorobanClient: SorobanClient;
  private cache: StellarCache;

  private isRunning: boolean = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private totalEventsDispatched: number = 0;
  private recentEventsWindow: number[] = [];
  private lastLedgerSeq: number = 0;
  private startTime: number = Date.now();

  constructor(
    analyticsService: StellarAnalyticsService,
    assetService: StellarAssetService,
    liquidityService: StellarLiquidityService,
    horizonClient: StellarHorizonClient,
    sorobanClient: SorobanClient,
    cache: StellarCache
  ) {
    super();
    this.analyticsService = analyticsService;
    this.assetService = assetService;
    this.liquidityService = liquidityService;
    this.horizonClient = horizonClient;
    this.sorobanClient = sorobanClient;
    this.cache = cache;

    this.setMaxListeners(200);
    this.startWorker();
  }

  /**
   * Registers a new SSE client connection and streams initial state snapshot.
   */
  public registerClient(
    clientId: string,
    res: Response,
    requestedTopics: string[] = ['all']
  ): void {
    const topicsSet = new Set<string>();
    requestedTopics.forEach((t) => {
      t.split(',').forEach((sub) => {
        const trimmed = sub.trim().toLowerCase();
        if (trimmed) topicsSet.add(trimmed);
      });
    });

    if (topicsSet.size === 0 || topicsSet.has('*')) {
      topicsSet.add('all');
    }

    const client: SSEClientConnection = {
      id: clientId,
      response: res,
      topics: topicsSet,
      connectedAt: Date.now(),
      lastEventAt: Date.now(),
    };

    this.clients.set(clientId, client);
    logger.info(`Registered SSE client [${clientId}], topics: [${Array.from(topicsSet).join(', ')}]. Total clients: ${this.clients.size}`);

    // Send initial handshake
    this.sendEventToClient(client, 'connected', {
      clientId,
      network: this.horizonClient.getNetwork(),
      topics: Array.from(topicsSet),
      timestamp: new Date().toISOString(),
    });

    // Send immediate snapshot data
    this.sendInitialSnapshot(client);

    // Clean up on disconnect
    res.on('close', () => {
      this.removeClient(clientId);
    });
  }

  public removeClient(clientId: string): void {
    if (this.clients.has(clientId)) {
      this.clients.delete(clientId);
      logger.info(`Removed SSE client [${clientId}]. Remaining: ${this.clients.size}`);
    }
  }

  /**
   * Broadcasts typed payload to all subscribed clients.
   */
  public broadcast(topic: StellarEventTopic, eventName: string, data: unknown): void {
    const now = Date.now();
    this.totalEventsDispatched++;
    this.recentEventsWindow.push(now);

    // Prune events older than 60s
    this.recentEventsWindow = this.recentEventsWindow.filter((t) => now - t <= 60000);

    for (const client of this.clients.values()) {
      if (client.topics.has('all') || client.topics.has(topic) || client.topics.has(eventName)) {
        this.sendEventToClient(client, eventName, data);
      }
    }

    this.emit(eventName, data);
  }

  private sendEventToClient(client: SSEClientConnection, eventName: string, data: unknown): void {
    try {
      const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
      client.response.write(payload);
      client.lastEventAt = Date.now();
    } catch (err) {
      logger.warn(`Failed to write SSE event to client [${client.id}], removing connection.`, { error: err });
      this.removeClient(client.id);
    }
  }

  private async sendInitialSnapshot(client: SSEClientConnection): Promise<void> {
    try {
      if (client.topics.has('all') || client.topics.has('health') || client.topics.has('tps')) {
        const health = await this.analyticsService.getNetworkHealth();
        this.sendEventToClient(client, 'network_health', health);
      }

      if (client.topics.has('all') || client.topics.has('ledgers') || client.topics.has('tps')) {
        const analytics = await this.analyticsService.getAggregatedAnalytics();
        this.sendEventToClient(client, 'network_analytics', analytics);
      }

      if (client.topics.has('all') || client.topics.has('prices')) {
        const summary = await this.assetService.getAssetSummary();
        this.sendEventToClient(client, 'asset_summary', summary);
      }

      if (client.topics.has('all') || client.topics.has('pools')) {
        const liquidity = await this.liquidityService.getLiquidityMetrics();
        this.sendEventToClient(client, 'liquidity_metrics', liquidity);
      }
    } catch (err) {
      logger.warn(`Initial snapshot delivery failed for client [${client.id}]`, { error: err });
    }
  }

  /**
   * Background central polling worker that queries Horizon/Soroban once,
   * detects changes, updates caches, and broadcasts to all SSE clients.
   */
  public startWorker(pollIntervalMs: number = 3500): void {
    if (this.isRunning) return;
    this.isRunning = true;

    logger.info(`Starting Stellar Event Bus Worker (Interval: ${pollIntervalMs}ms)`);

    this.pollTimer = setInterval(async () => {
      await this.runWorkerCycle();
    }, pollIntervalMs);

    if (this.pollTimer.unref) this.pollTimer.unref();

    // Heartbeat every 15 seconds to prevent browser/proxy connection dropouts
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, 15000);

    if (this.heartbeatTimer.unref) this.heartbeatTimer.unref();
  }

  public stopWorker(): void {
    this.isRunning = false;
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    logger.info('Stopped Stellar Event Bus Worker');
  }

  private async runWorkerCycle(): Promise<void> {
    try {
      // 1. Fetch latest ledgers & analytics
      const [ledgers, analytics, health] = await Promise.all([
        this.analyticsService.getLatestLedgers(10).catch(() => []),
        this.analyticsService.getAggregatedAnalytics().catch(() => null),
        this.analyticsService.getNetworkHealth().catch(() => null),
      ]);

      if (ledgers.length > 0) {
        const latest = ledgers[0];

        // Check if a new ledger closed
        if (latest.sequence > this.lastLedgerSeq) {
          this.lastLedgerSeq = latest.sequence;

          // Broadcast new ledger event
          this.broadcast('ledgers', 'ledger_closed', {
            ledger: latest,
            timestamp: new Date().toISOString(),
          });

          // Fetch recent transactions for this ledger
          const transactions = await this.analyticsService.getLatestTransactions(15).catch(() => []);
          if (transactions.length > 0) {
            this.broadcast('transactions', 'transactions_updated', {
              transactions,
              timestamp: new Date().toISOString(),
            });
          }
        }
      }

      if (analytics) {
        this.broadcast('tps', 'tps_updated', {
          tps: analytics.tps,
          peakTps24h: analytics.peakTps24h,
          avgLedgerCloseSeconds: analytics.avgLedgerCloseSeconds,
          currentLedgerSequence: analytics.currentLedgerSequence,
          timestamp: new Date().toISOString(),
        });
      }

      if (health) {
        this.broadcast('health', 'network_health', health);
      }
    } catch (err) {
      logger.warn('Stellar Event Bus cycle error', { error: err });
    }
  }

  private sendHeartbeat(): void {
    for (const client of this.clients.values()) {
      try {
        client.response.write(`:keepalive ${Date.now()}\n\n`);
      } catch {
        this.removeClient(client.id);
      }
    }
  }

  public getMetrics(): EventBusMetrics {
    const counts: Record<string, number> = {};
    for (const client of this.clients.values()) {
      for (const topic of client.topics) {
        counts[topic] = (counts[topic] || 0) + 1;
      }
    }

    return {
      activeClientsCount: this.clients.size,
      totalEventsDispatched: this.totalEventsDispatched,
      eventsPerMinute: this.recentEventsWindow.length,
      lastLedgerSequenceBroadcasted: this.lastLedgerSeq,
      topicsSubscriptionCounts: counts,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }
}
