# GrammarPath Phase 3.1 — Final Independent Verification Report
**Independent QA Audit, Database Semantics Verification, and Browser E2E Inspection**

- **Date:** 2026-11-13
- **Auditor:** Senior Independent QA Engineer & Database Auditor
- **Target Environment:** Neon PostgreSQL Staging (`ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging`)
- **Canonical Dataset:** `grammarpath-data` (Murphy *English Grammar in Use*, 4th Edition, Units 1–145)
- **Application Codebase:** `grammarpath-app`

---

## 1. Executive Verdict

### **VERIFIED PASS WITH CONDITIONS**

The Phase 3.1 implementation has been independently evaluated across all architectural, database, backend, frontend, and browser dimensions. All functional, data model, and user-facing requirements are operational, and all automated test suites pass 100% against the live Neon staging database.

The verdict is designated as **VERIFIED PASS WITH CONDITIONS** (rather than an unconditional Pass) due to four concrete architectural discrepancies and pedagogical observations identified between the initial completion report and the actual database state:

1. **`chk_qai_attempt_status_consistency` SQL Scope:** The database CHECK constraint enforces consistency between `attempt_status` and `is_correct`, but does **not** assert `student_answer IS NULL` directly in PostgreSQL DDL (as claimed in the initial report). This requirement is currently guarded by the application layer.
2. **PostgreSQL 3-Valued Logic Nuance on CHECK Constraints:** Under PostgreSQL's 3-valued boolean logic (`TRUE`, `FALSE`, `UNKNOWN`), conditions evaluating to `UNKNOWN` pass CHECK constraints. A raw SQL tuple `('correct', NULL)` evaluates to `UNKNOWN` and is not rejected by the engine constraint alone; runtime schema guards (Zod/Prisma) enforce nullability.
3. **Automated Structural Inference for Concept Confidence:** Link confidence levels (`high`, `medium`, `needs_review`) are derived from automated explanation rule-reference heuristics rather than manual review by English language educators.
4. **Correction of `needs_review` Unit References:** The initial theory mapping report listed Units 110, 137, 142, and Appendixes as `needs_review`. The actual database records in `concept_theory_links` flag 7 specific introductory and comparative sections (Units 1A, 6A, 15B, 16C, 18D, 113D, 123D).

All automated test suites, end-to-end user workflows, migration idempotency, and data models are fully functional and ready for Phase 3.2 upon acceptance of these documented conditions.

---

## 2. Playwright Execution Evidence & History Audit

### 2.1 Audit of Prior Session Execution Logs
An audit of the previous session execution transcripts revealed the following timeline:
- The initial test suite runs encountered process signal termination and port binding conflicts (`listen EADDRINUSE: address already in use :::3000`).
- The developer server remained bound to active socket handles, causing a Playwright runner task to be forcibly terminated.
- Although the assertions inside the runner script passed, the previous process did not terminate with a natural exit code 0, and browser screenshots were not written to the final reports directory.
- Despite this, the completion report asserted an unconditional Playwright PASS.

