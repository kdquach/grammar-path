-- Rollback Phase 3.4B: Dedicated TOEIC Question Bank, Quality Gates & Offline Job Queue
--
-- NON-REVERSIBLE DATA BOUNDARY WARNING:
-- Phase 3.4B introduced the storage of TOEIC practice attempts in "question_attempt_items"
-- where "question_id" is NULL and "question_bank_item_id" references "toeic_question_bank_items".
--
-- PREFLIGHT VERIFICATION QUERY:
-- Execute before attempting rollback:
--   SELECT COUNT(*) AS incompatible_rows
--   FROM "question_attempt_items"
--   WHERE "question_id" IS NULL;
--
-- If incompatible_rows > 0:
--   A full rollback to Phase 3.4A schema CANNOT occur without either:
--   Option A (Recommended Data Preservation): Archive TOEIC attempts to cold storage:
--     CREATE TABLE IF NOT EXISTS "question_attempt_items_toeic_archive" AS
--     SELECT * FROM "question_attempt_items" WHERE "question_id" IS NULL;
--     DELETE FROM "question_attempt_items" WHERE "question_id" IS NULL;
--   Option B (Preserve in place): Do not execute the "ALTER COLUMN question_id SET NOT NULL" line.

-- 1. Drop foreign keys referencing toeic_question_bank_items
ALTER TABLE "question_attempt_items" DROP CONSTRAINT IF EXISTS "question_attempt_items_question_bank_item_id_fkey";
DROP INDEX IF EXISTS "question_attempt_items_user_id_question_bank_item_id_idx";
ALTER TABLE "question_attempt_items" DROP COLUMN IF EXISTS "question_bank_item_id";

-- 2. Guard: Only set question_id back to NOT NULL if no NULL rows exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "question_attempt_items" WHERE "question_id" IS NULL) THEN
    ALTER TABLE "question_attempt_items" ALTER COLUMN "question_id" SET NOT NULL;
  ELSE
    RAISE NOTICE 'Skipping SET NOT NULL on question_id: TOEIC learner attempts exist (Data Boundary). Rows preserved.';
  END IF;
END $$;

-- 3. Remove relation from toeic_practice_items
ALTER TABLE "toeic_practice_items" DROP CONSTRAINT IF EXISTS "toeic_practice_items_question_bank_item_id_fkey";
DROP INDEX IF EXISTS "toeic_practice_items_question_bank_item_id_idx";
ALTER TABLE "toeic_practice_items" DROP COLUMN IF EXISTS "question_bank_item_id";

-- 4. Drop Phase 3.4B Tables
DROP TABLE IF EXISTS "toeic_generation_jobs" CASCADE;
DROP TABLE IF EXISTS "toeic_question_options" CASCADE;
DROP TABLE IF EXISTS "toeic_question_bank_items" CASCADE;
DROP TABLE IF EXISTS "toeic_question_generation_runs" CASCADE;

-- 5. Drop Phase 3.4B Enums
DROP TYPE IF EXISTS "toeic_generation_job_status_enum";
DROP TYPE IF EXISTS "toeic_primary_skill_enum";
DROP TYPE IF EXISTS "toeic_review_status_enum";
DROP TYPE IF EXISTS "toeic_item_source_enum";
DROP TYPE IF EXISTS "toeic_question_format_enum";
DROP TYPE IF EXISTS "toeic_part_enum";
