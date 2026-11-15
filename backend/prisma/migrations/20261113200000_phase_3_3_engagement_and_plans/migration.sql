-- Phase 3.3: Learning Experience, Onboarding & Daily Plans
-- Additive migration: adds user_learning_preferences, diagnostic_assessments, diagnostic_assessment_items, daily_learning_plans, daily_learning_plan_items.

-- CreateTable: user_learning_preferences
CREATE TABLE "user_learning_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "grammar_confidence" VARCHAR(30) NOT NULL DEFAULT 'elementary',
    "learning_objective" VARCHAR(50) NOT NULL DEFAULT 'foundation',
    "daily_study_minutes" INTEGER NOT NULL DEFAULT 20,
    "preferred_days" JSONB NOT NULL DEFAULT '["mon","tue","wed","thu","fri"]'::jsonb,
    "target_toeic_score" INTEGER,
    "target_date" TIMESTAMPTZ(6),
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_learning_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable: diagnostic_assessments
CREATE TABLE "diagnostic_assessments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "status" VARCHAR(30) NOT NULL DEFAULT 'in_progress',
    "total_questions" INTEGER NOT NULL DEFAULT 0,
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "score_percentage" DOUBLE PRECISION,
    "estimated_level" VARCHAR(50),
    "recommended_unit_id" UUID,
    "summary_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "diagnostic_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: diagnostic_assessment_items
CREATE TABLE "diagnostic_assessment_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assessment_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "concept_id" UUID,
    "student_answer" JSONB,
    "is_correct" BOOLEAN,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diagnostic_assessment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: daily_learning_plans
CREATE TABLE "daily_learning_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "plan_date" VARCHAR(10) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'not_started',
    "target_minutes" INTEGER NOT NULL DEFAULT 20,
    "completed_minutes" INTEGER NOT NULL DEFAULT 0,
    "summary_vi" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "daily_learning_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable: daily_learning_plan_items
CREATE TABLE "daily_learning_plan_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "plan_id" UUID NOT NULL,
    "activity_type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'not_started',
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "estimated_minutes" INTEGER NOT NULL DEFAULT 5,
    "target_id" VARCHAR(100),
    "target_number" VARCHAR(50),
    "metadata" JSONB,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "daily_learning_plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_learning_preferences_user_id_key" ON "user_learning_preferences"("user_id");
CREATE INDEX "diagnostic_assessments_user_id_created_at_idx" ON "diagnostic_assessments"("user_id", "created_at");
CREATE UNIQUE INDEX "diagnostic_assessment_items_assessment_id_question_id_key" ON "diagnostic_assessment_items"("assessment_id", "question_id");
CREATE INDEX "diagnostic_assessment_items_assessment_id_idx" ON "diagnostic_assessment_items"("assessment_id");
CREATE UNIQUE INDEX "daily_learning_plans_user_id_plan_date_key" ON "daily_learning_plans"("user_id", "plan_date");
CREATE INDEX "daily_learning_plans_user_id_plan_date_idx" ON "daily_learning_plans"("user_id", "plan_date");
CREATE INDEX "daily_learning_plan_items_plan_id_display_order_idx" ON "daily_learning_plan_items"("plan_id", "display_order");

-- AddForeignKey
ALTER TABLE "user_learning_preferences" ADD CONSTRAINT "user_learning_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "diagnostic_assessments" ADD CONSTRAINT "diagnostic_assessments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "diagnostic_assessments" ADD CONSTRAINT "diagnostic_assessments_recommended_unit_id_fkey" FOREIGN KEY ("recommended_unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "diagnostic_assessment_items" ADD CONSTRAINT "diagnostic_assessment_items_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "diagnostic_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "diagnostic_assessment_items" ADD CONSTRAINT "diagnostic_assessment_items_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "diagnostic_assessment_items" ADD CONSTRAINT "diagnostic_assessment_items_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "grammar_concepts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "daily_learning_plans" ADD CONSTRAINT "daily_learning_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "daily_learning_plan_items" ADD CONSTRAINT "daily_learning_plan_items_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "daily_learning_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

