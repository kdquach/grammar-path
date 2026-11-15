-- Phase 3.2: Learning Mastery Engine & Review Scheduling
-- Additive migration: adds mastery tracking, mastery state events, review scheduling, and hardens question attempt item consistency.

-- CreateEnum
CREATE TYPE "mastery_status_enum" AS ENUM ('not_started', 'insufficient_data', 'developing', 'practicing', 'proficient', 'mastered', 'needs_review');

-- CreateEnum
CREATE TYPE "review_state_enum" AS ENUM ('new', 'scheduled', 'due', 'completed', 'suspended');

-- AlterTable: question_attempt_items (Harden CHECK constraint to strictly check student_answer IS NULL on unanswered and IS NOT NULL on evaluated)
ALTER TABLE "question_attempt_items"
  DROP CONSTRAINT IF EXISTS "chk_qai_attempt_status_consistency";

ALTER TABLE "question_attempt_items"
  ADD CONSTRAINT "chk_qai_attempt_status_consistency"
  CHECK (
    CASE
      WHEN "attempt_status" = 'unanswered'::"attempt_status_enum"
        THEN ("is_correct" IS NULL AND "student_answer" IS NULL)
      WHEN "attempt_status" = 'correct'::"attempt_status_enum"
        THEN ("is_correct" IS TRUE AND "student_answer" IS NOT NULL)
      WHEN "attempt_status" = 'incorrect'::"attempt_status_enum"
        THEN ("is_correct" IS FALSE AND "student_answer" IS NOT NULL)
      ELSE false
    END
  );

-- CreateTable: user_concept_mastery
CREATE TABLE "user_concept_mastery" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "concept_id" UUID NOT NULL,
    "mastery_score" DOUBLE PRECISION,
    "mastery_status" "mastery_status_enum" NOT NULL DEFAULT 'not_started',
    "retention_score" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "evidence_count" INTEGER NOT NULL DEFAULT 0,
    "distinct_question_count" INTEGER NOT NULL DEFAULT 0,
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "incorrect_count" INTEGER NOT NULL DEFAULT 0,
    "repeated_attempt_count" INTEGER NOT NULL DEFAULT 0,
    "model_version" VARCHAR(20) NOT NULL DEFAULT 'v1.0',
    "last_practiced_at" TIMESTAMPTZ(6),
    "last_calculated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_concept_mastery_pkey" PRIMARY KEY ("id")
);

-- CreateTable: concept_mastery_events
CREATE TABLE "concept_mastery_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "concept_id" UUID NOT NULL,
    "previous_status" "mastery_status_enum",
    "new_status" "mastery_status_enum" NOT NULL,
    "previous_score" DOUBLE PRECISION,
    "new_score" DOUBLE PRECISION,
    "reason" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "concept_mastery_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable: concept_review_schedules
CREATE TABLE "concept_review_schedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "concept_id" UUID NOT NULL,
    "due_at" TIMESTAMPTZ(6) NOT NULL,
    "last_reviewed_at" TIMESTAMPTZ(6),
    "stability_days" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "interval_days" INTEGER NOT NULL DEFAULT 2,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "consecutive_correct" INTEGER NOT NULL DEFAULT 0,
    "review_state" "review_state_enum" NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "concept_review_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_concept_mastery_user_id_concept_id_key" ON "user_concept_mastery"("user_id", "concept_id");
CREATE INDEX "user_concept_mastery_user_id_mastery_status_idx" ON "user_concept_mastery"("user_id", "mastery_status");
CREATE INDEX "concept_mastery_events_user_id_concept_id_created_at_idx" ON "concept_mastery_events"("user_id", "concept_id", "created_at");
CREATE UNIQUE INDEX "concept_review_schedules_user_id_concept_id_key" ON "concept_review_schedules"("user_id", "concept_id");
CREATE INDEX "concept_review_schedules_user_id_review_state_due_at_idx" ON "concept_review_schedules"("user_id", "review_state", "due_at");
CREATE INDEX "concept_review_schedules_due_at_idx" ON "concept_review_schedules"("due_at");

-- AddForeignKey
ALTER TABLE "user_concept_mastery" ADD CONSTRAINT "user_concept_mastery_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_concept_mastery" ADD CONSTRAINT "user_concept_mastery_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "grammar_concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "concept_mastery_events" ADD CONSTRAINT "concept_mastery_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "concept_mastery_events" ADD CONSTRAINT "concept_mastery_events_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "grammar_concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "concept_review_schedules" ADD CONSTRAINT "concept_review_schedules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "concept_review_schedules" ADD CONSTRAINT "concept_review_schedules_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "grammar_concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
