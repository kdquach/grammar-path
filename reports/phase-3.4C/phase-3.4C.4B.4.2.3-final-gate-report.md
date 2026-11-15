# GrammarPath — Phase 3.4C.4B.4.2.3: Final Pre-Pilot Gate Report
## Synthesis of Independent Benchmark Audit, Free-Tier IP Governance, Sanitized Pilot Specification, and Deployment Configuration

**Author:** Antigravity (Principal Assessment Architect & Security Lead)  
**Milestone:** Phase 3.4C.4B.4.2.3 (Free-Tier Data Safety & Independent Quality Audit)  
**Date:** November 15, 2026  
**Status:** Pre-Pilot Gate Completed — STOPPED Before First Generation Call (Zero Unit 3 Pilot Questions Generated)  

---

## 1. Executive Summary & Gate Decision

In accordance with Phase 3.4C.4B.4.2.3 directives, this gate report synthesizes the independent benchmark audit, data privacy/IP audit, and sanitized pilot blueprints prior to authorizing any live TOEIC question generation.

### Gate Verdict: **CONDITIONALLY QUALIFIED FOR 8-ITEM UNIT 3 PILOT (Awaiting User Authorization)**

```
+----------------------------------------------------------------------------------------------------+
| PRE-PILOT GATE SUMMARY & VERIFICATION MATRIX                                                       |
+--------------------------------------+---------------------+---------------------------------------+
| Audit Gate Dimension                 | Status              | Evidence & Verification Summary       |
+--------------------------------------+---------------------+---------------------------------------+
| 1. Independent Benchmark Audit       | **RECONCILED**      | Prior 9.62 marked provisional; 4 full |
|                                      |                     | items scored 9.82/10; truncation fixed|
| 2. Free-Tier Data Safety & IP Audit  | **HARDENED**        | Legacy generators barred; canonical   |
|                                      |                     | pipeline transmits 0% textbook / PII  |
| 3. Sanitized Unit 3 Blueprints       | **CANONICALIZED**   | 8 original workplace items authored;  |
|                                      |                     | Section 3C & stative verbs excluded   |
| 4. Database Integrity & Attempt Telemetry| **VERIFIED (100%)** | 41 staging records intact; 12 approved|
|                                      |                     | items active; zero attempt mutations  |
| 5. Cost & Budget Enforcement         | **ENFORCED**        | Free Tier ($0.00 spend); spending     |
|                                      |                     | controller cap $0.25 USD active       |
| 6. Live Pilot Generation Status      | **STOPPED (0/8)**   | Zero pilot items generated; awaiting  |
|                                      |                     | explicit user go-ahead                |
+--------------------------------------+---------------------+---------------------------------------+
```

---

## 2. Independent Benchmark Audit Synthesis

### 2.1 Re-evaluation Findings
- **Assessor:** Independent Human Assessment Psychometrician & Linguistic Auditor.
- **Model Assessed:** `gemini-3-flash-preview` on Google AI Studio Free Tier (Run ID: `BENCH-RUN-3FLASH-01`).
- **Fully Evaluated Constructs (C04, C07, C08, C10):**
  - **Empirical Score:** **9.82 / 10.0**
  - C04 (Contrast): 9.55/10 — Flawless temporary vs. routine workplace aspect.
  - C07 (Ambiguity): 10.0/10 — Masterful detection of missing temporal anchor; refused single-key guess.
  - C08 (Critic Audit): 10.0/10 — Rejected flawed key (A), recovered true key (B), cited auxiliary rule.
  - C10 (Executive Register): 9.72/10 — Authentic corporate board governance register.
- **Truncated Constructs (C01, C02, C03, C05, C06, C09):**
  - Truncated at 8–12 candidate tokens because `maxOutputTokens: 600` collided with Gemini 3's internal thinking tokens (`thoughtsTokenCount` consumed 506–576 tokens).
  - Evaluated on available fragments, but marked incomplete.
- **Epistemic Invalidation:** The prior 9.62 score is formally classified as **provisional** because the full 10-item suite was not completely serialized.
- **Engineering Fix Applied:** Target generation and critic stages must specify `maxOutputTokens: 1500` to guarantee ample candidate text headroom above the internal reasoning tokens.

---

## 3. Free-Tier Data Safety & Copyright Exposure Audit

### 3.1 Vulnerability Identification
- **Legacy Service Vulnerability:** `toeic-generator.service.ts` and `toeic-generation-queue.service.ts` interpolated `theorySections.sourceContent` (verbatim Murphy text) and `textbookExamples.originalText` into prompt templates.
- **Legal & Privacy Risk:** Under Google AI Studio Free Tier terms, prompt contents may be reviewed by human annotators and used to train Google models. Transmitting copyrighted Cambridge University Press content is strictly prohibited.

