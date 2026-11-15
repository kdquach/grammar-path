# GrammarPath — Phase 3.4B.1: TOEIC Question Bank Data Model Decisions

**Auditor:** Senior Software Architect, Database Engineer  
**Date:** November 13, 2026  
**Status:** ARCHITECTURAL SPECIFICATION & DESIGN DECISION  
**Safety Scope:** Prisma Schema Addendum (Design-Only, No Migrations Run)  

---

## 1. Explicit Answers to the Seven Core Architectural Questions

### Question 1: Does the model support one or multiple correct answers?
- **Decision:** **The data model natively supports multiple correct options via a boolean flag (`isCorrect: Boolean`) on each `ToeicQuestionOption`, but enforces a strict single-key constraint for TOEIC Part 5 items.**
- **Implementation Mechanism:**
  - In `ToeicQuestionOption`, each option row has `isCorrect: Boolean @default(false)`.
  - In `ToeicQuestionBankItem`, an enum `format: ToeicQuestionFormat` specifies the item structure (`PART5_INCOMPLETE_SENTENCE`, `PART6_TEXT_COMPLETION`, etc.).
  - A database-level CHECK constraint or application service invariant enforces:
    $$\text{For format } = \text{'PART5\_INCOMPLETE\_SENTENCE'}, \quad \sum_{\text{options}} \mathbb{I}(\text{isCorrect} = \text{true}) = 1$$
- **Architectural Rationale:**
  - Storing a string enum `correctAnswer: "A" | "B" | "C" | "D"` directly on the question table is an anti-pattern when options are shuffled or modified; option texts can desynchronize from letter keys.
  - Using `isCorrect` on the child option allows option text shuffling without mutating the question record, while keeping open compatibility for multi-correct question formats in advanced diagnostic assessments.

---

### Question 2: Is it intentionally limited to multiple-choice questions?
- **Decision:** **Yes, for Phase 3.4B, the system is intentionally specialized for 4-option Multiple Choice Questions (MCQ) characteristic of TOEIC Part 5 (Incomplete Sentences).**
- **Limitation Documentation:**
  - Free-text cloze, word-bank dragging, and sentence restructuring (supported in canonical Murphy exercises) are deliberately excluded from the TOEIC question bank to match ETS standard testing specs.
- **Future Extension Path (Parts 6 & 7):**
  - To support TOEIC Part 6 (Text Completion) and Part 7 (Reading Passages), the data model introduces an optional parent entity:
    ```prisma
    model ToeicStimulus {
      id          String                  @id @default(uuid())
      stimulusType ToeicStimulusType      // READING_PASSAGE, MEMO, EMAIL, ADVERTISEMENT, AUDIO_PROMPT
      title       String?
      bodyContent String                  @db.Text
      mediaUrl    String?                 // For listening audio tracks
      wordCount   Int?
      items       ToeicQuestionBankItem[]
      createdAt   DateTime                @default(now())
    }
    ```
  - When Part 6 or 7 is implemented, `ToeicQuestionBankItem.stimulusId` references the shared passage/memo, and each question represents an individual item linked to that stimulus.

---

### Question 3: Where are the question-level explanation and per-option distractor rationales stored?
- **Decision:** **A dual-level storage hierarchy is established:**
  1. **Question-Level Synthesis:** Stored in `ToeicQuestionBankItem.explanation` (`@db.Text`). This provides the overarching pedagogical narrative, grammatical rule analysis, translation, and reference back to the Murphy unit/section.
  2. **Option-Level Distractor Rationales:** Stored in `ToeicQuestionOption.rationale` (`@db.Text`, optional).
- **Pedagogical Rationale:**
  - Learners failing a TOEIC Part 5 item often understand why the correct answer works, but fail to understand *why their chosen distractor was disqualified* (e.g., distinguishing between a gerund acting as a noun vs. a participle, or recognizing a transitive verb that cannot take a preposition).
  - Explicit distractor rationales power targeted error remediation during Review Center drills.

