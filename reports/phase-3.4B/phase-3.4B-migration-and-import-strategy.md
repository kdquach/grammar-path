# GrammarPath Phase 3.4B — Report 8: Migration & Seed Import Strategy
## Database DDL Migrations, Curated Seed Ingestion, and Data Integrity Guardrails

**Date:** 2026-11-13  
**Auditor:** Principal Database Architect & Data Migration Specialist  
**Scope:** Prisma ORM Migration Strategy, DDL Execution Plan, Seed Import Workflows, and Zero-Downtime Rollback  
**Phase Status:** DESIGN ONLY (Phase 3.4B Stage 1)

---

## 1. Executive Summary

This report establishes the **Migration and Seed Ingestion Strategy** for Phase 3.4B. The strategy guarantees zero data loss, zero table locking during production deployment, and complete backward compatibility with existing user practice sessions.

The migration introduces three new relational tables and three PostgreSQL enums. An automated, idempotent seed script will import the 30 existing curated questions for Units 1–4, followed by an offline generation and validation pipeline that seeds high-quality, pre-approved questions for Units 5–52 (the core verb/tense/modal backbone of the curriculum).

> [!IMPORTANT]
> **Safety Constraint:** In accordance with the Stage 1 charter, **zero migrations or database writes are executed during Stage 1**. This document defines the execution runbook for Stage 2.

---

## 2. PostgreSQL DDL Migration Plan

### 2.1 Target Migration Identifier
- **Migration Name:** `20261114000000_phase_3_4b_toeic_question_bank`
- **Execution Engine:** Prisma ORM 6.19.3 (`prisma migrate deploy`)
- **Isolation Verification:** Verified via `scripts/run-with-staging-env.mjs` against Neon staging.

### 2.2 Schema Additions & DDL Specifications

```sql
-- 1. Create Enums
CREATE TYPE "toeic_part_enum" AS ENUM (
  'part_1', 'part_2', 'part_3', 'part_4', 'part_5', 'part_6', 'part_7'
);

CREATE TYPE "toeic_question_status_enum" AS ENUM (
  'draft', 'validated', 'approved', 'rejected', 'archived'
);

CREATE TYPE "toeic_skill_category_enum" AS ENUM (
  'grammar', 'word_form', 'vocabulary', 'reading', 'listening'
);

-- 2. Create Generation Run Table
CREATE TABLE "toeic_question_generation_runs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "model_name" VARCHAR(60) NOT NULL,
  "prompt_template" TEXT NOT NULL,
  "unit_number" INTEGER,
  "target_count" INTEGER NOT NULL,
  "generated_count" INTEGER NOT NULL,
  "accepted_count" INTEGER NOT NULL DEFAULT 0,
  "raw_output" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "toeic_question_generation_runs_pkey" PRIMARY KEY ("id")
);

-- 3. Create Question Bank Items Table
CREATE TABLE "toeic_question_bank_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "question_code" VARCHAR(60) NOT NULL,
  "toeic_part" "toeic_part_enum" NOT NULL DEFAULT 'part_5',
  "prompt" TEXT NOT NULL,
  "passage_text" TEXT,
  "correct_option_key" VARCHAR(4) NOT NULL,
  "difficulty" "difficulty_level_enum" NOT NULL DEFAULT 'medium',
  "status" "toeic_question_status_enum" NOT NULL DEFAULT 'draft',
  "skill_category" "toeic_skill_category_enum" NOT NULL DEFAULT 'grammar',
  
  "primary_concept_id" UUID,
  "secondary_concept_id" UUID,
  "unit_number" INTEGER,
  "theory_section_id" VARCHAR(20),
  
  "explanation_vi" TEXT NOT NULL,
  "explanation_en" TEXT,
  "rule_reference" VARCHAR(50) NOT NULL,
  
  "quality_score" DECIMAL(4, 2) NOT NULL DEFAULT 0.00,
  "is_official_toeic" BOOLEAN NOT NULL DEFAULT false,
  "version" INTEGER NOT NULL DEFAULT 1,
  
  "generation_run_id" UUID,
  "approved_by" VARCHAR(80),
  "approved_at" TIMESTAMPTZ(6),
  "rejection_reason" TEXT,
  
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "toeic_question_bank_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "toeic_question_bank_items_question_code_key" UNIQUE ("question_code"),
  CONSTRAINT "fk_tqbi_primary_concept" FOREIGN KEY ("primary_concept_id") REFERENCES "grammar_concepts"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_tqbi_secondary_concept" FOREIGN KEY ("secondary_concept_id") REFERENCES "grammar_concepts"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_tqbi_generation_run" FOREIGN KEY ("generation_run_id") REFERENCES "toeic_question_generation_runs"("id") ON DELETE SET NULL
);

-- 4. Create Question Options Table
CREATE TABLE "toeic_question_options" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "question_bank_item_id" UUID NOT NULL,
  "option_key" VARCHAR(4) NOT NULL,
  "option_text" TEXT NOT NULL,
  "is_correct" BOOLEAN NOT NULL,
  "distractor_rationale_vi" TEXT,
  "display_order" INTEGER NOT NULL,

  CONSTRAINT "toeic_question_options_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "toeic_question_options_item_key_unique" UNIQUE ("question_bank_item_id", "option_key"),
  CONSTRAINT "fk_tqo_bank_item" FOREIGN KEY ("question_bank_item_id") REFERENCES "toeic_question_bank_items"("id") ON DELETE CASCADE
);

-- 5. Create Performance Indexes
CREATE INDEX "idx_tqbi_status_unit_diff" ON "toeic_question_bank_items" ("status", "unit_number", "difficulty");
CREATE INDEX "idx_tqbi_status_concept" ON "toeic_question_bank_items" ("status", "primary_concept_id");
CREATE INDEX "idx_tqbi_status_part_diff" ON "toeic_question_bank_items" ("status", "toeic_part", "difficulty");
CREATE INDEX "idx_tqo_item_order" ON "toeic_question_options" ("question_bank_item_id", "display_order");
```