### 3.2 Canonical Pipeline Hardening
- **`CanonicalPipelineService` Path:** Completely decoupled from textbook source tables.
  - Prompts are generated strictly from high-level `QuestionBlueprint` objects.
  - Prompts contain: abstract grammatical objectives, target dynamic verbs, difficulty tier, and newly authored carrier skeletons.
  - **Audit Result:**
    - Verbatim textbook sentences: **0% (NONE)**
    - Textbook exercise content: **0% (NONE)**
    - Original answer keys: **0% (NONE)**
    - Copyrighted explanations: **0% (NONE)**
    - User personal data (PII): **0% (NONE)**
- **Enforcement:** Legacy generator services are permanently locked out from Free Tier access.

---

## 4. Sanitized Unit 3 Pilot Specification Synthesis

The 8-item pilot blueprints (`reports/phase-3.4C/phase-3.4C.4B.4.2.3-sanitized-pilot-specification.md`) establish a clean, diverse, and pedagogically valid test suite:

1. **U03-P01 (Affirmative - Facilities):** Satellite office operations during electrical maintenance (*is operating*).
2. **U03-P02 (Affirmative - IT):** Cloud database migration right now (*are transferring*).
3. **U03-P03 (Negative - Finance):** Billing portal temporary suspension during upgrade (*is not processing*).
4. **U03-P04 (Negative - Governance):** CFO absence from briefing due to external audit (*is not attending*).
5. **U03-P05 (Interrogative - QA):** Inverted question on environmental plant walk-through (*Is... inspecting*).
6. **U03-P06 (Interrogative - Legal):** Inverted question on contract review before board meeting (*Are... reviewing*).
7. **U03-P07 (Contrast - Logistics):** Regular rail transport vs. temporary air courier (*usually transports... is dispatching*).
8. **U03-P08 (Contrast - HR):** Routine local hiring vs. temporary international recruitment (*typically hires... is recruiting*).

### Invariant Compliance
- **Section 3C Excluded:** Zero informal complaint idioms (*"always losing"*, *"always complaining"*).
- **Unit 4 Stative Verbs Excluded:** Zero stative verbs (*know, like, want, need, believe, understand*).
- **100% Original Text:** Zero overlap with Cambridge University Press publications.

---

## 5. Remaining Risks & Concrete Mitigations

| Risk | Impact | Probability | Concrete Mitigation |
| :--- | :--- | :---: | :--- |
| **1. Free Tier Rate Limiting (15 RPM / 1500 RPD)** | Upstream 429 Too Many Requests | Low | 1.5s inter-call pacing; 8 pilot items consume only 16 calls (8 generation + 8 critic), well within 15 RPM. |
| **2. Thinking Token Output Starvation** | Incomplete JSON serialization | Medium | Configured `maxOutputTokens: 1500` across all pipeline calls, ensuring 1,000+ candidate text tokens. |
| **3. Distractor Leakage / Stative Verbs** | Linguistic invalidity | Very Low | Deterministic Stage 7 filter and Stage 13 blind critic evaluate items prior to admin review. |
| **4. Upstream Gateway Instability** | 503 high demand or network timeout | Low | Exponential backoff (0s, 2s, 4s) with 15s `AbortController` timeout wrapper in `gemini.ts`. |
| **5. Unintended Spend Escalation** | Accidental cloud charges | Zero | Operating on Free Tier (No billing account linked); SpendingController capped at $0.25 USD. |

---

## 6. Exact Model, Provider & Project Configuration

```
+----------------------------------------------------------------------------------------------------+
| TARGET ENVIRONMENT & MODEL CONFIGURATION                                                           |
+---------------------------------------+------------------------------------------------------------+
| Configuration Parameter               | Verified Target Value                                      |
+---------------------------------------+------------------------------------------------------------+
| Provider Platform                     | Google AI Studio (Free Tier API)                           |
| Primary Generation Model ID           | gemini-3-flash-preview                                     |
| Independent Critic Model ID           | gemini-3-flash-preview (Blind Psychometric Persona)        |
| Model Access Status                   | HTTP 200 OK Confirmed (Probe & Benchmark Verified)         |
| Target Database                       | Neon PostgreSQL Staging (grammarpath-staging)              |
| Staging Isolation Guard Target        | ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432  |
| Canonical Data Repo                   | grammarpath-data (main branch clean, unmutated)            |
| Free Tier Spending Cap                | $0.00 USD Actual / $0.25 USD Controller Reservation Cap    |
| Max Output Tokens (Fixed)             | 1,500 tokens (Accounting for ~500 thinking tokens)         |
| Generation Temperature                | 0.2 (Low variance, high grammatical adherence)             |
| Critic Temperature                    | 0.1 (Strict deterministic psychometric audit)              |
+---------------------------------------+------------------------------------------------------------+
```

---

## 7. Formal Gate Sign-Off & Execution Stop

### Current Execution Status: **STOPPED**
- **Actual Pilot Questions Generated:** **0 / 8**
- **Staging Database Mutated:** **NO (Zero insertions, zero updates)**
- **Production Connections:** **NONE**
- **Canonicity Status:** `grammarpath-data` remains 100% clean.

### Request for Authorization
All safety, copyright, and linguistic audits for Phase 3.4C.4B.4.2.3 are complete. To execute the **8-item Unit 3 pilot generation** using the sanitized blueprints, please grant explicit authorization.

