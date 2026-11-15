# GrammarPath Phase 3.4B — Report 3: TOEIC Question Bank Data Architecture
## Normalized Relational Data Model, Schema Optimization, Indexing & Immutability Strategy

**Date:** 2026-11-13  
**Auditor:** Principal Learning Systems Architect & Database Integrity Engineer  
**Scope:** Data Architecture, Entity Lifecycle, Prisma ORM Schema Design, and Indexing Strategy  
**Phase Status:** DESIGN ONLY (Phase 3.4B Stage 1)

---

## 1. Executive Summary

This report establishes the normalized data architecture for the dedicated **GrammarPath TOEIC Question Bank**. The design replaces ephemeral, per-session storage (`ToeicPracticeItem`) with a centralized, indexed, version-controlled, and audited repository of validated TOEIC items.

The architecture balances relational rigor against unnecessary normalization:
- **Normalized Entities:** `ToeicQuestionBankItem`, `ToeicQuestionOption`, and `ToeicQuestionGenerationRun`.
- **Deliberate De-normalization:** Avoided separate tables for `ToeicQuestionAnswer` (modeled via `isCorrect` flag on options plus `correctOptionKey` on item for zero-join grading) and `ToeicQuestionExplanation` (modeled as first-class columns on the item).
- **Audit & Review:** Review state is tracked via explicit lifecycle enums (`ToeicQuestionStatus`) and immutable approval timestamps.

---

## 2. Entity Relational Architecture

```
┌────────────────────────────────────────────────────────┐
│            ToeicQuestionGenerationRun                  │
│  - id: UUID (PK)                                       │
│  - modelName: varchar(60)                              │
│  - promptTemplate: text                                │
│  - unitNumber: int?                                    │
│  - targetCount: int                                    │
│  - generatedCount: int                                 │
│  - acceptedCount: int                                  │
│  - createdAt: timestamptz                              │
└───────────────────────────┬────────────────────────────┘
                            │ 1 : N
                            ▼
┌────────────────────────────────────────────────────────┐
│               ToeicQuestionBankItem                    │
│  - id: UUID (PK)                                       │
│  - questionCode: varchar(60) [UNIQUE]                  │
│  - toeicPart: ToeicPart (default: part_5)              │
│  - prompt: text                                        │
│  - passageText: text?                                  │
│  - correctOptionKey: varchar(4)                        │
│  - difficulty: DifficultyLevel (easy/med/hard)         │
│  - status: ToeicQuestionStatus (draft/val/appr/rej/arc)│
│  - skillCategory: ToeicSkillCategory                   │
│  - primaryConceptId: UUID? -> GrammarConcept.id        │
│  - secondaryConceptId: UUID? -> GrammarConcept.id      │
│  - unitNumber: int?                                    │
│  - theorySectionId: varchar(20)?                       │
│  - explanationVi: text                                 │
│  - explanationEn: text?                                │
│  - ruleReference: varchar(50)                          │
│  - qualityScore: decimal(4,2)                          │
│  - generationRunId: UUID? -> GenerationRun.id          │
│  - version: int (default: 1)                           │
│  - approvedAt: timestamptz?                            │
│  - approvedBy: varchar(80)?                            │
│  - rejectionReason: text?                              │
│  - createdAt: timestamptz                              │
│  - updatedAt: timestamptz                              │
└───────────────────────────┬────────────────────────────┘
                            │ 1 : N (CASCADE)
                            ▼
┌────────────────────────────────────────────────────────┐
│               ToeicQuestionOption                      │
│  - id: UUID (PK)                                       │
│  - questionBankItemId: UUID (FK)                       │
│  - optionKey: varchar(4) ('A' | 'B' | 'C' | 'D')       │
│  - optionText: text                                    │
│  - isCorrect: boolean                                  │
│  - distractorRationaleVi: text?                        │
│  - displayOrder: int                                   │
└────────────────────────────────────────────────────────┘
```

---

## 3. Entity Specification & Trade-Off Analysis

### 3.1 Entity 1: `ToeicQuestionBankItem`
- **Business Responsibility:** Represents a canonical, distinct TOEIC assessment item. Serves as the authoritative source for learner practice, diagnostic assessments, and mastery transfer.
- **Keys:**
  - Primary Key: `id UUID @id @default(uuid())`.
  - Natural Key: `questionCode VARCHAR(60) @unique` (e.g. `TOEIC-P5-U005-E01-V1`).
