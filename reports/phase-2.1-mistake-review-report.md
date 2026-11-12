# Phase 2.1 Report — Workstream C: Mistake Review Parity & Latest-Attempt Resolution

**Phase:** 2.1 (Core Learning System Remediation)  
**Target Area:** `GET /api/v1/progress/mistakes`, `services/mistakes.service.ts`, & `MistakeReviewPage.tsx`  
**Status:** COMPLETED & VERIFIED ON STAGING

---

## 1. Original Audit Findings

Phase 2.0 surfaced two critical bugs in the Mistake Review workflow:
1. **Stale Historical Mistakes:** `getMistakes` queried any question with historical `isCorrect = false` rather than inspecting the user's *latest* attempt per question, or inconsistently omitted structural data (`options`, `blanks`, `parts`, `wordBankItems`).
2. **Broken Retry UI:** `MistakeReviewPage.tsx` rendered only a single plain `<input type="text">` ("Type your correction..."), making multi-blank (`["No-one", "anyone"]`), option-key, multi-select, and multi-part mistakes impossible to answer properly on retry, and showed raw JSON strings (`["Nothing","nothing"]`) for array answers.

---

## 2. Root Cause Analysis

- `progress.controller.ts` contained bespoke raw SQL in `getMistakes` that did not select `instruction`, `wordBankItems`, `options`, `blanks`, `parts`, `visualContextDescription`, `contextClue`, or `ruleReference`.
- `adaptive.controller.ts` duplicated a separate mistake SQL query instead of sharing a canonical latest-attempt mistake selector.
- `MistakeReviewPage.tsx` did not reuse the polymorphic exercise renderers or WordBank integration, and lacked a double-submit guard or post-resolve analytics refresh.

---

## 3. Files Modified / Added

- `backend/src/services/mistakes.service.ts` (new canonical service: `getLatestUnresolvedMistakes`)
- `backend/src/controllers/progress.controller.ts` (delegates `getMistakes` to `getLatestUnresolvedMistakes` with enriched DTO)
- `backend/src/controllers/adaptive.controller.ts` (delegates adaptive mistake sourcing to `getLatestUnresolvedMistakes`)
- `frontend/src/types/api.types.ts` (expanded `MistakeItem` interface)
- `frontend/src/pages/MistakeReviewPage.tsx` (polymorphic renderers + `WordBankBar` + `QuestionFeedbackPanel` + `RuleReferenceModal` + duplicate-submit lock + analytics refresh)
- `backend/tests/phase2-1-remediation.api.test.ts`
- `frontend/tests/auth-and-progress.test.tsx`
- `frontend/tests/phase1-runtime-reliability.test.tsx`

---

## 4. Implementation Details

### Backend Canonical Latest-Attempt Mistake Service
- Created [`getLatestUnresolvedMistakes`](../backend/src/services/mistakes.service.ts#L39-L139) using PostgreSQL `DISTINCT ON (qai.question_id)` ordered by `qai.created_at DESC, qai.id DESC`, excluding null/unanswered items (`student_answer IS NOT NULL AND student_answer::text <> 'null'`), and filtering `WHERE "isCorrect" = false`.
- Hydrates each unresolved mistake with `options`, `blanks`, `parts`, `wordBankItems`, `instruction`, `hasVisualContext`, `visualContextDescription`, `contextClue`, and `ruleReference`.
- Uses `formatQuestion(q, false)` strictly so zero correct answers or pre-retry explanations leak into `GET /api/v1/progress/mistakes`.
- Historical `QuestionAttemptItem` rows remain immutable in PostgreSQL; passing a retry later creates a newer `isCorrect = true` row which supersedes the old failure in `DISTINCT ON`.

### Frontend Polymorphic Retry Experience
- `MistakeReviewPage.tsx` renders each mistake using the exact renderer matched to its metadata:
  - `OptionQuestionRenderer` (including multi-select for 17.2/24.1-style items)
  - `MultiPartQuestionRenderer` (record map `{ partId: answer }`)
  - `FillBlankQuestionRenderer` (single & multi-blank + split slash choice pills)
  - `SentenceQuestionRenderer` (fallback free-response text input with placeholder `Type full sentence or missing phrase...`)
- Renders exercise `instruction`, clickable `WordBankBar` with field-focus insertion, `RuleReferenceModal` inspection button, human-readable `formatStudentAnswerSummary(item.lastStudentAnswer)` (`"Nothing / nothing"` instead of raw JSON), `inFlightChecksRef` double-submit lock, `QuestionFeedbackPanel` upon resolving, and `analyticsRefreshKey` propagation to `<AdaptiveReviewPanel refreshKey={analyticsRefreshKey} />`.

---

## 5. Observed Verification Results

- **Backend Adversarial Integration (`tests/phase2-1-remediation.api.test.ts` — Scenario 3 passed):**
  - Submitted wrong array answer on multi-blank `86.4-q9` -> `GET /progress/mistakes` returned `86.4-q9` with `blanks` (length 2), `options`, and `instruction`, with zero answer keys.
  - Submitted valid `["No-one", "anyone"]` retry -> `GET /progress/mistakes` cleared `86.4-q9` cleanly, while raw DB `QuestionAttemptItem` history retained both rows (`count === 2`, preserving history).
- **Frontend Tests (`tests/auth-and-progress.test.tsx` — `6/6` passed; `tests/phase1-runtime-reliability.test.tsx` — `8/8` passed):**
  - Verified plain sentence retry resolves and renders `QuestionFeedbackPanel`.
  - Verified multi-blank `86.4-q9` mistake renders `Blank #1` & `Blank #2`, displays `"Nothing / nothing"`, supports slash pill + `WordBankBar` click insertion, submits `["No-one", "anyone"]`, resolves mistake, and triggers `getAdaptiveAnalytics` refresh.

---

## 6. Remaining Limitations & Regression Risks

- **Order stability in SQL `DISTINCT ON`:** Relies on `(created_at DESC, id DESC)`; same-millisecond concurrent inserts without deduplication would tie-break on UUID `id`. Backend deduplication prevents duplicate concurrent submits from the UI, mitigating tie-break ambiguity.
- **Page reload dismissal vs optimistic dismissal:** When resolved inline, items display a green `Resolved! Cleared from mistakes list` card with `Dismiss` until reload, after which `/progress/mistakes` excludes them permanently.

