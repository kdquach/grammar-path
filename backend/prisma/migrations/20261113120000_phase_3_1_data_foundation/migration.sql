-- Phase 3.1: Data Foundation (Additive Schema + Deterministic Backfill)
-- Rollback note: Drop added FK/tables/columns/enums and restore NOT NULL after remapping unanswered rows if rollback is ever required.

-- CreateEnum
CREATE TYPE "attempt_status_enum" AS ENUM ('correct', 'incorrect', 'unanswered');

-- CreateEnum
CREATE TYPE "attempt_source_enum" AS ENUM ('single_check', 'exercise_submission', 'adaptive_quiz', 'mistake_retry', 'toeic_practice', 'legacy_unknown');

-- CreateEnum
CREATE TYPE "concept_theory_role_enum" AS ENUM ('primary', 'secondary');

-- CreateEnum
CREATE TYPE "mapping_confidence_enum" AS ENUM ('high', 'medium', 'low', 'needs_review');

-- CreateEnum
CREATE TYPE "toeic_unit_priority_enum" AS ENUM ('core', 'recommended', 'advanced');

-- AlterTable: explanations
ALTER TABLE "explanations" ADD COLUMN "theory_section_id" UUID;

-- AlterTable: question_attempt_items (drop NOT NULL before nullifying historical unanswered rows)
ALTER TABLE "question_attempt_items"
  ADD COLUMN "attempt_source" "attempt_source_enum" NOT NULL DEFAULT 'legacy_unknown',
  ADD COLUMN "attempt_status" "attempt_status_enum" NOT NULL DEFAULT 'incorrect',
  ALTER COLUMN "student_answer" DROP NOT NULL,
  ALTER COLUMN "is_correct" DROP NOT NULL;

-- Backfill question_attempt_items conservatively and idempotently
UPDATE "question_attempt_items"
SET
  "attempt_source" = CASE
    WHEN "attempt_id" IS NOT NULL THEN 'exercise_submission'::"attempt_source_enum"
    ELSE 'legacy_unknown'::"attempt_source_enum"
  END,
  "attempt_status" = CASE
    WHEN "student_answer" IS NULL OR "student_answer"::text = 'null' THEN 'unanswered'::"attempt_status_enum"
    WHEN "is_correct" = true THEN 'correct'::"attempt_status_enum"
    ELSE 'incorrect'::"attempt_status_enum"
  END,
  "student_answer" = CASE
    WHEN "student_answer" IS NULL OR "student_answer"::text = 'null' THEN NULL
    ELSE "student_answer"
  END,
  "is_correct" = CASE
    WHEN "student_answer" IS NULL OR "student_answer"::text = 'null' THEN NULL
    WHEN "is_correct" = true THEN true
    ELSE false
  END;

-- Add CHECK constraint enforcing attempt_status <-> is_correct invariant
ALTER TABLE "question_attempt_items"
  ADD CONSTRAINT "chk_qai_attempt_status_consistency" CHECK (
    ("attempt_status" = 'unanswered' AND "is_correct" IS NULL) OR
    ("attempt_status" = 'correct' AND "is_correct" = true) OR
    ("attempt_status" = 'incorrect' AND "is_correct" = false)
  );

