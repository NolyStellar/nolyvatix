# Contributing to Nolyvatix

First off, thank you for considering contributing to **Nolyvatix**! 🎉
Nolyvatix is an open-source, enterprise-grade Business Intelligence platform built for the Stellar blockchain ecosystem.

Whether you're fixing a bug, adding a new Soroban contract decoder feature, improving documentation, or creating new dashboard visualizations, your help is welcome!

---

## 🛠️ Local Development Setup

### Prerequisites

- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **Git**
- *(Optional)* **PostgreSQL**: v15+ (not required for standard development; repositories automatically fall back to in-memory storage when database environment variables are omitted)

### Installation Steps

1. **Fork and Clone the Repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/nolyvatix.git
   cd nolyvatix
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   - By default, `ALLOW_DEV_FALLBACK="true"` allows local API testing without requiring a live Firebase login.
   - `GEMINI_API_KEY` is optional. If omitted, the AI service falls back to intelligent, rule-based synthesis with live Stellar Horizon metrics.
   - For database persistence, you can optionally configure `SQL_HOST`, `SQL_USER`, `SQL_PASSWORD`, and `SQL_DB_NAME`. If left blank, Nolyvatix runs in zero-configuration mode using in-memory repositories.

4. **Start Dev Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

5. **Run Backend Tests**:
   ```bash
   npm test
   ```
   Runs the test suite (36 unit and integration test cases across 12 suites) using Node.js's native test runner via `tsx --test`.

6. **Run Typechecks and Linting**:
   ```bash
   npm run lint
   ```

7. **Verify Production Build**:
   ```bash
   npm run build
   ```

---

## ⚠️ Current Development Limitations & Technical Debt

Contributors should be aware of the following ongoing architecture states:
1. **Zero-Configuration In-Memory Persistence**: While full Drizzle ORM schemas exist (`src/db/schema.ts`), deterministic migration scripts and Docker Compose are not yet implemented. Repositories automatically use in-memory collections when database variables are unset.
2. **Web3 Wallet Flow**: The wallet connection modal currently simulates connection state (`connectMockWallet`). Native browser extension integration (`@stellar/freighter-api`) and cryptographic Ed25519 signature challenges are in progress.
3. **Dual Soroban Clients**: The codebase currently maintains two Soroban client files (`src/server/clients/sorobanClient.ts` and `src/server/services/stellar/sorobanClient.ts`), which are scheduled for consolidation under task ARCH-01.

---

## 📐 Coding Standards & Architecture Guidelines

- **TypeScript**: Strict mode is enabled. All functions, components, props, and API state payloads must be explicitly typed (`src/types/index.ts` and `src/server/types/`). Avoid `any`.
- **Styling**: Use **Tailwind CSS v4** utility classes. Do not write inline styles or separate CSS files.
- **Icons**: Always import icons from `lucide-react`.
- **Frontend Architecture**:
  - State management: Use Zustand (`src/store/useAppStore.ts`) for global UI/navigation state.
  - Data fetching: Use TanStack Query (`src/services/queryClient.ts`) or dedicated client wrappers in `src/services/api/`.
  - Atomic component design: Follow modular folder structure (`src/components/ui/`, `common/`, `layout/`, `ai/`).
- **Backend Architecture**:
  - Layered pattern: Routes (`src/server/routes/`) -> Services (`src/server/services/`) -> Repositories (`src/server/repositories/`) -> Clients/Database.
  - Test coverage: Any new backend service, route, or repository must include corresponding unit/integration tests in `src/server/__tests__/`.
  - Error handling: Use `sendSuccess`, `sendError`, and `sendPaginated` from `src/server/middleware/responseWrapper.ts`.

---

## 🌿 Branch Naming Convention

Use clear, structured branch names:

- `feat/feature-name` (e.g., `feat/soroban-event-parser`)
- `fix/bug-description` (e.g., `fix/horizon-sse-reconnect`)
- `docs/topic-name` (e.g., `docs/architecture-update`)
- `refactor/component-name` (e.g., `refactor/chart-container`)
- `chore/task-description` (e.g., `chore/bump-deps`)

---

## 📝 Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat: add Soroban WASM instruction counter widget`
- `fix: resolve stale connection in Horizon ledger stream`
- `docs: update deployment instructions in README`
- `style: refine glassmorphic card contrast ratios`
- `refactor: extract status chip component to UI design system`
- `test: add unit tests for utility number formatters`

---

## 🔄 Pull Request Process

1. **Create an Issue**: Before starting major work, create an issue or comment on an existing issue to discuss your planned changes.
2. **Branch from `main`**: Ensure your feature branch is created from the latest `main`.
3. **Commit Your Changes**: Follow commit conventions.
4. **Run Verification**:
   ```bash
   npm test
   npm run lint
   npm run build
   ```
5. **Submit PR**: Fill out the Pull Request template completely. Link the relevant issue number (e.g., `Closes #42`).
6. **Code Review**: A maintainer will review your code. Address any feedback promptly.

---

## 🐛 Issue Reporting

When reporting a bug, please use the **Bug Report** issue template and include:
- A clear, descriptive title.
- Steps to reproduce the behavior.
- Expected vs actual result.
- Browser/OS details and console error logs.

---

## 🔍 Code Review Guidelines

Maintainers look for:
1. **Adherence to Type Safety**: No implicit `any` or missing interfaces.
2. **Performance**: Efficient re-rendering, proper memoization or query caching.
3. **Security**: Server-side proxying for sensitive API keys.
4. **UI Consistency**: Alignment with Nolyvatix / LumenIQ design tokens.
