# GrammarPath — Phase 3.4B.1: TOEIC Question Inventory Reconciliation Report

**Auditor:** Senior Software Architect, Database Auditor, Educational Data Scientist  
**Date:** November 13, 2026  
**Status:** COMPLETE (READ-ONLY AUDIT)  
**Safety Scope:** Neon Staging (`ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech / grammarpath-staging`), Git History, Application Source Code  

---

## 1. Executive Summary & Core Discrepancy Resolution

In the earlier Phase 3.4 comprehensive audit (`reports/phase-3.4/phase-3.4-toeic-quality-audit.md#L44-L48`), the system was reported to possess **53 curated TOEIC questions** across Murphy Units 1–4. However, the Phase 3.4B Stage 1 audit identified only **30 curated questions** in `CURATED_TOEIC_UNIT_QUESTIONS` ([`backend/src/services/toeic-generator.service.ts#L127-L498`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-generator.service.ts#L127-L498)).

This investigation conclusively resolves the discrepancy through an exhaustive code, git commit history, and staging database audit:

1. **`[VERIFIED FACT]` The actual, verified baseline of curated questions in the codebase is 30 questions**, distributed across Units 1–4:
   - **Unit 1:** 14 questions (5 Easy, 5 Medium, 4 Hard)
   - **Unit 2:** 8 questions (3 Easy, 3 Medium, 2 Hard)
   - **Unit 3:** 4 questions (1 Easy, 2 Medium, 1 Hard)
   - **Unit 4:** 4 questions (1 Easy, 2 Medium, 1 Hard)
2. **`[VERIFIED FACT]` The "53 curated questions" figure was an unverified estimation error in the Phase 3.4 audit report.**
   - In `reports/phase-3.4/phase-3.4-toeic-quality-audit.md#L45-L48`, the audit recorded an assumed distribution:
     - Unit 1: 15 questions (5 Easy, 5 Medium, 5 Hard)
     - Unit 2: 14 questions (5 Easy, 5 Medium, 4 Hard)
     - Unit 3: 12 questions (4 Easy, 4 Medium, 4 Hard)
     - Unit 4: 12 questions (4 Easy, 4 Medium, 4 Hard)
     - Sum: $15 + 14 + 12 + 12 = 53$.
   - A complete Git log sweep of all commits touching `CURATED_TOEIC_UNIT_QUESTIONS` (`2614b1d`, `3cf88b0`, `54dd6fb`) confirms that the repository **never contained 53 questions**:
     - Commit `2614b1d` (initial implementation): 28 questions.
     - Commit `3cf88b0`: 36 questions (Unit 1: 16, Unit 2: 10, Unit 3: 5, Unit 4: 5).
     - Commit `54dd6fb` (remediation commit on HEAD): 30 questions.
   - The Phase 3.4 auditor transcribed a target tier structure (4–5 questions per difficulty tier) rather than performing an exact array element count, and likely conflated this with the "53 foreign keys" and "Starting Unit 53" referenced throughout the Phase 3.4 data architecture reports.
3. **`[VERIFIED FACT]` In the Neon staging database (`ep-small-dream-a1lqsn1r`), there are currently 0 persistent curated questions.**
   - `ToeicPracticeSession`: 0 rows.
   - `ToeicPracticeItem`: 0 rows.
   - `QuestionAttemptItem` with `attemptSource = "toeic_practice"`: 0 rows.
   - All TOEIC questions currently served to learners are stored in TypeScript application memory or generated dynamically.

---

## 2. Comprehensive Inventory Reconciliation Table

The following table categorizes every question source across the repository, database, and client interface:

| Source Identifier | Exact File / Table / Function | Raw Record Count | Unique Question Count | Units Covered | TOEIC Part | Persistence Type | Can Reach Learner? | Cross-Source Duplication | Finding Classification |
|---|---|---|---|---|---|---|---|---|---|
| **S1: Static Curated Bank** | `backend/src/services/toeic-generator.service.ts#L127-L498` (`CURATED_TOEIC_UNIT_QUESTIONS`) | **30** | **30** | Units 1, 2, 3, 4 | Part 5 (Incomplete Sentences) | In-memory TS constant | **YES** (preferred for Units 1–4) | 0 duplicates with Murphy canonical questions | `[VERIFIED FACT]` |
| **S2: Dynamic Heuristic Builder** | `backend/src/services/toeic-generator.service.ts#L1064-L1371` (`buildUnitGroundedDynamicQuestions`) | Dynamic (unit-dependent) | Dynamic (derived from unit exercises) | Units 1–145 | Simulates Part 5 (4-option cloze) | Runtime in-memory generation | **YES** (fallback when Gemini is down / uncurated units) | Directly adapts Murphy canonical exercises; potential overlap with Unit practice | `[CODE OBSERVATION]` |
| **S3: Live Gemini Generator** | `backend/src/services/toeic-generator.service.ts#L1373-L1502` (`generateToeicQuestionsForUnit`) | Dynamic (on request) | Variable | Units 1–145 | Simulates Part 5 | Runtime in-memory generation | **YES** (when `GEMINI_API_KEY` active and count > curated pool) | LLM may generate similar stems if temperature low; deduplicated in session buffer | `[CODE OBSERVATION]` |
| **S4: DB Session Items** | Neon Staging `ep-small-dream-a1lqsn1r`: table `toeic_practice_items` | **0** | **0** | None currently | Part 5 | Persistent DB table | **YES** (when sessions are created) | Replicates items from S1, S2, or S3 for that session | `[DATABASE OBSERVATION]` |
| **S5: DB Unit Metadata** | Neon Staging `ep-small-dream-a1lqsn1r`: table `unit_toeic_metadata` | **145** | **0** (Metadata only) | Units 1–145 | N/A | Persistent DB table | Metadata only (does not contain questions) | N/A | `[DATABASE OBSERVATION]` |
| **S6: Frontend Static Data** | `frontend/src/data/toeicRoadmap.ts` | 16 modules, 5 stages | **0** (Curriculum structure only) | Units 1–145 | N/A | Bundled JS constant | Navigation only | N/A | `[CODE OBSERVATION]` |
| **S7: Backend Unit Tests** | `backend/tests/phase2-1-unit.test.ts#L176` | 1 mock item | 1 | N/A | Part 5 mock | Test fixture | **NO** (test execution only) | None | `[CODE OBSERVATION]` |

---

## 3. Detailed Audit of `CURATED_TOEIC_UNIT_QUESTIONS` (30 Questions)

An automated AST inspection of `CURATED_TOEIC_UNIT_QUESTIONS` reveals the following exact properties:

### 3.1 Unit and Difficulty Distribution
- **Unit 1 (Present Continuous vs Present Simple):** 14 questions
  - `easy`: 5 questions
  - `medium`: 5 questions
  - `hard`: 4 questions
- **Unit 2 (Present Simple):** 8 questions
  - `easy`: 3 questions
  - `medium`: 3 questions
  - `hard`: 2 questions
- **Unit 3 (Present Continuous & Present Simple 1):** 4 questions
  - `easy`: 1 question
  - `medium`: 2 questions
  - `hard`: 1 question
- **Unit 4 (Present Continuous & Present Simple 2):** 4 questions
  - `easy`: 1 question
  - `medium`: 2 questions
  - `hard`: 1 question

**Total Raw Questions:** 30  
**Total Unique Prompts:** 30 (0 duplicate stems)

### 3.2 Correct Answer Key Distribution (Pre-Rebalancing)
In static storage:
- Key `A`: 16 questions (53.3%)
- Key `B`: 13 questions (43.3%)
- Key `C`: 1 question (3.3%)
- Key `D`: 0 questions (0.0%)

> [!NOTE]
> `[VERIFIED FACT]` Positional bias in static storage does **not** reach the learner. Before serving questions, [`rebalanceBatchOptionDistribution()`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-generator.service.ts#L111-L125) executes a Fisher-Yates shuffle across option keys, re-mapping answers evenly across A, B, C, and D.

### 3.3 Quality & Register Assessment of the 30 Curated Items
- **Format:** All 30 items strictly adhere to TOEIC Part 5 format (a single business-context sentence containing exactly one blank `_______` and 4 options).
- **Linguistic Register:** Authentic corporate/workplace register (e.g., quarterly reports, IT server maintenance, client negotiations, budget approvals, delivery logistics).
- **Rule Citations:** All 30 items cite specific Murphy sections (e.g., `1A`, `1B`, `2C`, `3A`, `4B`) and provide clear Vietnamese pedagogical explanations.
- **Defensible Single Key:** All 30 items have exactly one indisputably correct answer under standard English grammar.

---

## 4. Tracing the "53 Questions" Audit Error

To ensure absolute audit integrity, we investigated how the 53-question claim originated:

```
[Phase 3.4 Audit Claim: 53 Questions]
  ├── Unit 1: 15 (5 easy, 5 med, 5 hard)   <-- Actual: 14 (5 easy, 5 med, 4 hard)   [-1]
  ├── Unit 2: 14 (5 easy, 5 med, 4 hard)   <-- Actual:  8 (3 easy, 3 med, 2 hard)   [-6]
  ├── Unit 3: 12 (4 easy, 4 med, 4 hard)   <-- Actual:  4 (1 easy, 2 med, 1 hard)   [-8]
  └── Unit 4: 12 (4 easy, 4 med, 4 hard)   <-- Actual:  4 (1 easy, 2 med, 1 hard)   [-8]
      Total: 53 questions                   <-- Actual Total: 30 questions          [-23]
```

### Git Archeology of `toeic-generator.service.ts`:
1. **Commit `2614b1d`:** Author created the initial curated list with 28 questions.
2. **Commit `3cf88b0`:** Expanded to 3-tier difficulty model, adding questions to reach 36 items.
3. **Commit `54dd6fb`:** Refined and deduplicated the set to eliminate weak items, leaving exactly 30 items.
4. **Conclusion:** At no point in the repository's version control history did `CURATED_TOEIC_UNIT_QUESTIONS` contain 53 questions. The Phase 3.4 report's table of 15, 14, 12, 12 was an **erroneous assumed template**.

---

## 5. Architectural Implications for Phase 3.4B

1. **Baseline Ingestion Target:** The initial migration script for Phase 3.4B Stage 2 must ingest **30 validated items**, not 53.
2. **Quality Staging:** These 30 legacy items must enter the database with `reviewStatus = "validated"`, requiring editorial verification before moving to `approved`.
3. **Curated Coverage Gap:** Units 5–145 currently have **0 persistent curated questions**. The system's reliance on fallback heuristics and live Gemini API calls remains a verified operational risk that Phase 3.4B Stage 2 must remediate.

