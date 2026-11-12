# GrammarPath Phase 2.2 — Regression & Verification Test Report

**Date:** 2026-11-12  
**Workspace:** `/Users/kd.quach03/Documents/grammarpath-app`

---

## 1. Environment & Prisma Startup Discovery During Regression Testing

- **Discovery:** Running `npm run test:unit` after generating Prisma 6.19.3 client caused [`phase1-6-hygiene.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/phase1-6-hygiene.test.ts) (fail-closed startup check when `JWT_SECRET` is omitted) to observe exit status `0` instead of `1`.
- **Root Cause:** Importing `./lib/prisma` at top-level in [`backend/src/server.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/server.ts) executed `new PrismaClient()` at module load, causing Prisma 6.19.3 to auto-read `backend/.env` before `validateEnv(process.env)` inspected `process.env.JWT_SECRET`.
- **Resolution:** Moved `import prisma from "./lib/prisma"` in [`backend/src/server.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/server.ts#L16-L18) below the `validateEnv(process.env)` guard, rebuilt `dist/`, and re-verified `npm run test:unit`. All `8` hygiene tests passed.

---

## 2. Complete Executed Test & Build Ledger

| Suite / Gate | Exact Command | Result | Details / Scope |
| :--- | :--- | :---: | :--- |
| **Backend TypeScript Build** | `cd backend && npm run build` | **PASS** (exit `0`) | Compiled `tsc` output cleanly including updated `server.ts`, `grader.ts`, `toeic-generator.service.ts`, `adaptive.controller.ts` |
| **Backend Unit Tests** | `cd backend && npm run test:unit` | **PASS** (`5/5` files, **48/48** tests) | `phase1-6-hygiene` (8), `phase1-7-staging-guard` (6), `phase1-security-hardening` (22), `phase2-1-unit` (8), `phase2-2-unit` (4) |
| **Migration SQL Verification** | `cd backend && npm run test:migrations` | **PASS** (exit `0`) | `5` enums, `29` tables, `31` FKs, `21` CHECK constraints, `48` indexes |
| **Staging Migration Status** | `cd backend && npm run prisma:status:staging` | **PASS** (exit `0`) | `3 migrations found in prisma/migrations`, `Database schema is up to date!` |
| **Backend Staging API Suite** | `cd backend && npm run test:api:staging` | **PASS** (`8/8` files, **65/65** tests, `97.46s`) | `phase2-1-remediation.api` (10), `adaptive-toeic.api` (11), `grading.api` (11), `adaptive.api` (7), `exercises.api` (8), `auth-and-progress.api` (7), `curriculum.api` (9), `phase2-2-qa.api` (2) |
| **Frontend Typecheck** | `cd frontend && npm run typecheck` | **PASS** (exit `0`) | `tsc --noEmit` with zero errors |
| **Frontend Component Suite** | `cd frontend && npm test` | **PASS** (`10/10` files, **64/64** tests, `3.51s`) | `adaptive-and-ai` (4), `phase2-2-ux` (4), `formatted-theory` (8), `phase1-6-api-url` (6), `exercise-renderer` (17), `adaptive-toeic` (2), `auth-and-progress` (6), `phase1-runtime-reliability` (8), `catalog-and-theory` (5), `toeic-roadmap` (4) |
| **Frontend Production Build** | `cd frontend && npm run build` | **PASS** (`1.63s`) | `tsc -b && vite build` transformed `1611` modules cleanly |
| **Live 4,414-Q Audit B Sweep** | `audit_b_and_c.ts` (staging DB) | **PASS** (exit `0`) | `0` renderer mismatches, `0` canonical failures, `0` variant failures, `0` alternative-answer failures across `3,753` interactive items |
| **Live 145-Unit TOEIC Sweep** | `audit_b_and_c.ts` (staging DB) | **PASS** (exit `0`) | `0` defects across `435` deterministic calls; `count=5` -> `145/145`, `count=10` -> `142/145`, `count=20` -> `127/145` (sparse units fail closed cleanly with `422`) |
| **Live Audit A/D/E Sweep** | `audit_a_d_e.ts` (staging DB) | **PASS** (exit `0`) | `14` read routes (`guest+auth`), `24` query bypasses -> `403`, `4` solution locks -> `401`/`403`, Flows `1–10`, dedupe & DB cleanup -> `0` test rows |

---

## 3. New Regression Test Files Added in Phase 2.2

- [`backend/tests/phase2-2-unit.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/phase2-2-unit.test.ts) (`4` unit tests): `""` zero-article multi-blank grading + TOEIC stem/option/"OK"/slash-prompt/forbidden-distractor hardening.
- [`backend/tests/phase2-2-qa.api.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/phase2-2-qa.api.test.ts) (`2` live staging API integration tests): live HTTP `73.1-q7` `["", "the"]` grading + tricky TOEIC unit generation (`24, 98, 110, 121, 145`) spoiler/defect checks.
- [`frontend/tests/phase2-2-ux.test.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/tests/phase2-2-ux.test.tsx) (`4` RTL/JSDOM tests): ordered `Blank #`/`Part #` feedback chips, `QuestionCard` multi-part solution hydration, `ToeicPracticeModal` `"are / debating"` 2-blank fill, and `Escape` dismissal for `RuleReferenceModal` + `AuthModal`.

