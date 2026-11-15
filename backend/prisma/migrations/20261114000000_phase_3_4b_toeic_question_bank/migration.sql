-- Phase 3.4B: Dedicated TOEIC Question Bank, Quality Gates & Offline Job Queue
-- Additive migration: adds toeic_question_generation_runs, toeic_question_bank_items, toeic_question_options, toeic_generation_jobs.
-- Modifies toeic_practice_items and question_attempt_items with optional question_bank_item_id FK.

-- CreateEnums
CREATE TYPE "toeic_part_enum" AS ENUM ('PART_1', 'PART_2', 'PART_3', 'PART_4', 'PART_5', 'PART_6', 'PART_7');
CREATE TYPE "toeic_question_format_enum" AS ENUM ('PART5_INCOMPLETE_SENTENCE', 'PART6_TEXT_COMPLETION', 'PART7_READING_SINGLE', 'PART7_READING_DOUBLE', 'PART7_READING_TRIPLE');
CREATE TYPE "toeic_item_source_enum" AS ENUM ('curated_expert', 'ai_generated', 'corpus_derived', 'legacy_seed');
CREATE TYPE "toeic_review_status_enum" AS ENUM ('draft', 'validated', 'approved', 'rejected', 'archived', 'withdrawn');
CREATE TYPE "toeic_primary_skill_enum" AS ENUM ('direct_grammar', 'word_form_morphology', 'vocabulary_collocation', 'reading_comprehension', 'listening_comprehension');
CREATE TYPE "toeic_generation_job_status_enum" AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'paused');

-- CreateTable: toeic_question_generation_runs
CREATE TABLE "toeic_question_generation_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" VARCHAR(50) NOT NULL,
    "model_name" VARCHAR(100) NOT NULL,
    "prompt_version" VARCHAR(50) NOT NULL,
    "prompt_template" TEXT NOT NULL,
    "target_unit_number" INTEGER,
    "target_difficulty" VARCHAR(20) NOT NULL,
    "target_skill" "toeic_primary_skill_enum" NOT NULL DEFAULT 'direct_grammar',
    "items_requested" INTEGER NOT NULL,
    "items_generated" INTEGER NOT NULL DEFAULT 0,
    "items_passed_validation" INTEGER NOT NULL DEFAULT 0,
    "prompt_tokens" INTEGER,
    "completion_tokens" INTEGER,
    "latency_ms" INTEGER,
    "executed_by" VARCHAR(100) NOT NULL DEFAULT 'system',
    "executed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "toeic_question_generation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: toeic_question_bank_items
CREATE TABLE "toeic_question_bank_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "root_question_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_latest_approved" BOOLEAN NOT NULL DEFAULT false,
    "part" "toeic_part_enum" NOT NULL DEFAULT 'PART_5',
    "format" "toeic_question_format_enum" NOT NULL DEFAULT 'PART5_INCOMPLETE_SENTENCE',
    "prompt" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "difficulty" VARCHAR(20) NOT NULL DEFAULT 'medium',
    "primary_skill" "toeic_primary_skill_enum" NOT NULL DEFAULT 'direct_grammar',
    "sub_skill" VARCHAR(100),
    "unit_number" INTEGER,
    "rule_reference" VARCHAR(32),
    "concept_id" UUID,
    "concept_mapping_confidence" DOUBLE PRECISION,
    "concept_mapping_source" VARCHAR(50),
    "review_status" "toeic_review_status_enum" NOT NULL DEFAULT 'draft',
    "quality_score" DOUBLE PRECISION,
    "validation_scores" JSONB,
    "source" "toeic_item_source_enum" NOT NULL DEFAULT 'ai_generated',
    "source_reference" VARCHAR(255),
    "content_hash" VARCHAR(64) NOT NULL,
    "generation_run_id" UUID,
    "reviewed_by" VARCHAR(100),
    "reviewed_at" TIMESTAMPTZ(6),
    "review_notes" TEXT,
    "withdrawn_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "toeic_question_bank_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: toeic_question_options
