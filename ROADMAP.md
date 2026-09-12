# Nolyvatix Platform Roadmap

This document outlines the development status and strategic roadmap for **Nolyvatix**, the open-source Business Intelligence & Observability platform for the Stellar blockchain ecosystem.

---

## ✅ Completed Capabilities

The following features and architectural layers are fully implemented, verified, and operational:

### 1. Real-Time Command Center
- [x] **Horizon REST SSE Live Stream**: Continuous low-latency streaming of ledger closes, operations count, base fees, and protocol versions.
- [x] **Network Throughput Analytics**: Time-series telemetry graphs for Transactions Per Second (TPS) and payment volume velocity.
- [x] **Multi-Network Switcher**: Seamless runtime toggling between Stellar `Mainnet` and `Testnet` environments.

### 2. Canonical Soroban RPC Client & Backend Telemetry
- [x] **Consolidated Soroban RPC Client**: Single canonical `SorobanClient` (`src/server/clients/sorobanClient.ts`) connecting to `https://mainnet.sorobanrpc.com`.
- [x] **Contract Inspection & Health Probes**: Real-time contract lookup by address (`C...`), bytecode hash retrieval, and JSON-RPC 2.0 health checks.
- [x] **WASM Gas & Resource Telemetry**: Tracking CPU instruction cycles and memory footprint limits.
- [x] **Event Log Ingestion**: Decoded WASM contract event topics, data payloads, and fee stats.

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

### 8. Backend Data Engine & API Architecture
- [x] **Express API Architecture**: 17 modular routers (`/api/ledgers`, `/api/soroban`, `/api/assets`, `/api/dashboards`, etc.).
- [x] **Dual-Tier In-Memory Caching**: `MemoryCache` and `StellarCache` with TTL expiry, hit/miss tracking, and regex key invalidation.
- [x] **Database Schema & In-Memory Fallbacks**: 11 relational tables defined via Drizzle ORM (`src/db/schema.ts`) with automatic fallback to in-memory repositories when PostgreSQL variables are omitted.
- [x] **Authentication & Tenant Isolation**: Firebase ID token verification middleware with JIT local user provisioning and development operator fallback.

### 9. Web3 Stellar Wallet Integration (Freighter)
- [x] **Real Browser Extension Integration**: Direct `@stellar/freighter-api` handshake verifying extension presence, network alignment, and public keys.
- [x] **Cryptographic Validation**: Rigorous client-side verification complying with SEP-0023 StrKey specifications and CRC16-XModem checksums.
- [x] **Live Horizon Balance Sync**: Live on-chain native XLM balance synchronization for connected accounts.
- [x] **Network Mismatch Detection**: Real-time comparison between active Freighter network and Nolyvatix's configured network.

### 10. Database Persistence & Migrations
- [x] **11 Drizzle Relational Tables**: Full schema declaration for workspaces, dashboards, widgets, alerts, reports, and ledger snapshots.
- [x] **Deterministic SQL Migrations**: Versioned migration files (`drizzle/0000_nolyvatix_init.sql`) with automated verification CLI (`npm run db:check`).
- [x] **Graceful Fallback**: Automatic activation of in-memory repositories when `DATABASE_URL` is omitted for zero-dependency local setup.

### 11. Production Security & Hardening
- [x] **Security Headers**: HSTS, CSP (`frame-ancestors`), X-Content-Type-Options, X-Frame-Options configured via custom security middleware.
- [x] **CORS Origin Validation**: Dynamic origin allowlisting supporting exact hostnames and wildcard patterns.
- [x] **Multi-Tier Rate Limiting**: Global (300 req/min), AI (30 req/min), Soroban (120 req/min), and Search (60 req/min) limiters.
- [x] **Production Error Sanitization**: Redaction of internal stack traces, system paths, and database connection strings from API responses.

### 12. Automated Testing Suite
- [x] **126 Unified Test Cases**: 95 backend unit and integration tests (Node.js test runner) and 31 frontend component and hook tests (Vitest) across 29 suites with zero failures.

### 13. Production Deployment & Runtime Readiness
- [x] **Health Probes**: Decoupled liveness (`GET /api/health`) and readiness (`GET /api/health/ready`) probes with HTTP 503 during failure or shutdown.
- [x] **Graceful Shutdown**: SIGTERM/SIGINT listeners that stop accepting HTTP traffic, broadcast shutdown to SSE clients, drain PostgreSQL pool, and exit cleanly.
- [x] **API Route Isolation**: Unmatched `/api/*` endpoints strictly return JSON 404 and never leak into the SPA fallback HTML.
- [x] **Operations Documentation**: Complete 12-factor production deployment guide in `docs/DEPLOYMENT.md`.

### 14. Continuous Integration Pipeline
- [x] **GitHub Actions Workflow**: Automated pipeline in `.github/workflows/ci.yml` running deterministic install, test, lint, and production build checks on push and PR.

---

## 🚧 In Progress

The following items are actively being refined:

- [ ] **Dedicated Standalone Soroban APM UI View**: Transitioning `src/views/SorobanAPMView.tsx` from placeholder state to full visualization components connected to the existing backend `/api/soroban` endpoints.
- [ ] **External Alert Webhook Dispatch Workers**: Asynchronous worker queue for dispatching alert notifications to external Slack and Discord webhooks.

---

## 🔮 Planned Capabilities

The following features represent subsequent phases on the Nolyvatix product roadmap:

### Phase 3: Enterprise Collaboration & Ecosystem Scale
- [ ] **Shareable Public Dashboard Links**: Secure, tokenized read-only public dashboard URLs with optional password protection.
- [ ] **Docker Compose Local Development Stack**: Pre-configured `docker-compose.yml` spinning up PostgreSQL and Nolyvatix server with one command.
- [ ] **Enterprise Helm Charts & Kubernetes**: Production manifests for deploying Nolyvatix on Kubernetes clusters.
- [ ] **AI Root-Cause Anomaly Engine**: Autonomous agentic analysis of failed Soroban contract invocations and network fee anomalies.

