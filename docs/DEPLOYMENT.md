# NOLYVATIX — Production Deployment & Runtime Operations Guide (DEPLOY-01)

This guide documents the production deployment architecture, startup lifecycle, runtime configuration, health/readiness probes, and operational procedures for **Nolyvatix**.

---

## 1. Architectural Principles

Nolyvatix strictly adheres to modern 12-factor application and cloud-native standards:

1. **Build & Runtime Separation**: Production execution runs solely against pre-compiled artifacts (`dist/server.cjs` and `dist/`). Development tools (`vite`, `tsx`, watch runners, HMR) are completely absent from the production container execution path.
2. **Deterministic Database Migrations**: Schema migrations are strictly separated from application startup. Migrations run as a pre-deploy release step or init-container (`npm run db:migrate`).
3. **Explicit Failure Semantics**: Controlled by `REQUIRE_DB`. When `REQUIRE_DB=true`, database unavailability marks the instance unready (HTTP 503) rather than crashing or silently losing persistence.
4. **Orderly Graceful Teardown**: Upon receiving `SIGTERM` or `SIGINT`, the process stops accepting new HTTP connections, drains all active Server-Sent Events (SSE) streams, closes the PostgreSQL connection pool, and exits cleanly within 10 seconds.
5. **Reverse-Proxy Readiness**: Standardized `trust proxy` support, strict CORS allowlisting, and robust security headers (HSTS, CSP, X-Content-Type-Options).

---

## 2. Production Build & Start Workflow

### Build Phase
```bash
# 1. Install production and build dependencies
npm ci

# 2. Build Vite static frontend and esbuild Node CommonJS server bundle
npm run build
```
Build Output:
* `dist/` — Compiled static client assets (`dist/index.html`, minified CSS/JS chunks).
* `dist/server.cjs` — Self-contained, single-file CommonJS Node.js bundle for the Express backend with sourcemaps.

### Migration Phase
Run database migrations prior to launching or traffic-shifting to the new runtime:
```bash
npm run db:migrate
```
* Migrations are fully idempotent and safe to run in automated CI/CD pipelines or Kubernetes pre-sync hooks.

### Runtime Start
```bash
NODE_ENV=production npm start
```
* Executes: `node dist/server.cjs`
* Binds to `0.0.0.0:3000`.

---

## 3. Environment Configuration Matrix

All production environment variables are configured via container environment injection or secrets managers (e.g., Google Cloud Secret Manager, AWS Secrets Manager, Kubernetes Secrets).

| Variable | Type | Required in Prod? | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | String | **Yes** | `development` | Set to `production`. Enables strict security sanitization and static file serving. |
| `PORT` | Number | No | `3000` | Port for the HTTP listener. |
| `REQUIRE_DB` | Boolean | Recommended | `false` | When set to `true`, startup and `/api/health/ready` enforce healthy PostgreSQL connectivity. |
| `DATABASE_URL` | String | Recommended | `""` | Full PostgreSQL connection string (`postgresql://user:pass@host:5432/dbname?sslmode=require`). Masked in all logs. |
| `SQL_HOST` | String | Optional | `""` | Discrete DB host (used if `DATABASE_URL` is omitted). |
| `SQL_PORT` | Number | Optional | `5432` | Discrete DB port. |
| `SQL_USER` | String | Optional | `""` | Discrete DB user. |
| `SQL_PASSWORD` | String | Optional | `""` | Discrete DB password. |
| `SQL_DB_NAME` | String | Optional | `""` | Discrete DB database name. |
| `DB_POOL_MIN` | Number | No | `2` | Minimum active connections in the pg pool. |
| `DB_POOL_MAX` | Number | No | `20` | Maximum active connections in the pg pool. |
| `DB_CONNECTION_TIMEOUT_MS` | Number | No | `10000` | Connection acquisition timeout (ms). |
| `DB_IDLE_TIMEOUT_MS` | Number | No | `30000` | Connection idle eviction threshold (ms). |
| `GEMINI_API_KEY` | String | Optional | `""` | Google Gemini AI API key. Server-side only; never exposed to browser. |
| `FIREBASE_PROJECT_ID` | String | Optional | `""` | Firebase project ID for token verification. |
| `ALLOW_DEV_FALLBACK` | Boolean | **No (Must be false)** | `false` | Must be `false` in production to reject unauthenticated spoofing. |
| `CORS_ALLOWED_ORIGINS` | String | Recommended | `""` | Comma-separated list of allowed origins (e.g. `https://nolyvatix.app,https://admin.nolyvatix.app`). |
| `TRUST_PROXY` | String / Number | No | `1` | Express `trust proxy` setting (`1`, `true`, or hops count). |
| `VITE_HORIZON_URL` | String | No | `https://horizon.stellar.org` | Public Stellar Horizon endpoint for client. |
| `VITE_SOROBAN_RPC_URL`| String | No | `https://mainnet.sorobanrpc.com` | Public Soroban RPC endpoint for client. |