CREATE TABLE "toeic_question_options" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "question_bank_item_id" UUID NOT NULL,
    "option_key" VARCHAR(10) NOT NULL,
    "option_text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "rationale" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "toeic_question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable: toeic_generation_jobs
CREATE TABLE "toeic_generation_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "unit_number" INTEGER NOT NULL,
    "difficulty" VARCHAR(20) NOT NULL,
    "target_skill" "toeic_primary_skill_enum" NOT NULL DEFAULT 'direct_grammar',
    "status" "toeic_generation_job_status_enum" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "last_error" TEXT,
    "checkpoint_data" JSONB,
    "run_id" UUID,
    "next_retry_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "toeic_generation_jobs_pkey" PRIMARY KEY ("id")
);

-- ModifyTable: toeic_practice_items
ALTER TABLE "toeic_practice_items" ADD COLUMN "question_bank_item_id" UUID;

-- ModifyTable: question_attempt_items
ALTER TABLE "question_attempt_items" ALTER COLUMN "question_id" DROP NOT NULL;
ALTER TABLE "question_attempt_items" ADD COLUMN "question_bank_item_id" UUID;

-- Indexes & Unique Constraints
CREATE UNIQUE INDEX "toeic_question_bank_items_content_hash_key" ON "toeic_question_bank_items"("content_hash");
CREATE UNIQUE INDEX "toeic_question_bank_items_root_question_id_version_key" ON "toeic_question_bank_items"("root_question_id", "version");
CREATE INDEX "toeic_question_bank_items_unit_number_difficulty_review_sta_idx" ON "toeic_question_bank_items"("unit_number", "difficulty", "review_status");
CREATE INDEX "toeic_question_bank_items_concept_id_review_status_idx" ON "toeic_question_bank_items"("concept_id", "review_status");
CREATE INDEX "toeic_question_bank_items_review_status_is_latest_approved_idx" ON "toeic_question_bank_items"("review_status", "is_latest_approved");

CREATE INDEX "toeic_question_generation_runs_target_unit_number_target_di_idx" ON "toeic_question_generation_runs"("target_unit_number", "target_difficulty");
CREATE INDEX "toeic_question_generation_runs_executed_at_idx" ON "toeic_question_generation_runs"("executed_at");

CREATE UNIQUE INDEX "toeic_question_options_question_bank_item_id_option_key_key" ON "toeic_question_options"("question_bank_item_id", "option_key");
CREATE INDEX "toeic_question_options_question_bank_item_id_is_correct_idx" ON "toeic_question_options"("question_bank_item_id", "is_correct");

CREATE INDEX "toeic_generation_jobs_status_next_retry_at_idx" ON "toeic_generation_jobs"("status", "next_retry_at");
CREATE INDEX "toeic_generation_jobs_unit_number_difficulty_idx" ON "toeic_generation_jobs"("unit_number", "difficulty");

CREATE INDEX "toeic_practice_items_question_bank_item_id_idx" ON "toeic_practice_items"("question_bank_item_id");
CREATE INDEX "question_attempt_items_user_id_question_bank_item_id_idx" ON "question_attempt_items"("user_id", "question_bank_item_id");

-- Foreign Keys
ALTER TABLE "toeic_question_bank_items" ADD CONSTRAINT "toeic_question_bank_items_generation_run_id_fkey" FOREIGN KEY ("generation_run_id") REFERENCES "toeic_question_generation_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "toeic_question_bank_items" ADD CONSTRAINT "toeic_question_bank_items_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "grammar_concepts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "toeic_question_options" ADD CONSTRAINT "toeic_question_options_question_bank_item_id_fkey" FOREIGN KEY ("question_bank_item_id") REFERENCES "toeic_question_bank_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "toeic_generation_jobs" ADD CONSTRAINT "toeic_generation_jobs_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "toeic_question_generation_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "toeic_practice_items" ADD CONSTRAINT "toeic_practice_items_question_bank_item_id_fkey" FOREIGN KEY ("question_bank_item_id") REFERENCES "toeic_question_bank_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "question_attempt_items" ADD CONSTRAINT "question_attempt_items_question_bank_item_id_fkey" FOREIGN KEY ("question_bank_item_id") REFERENCES "toeic_question_bank_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

