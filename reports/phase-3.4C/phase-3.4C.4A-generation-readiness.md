# GrammarPath — Phase 3.4C.4A: Generation Readiness Evaluation
## Controlled Pilot Protocol, Curriculum Scaffolding, and Quality Guardrails for Unit 1

**Author:** Antigravity (Senior Backend Architect & Learning Systems Engineer)  
**Milestone:** Phase 3.4C.4A (Question Bank Curation & Editorial Readiness)  
**Date:** November 14, 2026  
**Target Module:** Unit 1 (Present continuous — `unit.001`)  
**Generation Execution Status:** AUDIT & PLANNING ONLY — ZERO JOBS ENQUEUED OR EXECUTED  

---

## 1. Executive Summary & Readiness Verdict

This evaluation determines whether Unit 1 (`Present continuous (I am doing)`) is technically, editorially, and pedagogically ready for a controlled AI generation pilot.

### Readiness Verdict: **READY WITH CONDITIONS**

Unit 1 possesses a robust curriculum foundation and sufficient architectural tooling, but generation must **NOT** be launched until five operational conditions are met:
1. **Curate Existing Validated Items First:** 7 pristine validated items in Unit 1 already exist across 5 domains. Approving these delivers $K_{\text{ctx}} = 8$ without spending API tokens.
2. **Collocation Guard in Generation Prompting:** Prompts must require the LLM to output semantic selection restrictions, preventing verb-object collocation failures (such as *"entering hardware"*).
3. **Domain Balancing Directives:** Generation batches must target underrepresented workplace domains (`hospitality_travel`, `human_resources`, `retail_commerce`).
4. **Strict Fail-Closed Provider Configuration:** Disable silent model fallback; require explicit failure states for HTTP 503 or rate-limiting.
5. **Micro-Batch Execution Gate:** Initial pilot must be capped at **one batch of 3 items** (1 easy, 1 medium, 1 hard) with mandatory human editorial inspection before scaling.

---

## 2. Curriculum Target & Concept Breakdown

