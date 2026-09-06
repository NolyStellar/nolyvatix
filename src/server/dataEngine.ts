/**
 * Nolyvatix Production Data Engine & Dependency Injection Root
 * Integrates Horizon, Soroban, High-Performance Multi-Layer Caching,
 * Pub/Sub Event Bus for Real-Time SSE Streams, Cloud SQL PostgreSQL Repositories,
 * Firebase Authentication with Tenant Isolation, and Business Analytics Services.
 */

import { Router } from 'express';
import { HorizonClient, defaultHorizonClient } from './clients/horizonClient.ts';
import { SorobanClient, defaultSorobanClient } from './clients/sorobanClient.ts';
import { MemoryCache, globalCache } from './cache/memoryCache.ts';
import { StellarCache, globalStellarCache } from './cache/stellarCache.ts';

// Specialized Live Clients & Services
import { StellarHorizonClient } from './services/stellar/index.ts';
import { StellarAssetService } from './services/stellar/stellarAssetService.ts';
import { StellarWalletService } from './services/stellar/stellarWalletService.ts';
import { StellarLiquidityService } from './services/stellar/stellarLiquidityService.ts';
import { StellarAnalyticsService } from './services/stellar/stellarAnalyticsService.ts';
import { StellarEventBus } from './services/stellar/stellarEventBus.ts';

// Blockchain Repositories
import { LedgerRepository } from './repositories/ledgerRepository.ts';
import { TransactionRepository } from './repositories/transactionRepository.ts';
import { OperationRepository } from './repositories/operationRepository.ts';
import { AccountRepository } from './repositories/accountRepository.ts';
import { AssetRepository } from './repositories/assetRepository.ts';
import { LiquidityPoolRepository } from './repositories/liquidityPoolRepository.ts';
import { SorobanRepository } from './repositories/sorobanRepository.ts';

// Cloud SQL PostgreSQL Repositories
import { UserDbRepository } from './repositories/db/userDbRepository.ts';
import { DashboardDbRepository } from './repositories/db/dashboardDbRepository.ts';
import { ReportDbRepository } from './repositories/db/reportDbRepository.ts';
import { AlertDbRepository } from './repositories/db/alertDbRepository.ts';
import { WorkspaceDbRepository } from './repositories/db/workspaceDbRepository.ts';

// Domain Services
import { LedgerService } from './services/ledgerService.ts';
import { TransactionService } from './services/transactionService.ts';
import { OperationService } from './services/operationService.ts';
import { AccountService } from './services/accountService.ts';
import { AssetService } from './services/assetService.ts';
import { LiquidityPoolService } from './services/liquidityPoolService.ts';
import { SorobanService } from './services/sorobanService.ts';
import { NetworkService } from './services/networkService.ts';
import { AiService } from './services/aiService.ts';
import { DashboardService } from './services/dashboardService.ts';
import { ReportService } from './services/reportService.ts';
import { AlertService } from './services/alertService.ts';
import { WorkspaceService } from './services/workspaceService.ts';
import { SearchService } from './services/searchService.ts';
import { SettingsService } from './services/settingsService.ts';

// API Route Creators
import { createHealthRouter } from './routes/healthRoutes.ts';
import { createStreamRouter } from './routes/streamRoutes.ts';
import { createNetworkRouter } from './routes/networkRoutes.ts';
import { createLedgerRouter } from './routes/ledgerRoutes.ts';
import { createTransactionRouter } from './routes/transactionRoutes.ts';
import { createAccountRouter } from './routes/accountRoutes.ts';
import { createAssetRouter } from './routes/assetRoutes.ts';
import { createLiquidityPoolRouter } from './routes/liquidityPoolRoutes.ts';
import { createOperationRouter } from './routes/operationRoutes.ts';
import { createSorobanRouter } from './routes/sorobanRoutes.ts';
import { createAiRouter } from './routes/aiRoutes.ts';
import { createDashboardRouter } from './routes/dashboardRoutes.ts';
import { createReportRouter } from './routes/reportRoutes.ts';
import { createAlertRouter } from './routes/alertRoutes.ts';
import { createWorkspaceRouter } from './routes/workspaceRoutes.ts';
import { createSearchRouter } from './routes/searchRoutes.ts';
import { createSettingsRouter } from './routes/settingsRoutes.ts';

