# Nolyvatix - Open-Source Stellar Blockchain BI & Analytics Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/nolyvatix/nolyvatix/actions/workflows/ci.yml/badge.svg)](https://github.com/nolyvatix/nolyvatix/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/Tests-126%20Passing-emerald)](https://github.com/nolyvatix/nolyvatix)
[![React](https://img.shields.io/badge/React-19.0-sky)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4.0-38bdf8)](https://tailwindcss.com/)
[![Stellar](https://img.shields.io/badge/Stellar-Horizon%20%2F%20Soroban-007afe)](https://stellar.org/)

**Nolyvatix** is an enterprise-grade, open-source Business Intelligence (BI) and observability platform designed specifically for the **Stellar blockchain ecosystem**.

The platform ingests real-time Stellar ledger Server-Sent Events (SSE), payment corridor telemetry, and Soroban WASM smart contract JSON-RPC events. It synthesizes complex blockchain data into interactive real-time dashboards, natural language AI insights, automated report generation, and enterprise health monitoring.

---

## 🌟 Key Features

### ⚡ Real-Time Command Center *(Implemented)*
- **Live Ledger Stream**: Continuous, low-latency stream of ledger closes, operations count, and base fee metrics via Horizon REST SSE.
- **Network Throughput Analytics**: Time-series telemetry graphs for Transactions Per Second (TPS) and payment volume velocity.
- **Stellar Network Switcher**: Seamless toggling between Stellar `Mainnet` and `Testnet` environments.

### 🔍 Soroban RPC Telemetry & Smart Contract Ingestion *(Implemented on Backend / Standalone UI in Roadmap)*
- **Consolidated Soroban Client**: Unified JSON-RPC 2.0 client (`https://mainnet.sorobanrpc.com`) with exponential backoff retries.
- **Smart Contract Inspection**: Address lookup (`C...`), bytecode hash retrieval, and JSON-RPC health probes via `/api/soroban/*`.
- **WASM Gas & Resource Tracking**: Telemetry endpoints for CPU instruction cycles, memory footprint, and fee stats.
- **Event Log Ingestion**: Decoded WASM contract event topics and execution metrics.
*(Note: A dedicated standalone UI view for deep contract profiling is currently scheduled on the frontend roadmap; contract telemetry is actively accessible via the Command Center and REST API).*

### 🌐 Assets & Anchor Corridors *(Implemented)*
- **Cross-Border Corridor Velocity**: Real-time tracking of fiat-pegged stablecoins (USDC, EURC) and anchor settlement speeds.
- **Liquidity Pool Intelligence**: AMM pool TVL, reserve distribution, volume, and fee analytics.

### 📊 BI Dashboard Builder *(Implemented)*
- **12-Column Responsive Layout Engine**: Customizable widget grid supporting KPI cards, time-series charts, bar charts, and data tables.
- **User Layout Persistence**: Saved layouts with active layout switching and default dashboard configuration.

### 🚨 Alert Center & Rule Engine *(Implemented)*
- **Configurable Anomaly Triggers**: Rules for TPS drops, fee spikes, ledger close delays, and contract failure rates.
- **Multi-Channel Notification History**: In-app notifications and webhook dispatch configurations.

### 📑 Report Builder & Export Center *(Implemented)*
- **Executive Digests & Custom Reports**: Automated metric rollups and scheduled summaries.
- **Multi-Format Export Engine**: One-click exports in CSV, JSON, and printable/compiled PDF formats.

### 🔮 Gemini AI Co-Pilot *(Implemented with Graceful Fallback)*
- **Natural Language Querying**: Ask plain-English questions about ledger trends, Soroban WASM contract execution, or anchor volumes.
- **Dynamic Chart Synthesizer**: Powered by `@google/genai` (Gemini 2.5 Flash), converting queries into interactive Recharts visualizations.
- **Intelligent Heuristic Fallback**: Deterministic rule-based synthesis using live Horizon metrics when `GEMINI_API_KEY` is not provided.

### 🏢 Multi-Tenant Workspace & Preferences *(Implemented)*
- **Identity & Access Management**: Firebase ID token authentication middleware with Just-In-Time (JIT) local database user synchronization.
- **Development Operator Fallback**: Seamless local development mode (`ALLOW_DEV_FALLBACK=true`) bypasses mandatory authentication for rapid iteration.

### 🛡️ Web3 Stellar Wallet Integration *(Implemented — Freighter)*
- **Real Freighter Integration**: Full browser extension handshake using `@stellar/freighter-api` with zero simulated delays or fake keys.
- **Cryptographic Validation**: Rigorous client-side verification complying with SEP-0023 StrKey specifications and CRC16-XModem checksum validation before any account is accepted.
- **Horizon Balance Sync**: Live on-chain native XLM balance synchronization for connected accounts.
- **Network Mismatch Detection**: Real-time cross-network verification comparing the active Freighter wallet network with Nolyvatix's configured network (Mainnet / Testnet).
- **Decoupled Architecture**: Stellar wallet state is completely decoupled from Firebase multi-tenant workspace authentication.
- **Deep Intelligence Hook**: One-click "My Connected Wallet" quick-navigation into the Wallet Intelligence analyzer.

---

## 🏛️ Architecture Overview

Nolyvatix is built as a full-stack, decoupled modular application combining high-performance blockchain ingestion with an Express API and React 19 client:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Client Tier (React 19 + Vite)                      │
│   • 12 Specialized Views  • Tailwind CSS v4  • Motion Transitions       │
│   • Zustand Global Store  • TanStack React Query  • Recharts Visuals    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP / REST / SSE Stream
┌────────────────────────────────────▼────────────────────────────────────┐
│                    Express API & Data Engine Layer                      │
│   • 17 Modular API Routers (/api/ledgers, /api/soroban, /api/ai, etc.)  │
│   • Server-Sent Events (SSE) Bus (StellarEventBus)                      │
│   • High-Performance Dual-Tier Caching (MemoryCache + StellarCache)     │
│   • Firebase Auth & Tenant Isolation Middleware (with Dev Fallback)     │
│   • Production Security (Helmet, CSP, Dynamic CORS, 4-Tier Rate Limits) │
│   • Google Gemini AI SDK (@google/genai) with Live Horizon Context      │
└─────────────────┬─────────────────────────────────────┬─────────────────┘
                  │                                     │
┌─────────────────▼─────────────────┐ ┌─────────────────▼─────────────────┐
│   Database Tier (PostgreSQL)      │ │     Stellar Network Tier          │
│   • 11 Tables via Drizzle ORM     │ │   • Stellar Horizon REST / SSE    │
│   • Versioned SQL Migrations      │ │   • Soroban JSON-RPC 2.0 Client   │
│   • Automatic In-Memory Fallback  │ │     (https://mainnet.sorobanrpc.com)
│     (zero local setup required)   │ │                                   │
└───────────────────────────────────┘ └───────────────────────────────────┘
```

For full technical specifications, refer to [ARCHITECTURE.md](docs/ARCHITECTURE.md), [DEPLOYMENT.md](docs/DEPLOYMENT.md), and [PRD.md](docs/PRD.md).

---

## 💻 Tech Stack

- **Frontend Core**: [React 19](https://react.dev/), [TypeScript 5.8](https://www.typescriptlang.org/), [Vite 6](https://vitejs.dev/)
- **Styling & Motion**: [Tailwind CSS v4](https://tailwindcss.com/), [Motion](https://motion.dev/)
- **State & Data Fetching**: [Zustand 5](https://zustand-demo.pmnd.rs/), [@tanstack/react-query](https://tanstack.com/query)
- **Data Visualization**: [Recharts](https://recharts.org/)
- **Backend API**: [Express 4](https://expressjs.com/), [Node.js](https://nodejs.org/)
- **Database & ORM**: [Drizzle ORM](https://orm.drizzle.team/), PostgreSQL driver (`pg`), [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview) (with versioned SQL migrations and in-memory fallback repositories)
- **Authentication**: Firebase Auth & Firebase Admin SDK
- **Blockchain Integrations**: Stellar Horizon REST/SSE, Soroban JSON-RPC 2.0, Freighter Wallet (`@stellar/freighter-api`)
- **AI Engine**: Google Gemini 2.5 Flash SDK (`@google/genai`) with fallback heuristic synthesis
- **Testing**: Unified test suite with 126 tests across 29 suites (Node.js test runner via `tsx --test` + Vitest)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🚀 Getting Started & Local Development

### Prerequisites

- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher
- *(Optional)* **PostgreSQL**: `v15+` if running with persistent database (otherwise in-memory repositories activate automatically)

### Installation Guide

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/nolyvatix/nolyvatix.git
   cd nolyvatix
   ```

2. **Install Dependencies**:
   ```bash
   npm ci
   ```

3. **Configure Environment Variables**:
   Create a `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```

   Key configuration settings:
   ```env
   # AI Co-Pilot (optional - system falls back to rule-based synthesis if omitted)
   GEMINI_API_KEY=""

   # Blockchain Nodes
   VITE_HORIZON_URL="https://horizon.stellar.org"
   VITE_SOROBAN_RPC_URL="https://mainnet.sorobanrpc.com"

   # Local Development Auth Fallback
   ALLOW_DEV_FALLBACK="true"

   # Optional PostgreSQL Database (leave blank to use built-in in-memory repositories)
   DATABASE_URL="postgresql://postgres:password@localhost:5432/nolyvatix"
   ```

4. **Verify Database Migrations**:
   ```bash
   npm run db:check
   ```

5. **Start Local Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

6. **Run Unified Test Suite**:
   ```bash
   npm test
   ```
   Executes 126 backend and frontend tests across 29 suites (Node.js test runner for backend, Vitest for frontend).

7. **Typecheck & Linting**:
   ```bash
   npm run lint
   ```

8. **Production Build & Verification**:
   ```bash
   npm run build
   npm run start
   ```
   For detailed production runtime configuration, Docker/Kubernetes deployment, health probes, and graceful shutdown specifications, see [DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## 📁 Folder Structure

```
/
├── .github/                       # GitHub Templates & Workflows
│   ├── ISSUE_TEMPLATE/            # Bug Report, Feature Request, Docs Templates
│   ├── workflows/ci.yml           # Automated CI Pipeline
│   └── PULL_REQUEST_TEMPLATE.md   # Pull Request Template
├── docs/                          # Technical Documentation
│   ├── ARCHITECTURE.md            # System Architecture Blueprint
│   ├── DEPLOYMENT.md              # 12-Factor Production Deployment & Ops Guide
│   ├── PRD.md                     # Product Requirements Document
│   ├── LABELS.md                  # GitHub Label Taxonomy
│   └── PROJECT_BOARD.md           # Project Board Structure
├── drizzle/                       # Database Migrations
│   └── 0000_nolyvatix_init.sql    # Versioned Initial Schema Migration
├── src/                           # Application Source Code
│   ├── components/                # Modular UI Design System
│   │   ├── ai/                    # Gemini AI Co-Pilot Drawer
│   │   ├── common/                # StatCard, ChartContainer, CommandPalette, ErrorBoundary
│   │   ├── layout/                # AppHeader, Sidebar, WorkspaceHeader, Footer
│   │   └── ui/                    # Button, GlassCard, Badge, Input, StatusChip, Modal
│   ├── db/                        # Database Schema & Persistence
│   │   ├── schema.ts              # Drizzle ORM Schema (11 Relational Tables)
│   │   ├── migrate.ts             # Programmatic Migration Runner
│   │   ├── index.ts               # Connection Pool & In-Memory Fallback Detector
│   │   └── drizzle.config.ts      # Drizzle Kit Configuration
│   ├── lib/                       # Utility Functions (formatting, cn, storage)
│   ├── router/                    # AppRouter navigation & centralized route registry
│   ├── server/                    # Modular Express Server Architecture
│   │   ├── __tests__/             # Backend Test Suites (node:test via tsx)
│   │   ├── cache/                 # MemoryCache & StellarCache In-Memory Layers
│   │   ├── clients/               # HorizonClient, SorobanClient, FirebaseAdmin
│   │   ├── dataEngine.ts          # Dependency Injection & API Gateway Wireup
│   │   ├── middleware/            # Auth, Security, Rate Limiting, Error Handlers
│   │   ├── repositories/          # Domain & DB Repositories (with In-Memory Fallbacks)
│   │   ├── routes/                # 17 Modular API Express Routers
│   │   ├── services/              # Domain Services (Ledger, Soroban, AI, Alerts, etc.)
│   │   └── utils/                 # Structured Logger & Response Wrappers
│   ├── services/                  # Frontend API Services & Stream Clients
│   ├── store/                     # Zustand Global Application Store
│   ├── types/                     # TypeScript Domain Models & Interfaces
│   ├── views/                     # 12 Interactive Workspace Views
│   ├── App.tsx                    # Root Application Component
│   ├── index.css                  # Tailwind CSS v4 Global Design Tokens
│   └── main.tsx                   # Frontend Mounting Entrypoint
├── .env.example                   # Environment Template
├── CONTRIBUTING.md                # Development & Contribution Guide
├── LICENSE                        # MIT License
├── ROADMAP.md                     # Feature Roadmap (Completed, In-Progress, Planned)
├── SECURITY.md                    # Security & Vulnerability Disclosure Policy
├── server.ts                      # Express Server Entrypoint
└── package.json                   # Dependencies & Build Scripts
```

---

## 🗺️ Roadmap Overview

Development is organized across clear operational phases:
- **Completed**: Real-Time Command Center, Canonical Soroban RPC Client (`https://mainnet.sorobanrpc.com`) with health diagnostics and event ingestion, Assets & Anchor Corridors, BI Dashboard Builder, Alert Center, Report Builder, Gemini AI with live context and fallback, Express API with 17 routers, Drizzle schema (11 tables) with versioned SQL migrations (`npm run db:check`), real Freighter wallet integration with SEP-0023 StrKey validation, production security middleware (HSTS, CSP, dynamic CORS, rate limiting), graceful shutdown and health probes, and 126 automated tests across 29 suites with zero failures.
- **In Progress**: Dedicated standalone Soroban APM UI view (`src/views/SorobanAPMView.tsx`), and external webhook notification dispatch workers.
- **Planned**: Shareable public dashboard links, Docker Compose local multi-container stack, Kubernetes Helm charts, and autonomous AI root-cause anomaly engine.

For the full detailed status breakdown, visit [ROADMAP.md](ROADMAP.md).

---

## 🤝 Contributing

We welcome contributions from the open-source community! Please review our [CONTRIBUTING.md](CONTRIBUTING.md) guide and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before submitting pull requests.

---

## 🛡️ Security

If you discover a security vulnerability, please refer to our [SECURITY.md](SECURITY.md) policy and disclose it responsibly via email at [security@nolyvatix.org](mailto:security@nolyvatix.org).

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

*Nolyvatix — Business Intelligence for the Stellar Blockchain Ecosystem.*
