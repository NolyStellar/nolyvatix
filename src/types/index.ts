/**
 * Nolyvatix BI Platform Type Definitions
 */

export type ThemeMode = 'dark' | 'light';
export type StellarNetwork = 'mainnet' | 'testnet';
export type HealthStatus = 'healthy' | 'degraded' | 'offline';

export type NavRoute = 
  | 'command-center'
  | 'dashboard-builder'
  | 'report-builder'
  | 'alert-center'
  | 'workspace-hub'
  | 'search-center'
  | 'export-center'
  | 'settings-center'
  | 'wallet-intelligence'
  | 'soroban-apm'
  | 'assets-corridors'
  | 'ai-copilot'
  | 'custom-dashboards'
  | 'alerts-settings'
  | 'not-found'
  | 'access-denied'
  | 'server-error'
  | 'offline';

export type WalletConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'unavailable'
  | 'rejected'
  | 'error'
  | 'network_mismatch';

export interface WalletState {
  status: WalletConnectionStatus;
  isConnected: boolean;
  publicKey: string | null;
  name: string | null; // e.g. 'Freighter'
  provider: 'Freighter' | null;
  walletNetwork: StellarNetwork | string | null;
  networkMismatch: boolean;
  balanceXLM: number | null;
  error: string | null;
}

export interface NetworkTelemetry {
  horizonStatus: HealthStatus;
  sorobanStatus: HealthStatus;
  currentLedgerSequence: number;
  tps: number;
  avgLedgerCloseSeconds: number;
  total24hVolumeUSD: number;
  activeAccounts24h: number;
  lastUpdated: string;
}

export interface StellarLedgerHeader {
  sequence: number;
  hash: string;
  prevHash: string;
  closedAt: string;
  successfulTransactionCount: number;
  failedTransactionCount: number;
  operationCount: number;
  totalCoins: string;
  feePool: string;
  baseFee: number;
}

export interface StellarTransaction {
  id: string;
  hash: string;
  ledgerSequence: number;
  createdAt: string;
  sourceAccount: string;
  feeCharged: number;
  operationCount: number;
  successful: boolean;
  memo?: string;
  memoType?: string;
}

export interface StellarOperation {
  id: string;
  txHash: string;
  type: 'payment' | 'path_payment_strict_send' | 'create_claimable_balance' | 'manage_buy_offer' | 'invoke_host_function' | 'change_trust';
  sourceAccount: string;
  createdAt: string;
  details: Record<string, any>;
}

export interface SorobanContract {
  contractId: string;
  name?: string;
  creatorAccount: string;
  createdAtLedger: number;
  invocations24h: number;
  successRate: number; // e.g. 99.4
  avgGasCpu: number; // WASM CPU units
  avgGasMem: number; // WASM Memory bytes
  status: 'active' | 'deprecated' | 'paused';
  recentEventsCount: number;
}

export interface SorobanEvent {
  id: string;
  contractId: string;
  txHash: string;
  ledgerSequence: number;
  createdAt: string;
  topic: string[];
  valueJson: any;
  type: 'contract' | 'system' | 'diagnostic';
}

export interface AssetMetric {
  code: string;
  issuer: string | 'NATIVE';
  domain?: string;
  priceUSD: number;
  change24h: number;
  volume24hUSD: number;
  liquidityUSD: number;
  payments24h: number;
  isVerified: boolean;
}

export interface LiquidityPool {
  id: string;
  assetA: string;
  assetB: string;
  reserveA: number;
  reserveB: number;
  tvlUSD: number;
  volume24hUSD: number;
  fees24hUSD: number;
  apyPercent: number;
}

export interface AnchorCorridor {
  id: string;
  sourceAsset: string;
  targetAsset: string;
  anchorName: string;
  countryCode: string;
  volume24hUSD: number;
  avgLatencySeconds: number;
  successRate: number;
}