### 2.2 Fresh Independent Browser Verification Execution
To eliminate any ambiguity and independently prove browser readiness, a dedicated standalone verification runner ([run-independent-browser-verification.mjs](file:///Users/kd.quach03/Documents/grammarpath-app/backend/scripts/run-independent-browser-verification.mjs)) was executed.

- **Execution Command:**
  ```bash
  cd /Users/kd.quach03/Documents/grammarpath-app/backend && node scripts/run-independent-browser-verification.mjs
  ```
- **Process Exit Code:** `0` (Clean normal termination)
- **Target Backend:** `http://localhost:3000` (backed by Neon Staging Database)
- **Target Frontend:** `http://localhost:5173` (Vite SPA production build)
- **Total Browser Test Assertions:** **14 / 14 Passed** (0 failed, 0 skipped)

### 2.3 Browser Verification Assertion Details
The independent execution tested the following end-to-end journey in Chromium:
1. **Unauthenticated Dashboard Gate:** Attempting to view `/dashboard` while signed out safely redirects to home with authentication modal prompt.
2. **New Learner Registration:** Created an isolated staging audit user (`audit-independent-<timestamp>@grammarpath.local`).
3. **Empty Dashboard State:** Verified new user sees null accuracy badge `"—"` (strictly never `0%`), `0%` curriculum progress, `0` active mistakes, and empty-state placeholders.
4. **Partial Exercise Submission:** Navigated to Unit 1 (`/units/1`), loaded Exercise 1.1 (8 blanks). Completed Blank 1 correctly (`"She's taking"`), answered Blank 2 incorrectly (`"She are taking"`), and left Blanks 3–8 empty. Clicked Submit.
5. **Session Reload & Unanswered Badge Persistence:** Reloaded the exercise page from server. Verified Blank 1 restored as `Correct`, Blank 2 as `Incorrect`, and Blanks 3–8 as `Unanswered` badges.
6. **Dashboard Accuracy Reflection:** Returned to `/dashboard`. Verified evaluated questions count is 2 (1 correct, 1 incorrect), accuracy displays exactly `50.0%`, and 6 unanswered blanks do **not** degrade accuracy.
7. **Cross-Page Agreement (`/progress` vs `/dashboard`):** Verified `/progress` and `/dashboard` agree on 1 completed unit exercise.
8. **Mistake Review & Remediation:** Navigated to `/mistakes`. Blank 2 was listed as an active mistake. Submitted correct answer (`"She's having"`). Active mistake count dropped to 0.
9. **Remediated Dashboard Accuracy:** Returned to `/dashboard`. Evaluated count updated to 3 (2 correct, 1 incorrect), accuracy reflected `66.7%`, and active mistakes displayed `0`.
10. **TOEIC Practice Modal:** Opened TOEIC practice drill modal; selected 5 questions; verified session launched with proper `toeic_practice` telemetry.
11. **Responsive Viewport Test:** Resized viewport to iPhone SE mobile dimensions (375 × 812). Verified layout reflows into single column with `0px` horizontal page overflow (`scrollWidth <= innerWidth`).
12. **Console & Network Cleanliness:** 0 browser console errors, 0 unhandled promise rejections, 0 HTTP 5xx responses.
13. **Staging Cleanup:** The temporary audit user was cleanly pruned from the staging database via `finally` teardown.

### 2.4 Visual Artifacts
The 5 required visual artifacts were generated, verified, and saved to disk:

| Artifact File | Size | Resolution | Verified Content |
|---|---|---|---|
| [01-dashboard-empty-state.png](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.1/artifacts/01-dashboard-empty-state.png) | 174 KB | 1280 × 800 | New user dashboard with `"—"` accuracy, empty mistake state |
| [02-exercise-restored-unanswered.png](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.1/artifacts/02-exercise-restored-unanswered.png) | 131 KB | 1280 × 800 | Unit 1.1 partial reload showing 1 correct, 1 incorrect, 6 unanswered badges |
| [03-dashboard-after-partial-and-retry.png](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.1/artifacts/03-dashboard-after-partial-and-retry.png) | 171 KB | 1280 × 800 | Dashboard updated to 66.7% accuracy, 0 active mistakes, recent activity stream |
| [04-toeic-drill.png](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.1/artifacts/04-toeic-drill.png) | 213 KB | 1280 × 800 | Interactive TOEIC Practice drill modal configured with 5-question set |
| [05-dashboard-mobile-responsive.png](file:///Users/kd.quach03/Documents/grammarpath-app/reports/phase-3.1/artifacts/05-dashboard-mobile-responsive.png) | 68 KB | 375 × 812 | Mobile responsive view with zero horizontal overflow |

---

## 3. Automated Verification Results Matrix

All project verification suites were re-executed against the live Neon staging environment without source code modifications:

| Verification Suite | Exact Command | Exit Code | Passed | Failed | Skipped | Notes |
|---|---|:---:|:---:|:---:|:---:|---|
| **Prisma Migration Status** | `npm run prisma:status:staging` | `0` | 4 / 4 | 0 | 0 | Database schema is up to date with 4 applied migrations |
| **Backend Typecheck** | `npx tsc --noEmit` | `0` | — | 0 | — | 0 TypeScript compilation errors |
| **Backend Build** | `npm run build` | `0` | — | 0 | — | Clean build via `tsc` to `dist/` |
| **Backend Unit Tests** | `npm run test:unit` | `0` | 54 | 0 | 0 | 6 suites passed in 0.94s |
| **Backend Staging API Suite** | `node scripts/run-with-staging-env.mjs -- npm run test:api:staging -- --testTimeout=60000` | `0` | 70 | 0 | 0 | 9 suites passed in 131.06s against Neon WAN |
| **Frontend Typecheck & Build** | `npm run typecheck && npm run build` | `0` | — | 0 | — | `tsc -b && vite build` built cleanly in 1.50s |
| **Frontend Vitest Suite** | `npm test` | `0` | 69 | 0 | 0 | 11 suites passed in 1.62s |
| **Browser E2E Suite** | `node scripts/run-independent-browser-verification.mjs` | `0` | 14 | 0 | 0 | Clean execution with 5 screenshots captured |
| **Total Automated Tests** | — | **`0`** | **207** | **0** | **0** | **100% Green Across All Layers** |

---

## 4. Attempt Semantics Verification Deep-Dive

An automated audit script ([audit-phase3-1-attempt-semantics.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/scripts/audit-phase3-1-attempt-semantics.ts)) was executed directly against PostgreSQL staging to test schema enums, constraints, and runtime data handling.

### 4.1 Schema Enums & DDL Inspection
- **`attempt_status_enum`:** Verified registered in `pg_type` with 3 enum values: `correct`, `incorrect`, `unanswered`.
- **`attempt_source_enum`:** Verified registered in `pg_type` with 6 enum values: `single_check`, `exercise_submission`, `adaptive_quiz`, `mistake_retry`, `toeic_practice`, `legacy_unknown`.

### 4.2 Verification of the Six Attempt States

| Test Case | In-Memory / Payload State | Database `attempt_status` | Database `is_correct` | Database `student_answer` | Observed Engine & App Behavior |
|---|---|---|---|---|---|
| **1. Correct Answer** | `"She's taking"` | `'correct'` | `true` | `'"She\'s taking"'::jsonb` | Stored cleanly; increments accuracy and evaluated count. |
| **2. Incorrect Answer** | `"She are taking"` | `'incorrect'` | `false` | `'"She are taking"'::jsonb` | Stored cleanly; enters mistake review; increments incorrect count. |
| **3. Unanswered Question** | `null` / omitted | `'unanswered'` | `NULL` | `NULL` | Stored cleanly; **excluded** from accuracy and mistakes. |
| **4. Explicit Empty String** | `""` (Zero-article blank) | `'correct'` or `'incorrect'` | `true` or `false` | `'""'::jsonb` | Evaluated against accepted answers (e.g., `""` accepted for zero article). Non-null `is_correct`. |
| **5. JSON Null** | `null` | `'unanswered'` | `NULL` | `NULL` | Application maps JSON null to SQL NULL. |
| **6. SQL NULL / Constraint Violations** | Mismatched combinations | Mismatched | Mismatched | Mismatched | Contradictory states rejected by engine CHECK constraint. |

### 4.3 Database CHECK Constraint Technical Analysis
The constraint `chk_qai_attempt_status_consistency` is defined in PostgreSQL as:
```sql
CHECK (
  ("attempt_status" = 'unanswered'::"attempt_status_enum" AND "is_correct" IS NULL) OR
  ("attempt_status" = 'correct'::"attempt_status_enum" AND "is_correct" = true) OR
  ("attempt_status" = 'incorrect'::"attempt_status_enum" AND "is_correct" = false)
)
```

#### Contradictory State Enforcement
All contradictory combinations were submitted directly via raw SQL:
- `('unanswered', false)` -> **REJECTED** (PostgreSQL Error 23514: `check_violation`)
- `('unanswered', true)` -> **REJECTED** (PostgreSQL Error 23514: `check_violation`)
- `('correct', false)` -> **REJECTED** (PostgreSQL Error 23514: `check_violation`)
- `('incorrect', true)` -> **REJECTED** (PostgreSQL Error 23514: `check_violation`)

#### SQL 3-Valued Logic Finding
In SQL, evaluating `NULL = true` yields `UNKNOWN`. Under PostgreSQL's CHECK constraint rules, a constraint is satisfied if the condition evaluates to `TRUE` OR `UNKNOWN` (it is rejected only if it evaluates strictly to `FALSE`). 
Consequently, a direct raw SQL insert of `attempt_status = 'correct'` and `is_correct = NULL` yields `UNKNOWN`, allowing the database engine to accept it. In GrammarPath, application-layer Zod validators and Prisma client logic strictly prevent `isCorrect: null` on evaluated attempts.

#### Student Answer Constraint Finding
The initial report stated that the CHECK constraint required `student_answer IS NULL` when `unanswered` and `student_answer IS NOT NULL` when `correct`/`incorrect`. In reality, the database CHECK constraint does not reference `student_answer`. This rule is enforced in [exercises.controller.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/exercises.controller.ts) and [questions.controller.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/questions.controller.ts).

### 4.4 Accuracy Formula & Historical Data Integrity
- **Formula:**
  $$\text{Accuracy} = \frac{\text{Correct}}{\text{Correct} + \text{Incorrect}}$$
- When $\text{Correct} + \text{Incorrect} = 0$, accuracy is `null` (rendered in UI as `"—"`, never `0%`).
- **Historical Staging Records Audit (1,180 records):**
  - `correct`: 733
  - `incorrect`: 405
  - `unanswered`: 42
  - Records violating consistency: **0**
  - Records with null status or source: **0**
  - Legacy attempts backfilled as `legacy_unknown`: 887 (provenance preserved without fake attribution).

---

## 5. Backfill Idempotency Proof

To verify that seed operations do not produce duplicate data or increment row counts on subsequent runs, [seed-phase3-1-concepts.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/scripts/seed-phase3-1-concepts.ts) was re-executed against the live staging database.

### 5.1 Before vs. After Row Count Audit

| Database Table | Pre-Run Count | Post-Run Count | Delta | Duplicate Key / Code Check |
|---|:---:|:---:|:---:|---|
| `grammar_concepts` | 161 | 161 | **+0** | 0 duplicate `code` values |
| `concept_theory_links` | 542 | 542 | **+0** | 0 duplicate `(concept_id, theory_section_id)` pairs |
| `toeic_roadmap_stages` | 5 | 5 | **+0** | 0 duplicate `stage_number` or `stage_key` |
| `toeic_roadmap_modules` | 16 | 16 | **+0** | 0 duplicate `module_key` |
| `unit_toeic_metadata` | 145 | 145 | **+0** | 0 duplicate `unit_id` |

Conclusion: The seed script uses strictly idempotent `upsert` semantics with unique composite keys, guaranteeing safe re-execution without duplicate rows.

---

## 6. Theory & Concept Mapping Assessment

### 6.1 Explanation to Theory Section Linkage (4,414 Explanations)
A SQL integrity audit joined all 4,414 explanations in the database to their linked `TheorySection`:
- Total explanations: **4,414**
- Explanations with `theory_section_id IS NOT NULL`: **4,414** (100.0%)
- Explanations referencing a theory section from a different unit: **0** (100.0% same-unit integrity)
- Orphaned or broken foreign keys: **0**

### 6.2 Concept to Theory Section Mapping (542 Sections)
All 542 canonical theory sections are mapped to one of the 161 grammar concepts.

#### Confidence Distribution:
- `high`: **512** (94.5%)
- `medium`: **23** (4.2%)
- `needs_review`: **7** (1.3%)
- `low`: **0** (0.0%)
- **Total:** **542** (100.0%)

#### Provenance and Pedagogical Validity Finding:
An inspection of `provenance` strings in `concept_theory_links` confirms that confidence ratings are generated through **automated structural inference**:
- `explanation_rule_reference_and_unit_curriculum` (512 items): Section code was cited directly in exercise explanation strings.
- `unit_theory_heading_without_explanation_ref` (23 items): Section heading matched curriculum title heuristics without direct explanation citations.
- `unit_theory_unreferenced_intro_or_contrast` (7 items): Introductory situational examples or comparative contrast sections not explicitly referenced in explanation text.

These confidence ratings reflect automated heuristics rather than manual educator validation.

#### Audit of the 7 `needs_review` Sections:
The actual 7 sections flagged as `needs_review` in the staging database were audited:

| Unit | Section Code | Section Heading | Mapped Concept Code | Reason for `needs_review` |
|:---:|:---:|---|:---:|---|
| **Unit 1** | `1A` | Study this example situation: | `unit.001` | Introductory illustration; no direct explanation citations |
| **Unit 6** | `6A` | Study this example situation: | `unit.006` | Introductory illustration; no direct explanation citations |
| **Unit 15** | `15B` | Compare the present perfect and past perfect | `unit.015` | Contrast section spanning multiple tenses |
| **Unit 16** | `16C` | Compare present perfect continuous and past perfect continuous | `unit.016` | Contrast section spanning multiple tenses |
| **Unit 18** | `18D` | Compare I used to do, I was doing and I am used to doing | `unit.018` | Multi-structure contrast section |
| **Unit 113** | `113D` | Compare although and in spite of / despite | `unit.113` | Contrast section on subordinating vs prepositional clauses |
| **Unit 123** | `123D` | Compare in, at and on | `unit.123` | Multi-preposition comparative section |

*Correction:* The initial completion report cited Units 110, 137, 142, and Appendixes as `needs_review`. The table above represents the true database state.

---

## 7. TOEIC Normalization & Source Attribution Verification

### 7.1 Stage & Module Structure
- **Stages:** Exactly 5 stages configured:
  1. Giai đoạn 1: Khôi phục Khung Câu, Danh Từ & Từ Loại (Target: 0 → 350+ TOEIC, 4 modules)
  2. Giai đoạn 2: Làm Chủ 12 Thì & Thể Bị Động (Target: 350 → 500+ TOEIC, 4 modules)
  3. Giai đoạn 3: Động Từ Khiếm Khuyết, Dạng Động Từ & Điều Kiện (Target: 500 → 650+ TOEIC, 3 modules)
  4. Giai đoạn 4: Mệnh Đề Quan Hệ, Rút Gọn & Liên Từ Học Thuật (Target: 650 → 750+ TOEIC, 2 modules)
  5. Giai đoạn 5: Giới Từ Công Sở, Collocations & Cụm Động Từ (Target: 750 → 850+ TOEIC, 3 modules)
- **Total Modules:** 16 modules.
- **Unit Metadata:** 145 canonical units.

### 7.2 Part Name Normalization
- All `toeicParts` arrays in `ToeicRoadmapModule` and `UnitToeicMetadata` were audited via regular expression `/^Part [1-7]$/`.
- Non-conforming or unnormalized part strings (e.g. `"part 5"`, `"P5"`, `"Part5"`): **0**.
- Coverage includes Parts 1, 2, 3, 4, 5, 6, and 7 across the roadmap.

### 7.3 Canonical Non-Affiliation Guarantee
- All 145 records in `unit_toeic_metadata` have `isOfficialToeic = false`.
- Neither the database nor the UI claims that Murphy textbook exercises are official ETS TOEIC test items.

### 7.4 Telemetry Isolation
- Items generated during TOEIC practice sessions are persisted with `source = 'toeic_practice'`.
- Verified that TOEIC practice attempts do not increment textbook exercise progress or mutate `user_exercise_progress`.

---

## 8. Learning Dashboard Metrics & Data Consistency

The Learning Dashboard metrics ([DashboardPage.tsx](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/pages/DashboardPage.tsx) and [dashboard.service.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/dashboard.service.ts)) were verified against the staging API and database:

1. **Accuracy Calculation:** Strictly computes $\frac{\text{Correct}}{\text{Correct} + \text{Incorrect}}$ over evaluated attempts. Unanswered questions do not reduce accuracy.
2. **Study Time Estimation:** Derived from active user interaction sessions with deduplication to prevent double-counting.
3. **Active Mistake Count:** Accurately reflects unremediated records in `mistake_records` where `status = 'active'`. Remediation via mistake retry immediately decrements this count.
4. **Recent Activity Deduplication:** Activity feed groups attempts by session and exercise ID, preventing duplicate listings for individual blanks within the same exercise.
5. **Recommended Focus Areas:** Queries weak grammar concepts ranked by error rate ($\frac{\text{Incorrect}}{\text{Evaluated}} > 0.3$) with a minimum attempt threshold. Unanswered blanks never trigger weak recommendations.
6. **Graceful Empty State:** New learners with zero evaluated attempts see `"—"` accuracy, empty mistake state, and curriculum start recommendations.
7. **Cross-Page Agreement:** Unit progress percentages and completed counts match between `/dashboard` and `/progress`.

---

## 9. Known Limitations & Technical Debt for Phase 3.2

The following items are documented for prioritization in Phase 3.2:

1. **Database-Level CHECK Constraint for `student_answer`:** The PostgreSQL CHECK constraint currently enforces `attempt_status <-> is_correct`. In Phase 3.2, consider enhancing the constraint to explicitly require `student_answer IS NULL` when `attempt_status = 'unanswered'` at the database level.
2. **Pedagogical Review of Concept Confidence:** The 23 `medium` and 7 `needs_review` concept links should undergo expert manual review by English teachers before implementing weighted mastery algorithms in Phase 3.2.
3. **WAN Latency Considerations in CI/CD:** Live integration tests against Neon staging in Singapore (`ap-southeast-1`) require extended timeouts (`--testTimeout=60000`) due to WAN round-trip latency. Mocked unit tests remain sub-second.

---

## 10. Differences Between Original Completion Report and Independent Findings

| Dimension | Initial Completion Report Claim | Independent Audit Reality | Technical Significance |
|---|---|---|---|
| **Playwright E2E Execution** | Claimed unconditional PASS in initial report. | The previous Playwright runner task was canceled/killed when the dev server remained open; exit code was non-zero and no screenshots were written to disk. Fresh independent run exited with natural code `0` and saved 5 screenshots. | Verifies real browser pass; resolves unsubstantiated claim. |
| **CHECK Constraint Scope** | Claimed `chk_qai_attempt_status_consistency` enforces `student_answer IS NULL` for unanswered attempts. | Actual database CHECK constraint only enforces `attempt_status` and `is_correct`. `student_answer` nullability is enforced by application controllers. | Documented so backend engineers do not assume PostgreSQL rejects non-null student answers on unanswered rows. |
| **SQL 3-Valued Logic Behavior** | Not mentioned; assumed constraint rejects any invalid combination. | Direct SQL insert of `('correct', NULL)` evaluates to `UNKNOWN` and is accepted by Postgres engine. | Highlights importance of application-layer Zod validation. |
| **Concept Mapping Confidence** | Described as curated pedagogical taxonomy. | Confidence ratings are derived from automated explanation string heuristics (`provenance` confirms automated rule matching). | Informs Phase 3.2 that adaptive weights need human pedagogical review. |
| **`needs_review` Unit References** | Listed Units 110, 137, 142, and Appendixes as `needs_review`. | Staging database records contain Units 1A, 6A, 15B, 16C, 18D, 113D, and 123D. | Corrects documentation to match real database records. |

---

## Summary Sign-off

The Phase 3.1 Data Foundation & Learning Dashboard implementation is **functional, resilient, idempotent, and fully verified**. With the independent execution of all 207 automated tests (including browser E2E with exit code 0) and the documentation of the four technical conditions above, GrammarPath is cleared to proceed to **Phase 3.2**.

