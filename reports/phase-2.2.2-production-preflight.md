# GrammarPath — Phase 2.2.2 Production Deployment Preflight Report

> **Date:** 2026-11-12  
> **Phase:** 2.2.2 — Final UX Polish & Production Deployment Preflight  
> **Audit Mode:** **READ-ONLY** (Zero production connections, zero production migrations, zero secrets logged)

---

## 1. Hosting & Deployment Topology Assessment

Inspection of `grammarpath-app` confirms:
- **Build Outputs:**
  - **Backend API ([backend/package.json](file:///Users/kd.quach03/Documents/grammarpath-app/backend/package.json)):** Compiles TypeScript (`npm run build` -> `tsc`) to `backend/dist/src/server.js`, launched via `npm start` (`node dist/src/server.js`).
  - **Frontend SPA ([frontend/package.json](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/package.json)):** Static Vite bundle (`npm run build` -> `tsc -b && vite build`) emitted under `frontend/dist/`.
- **CI Workflow ([.github/workflows/ci.yml](file:///Users/kd.quach03/Documents/grammarpath-app/.github/workflows/ci.yml)):** Runs CI verification jobs (`backend-verify` and `frontend-verify`) on Node.js 20 only.
- **No Checked-In Infrastructure Manifests:** There are **no** `Dockerfile`, `nginx.conf`, `vercel.json`, `render.yaml`, `railway.json`, or `fly.toml` manifests committed in `grammarpath-app`.
- **Supported Production Topologies:**
  1. **Single-Origin Reverse Proxy (Recommended for simplicity):** TLS-terminating reverse proxy (Nginx / ALB / Caddy) serves `frontend/dist` and routes `/api/*` -> `http://127.0.0.1:<PORT>`; `VITE_API_BASE_URL` stays unset/empty (`""`), using relative `/api/v1`.
  2. **Split-Origin Hosting:** Static CDN/host serves `frontend/dist` at `https://app.example.com`; Node service hosts `/api/v1` at `https://api.example.com`; `VITE_API_BASE_URL` is built with `https://api.example.com` and backend `CORS_ORIGIN` must explicitly include `https://app.example.com`.

---

## 2. Reverse Proxy, `TRUST_PROXY`, and Rate Limiting

- **Proxy Trust Policy ([env.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/config/env.ts#L58-L91), [app.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/app.ts#L13-L15)):**
  - `app.disable("x-powered-by")`.
  - `TRUST_PROXY` accepts `"false"` / `"0"` (direct traffic -> `false`), integer `"1".."10"` (trusted reverse-proxy hop count), or `"true"` (normalized strictly to `1`). Permissive Express boolean `true` is **never** passed, preventing spoofed `X-Forwarded-For` prefixes from bypassing rate limits.
  - **Production Action Required:** Set `TRUST_PROXY="1"` for a single edge proxy/PaaS router (Nginx/ALB/Render/Railway), or `TRUST_PROXY="2"` behind CDN + edge proxy (e.g., Cloudflare -> Nginx -> Node).
- **Rate Limiter Constraints ([rate-limit.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/middleware/rate-limit.ts)):**
  - `authRateLimiter` protects `/api/v1/auth/register` and `/api/v1/auth/login` (default `15` requests per `900,000ms` window keyed by IPv4/IPv6-normalized `req.ip`).
  - `aiRateLimiter` protects `POST /api/v1/theory/explain-theory`, `POST /api/v1/adaptive/toeic-practice`, and `POST /api/v1/adaptive/quiz/generate` (default `20` requests per `900,000ms` keyed by `user:${id}`, fallback normalized `req.ip`).
  - **Architectural Limitation:** Both limiters use in-process `MemoryStore`. Single-instance Node deployments behave accurately; multi-replica horizontal autoscaling requires upgrading to a shared store (e.g., Redis) before scaling beyond 1 instance.

---

## 3. HTTPS / TLS Termination & CORS Allowlist

- **TLS Termination:** Node server ([server.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/server.ts)) listens over plain HTTP (`app.listen(env.port)`); TLS termination must happen at the upstream edge proxy/load balancer. `helmet()` is mounted globally in [app.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/app.ts#L18).
- **CORS Allowlist ([env.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/config/env.ts#L19-L56), [app.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/app.ts#L20-L39)):**
  - Parses comma-separated `CORS_ORIGIN`, validates `http:` / `https:` URLs, normalizes to `parsed.origin`, and rejects wildcard `*` with a fatal startup error.
  - When `NODE_ENV=production` and `CORS_ORIGIN` is empty/unset, `corsOrigins` evaluates to `[]`, causing all cross-origin browser requests (`Origin` header present) to fail closed with `403 CORS_FORBIDDEN`, while same-origin browser calls / non-browser health probes (no `Origin` header) pass cleanly.
  - Production browser origins must use `https://`.

---

## 4. Frontend API Base URL Configuration

- Implemented in [apiUrl.ts](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/api/apiUrl.ts), [client.ts](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/api/client.ts), [vite.config.ts](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/vite.config.ts), and documented in [frontend/.env.example](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/.env.example):
  - `VITE_API_BASE_URL` is a **build-time** Vite environment variable.
  - Normalizer strips trailing slashes and accidental `/api/v1` suffixes so `/api/v1` is never duplicated.
  - Set `VITE_API_BASE_URL` empty/unset for single-origin reverse proxy hosting, or origin-only (`https://api.yourdomain.com`) for split-origin hosting.

---

## 5. Production Environment Variable Matrix

| Component | Variable | Required? | Production Rule / Verification |
|---|---|---|---|
| Backend | `NODE_ENV` | **Yes** | Must be `"production"` (disables dev CORS defaults) |
| Backend | `PORT` | Recommended | Integer `1..65535` (default `4000`) |
| Backend | `DATABASE_URL` | **Yes** | Neon PostgreSQL SSL URL (`?sslmode=require`). Read directly by [schema.prisma](file:///Users/kd.quach03/Documents/grammarpath-app/backend/prisma/schema.prisma#L9-L12) |
| Backend | `JWT_SECRET` | **Yes** | Fail-closed at boot: `>=32` chars, `>=4` unique chars, rejects placeholders |
| Backend | `JWT_EXPIRES_IN` | Optional | Duration string (default `"7d"`) |
| Backend | `CORS_ORIGIN` | Conditionally Yes | Required if split-origin (`https://...`); empty `""` allowed only for single-origin proxy |
| Backend | `TRUST_PROXY` | **Yes** (behind proxy) | `"1"` (single proxy) or `"2"` (CDN + proxy); `"false"` if direct |
| Backend | `BODY_LIMIT` | Optional | Bounded parser limit (default `"100kb"`) |
| Backend | `RATE_LIMIT_WINDOW_MS` | Optional | `1000..3600000` (default `900000`) |
| Backend | `RATE_LIMIT_AUTH_MAX` | Optional | `1..1000` (default `15`) |
| Backend | `RATE_LIMIT_AI_MAX` | Optional | `1..1000` (default `20`) |
| Backend | `GEMINI_API_KEY` | Recommended | Required for live AI Theory Tutor & dynamic AI TOEIC generation; sent only via `x-goog-api-key` header |
| Backend | `GEMINI_MODEL` | Optional | Overrides default primary model in fallback chain |
| Frontend | `VITE_API_BASE_URL` | Build-time | Empty (`""`) for single-origin proxy; origin-only `https://api...` for split-origin |

### Configuration Discrepancy / Operational Warning (`DATABASE_URL` vs `DIRECT_URL`)
- [backend/.env.example](file:///Users/kd.quach03/Documents/grammarpath-app/backend/.env.example#L3-L5) documents `DATABASE_URL`, `DIRECT_URL`, and `POOLED_DATABASE_URL`, whereas [schema.prisma](file:///Users/kd.quach03/Documents/grammarpath-app/backend/prisma/schema.prisma#L9-L12) currently defines only `url = env("DATABASE_URL")` (no `directUrl`).
- **Impact:** If production runtime uses a Neon `-pooler` URL in `DATABASE_URL`, `prisma migrate deploy` must explicitly override `DATABASE_URL` with the **direct non-pooled** PostgreSQL endpoint during migration execution (see the Migration Deployment Runbook).

---

## 6. Gemini AI Configuration & Resilience

- Verified in [gemini.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/lib/gemini.ts) and [toeic-generator.service.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-generator.service.ts):
  - API key is transmitted exclusively in the `x-goog-api-key` request header (never in URL query parameters).
  - Timeout per candidate model request: `15,000ms` via `AbortController`.
  - Default fallback chain: `gemini-3-flash-preview` -> `gemini-flash-lite-latest` -> `gemini-3.1-flash-lite-preview` -> `gemini-flash-latest`.
  - Missing key or upstream outage triggers a `60,000ms` circuit cooldown cleanly: TOEIC generation falls back to deterministic curated/rule-based items without HTTP 500, while `POST /api/v1/theory/explain-theory` fails closed with HTTP `503 AI_PROVIDER_UNAVAILABLE` ([ai.controller.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/ai.controller.ts)).

---

## 7. Prisma Migration History & Startup/Health-Check Behavior

- **Authoritative Migration Owner:** `grammarpath-app/backend/prisma/migrations` contains `3` chronological migrations:
  1. `20261105000000_init_schema` (`SHA-256: 83d240dcac514168b953a26d2d7fed6aa800e4f6eab662b9fb0172c36bb3eae0`)
  2. `20261106000000_add_user_progress_tables` (`SHA-256: 659e086db5fc1fad6ee07d9e52a69d6c8324b7f3652c0e38bac7344acebc7e41`)
  3. `20261113000000_add_practice_sessions` (`SHA-256: 976b5ee311bf8c64b1cc971d737dbe2628def72ccc697181e78cb1407b2c64a7`)
- **Staging Verification:** `grammarpath-staging` verified `3/3` migrations applied (`prisma migrate status`: `Database schema is up to date!`) and `0` schema drift (`prisma migrate diff`: `No difference detected.`). Production is expected to be missing `20261113000000_add_practice_sessions` until the runbook in `phase-2.2.2-migration-deployment-runbook.md` is executed.
- **Startup & Shutdown ([server.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/server.ts)):**
  - `validateEnv(process.env)` executes **before** importing Prisma or mounting Express; invalid env logs a non-secret error and calls `process.exit(1)`.
  - `SIGINT` and `SIGTERM` close HTTP keep-alive/listeners and await `prisma.$disconnect()`.
- **Health Endpoint (`GET /api/v1/health`, [health.controller.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/health.controller.ts)):**
  - Executes `SELECT 1` and `prisma.unit.count()`, returning HTTP `200` `{ success: true, data: { status: "ok", database: "connected", totalUnits } }`, or propagating HTTP `500` if DB connectivity fails. Ready for container/load-balancer readiness probes (verify `totalUnits === 145` post-deploy).

---

## 8. Preflight Go / No-Go Checklist for Operator

- [ ] Target hosting platform chosen and reverse proxy routes `/api/*` -> Node (`PORT`) with `TRUST_PROXY` set to exact hop count (`"1"` or `"2"`).
- [ ] `JWT_SECRET` generated securely (`>=32` random chars), never matching `.env.example` placeholders.
- [ ] Single-instance deployment policy confirmed for in-memory rate limiters (`MemoryStore`), OR Redis store provisioned prior to multi-replica scaling.
- [ ] Production DB backup / Neon branch snapshot taken before applying `20261113000000_add_practice_sessions`.
- [ ] Production Unit 110 canonical DB reconciliation status verified (`grammarpath-data` pipeline tracked separately if production still reflects pre-1.6 Unit 110 rows).