Unit 1 in *English Grammar in Use* (4th Edition) is decomposed into four specific assessment constructs:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ UNIT 1 ASSESSMENT CONSTRUCT SPECIFICATION                                                        │
├─────────┬──────────────────────┬─────────────┬──────────────────────────┬────────────────────────┤
│ Sub-Rule│ Pedagogical Target   │ Difficulty  │ Typical Time Indicators  │ Cognitive Focus        │
├─────────┼──────────────────────┼─────────────┼──────────────────────────┼────────────────────────┤
│ Rule 1A │ Moment of speaking   │ easy        │ right now, at present,   │ Action in progress at  │
│         │ (Physical action)    │             │ at the moment, Listen!   │ the exact moment.      │
├─────────┼──────────────────────┼─────────────┼──────────────────────────┼────────────────────────┤
│ Rule 1B │ Around now           │ medium      │ this week, these months, │ Temporary activity not │
│         │ (Temporary state)    │             │ currently, today         │ necessarily at moment. │
├─────────┼──────────────────────┼─────────────┼──────────────────────────┼────────────────────────┤
│ Rule 1C │ Definite arrangement │ medium-hard │ this afternoon, tonight, │ Pre-arranged business  │
│         │ (Scheduled meeting)  │             │ next Monday              │ appointment/event.     │
├─────────┼──────────────────────┼─────────────┼──────────────────────────┼────────────────────────┤
│ Rule 1E │ Trends & processes   │ hard        │ steadily, increasingly,  │ Gradual change or      │
│         │ (Developing change)  │             │ more and more, rapidly   │ corporate evolution.   │
└─────────┴──────────────────────┴─────────────┴──────────────────────────┴────────────────────────┘
```

---

## 3. Workplace Domain Gap Analysis

To guarantee that newly generated items maximize contextual distance ($D_{\text{ctx}} \ge 0.50$), generation must inject scenarios into domains that currently have zero coverage in Unit 1.

```
┌────────────────────────────────────────────────────────────────────────┐
│ UNIT 1 DOMAIN SATURATION & TARGETING MATRIX                            │
├─────────────────────────┬──────────────┬──────────────┬────────────────┤
│ Workplace Domain        │ Current Items│ Saturation   │ Pilot Target?  │
├─────────────────────────┼──────────────┼──────────────┼────────────────┤
│ it_technology           │ 5 items      │ OVER-INDEXED │ DO NOT TARGET  │
│ corporate_management    │ 3 items      │ ADEQUATE     │ LOW PRIORITY   │
│ marketing_sales         │ 2 items      │ ADEQUATE     │ LOW PRIORITY   │
│ finance_accounting      │ 2 items      │ ADEQUATE     │ LOW PRIORITY   │
│ manufacturing_production│ 1 item       │ MODERATE     │ MEDIUM PRIORITY│
│ logistics_shipping      │ 1 item       │ MODERATE     │ MEDIUM PRIORITY│
│ hospitality_travel      │ 0 items      │ ZERO         │ HIGH PRIORITY  │
│ human_resources         │ 0 items      │ ZERO         │ HIGH PRIORITY  │
│ retail_commerce         │ 0 items      │ ZERO         │ HIGH PRIORITY  │
└─────────────────────────┴──────────────┴──────────────┴────────────────┘
```

### Targeted Prompt Templates for Missing Domains:
1. **Hospitality & Business Travel:** Hotel executive suite check-in, airline conference shuttle, flight cancellation re-booking.
2. **Human Resources & Talent:** First-round candidate interviewing, benefits orientation, annual compensation appraisal.
3. **Retail & Customer Commerce:** Store flagship grand opening, inventory point-of-sale upgrade, seasonal promotional rollout.

---

## 4. Controlled Generation Pilot Specification

### 4.1 Bounded Batch Architecture
When authorized, the generation pilot must adhere to the following bounded parameters:
- **Scope:** Unit 1 only.
- **Batch Size:** Exactly **3 items** (1 easy, 1 medium, 1 hard).
- **Target Sub-rules:**
  - Item 1 (Easy): Rule 1A (`hospitality_travel` — front desk reservation check).
  - Item 2 (Medium): Rule 1B (`human_resources` — candidate interviewing).
  - Item 3 (Hard): Rule 1E (`retail_commerce` — consumer retail expansion).
- **Review Status on Insertion:** Strictly `validated` (NEVER auto-approved).

### 4.2 AI Model & Provider Configuration
- **Designated Provider:** Google Gemini API.
- **Primary Model:** Explicitly configured via `GEMINI_MODEL` (e.g., `gemini-2.5-flash`).
- **No Silent Downgrades:** If the primary model returns HTTP 503, 429, or timeout, the queue worker must back off with bounded exponential delay and record `provider_unavailable`. It must **NOT** silently fall back to random deprecated model strings.
- **Generation Parameters:**
  - `temperature`: 0.35 (low temperature for deterministic syntactic adherence).
  - `topP`: 0.85.
  - JSON Mode: Schema-enforced structured output.

### 4.3 Mandatory Automated Quality & Editorial Gates
Every generated item must pass the following deterministic pipeline gates before entering the `validated` table:
1. **Schema Integrity:** Prompt has exactly one `_____` (5 underscores) or `[BLANK]`; exactly 4 options (A, B, C, D); exactly 1 correct key.
2. **Subject-Verb Agreement Gate:** Deterministic regex check verifying agreement between subject person/number and verb form (rejecting *"he are"* or *"they is"*).
3. **Collocation Validation:** Automated check against common anomaly patterns (rejecting *"enter/explain hardware"*).
4. **Context Diversity Check:** Pairwise $D_{\text{ctx}}$ against existing bank items in the unit must be $\ge 0.50$.
5. **Content Hash Uniqueness:** SHA-256 hash check preventing prompt or option collision.

---

## 5. Pilot Execution Protocol (For Phase 3.4C.4B)

```
┌────────────────────────────────────────────────────────────────────────┐
│ PILOT EXECUTION STAGES (FUTURE PHASE 3.4C.4B)                         │
├────────────────────────────────────────────────────────────────────────┤
│ Step 1: Owner approves 7 existing validated items in Unit 1.           │
│ Step 2: Owner authorizes execution of execute-phase3-4c4-replacements. │
│ Step 3: Verify staging isolation guard and DB snapshot.               │
│ Step 4: Run single 3-item generation job (Unit 1, 3 distinct domains). │
│ Step 5: Output complete editorial audit report of generated items.     │
│ Step 6: Present generated items for human owner sign-off.              │
└────────────────────────────────────────────────────────────────────────┘
```

