# GrammarPath Phase 3.4B — Report 1: Existing TOEIC System Audit
## Comprehensive Audit of Existing TOEIC Architecture, Data Models, Question Inventory & Generation Logic

**Date:** 2026-11-13  
**Auditor:** Principal Learning Systems Architect & Educational Data Scientist  
**Scope:** Existing TOEIC Practice Engine, Data Storage, Question Inventory, Generation Pipelines, and Grading  
**Target Environment:** Neon PostgreSQL Staging (`grammarpath-staging`)  
**Phase Status:** DESIGN ONLY (Phase 3.4B Stage 1)

---

## 1. Executive Summary

This report delivers an exhaustive, evidence-based audit of the existing TOEIC preparation capabilities within GrammarPath. Prior to Phase 3.4B, TOEIC practice relied on a combination of 30 statically embedded multiple-choice questions for Units 1–4, on-the-fly real-time generation via Google Gemini, and a heuristic regex-based cloze fallback engine that converted textbook exercises into multiple-choice items.

The audit reveals that while the TOEIC roadmap metadata accurately maps all 145 canonical units to TOEIC Parts and grammar foci, the application currently lacks a **persistent, validated, and approved TOEIC Question Bank**. Practice sessions generate ephemeral questions that are stored only in per-user session history tables, completely disconnected from the concept mastery engine and subject to real-time LLM latency, rate-limit bottlenecks, and heuristic distractor degradation.

---

## 2. Complete Trace of Current TOEIC Workflow

The current end-to-end execution path for TOEIC practice was traced through the codebase:

```
[UI: ToeicPracticeModal.tsx] (L65-89)
         │
         ▼ calls api.generateToeicPractice(unitNumber, count, difficulty)
[Client: client.ts] (L644-656)
         │
         ▼ HTTP POST /api/v1/adaptive/toeic-practice
[Route: adaptive.routes.ts] (L28-36) [requireAuth + submissionRateLimiter]
         │
         ▼
[Controller: adaptive.controller.ts] (L566-695) [generateToeicPracticeHandler]
         │ Queries unit, theory sections, textbook examples, and questions
         ▼
[Generator Service: toeic-generator.service.ts] (L1373-1550) [generateToeicQuestionsForUnit]
         ├── 1. Check CURATED_TOEIC_UNIT_QUESTIONS[unitNumber] (Units 1-4 only)
         ├── 2. If deficit: Real-time Gemini API call (generateGeminiText, 4s timeout)
         └── 3. If deficit: Heuristic cloze extractor (buildUnitGroundedDynamicQuestions)
         │
         ▼
[Persistence: adaptive.controller.ts] (L644-669)
         ├── prisma.toeicPracticeSession.create
         └── prisma.toeicPracticeItem.create (stores prompt, options, correctAnswer, explanation)
         │
         ▼
[Anti-Spoiler Response: adaptive.controller.ts] (L671-692)
         Returns session ID and questions WITHOUT correct answers or explanations
         │
         ▼
[User Submits Answer: ToeicPracticeModal.tsx] (L138-165)
         │
         ▼ calls api.checkToeicPracticeAnswer({ sessionId, itemId, studentAnswer })
[HTTP POST: adaptive.routes.ts] (L44-52) [/api/v1/adaptive/toeic-practice/check]
         │
         ▼
[Grader: adaptive.controller.ts] (L701-770) [checkToeicPracticeHandler]
         ├── Verifies session ownership (IDOR defense)
         ├── Evaluates rawAnswer === item.correctAnswer.toUpperCase()
         └── prisma.toeicPracticeItem.update (updates studentAnswer, isCorrect, attemptCount)
```