// Auth & Security Middleware
import { authenticateUser } from './middleware/authMiddleware.ts';
import {
  sorobanRateLimiter,
  aiRateLimiter,
  searchRateLimiter,
} from './middleware/rateLimitMiddleware.ts';

import { Logger } from './utils/logger.ts';

const logger = new Logger('DataEngine');

export interface DataEngineInstance {
  horizonClient: HorizonClient;
  sorobanClient: SorobanClient;
  cache: MemoryCache;
  stellarCache: StellarCache;
  eventBus: StellarEventBus;
  repositories: {
    ledger: LedgerRepository;
    transaction: TransactionRepository;
    operation: OperationRepository;
    account: AccountRepository;
    asset: AssetRepository;
    liquidityPool: LiquidityPoolRepository;
    soroban: SorobanRepository;
    userDb: UserDbRepository;
    dashboardDb: DashboardDbRepository;
    reportDb: ReportDbRepository;
    alertDb: AlertDbRepository;
    workspaceDb: WorkspaceDbRepository;
  };
  services: {
    ledger: LedgerService;
    transaction: TransactionService;
    operation: OperationService;
    account: AccountService;
    asset: AssetService;
    liquidityPool: LiquidityPoolService;
    soroban: SorobanService;
    network: NetworkService;
    ai: AiService;
    dashboard: DashboardService;
    report: ReportService;
    alert: AlertService;
    workspace: WorkspaceService;
    search: SearchService;
    settings: SettingsService;
    stellarAsset: StellarAssetService;
    stellarWallet: StellarWalletService;
    stellarLiquidity: StellarLiquidityService;
    stellarAnalytics: StellarAnalyticsService;
  };
  apiRouter: Router;
}