- **Foreign Keys:**
  - `primaryConceptId UUID? -> GrammarConcept(id) ON DELETE SET NULL`.
  - `secondaryConceptId UUID? -> GrammarConcept(id) ON DELETE SET NULL`.
  - `generationRunId UUID? -> ToeicQuestionGenerationRun(id) ON DELETE SET NULL`.
- **Indexing Strategy:**
  - `@@index([status, unitNumber, difficulty])`: **Hot query path.** Powers practice session assembly filtering by approved items for a target unit.
  - `@@index([status, primaryConceptId])`: Powers concept-targeted adaptive drills.
  - `@@index([status, toeicPart, difficulty])`: Powers mixed Part 5 practice drills.
  - `@@index([questionCode])`: Unique constraint index.
- **Lifecycle & Deletion:**
  - Hard deletions are **strictly prohibited** once an item has been served in practice sessions (to preserve learner attempt history).
  - Soft deprecation via `status = 'archived'`.
- **Immutability & Versioning:**
  - When `status === 'approved'`, the question's linguistic content (`prompt`, `options`, `correctAnswer`, `explanationVi`) is **immutable**.
  - Any editorial revision increments `version`, sets previous row to `archived`, and creates a new active row.

### 3.2 Entity 2: `ToeicQuestionOption`
- **Business Responsibility:** Represents one of the 4 candidate choices (A, B, C, D) presented to the learner.
- **Keys:**
  - Primary Key: `id UUID @id @default(uuid())`.
  - Foreign Key: `questionBankItemId UUID -> ToeicQuestionBankItem(id) ON DELETE CASCADE`.
- **Constraints:**
  - `@@unique([questionBankItemId, optionKey])`: Guarantees exactly one choice per key (A, B, C, D) per question.
  - Exactly one option per question must have `isCorrect: true`.
- **Why Separate Table vs JSON:**
  - Allows precise indexing of distractor texts, distinct analysis of student answer distributions, and storage of `distractorRationaleVi` (educational rationale for why a distractor is wrong) without JSON parsing overhead.

### 3.3 Entity 3: `ToeicQuestionGenerationRun`
- **Business Responsibility:** Tracks metadata and batch provenance for AI generation pipelines. Enables data scientists to evaluate prompt template performance, model drift, and acceptance ratios across different LLM versions.
- **Keys:**
  - Primary Key: `id UUID @id @default(uuid())`.
- **Lifecycle:**
  - Retained for auditability. Deleting a generation run does not delete generated questions (`ON DELETE SET NULL`).

---

## 4. Evaluation of Discarded / Consolidated Entities

To prevent over-engineering and database sprawl, candidate entities were critically evaluated:

| Candidate Entity | Decision | Architectural Rationale |
| :--- | :--- | :--- |
| `ToeicQuestionAnswer` | **DISCARDED** | Storing the answer key in a separate 1:1 table requires an unnecessary join on every query. Instead, `correctOptionKey` on the item plus `isCorrect: boolean` on `ToeicQuestionOption` provides instant, zero-join answer validation while maintaining relational integrity. |
| `ToeicQuestionExplanation` | **DISCARDED** | Explanations are 1:1 with questions. Placing `explanationVi`, `explanationEn`, and `distractorRationaleVi` directly on the item and options avoids multi-table joins during review rendering. |
| `ToeicQuestionConceptLink` | **CONSOLIDATED** | 98% of TOEIC grammar questions have a single primary concept focus. Using `primaryConceptId` and optional `secondaryConceptId` directly on `ToeicQuestionBankItem` satisfies 100% of current pedagogical needs without introducing an expensive junction table. |
| `ToeicQuestionReview` | **CONSOLIDATED** | Storing `approvedBy`, `approvedAt`, `rejectionReason`, and `qualityScore` directly on `ToeicQuestionBankItem` provides complete audit traceability without creating a separate review ledger table. |

---

## 5. Target Prisma ORM Schema Definition

