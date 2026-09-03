# Nolyvatix Platform Roadmap

This document outlines the development status and strategic roadmap for **Nolyvatix**, the open-source Business Intelligence & Observability platform for the Stellar blockchain ecosystem.

---

## ✅ Completed Capabilities

The following features and architectural layers are fully implemented, verified, and operational:

### 1. Real-Time Command Center
- [x] **Horizon REST SSE Live Stream**: Continuous low-latency streaming of ledger closes, operations count, base fees, and protocol versions.
- [x] **Network Throughput Analytics**: Time-series telemetry graphs for Transactions Per Second (TPS) and payment volume velocity.
- [x] **Multi-Network Switcher**: Seamless runtime toggling between Stellar `Mainnet` and `Testnet` environments.

### 2. Soroban WASM APM & Profiler
- [x] **Contract Search & Inspection**: Address-based lookup (`C...`), bytecode hash display, and contract metadata extraction.
- [x] **WASM Gas & Resource Profiler**: Tracking of CPU instruction cycles (`cpuInsns`) and memory byte consumption (`memBytes`).
- [x] **Event Log Decoder**: Real-time decoding of WASM contract event topics, data payloads, and invocation success/failure rates.

### 3. Assets & Anchor Corridor Intelligence
- [x] **Cross-Border Corridor Velocity**: Telemetry for fiat-backed stablecoins (USDC, EURC) and anchor settlement speeds.
- [x] **Liquidity Pool Intelligence**: AMM pool TVL, reserve distribution, volume, and fee analytics.

### 4. BI Dashboard Builder
- [x] **12-Column Responsive Layout Engine**: Customizable widget grid supporting KPI cards, time-series charts, bar charts, and data tables.
- [x] **Layout Persistence**: Saved custom dashboard configurations and default view selection.

### 5. Alert Center & Notification Engine
- [x] **Configurable Anomaly Rules**: Threshold triggers for TPS drops, fee spikes, ledger close delays, and contract failure rates.
- [x] **Notification History & In-App Alerts**: Centralized alert management and acknowledgment feed.

### 6. Report Builder & Export Center
- [x] **Executive Digests & Custom Reports**: Automated metric rollups and scheduled summaries.
- [x] **Multi-Format Export Engine**: One-click exports in CSV, JSON, and compiled PDF formats.

### 7. Gemini AI Co-Pilot Drawer
- [x] **Server-Side AI Proxy**: Integrated via `@google/genai` (Gemini 2.5 Flash) with live Stellar ledger context injection.
- [x] **Dynamic Chart Synthesizer**: Converts natural language analytical questions into interactive Recharts visualizations.
- [x] **Intelligent Heuristic Fallback**: Deterministic rule-based synthesis using live Horizon metrics when `GEMINI_API_KEY` is not configured.

### 8. Backend Data Engine & Architecture
- [x] **Express API Architecture**: 17 modular routers (`/api/ledgers`, `/api/soroban`, `/api/assets`, `/api/dashboards`, etc.).
- [x] **Dual-Tier In-Memory Caching**: `MemoryCache` and `StellarCache` with TTL expiry, hit/miss tracking, and regex key invalidation.
- [x] **Database Schema & In-Memory Fallbacks**: 11 relational tables defined via Drizzle ORM (`src/db/schema.ts`) with automatic fallback to in-memory repositories when PostgreSQL variables are omitted.
- [x] **Authentication & Tenant Isolation**: Firebase ID token verification middleware with JIT local user provisioning and development operator fallback.
- [x] **Backend Test Suite**: 36 unit and integration test cases across 12 suites running via native Node.js test runner (`npm test`).

---

## 🚧 In Progress (Foundation Hardening & Integrity)

The following items are actively in progress during Phase 1:

- [ ] **Real Web3 Wallet Integration**:
  - *Current Status*: Interactive wallet modal with simulated connection state (`connectMockWallet`).
  - *Next Step*: Implement browser extension injection (`@stellar/freighter-api`, Albedo) and Ed25519 cryptographic challenge/response signature verification.
- [ ] **Duplicate Soroban Client Consolidation (Task ARCH-01)**:
  - *Current Status*: Dual implementations exist in `src/server/clients/sorobanClient.ts` and `src/server/services/stellar/sorobanClient.ts`.
  - *Next Step*: Reconcile both into a single, unified client with connection pooling, retries, and comprehensive error handling.
- [ ] **Deterministic Database Migration Pipeline**:
  - *Current Status*: Drizzle ORM schema is complete (`src/db/schema.ts`), but automated `.sql` migration files are not yet versioned.
  - *Next Step*: Configure deterministic `drizzle-kit generate` and automated migration application script.

---

## 🔮 Planned Capabilities

The following features represent subsequent phases on the Nolyvatix product roadmap:

### Phase 2: Production Infrastructure & Tooling
- [ ] **Automated CI/CD Pipeline**: GitHub Actions workflows for automated testing, typechecking, and Docker container build validation on every PR.
- [ ] **Frontend Component & Integration Tests**: Vitest and React Testing Library setup for UI components, state stores, and router navigation.
- [ ] **Production Security Middleware**: Express rate limiting (`express-rate-limit`), Helmet security headers (CSP, HSTS), and strict CORS origin validation.
- [ ] **External Webhook Dispatch Workers**: Background queue for asynchronous webhook dispatch to external Discord, Slack, and Telegram channels.

### Phase 3: Enterprise Collaboration & Deployment
- [ ] **Shareable Public Dashboard Links**: Secure, tokenized public dashboard URLs with optional password protection.
- [ ] **Docker Compose Local Development Stack**: Pre-configured `docker-compose.yml` spinning up PostgreSQL and Nolyvatix server with one command.
- [ ] **Enterprise Helm Charts & Kubernetes**: Production manifests for deploying Nolyvatix on Kubernetes clusters.
- [ ] **AI Root-Cause Anomaly Engine**: Autonomous agentic analysis of failed Soroban invocations and ledger fee spikes.

