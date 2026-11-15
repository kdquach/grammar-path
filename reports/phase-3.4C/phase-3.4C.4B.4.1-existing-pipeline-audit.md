# GrammarPath — Phase 3.4C.4B.4.1: Existing Pipeline Audit Report
## Deep-Dive Codebase Audit of Existing AI Generation, Quality Validation, Context Diversity, and Approval Systems

**Author:** Antigravity (Principal Backend Architect & Quality Assurance Lead)  
**Milestone:** Phase 3.4C.4B.4.1 (AI TOEIC Question Generation Pipeline — Design & Readiness Audit)  
**Date:** November 14, 2026  
**Environment:** Staging Codebase & Schema Inspection (Read-Only)  
**Audit Scope:** `src/lib/gemini.ts`, `toeic-generator.service.ts`, `toeic-generation-queue.service.ts`, `toeic-quality-engine.service.ts`, `contextual-diversity.service.ts`, `toeic-question-bank.service.ts`, `admin-toeic.controller.ts`  

---

## 1. Executive Summary

A comprehensive architectural and code-level audit was conducted across GrammarPath's existing TOEIC generation, validation, diversity, and question bank services.

### Core Audit Findings:
1. **Strengths:** 
   - An asynchronous job queue (`ToeicGenerationJob`) with state tracking (`pending`, `in_progress`, `completed`, `failed`) and exponential backoff retry logic already exists.
   - A multi-tier quality validator (`ToeicQualityEngineService`) successfully enforces structural invariants (blank count, option count, unique content hashing, business vocabulary heuristic, and basic Vietnamese explanation presence).
   - An advanced contextual diversity engine (`ContextualDiversityService`) measures pairwise distances across 5 distinct signals and supports connected-components clustering.
   - Practice retrieval (`ToeicQuestionBankService.getApprovedQuestionsForPractice`) strictly isolates unapproved records, enforcing `isLatestApproved = true` and `reviewStatus = "approved"`.
2. **Critical Vulnerabilities & Gaps:**
   - **Silent Provider Downgrade:** `src/lib/gemini.ts` iterates through a list of 4 fallback models (`gemini-3-flash-preview` $\to$ `gemini-flash-lite-latest` $\to$ `gemini-3.1-flash-lite-preview` $\to$ `gemini-flash-latest`) without caller notification or model version pinning.
   - **Naïve Prompt Construction:** Generation prompts lack detailed grammar rule blueprints, domain-specific constraints, and distractor design instructions. In the queue service, prompts consist of a 4-line request with truncated theory headings.
   - **Absence of Syntactic & Semantic Defect Filters:** The quality validator lacks checks for double auxiliaries (e.g. *"is is reviewing"*), subject-verb agreement mismatches, and semantic collocation anomalies (e.g. *"entering hardware"* or *"explaining hardware"*).
   - **Hardcoded Rule Association:** Generation jobs hardcode `ruleReference: "${unitNumber}A"` and `conceptMappingConfidence: 0.9` without verifying that the generated prompt actually assesses that rule.
   - **Lack of Cost & Token Telemetry:** While `ToeicQuestionGenerationRun` captures latency and item counts, it records zero token usage or cost telemetry.

---

## 2. Granular Component Audit

### 2.1 Gemini Client Integration (`backend/src/lib/gemini.ts`)
- **Current Architecture:**
  - Invokes Google Gemini REST API v1beta directly via `fetch`.
  - Exposes `generateGeminiTextDetailed(options)` and `generateGeminiText(options)`.
  - Manages abort signals via `AbortController` (default timeout: 15,000ms).
- **Vulnerabilities Identified:**
  ```typescript
  // Lines 29-45 in gemini.ts:
  const DEFAULT_MODEL_CANDIDATES: GeminiModelCandidate[] = [
    { name: "gemini-3-flash-preview", ... },
    { name: "gemini-flash-lite-latest" },
    { name: "gemini-3.1-flash-lite-preview" },
    { name: "gemini-flash-latest" },
  ];
  ```
  - When an HTTP error or timeout occurs on candidate 1, the engine silently falls through to candidate 2 and 3 without recording the actual model used in the question bank item record.
  - The generation run record hardcodes `modelName: "gemini-1.5-flash"` in DB, completely decoupled from the actual model executing in `gemini.ts`.
  - No exponential backoff for rate limits (HTTP 429) inside `gemini.ts`.
  - No token tracking (prompt tokens, candidate tokens, total tokens) extracted from Gemini's `usageMetadata` response object.

---

### 2.2 Offline Generation Queue (`backend/src/services/toeic-generation-queue.service.ts`)
- **Current Architecture:**
  - Manages asynchronous offline batch jobs via table `toeic_generation_jobs`.
  - Enqueues jobs per unit and difficulty (`enqueueUnits`).
  - Worker process retrieves eligible pending jobs ordered by `unitNumber` and `createdAt` (`processNextJob`).
  - Creates an audit record in `toeic_question_generation_runs`.
  - Auto-assigns items to `reviewStatus: isQualified ? "validated" : "draft"`, guaranteeing that no generated item is ever auto-approved.
- **Gaps Identified:**
  - **Crude Theory Retrieval:** Fetches only the first 4 theory sections and first 4 examples:
    ```typescript
    take: 4, // Truncates theory content to 150 characters
    ```
    This deprives the LLM of complete grammatical rules, exceptions, and stative verb lists.
  - **Fixed 2-Item Batching:** Generates exactly 2 items per run regardless of unit complexity or blueprint requirements.
  - **Rule Hallucination Risk:** The service automatically assigns `ruleReference: "${job.unitNumber}A"`. If the LLM generates a sentence targeting Rule B or C, the database permanently stores an incorrect rule tag.

