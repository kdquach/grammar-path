# Phase 2.1 Report — Workstream E: TOEIC Generator Integrity, Distribution & Anti-Spoiler Persistence

**Phase:** 2.1 (Core Learning System Remediation)  
**Target Area:** `toeic-generator.service.ts`, `POST /api/v1/adaptive/toeic-practice`, `POST /api/v1/adaptive/toeic-practice/check`, & `ToeicPracticeModal.tsx`  
**Status:** COMPLETED & VERIFIED ON STAGING

---

## 1. Original Audit Findings

Phase 2.0 identified serious quality and integrity failures in the TOEIC Part 5 practice subsystem:
1. **Unfair Fallback Drift:** Non-Unit-1 requests (`unitNumber > 1`) fell back to static generic/Unit-1 items or returned mismatched grammar rules when AI generation was unavailable.
2. **Pre-Submission Spoiler Leakage:** `POST /api/v1/adaptive/toeic-practice` returned `correctAnswer` and `explanation` immediately, and `ToeicPracticeModal.tsx` evaluated answers client-side.
3. **Key-Bias & Prompt Bugs:** Static/dynamic items clustered disproportionately on option `B`, left literal `{blank}` or ellipsis (`...`) markers next to `_______`, and failed to honor requested counts up to `count=20` across non-curated units.
4. **Inadequate Attribution & Strict Count Bugs:** Modal lacked explicit non-ETS source disclosure and count controls (`5 / 10 / 20`).

---

## 2. Root Cause Analysis

- `toeic-generator.service.ts` relied on small hardcoded Unit 1–5/fallback arrays instead of dynamically adapting canonical unit questions (`unitQuestions`), theory sections, and distractor pools from PostgreSQL.
- No persisted session/item model existed in Prisma (`toeic_practice_sessions`, `toeic_practice_items`) to support server-side checking (`POST /adaptive/toeic-practice/check`).
- `normalizePromptWithBlank` failed to match curly `{blank}` / `{blank:N}` markers and `...` tokens, causing artifacts such as `"it {blank} _______"` on Unit 145.
- Gemini timeouts (`8000ms` per model across 4 models without cooldown) caused slow stalls when upstream Gemini returned `HTTP 503`.

---

## 3. Files Modified / Added

- `backend/prisma/schema.prisma` (`ToeicPracticeSession`, `ToeicPracticeItem`)
- `backend/prisma/migrations/20261113000000_add_practice_sessions/migration.sql`
- `backend/src/services/toeic-generator.service.ts`
- `backend/src/controllers/adaptive.controller.ts` (`generateToeicPracticeHandler`, `checkToeicPracticeHandler`)
- `backend/src/routes/adaptive.routes.ts` (`POST /adaptive/toeic-practice/check`)
- `backend/src/controllers/ai.controller.ts` (`timeoutMs: 5000` bound for fail-closed AI theory fallback)
- `frontend/src/types/api.types.ts`
- `frontend/src/api/client.ts` (`checkToeicPracticeAnswer`)
- `frontend/src/components/adaptive/ToeicPracticeModal.tsx`
- `backend/tests/adaptive-toeic.api.test.ts`
- `backend/tests/phase2-1-remediation.api.test.ts`
- `backend/tests/phase2-1-unit.test.ts`
- `frontend/tests/adaptive-toeic.test.tsx`
- `frontend/tests/toeic-roadmap.test.tsx`

---

## 4. Implementation Details