---

## 4. Health & Readiness Probes

Nolyvatix provides distinct liveness and readiness probes designed for Kubernetes, Cloud Run, and load-balancer health checkers:

### Liveness Probe
* **Endpoint**: `GET /api/health`
* **Purpose**: Verifies that the Node.js process is alive, listening, and responsive on the event loop.
* **Response**: `200 OK`
```json
{
  "status": "ok",
  "service": "Nolyvatix Stellar Data Layer",
  "timestamp": "2026-09-11T08:45:32.255Z"
}
```

### Readiness Probe
* **Endpoint**: `GET /api/health/ready`
* **Purpose**: Determines if the instance is ready to receive and process user traffic.
* **Checks performed**:
  1. Graceful shutdown state: If server is undergoing shutdown, responds `503 Service Unavailable`.
  2. Database dependency check: If `REQUIRE_DB=true` and PostgreSQL is unreachable or unconfigured, responds `503 Service Unavailable`.
  3. Safe data masking: Does not leak raw connection strings or credentials.
* **Success Response (`200 OK`)**:
```json
{
  "status": "ready",
  "service": "Nolyvatix Stellar Data Layer",
  "database": {
    "status": "healthy",
    "mode": "postgresql"
  },
  "timestamp": "2026-09-11T08:45:40.647Z"
}
```
* **Failure Response (`503 Service Unavailable`)**:
```json
{
  "status": "not_ready",
  "reason": "Database required but unavailable",
  "database": {
    "status": "not_configured",
    "mode": "in_memory_fallback"
  },
  "timestamp": "2026-09-11T08:45:41.000Z"
}
```

---

## 5. Graceful Shutdown Lifecycle

When receiving termination signals (`SIGTERM` from Docker/Kubernetes or `SIGINT` via terminal):

```
┌─────────────────────────────────────────────────────────────┐
│ 1. SIGTERM / SIGINT Received                                │
│    • Set internal `isShuttingDown = true`                   │
│    • Future `/api/health/ready` calls return 503            │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ 2. Close HTTP Listener (`server.close()`)                   │
│    • Stops accepting new TCP connections                    │
│    • In-flight requests are allowed to complete             │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ 3. Drain Real-Time Streams (`eventBus.closeAllClients()`)   │
│    • Broadcasts `event: shutdown` to all connected clients  │
│    • Closes open SSE response sockets cleanly               │
│    • Halts background interval pollers                      │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ 4. Drain Database Connection Pool (`closeDatabasePool()`)   │
│    • Waits for active queries to release                    │
│    • Closes all idle clients in pg.Pool                     │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ 5. Orderly Process Exit (`process.exit(0)`)                 │
│    • Hard fail-safe timer (10s) terminates hanging sockets  │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Routing & Error Handling Architecture

* **SPA Fallback**: In production, GET requests to non-API paths (e.g., `/`, `/analytics`, `/wallets`) serve `dist/index.html`.
* **API Route Isolation**: Unmatched requests under `/api/*` (e.g., `/api/nonexistent`) **never** serve the SPA HTML. They immediately return structured JSON with status 404:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "API endpoint not found: GET /api/nonexistent"
  },
  "timestamp": "2026-09-11T08:45:42.298Z"
}
```
* **Production Error Sanitization**: In `NODE_ENV=production`, internal error stacks and driver-level database messages are scrubbed from HTTP responses and replaced with standard error codes (`INTERNAL_ERROR`, `DATABASE_ERROR`). Full diagnostic details are recorded exclusively in server-side logs.

---

## 7. Containerization (Dockerfile Reference)

A multi-stage container build ensures minimal image size and zero dev dependency leakage:

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production Runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3000
USER node
CMD ["node", "dist/server.cjs"]
```

---

## 8. Verification & Pre-Flight Checklist

Before deploying a release to production:

- [x] Backend tests pass: `npm run test:backend`
- [x] Frontend tests pass: `npm run test:frontend`
- [x] TypeScript validation passes: `npm run typecheck`
- [x] Production build succeeds: `npm run build`
- [x] Database migrations verified: `npm run db:migrate`
- [x] Liveness (`/api/health`) and Readiness (`/api/health/ready`) confirmed
- [x] Unhandled API 404 returns JSON, not HTML
- [x] Secrets masked in logs and configured securely in runtime environment