```prisma
// ─── Enums for TOEIC Question Bank ──────────────────────────────────────────

enum ToeicPart {
  part_1
  part_2
  part_3
  part_4
  part_5
  part_6
  part_7

  @@map("toeic_part_enum")
}

enum ToeicQuestionStatus {
  draft
  validated
  approved
  rejected
  archived

  @@map("toeic_question_status_enum")
}

enum ToeicSkillCategory {
  grammar
  word_form
  vocabulary
  reading
  listening

  @@map("toeic_skill_category_enum")
}

// ─── TOEIC Question Bank Models ─────────────────────────────────────────────

model ToeicQuestionGenerationRun {
  id              String   @id @default(uuid()) @db.Uuid
  modelName       String   @map("model_name") @db.VarChar(60)
  promptTemplate  String   @map("prompt_template") @db.Text
  unitNumber      Int?     @map("unit_number")
  targetCount     Int      @map("target_count")
  generatedCount  Int      @map("generated_count")
  acceptedCount   Int      @default(0) @map("accepted_count")
  rawOutput       String?  @map("raw_output") @db.Text
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  questions       ToeicQuestionBankItem[]

  @@map("toeic_question_generation_runs")
}

model ToeicQuestionBankItem {
  id                  String              @id @default(uuid()) @db.Uuid
  questionCode        String              @unique @map("question_code") @db.VarChar(60)
  toeicPart           ToeicPart           @default(part_5) @map("toeic_part")
  prompt              String              @db.Text
  passageText         String?             @map("passage_text") @db.Text
  correctOptionKey    String              @map("correct_option_key") @db.VarChar(4)
  difficulty          DifficultyLevel     @default(medium)
  status              ToeicQuestionStatus @default(draft)
  skillCategory       ToeicSkillCategory  @default(grammar) @map("skill_category")
  
  primaryConceptId    String?             @map("primary_concept_id") @db.Uuid
  secondaryConceptId  String?             @map("secondary_concept_id") @db.Uuid
  unitNumber          Int?                @map("unit_number")
  theorySectionId     String?             @map("theory_section_id") @db.VarChar(20)
  
  explanationVi       String              @map("explanation_vi") @db.Text
  explanationEn       String?             @map("explanation_en") @db.Text
  ruleReference       String              @map("rule_reference") @db.VarChar(50)
  
  qualityScore        Decimal             @default(0.00) @map("quality_score") @db.Decimal(4, 2)
  isOfficialToeic     Boolean             @default(false) @map("is_official_toeic")
  version             Int                 @default(1)
  
  generationRunId     String?             @map("generation_run_id") @db.Uuid
  approvedBy          String?             @map("approved_by") @db.VarChar(80)
  approvedAt          DateTime?           @map("approved_at") @db.Timestamptz(6)
  rejectionReason     String?             @map("rejection_reason") @db.Text
  
  createdAt           DateTime            @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt           DateTime            @updatedAt @map("updated_at") @db.Timestamptz(6)

  // Relations
  options             ToeicQuestionOption[]
  primaryConcept      GrammarConcept?     @relation("PrimaryToeicConcept", fields: [primaryConceptId], references: [id], onDelete: SetNull)
  secondaryConcept    GrammarConcept?     @relation("SecondaryToeicConcept", fields: [secondaryConceptId], references: [id], onDelete: SetNull)
  generationRun       ToeicQuestionGenerationRun? @relation(fields: [generationRunId], references: [id], onDelete: SetNull)

  // Indexes for high-throughput practice retrieval
  @@index([status, unitNumber, difficulty])
  @@index([status, primaryConceptId])
  @@index([status, toeicPart, difficulty])
  @@index([skillCategory, status])
  @@map("toeic_question_bank_items")
}

model ToeicQuestionOption {
  id                      String   @id @default(uuid()) @db.Uuid
  questionBankItemId      String   @map("question_bank_item_id") @db.Uuid
  optionKey               String   @map("option_key") @db.VarChar(4)
  optionText              String   @map("option_text") @db.Text
  isCorrect               Boolean  @map("is_correct")
  distractorRationaleVi   String?  @map("distractor_rationale_vi") @db.Text
  displayOrder            Int      @map("display_order")

  questionItem            ToeicQuestionBankItem @relation(fields: [questionBankItemId], references: [id], onDelete: Cascade)

  @@unique([questionBankItemId, optionKey])
  @@index([questionBankItemId, displayOrder])
  @@map("toeic_question_options")
}
```

---

## 6. Backward Compatibility with Existing Models

During Phase 3.4B, existing user session tables `toeic_practice_sessions` and `toeic_practice_items` will be **preserved without schema deletion**:
1. User practice sessions will continue to be recorded in `toeic_practice_sessions` to track session duration and scores.
2. In Phase 3.4B Stage 2, `toeic_practice_items` can add an optional foreign key `bankItemId UUID? -> ToeicQuestionBankItem(id)` to link practice attempts directly to the canonical question bank item.
3. Zero breaking changes to existing data or migrations.