### Unit-Grounded Dynamic Synthesis & Prompt Normalization
- Overhauled `toeic-generator.service.ts` so every unit (`1..145`) combines curated unit items (where available), Gemini synthesis (with 4000ms per-model timeout + 60s `geminiCooldownUntil` circuit breaker on upstream unavailability), and deterministic unit-grounded conversion of canonical textbook questions (`buildDynamicQuestionsFromUnitDb`).
- Fixed `normalizePromptWithBlank` (lines 835–859) so `[blank]`, `{blank}`, `{blank:N}`, `{_..._}`, `[___]`, `___`, and standalone `...` / `....` convert cleanly into a single `_______` placeholder.
- Implemented `rebalanceBatchOptionDistribution` rotating options cleanly across keys `A`, `B`, `C`, and `D` so 20-question batches exhibit uniform answer distribution (`5 A / 5 B / 5 C / 5 D` for `count = 20`) instead of skewing to `B`.
- Explicitly fails closed with `422 INSUFFICIENT_CONTENT` if a unit lacks valid source questions to synthesize an authentic question batch rather than fabricating unrelated Unit 1 content.
- Includes explicit `source`, `isOfficialToeic: false`, and honest `sourceNotice` disclosure clarifying items are grammar drills in TOEIC Part 5 format (not official ETS exams).

### Non-Spoiler Session Persistence & Server Grading
- Persists sessions in `toeic_practice_sessions` and items in `toeic_practice_items`.
- `POST /api/v1/adaptive/toeic-practice` returns `{ sessionId, unitNumber, title, difficulty, source, isOfficialToeic: false, sourceNotice, requestedCount, actualCount, questions }` with `correctAnswer` and `explanation` strictly omitted (`itemId`, `prompt`, `options`, `ruleReference`, `source`, `difficulty`).
- `POST /api/v1/adaptive/toeic-practice/check` validates `A|B|C|D`, verifies `session.userId === userId` (`403 FORBIDDEN`), evaluates server-side, increments `attemptCount`, records `studentAnswer`/`isCorrect`/`answeredAt`, deduplicates via `runDeduplicatedSubmission`, and reveals `correctAnswer` + `explanation` post-submission.

### Frontend Modal Controls
- Updated `ToeicPracticeModal.tsx` with count selector buttons (`5`, `10`, `20`), provenance/non-ETS disclaimer banner, `inFlightIndicesRef` double-submit lock, and server grading via `api.checkToeicPracticeAnswer`.

---

## 5. Observed Verification Results

- **Staging Multi-Unit Script (`[1, 5, 42, 70, 98, 121, 145]`, `count=20`, offline Gemini):**
  - All 7 sampled units generated `20` unit-grounded items with clean `_______` blanks (including Unit 145) and exact `A: 5, B: 5, C: 5, D: 5` distribution.
- **Offline Unit Tests (`tests/phase2-1-unit.test.ts`):** Verified `rebalanceBatchOptionDistribution` (exact `5/5/5/5` on 20 items), `{blank}` / `...` normalization without `{blank}` leakage, and `422 INSUFFICIENT_CONTENT` behavior.
- **Backend Staging API Tests (`tests/adaptive-toeic.api.test.ts` — `11/11` passed; `tests/phase2-1-remediation.api.test.ts` — Scenario 10 passed):**
  - Verified Unit 98 `count=20` returns `20` unit-grounded `Adjectives and adverbs 1` items, balanced DB distribution (`A..D >= 3`, exact 5/5/5/5), zero pre-submission spoiler fields (`correctAnswer` / `explanation` absent), ownership check (`403` for User B submitting User A's item), server-graded feedback, and DB persistence.
- **Frontend Tests (`tests/adaptive-toeic.test.tsx` — `2/2` passed; `tests/toeic-roadmap.test.tsx` — `4/4` passed):**
  - Verified non-ETS disclaimer text, `5/10/20` count switching, server check invocation, and explanation/rule badge reveal.

---

## 6. Remaining Limitations & Regression Risks

- **Distractor diversity in small units:** Units with unusually repetitive answer forms rely on cross-question unit answer distractors + curated inflection variants (`createInflectionDistractors`); if an extreme edge unit had fewer than 4 distinct forms, `422 INSUFFICIENT_CONTENT` triggers by design rather than inventing off-unit distractors. (Across sampled curriculum units `[1, 5, 42, 70, 98, 121, 145]`, all succeeded with 20 valid items.)
- **Upstream Gemini availability:** Live Gemini preview models returned `HTTP 503` during integration verification; dynamic DB synthesis + `geminiCooldownUntil` kept TOEIC generation responsive and deterministic without stalling users.