export function initializeDataEngine(
  customHorizonClient?: HorizonClient,
  customSorobanClient?: SorobanClient,
  customCache?: MemoryCache
): DataEngineInstance {
  logger.info('Initializing Nolyvatix Stellar Production Data Engine...');

  const horizonClient = customHorizonClient || defaultHorizonClient;
  const sorobanClient = customSorobanClient || defaultSorobanClient;
  const cache = customCache || globalCache;
  const stellarCache = globalStellarCache;

  // Initialize Stellar Live Service Layer components
  const stellarHorizonClient = new StellarHorizonClient({
    network: horizonClient.getNetwork(),
  });

  const stellarAssetService = new StellarAssetService(stellarHorizonClient, stellarCache);
  const stellarWalletService = new StellarWalletService(stellarHorizonClient, stellarCache);
  const stellarLiquidityService = new StellarLiquidityService(stellarHorizonClient, stellarCache);
  const stellarAnalyticsService = new StellarAnalyticsService(
    stellarHorizonClient,
    sorobanClient,
    stellarCache
  );

  // Initialize Real-time Event Bus & SSE Manager
  const eventBus = new StellarEventBus(
    stellarAnalyticsService,
    stellarAssetService,
    stellarLiquidityService,
    stellarHorizonClient,
    sorobanClient,
    stellarCache
  );

  // Initialize Classic Blockchain Repositories
  const ledgerRepo = new LedgerRepository(horizonClient, cache);
  const txRepo = new TransactionRepository(horizonClient, cache);
  const opRepo = new OperationRepository(horizonClient, cache);
  const accountRepo = new AccountRepository(horizonClient, cache);
  const assetRepo = new AssetRepository(horizonClient, cache);
  const poolRepo = new LiquidityPoolRepository(horizonClient, cache);
  const sorobanRepo = new SorobanRepository(sorobanClient, cache);

  // Initialize Cloud SQL PostgreSQL Repositories
  const userDbRepo = new UserDbRepository();
  const dashboardDbRepo = new DashboardDbRepository();
  const reportDbRepo = new ReportDbRepository();
  const alertDbRepo = new AlertDbRepository();
  const workspaceDbRepo = new WorkspaceDbRepository();

  // Initialize Domain Services
  const ledgerService = new LedgerService(ledgerRepo);
  const txService = new TransactionService(txRepo);
  const opService = new OperationService(opRepo);
  const accountService = new AccountService(accountRepo, txRepo, opRepo);
  const assetService = new AssetService(assetRepo);
  const poolService = new LiquidityPoolService(poolRepo);
  const sorobanService = new SorobanService(sorobanRepo, sorobanClient);
  const networkService = new NetworkService(horizonClient, sorobanClient, ledgerService);
  const aiService = new AiService(
    networkService,
    ledgerService,
    txService,
    accountService,
    assetService,
    poolService,
    sorobanService,
    opService
  );

  const dashboardService = new DashboardService(dashboardDbRepo, userDbRepo);
  const reportService = new ReportService(networkService, assetService, poolService, sorobanService, reportDbRepo, userDbRepo);
  const alertService = new AlertService(alertDbRepo, userDbRepo);
  const workspaceService = new WorkspaceService(workspaceDbRepo, userDbRepo);
  const searchService = new SearchService(assetService, poolService, sorobanService, dashboardService, reportService);
  const settingsService = new SettingsService();

  // Initialize Main API Router
  const apiRouter = Router();

  // Public System Health & Diagnostics
  apiRouter.use('/health', createHealthRouter(stellarHorizonClient, sorobanClient, stellarCache, eventBus));

  // Real-Time Server-Sent Events (SSE)
  apiRouter.use('/stream', createStreamRouter(eventBus));

  // Public Blockchain Data Routes
  apiRouter.use('/network', createNetworkRouter(networkService));
  apiRouter.use('/ledgers', createLedgerRouter(ledgerService, txService, opService));
  apiRouter.use('/transactions', createTransactionRouter(txService, opService));
  apiRouter.use('/accounts', createAccountRouter(accountService));
  apiRouter.use('/assets', createAssetRouter(assetService));
  apiRouter.use('/liquidity-pools', createLiquidityPoolRouter(poolService));
  apiRouter.use('/operations', createOperationRouter(opService));
  apiRouter.use('/soroban', sorobanRateLimiter.middleware(), createSorobanRouter(sorobanService));
  apiRouter.use('/ai', aiRateLimiter.middleware(), createAiRouter(aiService));
  apiRouter.use('/search', searchRateLimiter.middleware(), createSearchRouter(searchService));

  // Protected User & Tenant-Scoped Domain Routes
  apiRouter.use('/dashboards', authenticateUser, createDashboardRouter(dashboardService));
  apiRouter.use('/reports', authenticateUser, createReportRouter(reportService));
  apiRouter.use('/alerts', authenticateUser, createAlertRouter(alertService));
  apiRouter.use('/workspaces', authenticateUser, createWorkspaceRouter(workspaceService));
  apiRouter.use('/settings', authenticateUser, createSettingsRouter(settingsService));

  logger.info('Stellar Production Data Engine successfully initialized with Firebase Auth, Cloud SQL Repositories, Event Bus, SSE, and all routes.');

  return {
    horizonClient,
    sorobanClient,
    cache,
    stellarCache,
    eventBus,
    repositories: {
      ledger: ledgerRepo,
      transaction: txRepo,
      operation: opRepo,
      account: accountRepo,
      asset: assetRepo,
      liquidityPool: poolRepo,
      soroban: sorobanRepo,
      userDb: userDbRepo,
      dashboardDb: dashboardDbRepo,
      reportDb: reportDbRepo,
      alertDb: alertDbRepo,
      workspaceDb: workspaceDbRepo,
    },
    services: {
      ledger: ledgerService,
      transaction: txService,
      operation: opService,
      account: accountService,
      asset: assetService,
      liquidityPool: poolService,
      soroban: sorobanService,
      network: networkService,
      ai: aiService,
      dashboard: dashboardService,
      report: reportService,
      alert: alertService,
      workspace: workspaceService,
      search: searchService,
      settings: settingsService,
      stellarAsset: stellarAssetService,
      stellarWallet: stellarWalletService,
      stellarLiquidity: stellarLiquidityService,
      stellarAnalytics: stellarAnalyticsService,
    },
    apiRouter,
  };
}