---

### Question 4: What provenance is retained across the lifecycle?
- **Decision:** **Full end-to-end cryptographic and organizational provenance is preserved across both `ToeicQuestionBankItem` and `ToeicQuestionGenerationRun`.**
- **Tracked Provenance Fields:**
  - **Origin Type:** `source: ToeicItemSource` (`curated_expert`, `ai_generated`, `corpus_derived`, `legacy_seed`).
  - **Generation Run Association:** `generationRunId` FK linking directly to the specific execution run.
  - **Model & Pipeline Metadata (via `ToeicQuestionGenerationRun`):**
    - `provider`: e.g., `"google_gemini"`, `"anthropic"`
    - `modelName`: e.g., `"gemini-1.5-flash"`, `"gemini-1.5-pro"`
    - `promptVersion`: e.g., `"v1.3-part5-business"`
    - `promptTemplate`: verbatim system + user prompt with parameter markers
    - `temperature`, `topP`, `maxTokens`: generation hyperparameters
    - `inputTokens`, `outputTokens`, `latencyMs`: operational telemetry
  - **Validation & Editorial History:**
    - `validationScores`: JSONB containing dual-pass automated scores (linguistic accuracy, business realism, distractor validity).
    - `reviewedBy`: User ID of the editorial reviewer or automated system agent.
    - `reviewedAt`: Timestamp of status change.
    - `reviewNotes`: Editorial remarks justifying approval or detailing rejection causes.
  - **Integrity Hash:** `contentHash: String` (SHA-256 of normalized stem + sorted option texts) ensuring zero duplicate ingestion across generation runs.

---

### Question 5: How are approved questions versioned?
- **Decision:** **Immutable question versioning using a root linkage model.**
- **Specification:**
  - `rootQuestionId`: UUID pointing to the conceptual root question (invariant across edits).
  - `version`: Integer starting at `1` and monotonically incrementing ($1, 2, 3, \dots$).
  - `isLatestApproved`: Boolean flag (`true` for at most one version per `rootQuestionId`).
  - `reviewStatus`: Enum (`draft`, `validated`, `approved`, `rejected`, `archived`, `withdrawn`).
- **Immutability Invariant:**
  - **An approved question version is strictly read-only.**
  - If a typo is fixed, a distractor refined, or an explanation improved:
    1. A new row is created with identical `rootQuestionId` and `version = current + 1`.
    2. The new row enters as `draft` or `validated`.
    3. Upon editorial approval, a transaction atomically sets the old version's `isLatestApproved = false`, marks the old version as `archived`, and sets the new version's `reviewStatus = "approved"` and `isLatestApproved = true`.

---

### Question 6: How are existing learner attempts protected from changes to question content?
- **Decision:** **Learner sessions and historical attempts maintain immutable references to the exact question version presented at practice time.**
- **Protection Mechanisms:**
  1. `ToeicPracticeItem` stores `questionBankItemId` referencing the exact immutable `ToeicQuestionBankItem.id` (which represents a specific version).
  2. `ToeicPracticeItem` preserves a frozen denormalized snapshot of the `prompt`, `options`, `correctAnswer`, and `explanation` captured at session creation time.
  3. Foreign keys from practice items to question bank items use `onDelete: Restrict`. A question version that has been served to a learner **can never be deleted from the database**.
  4. Updating or archiving a question in the bank has zero mathematical or visual impact on historical practice sessions, mistake logs, or accuracy percentages.

---