---

## 3. Seed & Ingestion Strategy

Seed ingestion is staged into two distinct phases to ensure stability:

### Phase 1: Curated Bank Migration (Units 1–4)
- **Target:** 30 existing curated questions in `CURATED_TOEIC_UNIT_QUESTIONS` ([`toeic-generator.service.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-generator.service.ts#L127-L500)).
- **Action:** A dedicated migration script parses the static TypeScript object and upserts all 30 questions into `ToeicQuestionBankItem` with:
  - `status: "approved"`
  - `qualityScore: 9.80`
  - `approvedBy: "editorial_lead_curated"`
  - `approvedAt: NOW()`
  - Normalized `ToeicQuestionOption` records for choices A, B, C, D.
- **Idempotency:** Driven by `question_code` (e.g. `TOEIC-P5-U001-E01`). Running the script repeatedly updates existing records without creating duplicates.

### Phase 2: Core Tense & Modal Seeding (Units 5–52)
- **Target:** 48 core grammar units (past tenses, present perfect, passive voice, future forms, modals).
- **Target Volume:** 6 questions per unit (2 Easy, 2 Medium, 2 Hard) = **288 newly validated questions**.
- **Action:** Executed via the offline CLI script `npm run seed:toeic-bank -- --units 5-52`:
  1. Calls Gemini in batch mode with strict structured output.
  2. Runs Gates 1–5 automated validators.
  3. Executes dual-pass blind re-evaluation.
  4. Inserts passing items with `status: "approved"` (if score >= 9.0) or `status: "validated"` for review.
- **Result:** Establishes a permanent, robust baseline bank of ~318 approved TOEIC Part 5 items covering the first 52 units of the curriculum.

---

## 4. Rollback & Data Safety Guardrails

1. **Non-Destructive Operations:** The migration creates new tables only. It does not drop, alter, or lock existing tables (`units`, `exercises`, `questions`, `toeic_practice_sessions`).
2. **Rollback SQL:** A corresponding rollback script (`DROP TABLE toeic_question_options; DROP TABLE toeic_question_bank_items; DROP TABLE toeic_question_generation_runs; ...`) is prepared to reverse the migration cleanly if needed.
3. **Staging Guard Verification:** All migration commands must be prepended with `scripts/run-with-staging-env.mjs` to ensure production credentials can never be targeted.