-- CreateTable: grammar_concepts
CREATE TABLE "grammar_concepts" (
    "id" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(80) NOT NULL,
    "parent_concept_id" UUID,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "grammar_concepts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: concept_theory_links
CREATE TABLE "concept_theory_links" (
    "id" UUID NOT NULL,
    "concept_id" UUID NOT NULL,
    "theory_section_id" UUID NOT NULL,
    "role" "concept_theory_role_enum" NOT NULL DEFAULT 'primary',
    "confidence" "mapping_confidence_enum" NOT NULL DEFAULT 'high',
    "provenance" VARCHAR(120) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "concept_theory_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable: toeic_roadmap_stages
CREATE TABLE "toeic_roadmap_stages" (
    "id" UUID NOT NULL,
    "stage_key" VARCHAR(40) NOT NULL,
    "stage_number" INTEGER NOT NULL,
    "title_vi" VARCHAR(255) NOT NULL,
    "target_band" VARCHAR(60) NOT NULL,
    "goal_band_key" VARCHAR(20) NOT NULL,
    "duration_estimate" VARCHAR(80) NOT NULL,
    "accent" VARCHAR(30) NOT NULL,
    "summary_vi" TEXT NOT NULL,
    "why_for_beginners_vi" TEXT NOT NULL,
    "outcome_vi" TEXT NOT NULL,

    CONSTRAINT "toeic_roadmap_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable: toeic_roadmap_modules
CREATE TABLE "toeic_roadmap_modules" (
    "id" UUID NOT NULL,
    "stage_id" UUID NOT NULL,
    "module_key" VARCHAR(40) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "title_vi" VARCHAR(255) NOT NULL,
    "subtitle_en" VARCHAR(255) NOT NULL,
    "toeic_parts" JSONB NOT NULL,
    "description_vi" TEXT NOT NULL,
    "trap_tip_vi" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,

    CONSTRAINT "toeic_roadmap_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable: unit_toeic_metadata
CREATE TABLE "unit_toeic_metadata" (
    "id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "module_id" UUID NOT NULL,
    "concept_id" UUID,
    "priority" "toeic_unit_priority_enum" NOT NULL,
    "toeic_tag" VARCHAR(120) NOT NULL,
    "toeic_parts" JSONB NOT NULL,
    "grammar_focus" VARCHAR(120) NOT NULL,
    "note_vi" TEXT NOT NULL,
    "is_official_toeic" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL,

    CONSTRAINT "unit_toeic_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "grammar_concepts_code_key" ON "grammar_concepts"("code");
CREATE INDEX "grammar_concepts_category_idx" ON "grammar_concepts"("category");
CREATE INDEX "grammar_concepts_parent_concept_id_idx" ON "grammar_concepts"("parent_concept_id");

CREATE INDEX "concept_theory_links_theory_section_id_idx" ON "concept_theory_links"("theory_section_id");
CREATE INDEX "concept_theory_links_confidence_idx" ON "concept_theory_links"("confidence");
CREATE UNIQUE INDEX "concept_theory_links_concept_id_theory_section_id_key" ON "concept_theory_links"("concept_id", "theory_section_id");

CREATE UNIQUE INDEX "toeic_roadmap_stages_stage_key_key" ON "toeic_roadmap_stages"("stage_key");
CREATE UNIQUE INDEX "toeic_roadmap_stages_stage_number_key" ON "toeic_roadmap_stages"("stage_number");
CREATE INDEX "toeic_roadmap_stages_goal_band_key_idx" ON "toeic_roadmap_stages"("goal_band_key");

CREATE UNIQUE INDEX "toeic_roadmap_modules_module_key_key" ON "toeic_roadmap_modules"("module_key");
CREATE UNIQUE INDEX "toeic_roadmap_modules_code_key" ON "toeic_roadmap_modules"("code");
CREATE UNIQUE INDEX "toeic_roadmap_modules_stage_id_display_order_key" ON "toeic_roadmap_modules"("stage_id", "display_order");

CREATE UNIQUE INDEX "unit_toeic_metadata_unit_id_key" ON "unit_toeic_metadata"("unit_id");
CREATE INDEX "unit_toeic_metadata_module_id_display_order_idx" ON "unit_toeic_metadata"("module_id", "display_order");
CREATE INDEX "unit_toeic_metadata_priority_idx" ON "unit_toeic_metadata"("priority");
CREATE INDEX "unit_toeic_metadata_concept_id_idx" ON "unit_toeic_metadata"("concept_id");

CREATE INDEX "explanations_theory_section_id_idx" ON "explanations"("theory_section_id");
CREATE INDEX "question_attempt_items_user_id_attempt_status_created_at_idx" ON "question_attempt_items"("user_id", "attempt_status", "created_at");
CREATE INDEX "question_attempt_items_user_id_attempt_source_idx" ON "question_attempt_items"("user_id", "attempt_source");

-- AddForeignKey
ALTER TABLE "explanations" ADD CONSTRAINT "explanations_theory_section_id_fkey" FOREIGN KEY ("theory_section_id") REFERENCES "theory_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "grammar_concepts" ADD CONSTRAINT "grammar_concepts_parent_concept_id_fkey" FOREIGN KEY ("parent_concept_id") REFERENCES "grammar_concepts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "concept_theory_links" ADD CONSTRAINT "concept_theory_links_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "grammar_concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "concept_theory_links" ADD CONSTRAINT "concept_theory_links_theory_section_id_fkey" FOREIGN KEY ("theory_section_id") REFERENCES "theory_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "toeic_roadmap_modules" ADD CONSTRAINT "toeic_roadmap_modules_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "toeic_roadmap_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "unit_toeic_metadata" ADD CONSTRAINT "unit_toeic_metadata_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "unit_toeic_metadata" ADD CONSTRAINT "unit_toeic_metadata_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "toeic_roadmap_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "unit_toeic_metadata" ADD CONSTRAINT "unit_toeic_metadata_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "grammar_concepts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill explanations.theory_section_id deterministically (exact unambiguous same-unit match only)
UPDATE "explanations" e
SET "theory_section_id" = matched."theory_section_id"
FROM (
  SELECT DISTINCT ON (e2."id")
    e2."id" AS "explanation_id",
    ts."id" AS "theory_section_id"
  FROM "explanations" e2
  JOIN "questions" q ON q."id" = e2."question_id"
  JOIN "exercises" ex ON ex."id" = q."exercise_id"
  JOIN "theory_sections" ts
    ON ts."unit_id" = ex."unit_id"
   AND UPPER(TRIM(ts."section_id")) = UPPER(TRIM(e2."rule_reference"))
  WHERE e2."rule_reference" IS NOT NULL
    AND TRIM(e2."rule_reference") <> ''
    AND (
      SELECT COUNT(*)
      FROM "theory_sections" ts2
      WHERE ts2."unit_id" = ex."unit_id"
        AND UPPER(TRIM(ts2."section_id")) = UPPER(TRIM(e2."rule_reference"))
    ) = 1
  ORDER BY e2."id"
) AS matched
WHERE e."id" = matched."explanation_id"
  AND e."theory_section_id" IS NULL;