### Question 7: What happens when a published question is found to contain a critical error?
- **Decision:** **An explicit emergency withdrawal protocol (`withdrawn` status) is implemented:**
  1. **Immediate Quarantine:** The question version is updated atomically to `reviewStatus = "withdrawn"`, `isLatestApproved = false`, and `withdrawnReason` is recorded.
  2. **Session Generation Block:** The practice generator queries only `reviewStatus = 'approved' AND isLatestApproved = true`. A withdrawn item immediately vanishes from all future session draws.
  3. **In-Flight Session Handling:** When a learner submits an answer to an in-flight session containing a withdrawn item:
     - The grading handler checks item status.
     - The item is graded and flagged with `isVoided: true`, `voidReason: "EMERGENCY_DEFECT_WITHDRAWAL"`.
     - Full credit is awarded to the learner to prevent penalty for system defects.
  4. **Mastery Telemetry Shield:** No negative mastery evidence is emitted for withdrawn items. An administrative CLI tool (`remedy-withdrawn-toeic-item.ts`) safely purges any `QuestionAttemptItem` records created from the defective item and recalculates affected `UserConceptMastery` records.

---

## 2. Evaluation of Existing Models: Reuse, Migrate, Link, or Deprecate?

### Current Database State:
- `ep-small-dream-a1lqsn1r` currently holds:
  - `toeic_practice_sessions`: **0 rows**.
  - `toeic_practice_items`: **0 rows**.

### Architectural Decision:
We **RETAIN, REFINE, AND LINK** the existing session models rather than deprecating or duplicating them:

```
[ToeicQuestionBankItem] (Canonical Repository of Quality-Approved Content)
         │ 1
         │
         │ has many
         ▼ *
[ToeicPracticeItem] (Learner Attempt Instance within a Practice Drill)
         ▲ *
         │
         │ belongs to
         │ 1
[ToeicPracticeSession] (User Practice Container: 5-20 questions, timed/practice mode)
```

1. **`ToeicPracticeSession` (RETAIN & REFINE):**
   - Serves as the user-facing session boundary.
   - Retains `userId`, `unitNumber`, `difficulty`, `score`, `isCompleted`.
   - Adds `sessionMode: "standard_practice" | "speed_drill" | "diagnostic"`.
2. **`ToeicPracticeItem` (REFINE & LINK):**
   - Retains `sessionId`, `studentAnswer`, `isCorrect`, `attemptCount`, `answeredAt`.
   - **Adds Foreign Key:** `questionBankItemId String? @relation(fields: [questionBankItemId], references: [id])`.
   - Maintains fallback support (`questionBankItemId = null`) for dynamic on-the-fly questions if an uncurated unit is accessed during rollout.
3. **No Duplicate Source of Truth:**
   - `ToeicQuestionBankItem` is the **Authoring & Quality Bank** (read-heavy, editorial workflow, versioned).
   - `ToeicPracticeItem` is the **Learner Telemetry Instance** (write-heavy, user-scoped, ephemeral drill state).

---

## 3. Complete Target Prisma Schema Specification