---

### 2.3 Quality Validation Engine (`backend/src/services/toeic-quality-engine.service.ts`)
- **Current Architecture:**
  - 10-point rubric assessing:
    - Linguistic Accuracy (0–3.0): blank count (`_______`), 4 options, exactly 1 correct key.
    - Business Realism (0–2.5): checks presence of 30 corporate keywords.
    - Distractor Validity (0–2.5): non-empty, distinct option texts.
    - Pedagogical Explanation (0–2.0): length $\ge 15$ chars, Vietnamese grammar terms check.
  - Deduplication: Content hash check via SHA-256 (`prompt` + options) and soft Levenshtein check ($> 0.85$ similarity within unit).
  - Gating Threshold: Items with `overallScore >= 8.5` and zero blocking defects qualify for `validated` status; others are marked `draft`.
- **Gaps Identified:**
  - **No Defective Key Stutter Check:** Did not catch `"is is reviewing"` in legacy v2 items because `"is is reviewing"` was considered a non-empty, distinct string.
  - **No Subject-Verb Agreement Checker:** Does not verify whether third-person singular subjects agree with singular verbs.
  - **No Collocational / Semantic Compatibility Check:** Allowed `"entering hardware"` and `"explaining hardware"` to pass quality validation with high scores because both words appeared in the dictionary.
  - **No Rule Verification:** Does not check whether the blank actually requires the grammatical target of the unit.

---

### 2.4 Contextual Diversity Engine (`backend/src/services/contextual-diversity.service.ts`)
- **Current Architecture:**
  - Computes 5 linguistic signals between question pairs:
    1. $S_{\text{norm}}$: Bigram Jaccard + Levenshtein prompt similarity.
    2. $S_{\text{slot}}$: Jaccard similarity of 3-token left/right context windows around the blank.
    3. $S_{\text{dist}}$: Option suffix morphological profile overlap (`ing`, `ed`, `s`, `tion`, `ly`, etc.).
    4. $S_{\text{rule}}$: Concept, unit, primary skill, and rule reference match score.
    5. $S_{\text{sem}}$: Domain keyword classification (8 domains) + non-stopword content Jaccard.
  - Carrier Distance: $D_{\text{ctx}} = 1 - \max(S_{\text{norm}}, 0.60 S_{\text{slot}} + 0.40 S_{\text{sem}})$.
  - Clustering: Connected-components graph partitioning at $D_{\text{ctx}} \ge 0.50$ to produce $K_{\text{ctx}}$.
- **Gaps Identified:**
  - **Keyword-Dependent Domain Classification:** A sentence with the word `"director"` is immediately classified as `corporate_management`, even if the context is about a film studio or medical center.
  - **Mathematical Metric Conflation:** A mathematical distance of $D_{\text{ctx}} = 0.58$ is treated as identical evidence of independence as $D_{\text{ctx}} = 0.92$, without qualitative human verification.
  - **Lack of Multi-Dimensional Reporting:** The service collapses diversity into a single scalar ($D_{\text{ctx}}$), obscuring whether similarity was driven by sentence frame, blank placement, or vocabulary overlap.

---

### 2.5 Admin Approval & Practice Retrieval Workflow
- **Current Architecture:**
  - `ToeicQuestionBankService.getApprovedQuestionsForPractice` requires:
    ```typescript
    where: {
      unitNumber,
      difficulty,
      reviewStatus: "approved",
      isLatestApproved: true,
    }
    ```
  - `AdminToeicController` exposes approval and withdrawal endpoints restricted to admin roles.
  - Root question lineage and versioning supported in schema (`rootQuestionId`, `version`, `isLatestApproved`).
- **Gaps Identified:**
  - Lack of a structured editorial review UI for side-by-side inspection of distractors, rule alignment, and contextual distance against existing approved items.
  - Approvals in legacy seeds were performed in bulk without individual linguistic verification, leading to the defects discovered in Units 1, 3, and 4.

---

## 3. Reusable Components vs. Required Enhancements

| Component | Current Status | Reusability Verdict | Required Enhancement |
| :--- | :--- | :---: | :--- |
| **Prisma Question Bank Schema** | Production-ready | **100% Reusable** | Add token/cost tracking fields to `ToeicQuestionGenerationRun`. |
| **Offline Job Queue Engine** | Working | **Reusable with Updates** | Replace generic prompt with blueprint-driven generator; add rate-limit backoff. |
| **Practice Retrieval Query Layer** | Verified robust | **100% Reusable** | Retain strict isolation (`isLatestApproved = true`, `reviewStatus = "approved"`). |
| **Quality Engine Formatter** | Working | **Reusable Base** | Add morphological regex filters (double auxiliaries, agreement, collocation traps). |
| **Contextual Diversity Math** | Working | **Reusable Base** | Supplement composite $D_{\text{ctx}}$ with 5-dimensional qualitative reporting. |
| **Gemini Client (`gemini.ts`)** | Vulnerable | **Major Refactor** | Pin explicit model versions; remove silent fallback; extract token usage metrics. |
| **Prompt Construction** | Primitive | **Complete Redesign** | Implement 15-stage structured pipeline with rule blueprints and negative constraints. |

---

## 4. Conclusion

The foundational architecture of GrammarPath (database schema, job queue, retrieval isolation, diversity mathematics) is sound and production-grade. However, the generative front-end and pre-database validation filters require substantial hardening before batch generation across Units 2–25 can be authorized.

