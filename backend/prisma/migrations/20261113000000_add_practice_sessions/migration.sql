-- CreateTable
CREATE TABLE "adaptive_quiz_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "difficulty" VARCHAR(20) NOT NULL,
    "question_ids" JSONB NOT NULL,
    "target_units" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adaptive_quiz_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "toeic_practice_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "unit_number" INTEGER NOT NULL,
    "difficulty" VARCHAR(20) NOT NULL,
    "source" VARCHAR(20) NOT NULL,
    "requested_count" INTEGER NOT NULL,
    "actual_count" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "toeic_practice_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "toeic_practice_items" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "item_order" INTEGER NOT NULL,
    "source" VARCHAR(20) NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correct_answer" VARCHAR(10) NOT NULL,
    "explanation" TEXT NOT NULL,
    "rule_reference" VARCHAR(32),
    "student_answer" VARCHAR(10),
    "is_correct" BOOLEAN,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "answered_at" TIMESTAMPTZ(6),

    CONSTRAINT "toeic_practice_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "adaptive_quiz_sessions_user_id_created_at_idx" ON "adaptive_quiz_sessions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "toeic_practice_sessions_user_id_created_at_idx" ON "toeic_practice_sessions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "toeic_practice_sessions_user_id_unit_number_idx" ON "toeic_practice_sessions"("user_id", "unit_number");

-- CreateIndex
CREATE INDEX "toeic_practice_items_session_id_item_order_idx" ON "toeic_practice_items"("session_id", "item_order");

-- AddForeignKey
ALTER TABLE "adaptive_quiz_sessions" ADD CONSTRAINT "adaptive_quiz_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "toeic_practice_sessions" ADD CONSTRAINT "toeic_practice_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "toeic_practice_items" ADD CONSTRAINT "toeic_practice_items_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "toeic_practice_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