export interface AIChatMessage {
  id: string;
  sender: 'user' | 'gemini';
  text: string;
  timestamp: string;
  generatedChart?: {
    type: 'line' | 'bar' | 'pie' | 'kpi';
    title: string;
    data: any[];
    xAxisKey?: string;
    dataKeys?: string[];
  };
  suggestedFollowups?: string[];
  anomalyDetected?: boolean;
}

export type WidgetType = 
  | 'kpi_card'
  | 'line_chart'
  | 'area_chart'
  | 'bar_chart'
  | 'pie_chart'
  | 'donut_chart'
  | 'table'
  | 'ai_summary'
  | 'network_status'
  | 'wallet_analytics'
  | 'asset_analytics'
  | 'dex_analytics'
  | 'liquidity_pool'
  | 'soroban_apm';

export interface WidgetConfig {
  id: string;
  title: string;
  type: 'metric' | 'timeseries' | 'bar' | 'pie' | 'table' | WidgetType;
  widgetType?: WidgetType;
  metricKey?: string;
  dataKey?: string;
  gridSpan: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12; // columns span out of 12
  customSettings?: Record<string, any>;
}

export interface CustomDashboard {
  id: string;
  title: string;
  description: string;
  isPinned?: boolean;
  isPublic: boolean;
  widgets: WidgetConfig[];
  updatedAt: string;
  createdAt?: string;
}

export type AlertTarget =
  | 'tps'
  | 'tps_drops'
  | 'failed_tx_spike'
  | 'soroban_gas_spike'
  | 'anchor_latency'
  | 'large_transaction'
  | 'whale_movement'
  | 'trustline_spike'
  | 'dex_volume_spike'
  | 'pool_tvl_change'
  | 'soroban_failure';

export type AlertChannel = 'browser' | 'email' | 'webhook' | 'slack' | 'discord';

export interface AlertRule {
  id: string;
  name: string;
  target: AlertTarget;
  condition: 'above' | 'below' | 'equals';
  threshold: number;
  channel: AlertChannel;
  destination?: string;
  enabled: boolean;
  lastTriggered?: string;
}

export interface BIReport {
  id: string;
  title: string;
  period: 'daily' | 'weekly' | 'monthly' | 'custom';
  startDate?: string;
  endDate?: string;
  createdAt: string;
  sections: string[];
  content: {
    executiveSummaryText: string;
    networkHealth: {
      tps: number;
      ledgerSequence: number;
      avgCloseTime: number;
      healthStatus: string;
    };
    walletAnalytics: {
      activeAccounts: number;
      newTrustlines: number;
      avgTxPerWallet: number;
    };
    assetAnalytics: {
      topAssets: { code: string; volume24h: string; trustlines: number }[];
    };
    dexAnalytics: {
      totalVolume24h: string;
      topPair: string;
      activeTraders: number;
    };
    liquidityPools: {
      totalTVL: string;
      activePools: number;
      topAPYPool: string;
    };
    sorobanAnalytics: {
      totalInvocations: number;
      avgGasCpu: string;
      successRate: string;
    };
    aiRecommendations: string[];
    kpis: { label: string; value: string; change: string }[];
  };
}

export interface UserWorkspace {
  favoriteDashboards: string[];
  recentReports: string[];
  savedAIConversations: { id: string; title: string; timestamp: string }[];
  pinnedAssets: string[];
  pinnedWallets: string[];
  pinnedContracts: string[];
  recentSearches: string[];
}

export interface SearchResultItem {
  id: string;
  type: 'wallet' | 'asset' | 'transaction' | 'ledger' | 'contract' | 'pool' | 'dex_pair' | 'report' | 'dashboard' | 'ai_chat';
  title: string;
  subtitle: string;
  metadata?: Record<string, any>;
  routeUrl?: string;
}

export interface PlatformSettings {
  theme: 'dark' | 'light';
  refreshIntervalSeconds: number;
  networkPreference: 'mainnet' | 'testnet';
  aiModel: string;
  notificationsEnabled: boolean;
  exportFormatDefault: 'pdf' | 'csv' | 'json' | 'markdown' | 'png' | 'svg';
  keyboardShortcutsEnabled: boolean;
}