### Exact Code File & Function Locations:
1. **Frontend Trigger:** [`frontend/src/components/adaptive/ToeicPracticeModal.tsx#L65-L89`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/adaptive/ToeicPracticeModal.tsx#L65-L89)
2. **API Client:** [`frontend/src/api/client.ts#L644-L670`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/api/client.ts#L644-L670)
3. **Route Guard & Rate Limiter:** [`backend/src/routes/adaptive.routes.ts#L28-L52`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/routes/adaptive.routes.ts#L28-L52)
4. **Generation Controller:** [`backend/src/controllers/adaptive.controller.ts#L566-L695`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/adaptive.controller.ts#L566-L695)
5. **Generation & Extraction Engine:** [`backend/src/services/toeic-generator.service.ts#L1373-L1556`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-generator.service.ts#L1373-L1556)
6. **Grader Controller:** [`backend/src/controllers/adaptive.controller.ts#L701-L770`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/adaptive.controller.ts#L701-L770)

---

## 3. Actual Question Inventory by Part & Source

A direct code and database audit was conducted to count verified questions currently existing in the system.

### 3.1 Curated Question Inventory
In [`backend/src/services/toeic-generator.service.ts#L127-L500`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-generator.service.ts#L127-L500), the static object `CURATED_TOEIC_UNIT_QUESTIONS` holds manually authored questions. The actual counts by unit and difficulty are:

| Unit Number | Grammar Focus | Easy Tier | Medium Tier | Hard Tier | Total Curated Questions | TOEIC Part | Evidence Type |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Unit 1** | Present continuous (*is doing*) | 5 | 5 | 4 | **14** | Part 5 | `[VERIFIED FACT]` Code inspection |
| **Unit 2** | Present simple (*I do*) | 3 | 3 | 2 | **8** | Part 5 | `[VERIFIED FACT]` Code inspection |
| **Unit 3** | Present continuous vs Present simple 1 | 1 | 2 | 1 | **4** | Part 5 | `[VERIFIED FACT]` Code inspection |
| **Unit 4** | Present continuous vs Present simple 2 | 1 | 2 | 1 | **4** | Part 5 | `[VERIFIED FACT]` Code inspection |
| **Units 5–145** | Past, perfect, passive, modals, etc. | 0 | 0 | 0 | **0** | — | `[VERIFIED FACT]` Code inspection |
| **TOTAL** | — | **10** | **12** | **8** | **30** | **Part 5 only** | — |

**Key Finding:** Out of 145 units in the curriculum, **only 4 units (2.7%)** possess curated TOEIC questions. Units 5 through 145 (97.3% of the curriculum) have zero curated questions.

### 3.2 Dynamic Question Generation: Gemini AI
For requests targeting Units 5–145 or requesting counts exceeding curated availability, the engine invokes Google Gemini (`generateGeminiText`, lines 1455–1460):
- **Model:** `gemini-1.5-flash` (or configured `GEMINI_MODEL`).
- **Prompt:** Assembles unit theory headings, source content summaries, and textbook examples. Requests JSON output matching a Part 5 schema.
- **Settings:** `temperature: 0.7`, `timeoutMs: 4000`, `responseMimeType: "application/json"`.
- **Failure Handling:** If the Gemini call times out or throws an error, the system enters a 60-second cooldown (`geminiCooldownUntil = Date.now() + 60000`) and falls through to the regex cloze fallback engine.

### 3.3 Heuristic Cloze Extractor Fallback
When Gemini fails, times out, or has no API key configured, [`buildUnitGroundedDynamicQuestions`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-generator.service.ts#L1070-L1364) attempts to synthesize Part 5 questions from existing Murphy exercises:
- **Pass 1:** Reuses existing multiple-choice questions from the textbook.
- **Pass 2:** Identifies single blanks in Murphy exercises and synthesizes 3 distractors using inflectional regex rules (`generateStructuredGrammarVariants`, `pickCompatibleSiblings`).
- **Pass 3 & 4:** Masks verbs in textbook example sentences using heuristic cloze masking (`maskSentenceForCloze`).

### 3.4 TOEIC Part Coverage Analysis
- **Part 1 (Photos):** 0 questions.
- **Part 2 (Question-Response):** 0 questions.
- **Part 3 (Conversations):** 0 questions.
- **Part 4 (Talks):** 0 questions.
- **Part 5 (Incomplete Sentences):** 30 curated questions + dynamic generation.
- **Part 6 (Text Completion):** 0 questions.
- **Part 7 (Reading Comprehension):** 0 questions.

**Finding:** The existing generator is strictly limited to Part 5 single-sentence cloze items. Although the curriculum metadata in `toeic-roadmap-data.ts` references Parts 1, 2, 3, 4, 6, and 7, no question rendering or generation logic exists for any part other than Part 5.

---

## 4. Database Schema & Persistence Audit

Inspection of Neon PostgreSQL staging revealed the following existing models:

```prisma
model ToeicPracticeSession {
  id             String   @id @default(uuid()) @db.Uuid
  userId         String   @map("user_id") @db.Uuid
  unitNumber     Int      @map("unit_number")
  difficulty     String   @db.VarChar(20)
  source         String   @db.VarChar(20) // 'curated' | 'dynamic' | 'mixed'
  requestedCount Int      @map("requested_count")
  actualCount    Int      @map("actual_count")
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  items          ToeicPracticeItem[]
}

model ToeicPracticeItem {
  id            String    @id @default(uuid()) @db.Uuid
  sessionId     String    @map("session_id") @db.Uuid
  itemOrder     Int       @map("item_order")
  source        String    @db.VarChar(20)
  prompt        String    @db.Text
  options       Json      // Array<{ key: 'A'|'B'|'C'|'D', text: string }>
  correctAnswer String    @map("correct_answer") @db.VarChar(10)
  explanation   String    @db.Text
  ruleReference String?   @map("rule_reference") @db.VarChar(50)
  studentAnswer String?   @map("student_answer") @db.VarChar(10)
  isCorrect     Boolean?  @map("is_correct")
  attemptCount  Int       @default(0) @map("attempt_count")
  answeredAt    DateTime? @map("answered_at") @db.Timestamptz(6)
}
```

### Critical Database Observations:
1. **Absence of Central Question Bank Table:** `ToeicPracticeItem` records exist strictly as children of a specific user's `ToeicPracticeSession`. There is no global table of approved questions that can be queried, indexed, or shared across learners.
2. **Current Record Counts on Staging:**
   - `ToeicRoadmapStage`: 5 records (`[VERIFIED FACT]`)
   - `ToeicRoadmapModule`: 16 records (`[VERIFIED FACT]`)
   - `UnitToeicMetadata`: 145 records (`[VERIFIED FACT]`)
   - `ToeicPracticeSession`: 0 records (`[VERIFIED FACT]`)
   - `ToeicPracticeItem`: 0 records (`[VERIFIED FACT]`)
3. **No Quality or Approval Metadata:** Existing items have no `status` column (`draft`, `approved`, `rejected`), no quality score, and no validation flags.

---

## 5. AttemptSource & Learning Mastery Disconnection

A critical finding of this audit is that **TOEIC practice is currently completely isolated from learner mastery analytics**:

1. **AttemptSource Disconnect:** In [`backend/src/controllers/adaptive.controller.ts#L757-L765`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/adaptive.controller.ts#L757-L765), `checkToeicPracticeHandler` updates `ToeicPracticeItem` directly in the database. It **never creates a `QuestionAttemptItem`** record.
2. **Mastery Calculation Bypass:** Because no `QuestionAttemptItem` is created:
   - `calculateConceptMastery` in [`mastery.service.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/mastery.service.ts) does not see TOEIC attempts.
   - Learner mastery scores, retention probabilities, and review schedules are completely unaffected by TOEIC performance.
3. **Dashboard Metric Disconnect:** The dashboard source breakdown (`sourceBreakdown.toeic_practice`) always returns 0 because no attempt items are tagged with this source.

---

## 6. Flaws & Vulnerabilities in Current Generator

| Vulnerability / Flaw | Technical Root Cause | Impact on Learner Experience | Severity |
| :--- | :--- | :--- | :--- |
| **Synchronous Real-Time Generation** | Gemini is called within the synchronous HTTP request handler (`POST /toeic-practice`). | 2–5 second request latency; subject to Gemini 503/429 rate limit outages. | `HIGH` |
| **Heuristic Cloze Degradation** | `buildUnitGroundedDynamicQuestions` generates distractors via regex word mutations (e.g. adding `-ing` or `-ed` blindly). | Generates non-existent words, grammatically unviable distractors, or multiple valid answers. | `HIGH` |
| **Register & Context Mismatch** | Text extracted from Murphy features casual British conversational English ("Kate", "cinema", "pub"). | Fails to reflect authentic TOEIC Part 5 professional workplace/business context (procurement, invoices, memos). | `MEDIUM` |
| **Ephemeral Session Storage** | Questions are generated per-session and discarded after user practice. | Redundant LLM costs; cannot audit question quality; inconsistent learner experience. | `HIGH` |
| **Disconnected Mastery Engine** | Attempts are saved to `ToeicPracticeItem` without triggering `QuestionAttemptItem` or mastery updates. | Learner gets no mastery progress or spaced repetition credit for TOEIC practice. | `HIGH` |

---

## 7. Audit Classification & Conclusions

- `[VERIFIED FACT]` Statically curated TOEIC questions exist exclusively for Units 1–4 (30 total questions).
- `[VERIFIED FACT]` Units 5–145 currently have zero persistent curated questions.
- `[VERIFIED FACT]` TOEIC question generation is 100% restricted to Part 5 (Incomplete Sentences).
- `[VERIFIED FACT]` `ToeicPracticeItem` attempts do not feed into `QuestionAttemptItem` or `UserConceptMastery`.
- `[VERIFIED FACT]` Staging database contains 0 practice sessions and 0 practice items.

**Phase 3.4B Mandate:** Transition from an on-the-fly, ephemeral, heuristic generator to a **persistent, normalized, pre-generated, and quality-vetted TOEIC Question Bank** backed by multi-stage quality gates and integrated with the mastery engine.