```prisma
// ============================================================================
// WORKSTREAM B: TOEIC QUESTION BANK & QUALITY ENGINE
// ============================================================================

enum ToeicPart {
  PART_1
  PART_2
  PART_3
  PART_4
  PART_5
  PART_6
  PART_7
}

enum ToeicQuestionFormat {
  PART5_INCOMPLETE_SENTENCE
  PART6_TEXT_COMPLETION
  PART7_READING_SINGLE
  PART7_READING_DOUBLE
  PART7_READING_TRIPLE
}

enum ToeicItemSource {
  curated_expert
  ai_generated
  corpus_derived
  legacy_seed
}

enum ToeicReviewStatus {
  draft
  validated
  approved
  rejected
  archived
  withdrawn
}

enum ToeicPrimarySkill {
  direct_grammar
  word_form_morphology
  vocabulary_collocation
  reading_comprehension
  listening_comprehension
}

model ToeicQuestionGenerationRun {
  id                    String                  @id @default(uuid())
  provider              String                  // e.g. "google_gemini"
  modelName             String                  // e.g. "gemini-1.5-flash"
  promptVersion         String                  // e.g. "v1.3-part5-business"
  promptTemplate        String                  @db.Text
  targetUnitNumber      Int?
  targetDifficulty      DifficultyLevel
  targetSkill           ToeicPrimarySkill
  itemsRequested        Int
  itemsGenerated        Int                     @default(0)
  itemsPassedValidation Int                     @default(0)
  promptTokens          Int?
  completionTokens      Int?
  latencyMs             Int?
  executedBy            String                  @default("system")
  executedAt            DateTime                @default(now())

  generatedItems        ToeicQuestionBankItem[]

  @@index([targetUnitNumber, targetDifficulty])
  @@index([executedAt])
  @@map("toeic_question_generation_runs")
}

model ToeicQuestionBankItem {
  id                    String                  @id @default(uuid())
  rootQuestionId        String                  @default(uuid()) // Identifies conceptual question across versions
  version               Int                     @default(1)
  isLatestApproved      Boolean                 @default(false)

  // Content
  part                  ToeicPart               @default(PART_5)
  format                ToeicQuestionFormat     @default(PART5_INCOMPLETE_SENTENCE)
  prompt                String                  @db.Text // Sentence with "_______"
  explanation           String                  @db.Text // Pedagogical explanation in Vietnamese
  difficulty            DifficultyLevel         @default(medium)
  
  // Curriculum & Assessment Mapping
  primarySkill          ToeicPrimarySkill       @default(direct_grammar)
  subSkill              String?                 // e.g. "verb_tense", "passive_voice", "relative_pronoun"
  unitNumber            Int?                    // Murphy Unit (1..145)
  ruleReference         String?                 // e.g. "1B", "24A"
  conceptId             String?                 // Optional FK to GrammarConcept
  conceptMappingConfidence Float?               // 0.00 to 1.00 (e.g. 0.95)
  conceptMappingSource  String?                 // "curated_metadata", "embedding_match", "expert_tagged"

  // Quality & Review Workflow
  reviewStatus          ToeicReviewStatus       @default(draft)
  qualityScore          Float?                  // Aggregate score (0.00 to 10.00)
  validationScores      Json?                   // Detailed rubrics: { linguisticAccuracy: 9.5, businessRealism: 9.0, ... }
  source                ToeicItemSource         @default(ai_generated)
  sourceReference       String?                 // e.g. "Murphy Unit 1 Example 3", "Curated Seed 1.1"
  contentHash           String                  @unique // SHA-256 of normalized prompt + options

  // Provenance & Audit
  generationRunId       String?
  generationRun         ToeicQuestionGenerationRun? @relation(fields: [generationRunId], references: [id], onDelete: SetNull)
  reviewedBy            String?
  reviewedAt            DateTime?
  reviewNotes           String?                 @db.Text
  withdrawnReason       String?                 @db.Text

  createdAt             DateTime                @default(now())
  updatedAt             DateTime                @updatedAt

  // Relations
  options               ToeicQuestionOption[]
  concept               GrammarConcept?         @relation(fields: [conceptId], references: [id], onDelete: SetNull)
  practiceItems         ToeicPracticeItem[]

  @@unique([rootQuestionId, version])
  @@index([unitNumber, difficulty, reviewStatus])
  @@index([conceptId, reviewStatus])
  @@index([reviewStatus, isLatestApproved])
  @@map("toeic_question_bank_items")
}

model ToeicQuestionOption {
  id                    String                  @id @default(uuid())
  questionBankItemId    String
  optionKey             String                  // "A", "B", "C", "D"
  optionText            String
  isCorrect             Boolean                 @default(false)
  rationale             String?                 @db.Text // Explains why this distractor is grammatically invalid
  displayOrder          Int                     @default(0)

  question              ToeicQuestionBankItem   @relation(fields: [questionBankItemId], references: [id], onDelete: Cascade)

  @@unique([questionBankItemId, optionKey])
  @@index([questionBankItemId, isCorrect])
  @@map("toeic_question_options")
}
```

