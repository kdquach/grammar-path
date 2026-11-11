-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "question_type_enum" AS ENUM ('fill_blank', 'transformation', 'sentence_correction', 'multiple_choice', 'matching', 'word_formation', 'other');

-- CreateEnum
CREATE TYPE "verification_status_enum" AS ENUM ('verified', 'inferred', 'needs_review', 'unavailable');

-- CreateEnum
CREATE TYPE "content_origin_enum" AS ENUM ('textbook', 'ai_generated', 'human_authored');

-- CreateEnum
CREATE TYPE "answer_type_enum" AS ENUM ('string', 'array', 'null');

-- CreateTable
CREATE TABLE "books" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "edition" VARCHAR(50) NOT NULL,
    "author" VARCHAR(255) NOT NULL,
    "publisher" VARCHAR(255),
    "pdf_filename" VARCHAR(255) NOT NULL,
    "total_pdf_pages" INTEGER NOT NULL,
    "total_units" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "unit_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "schema_version" VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    "theory_pdf_page" INTEGER,
    "exercise_pdf_page" INTEGER,
    "book_theory_page" INTEGER,
    "book_exercise_page" INTEGER,
    "book_answer_key_page" INTEGER,
    "confidence_level" VARCHAR(50),
    "source_file_sha256" VARCHAR(64),
    "mapping_version" VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    "import_run_id" UUID,
    "imported_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_source_pages" (
    "id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "page_number" INTEGER NOT NULL,
    "page_role" VARCHAR(30) NOT NULL,

    CONSTRAINT "unit_source_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "theory_sections" (
    "id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "section_id" VARCHAR(20) NOT NULL,
    "heading" TEXT NOT NULL,
    "source_content" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "theory_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "theory_section_source_pages" (
    "id" UUID NOT NULL,
    "theory_section_id" UUID NOT NULL,
    "page_number" INTEGER NOT NULL,

    CONSTRAINT "theory_section_source_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "textbook_examples" (
    "id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "example_id" VARCHAR(50) NOT NULL,
    "original_text" TEXT NOT NULL,
    "translation_vi" TEXT,
    "display_order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "textbook_examples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "textbook_example_source_pages" (
    "id" UUID NOT NULL,
    "textbook_example_id" UUID NOT NULL,
    "page_number" INTEGER NOT NULL,

    CONSTRAINT "textbook_example_source_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "exercise_id" VARCHAR(50) NOT NULL,
    "exercise_number" VARCHAR(20) NOT NULL,
    "question_type" "question_type_enum" NOT NULL,
    "instruction" TEXT NOT NULL,
    "has_visual_context" BOOLEAN NOT NULL DEFAULT false,
    "visual_context_description" TEXT,
    "context_notes" TEXT,
    "display_order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_word_bank_items" (
    "id" UUID NOT NULL,
    "exercise_id" UUID NOT NULL,
    "word" VARCHAR(200) NOT NULL,
    "display_order" INTEGER NOT NULL,

    CONSTRAINT "exercise_word_bank_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL,
    "exercise_id" UUID NOT NULL,
    "question_id" VARCHAR(50) NOT NULL,
    "question_content" TEXT NOT NULL,
    "is_example" BOOLEAN NOT NULL DEFAULT false,
    "example_answer" TEXT,
    "has_visual_context" BOOLEAN NOT NULL DEFAULT false,
    "visual_context_description" TEXT,
    "context_clue" TEXT,
    "correct_answer_type" "answer_type_enum" NOT NULL,
    "correct_answer_text" TEXT,
    "correct_answer_array" JSONB,
    "verification_status" "verification_status_enum" NOT NULL DEFAULT 'verified',
    "content_origin" "content_origin_enum" NOT NULL DEFAULT 'textbook',
    "display_order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_source_pages" (
    "id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "page_number" INTEGER NOT NULL,

    CONSTRAINT "question_source_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_options" (
    "id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "option_key" VARCHAR(10) NOT NULL,
    "option_text" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_blanks" (
    "id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "blank_index" INTEGER NOT NULL,
    "correct_answer_type" "answer_type_enum" NOT NULL,
    "correct_answer_text" TEXT,
    "correct_answer_array" JSONB,

    CONSTRAINT "question_blanks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blank_accepted_answers" (
    "id" UUID NOT NULL,
    "blank_id" UUID NOT NULL,
    "answer_text" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,

    CONSTRAINT "blank_accepted_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_parts" (
    "id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "part_id" VARCHAR(50) NOT NULL,
    "question_content" TEXT NOT NULL,
    "correct_answer_type" "answer_type_enum" NOT NULL,
    "correct_answer_text" TEXT,
    "correct_answer_array" JSONB,
    "display_order" INTEGER NOT NULL,

    CONSTRAINT "question_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_accepted_answers" (
    "id" UUID NOT NULL,
    "part_id" UUID NOT NULL,
    "answer_text" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,

    CONSTRAINT "part_accepted_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accepted_answers" (
    "id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "answer_text" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,

    CONSTRAINT "accepted_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer_keys" (
    "id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "exercise_number" VARCHAR(20) NOT NULL,
    "answer_type" "answer_type_enum" NOT NULL,
    "answer_text" TEXT,
    "answer_array" JSONB,
    "verification_status" "verification_status_enum" NOT NULL DEFAULT 'verified',
    "notes" TEXT,
    "content_origin" "content_origin_enum" NOT NULL DEFAULT 'textbook',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "answer_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer_key_source_pages" (
    "id" UUID NOT NULL,
    "answer_key_id" UUID NOT NULL,
    "page_number" INTEGER NOT NULL,

    CONSTRAINT "answer_key_source_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "explanations" (
    "id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "ai_explanation" TEXT NOT NULL,
    "explanation_language" VARCHAR(10) NOT NULL DEFAULT 'vi',
    "based_on_source" BOOLEAN NOT NULL DEFAULT true,
    "rule_reference" VARCHAR(20),
    "content_origin" "content_origin_enum" NOT NULL DEFAULT 'ai_generated',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "explanations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_validation" (
    "id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "checked_at" TIMESTAMPTZ(6),
    "issues" JSONB NOT NULL DEFAULT '[]',
    "import_run_id" UUID,

    CONSTRAINT "unit_validation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unresolved_items" (
    "id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "item_id" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "source_pages" JSONB,

    CONSTRAINT "unresolved_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "books_title_edition_key" ON "books"("title", "edition");

-- CreateIndex
CREATE INDEX "units_unit_number_idx" ON "units"("unit_number");

-- CreateIndex
CREATE UNIQUE INDEX "units_book_id_unit_number_key" ON "units"("book_id", "unit_number");

-- CreateIndex
CREATE INDEX "unit_source_pages_page_number_idx" ON "unit_source_pages"("page_number");

-- CreateIndex
CREATE UNIQUE INDEX "unit_source_pages_unit_id_page_number_page_role_key" ON "unit_source_pages"("unit_id", "page_number", "page_role");

-- CreateIndex
CREATE INDEX "theory_sections_section_id_idx" ON "theory_sections"("section_id");

-- CreateIndex
CREATE UNIQUE INDEX "theory_sections_unit_id_section_id_key" ON "theory_sections"("unit_id", "section_id");

-- CreateIndex
CREATE UNIQUE INDEX "theory_sections_unit_id_display_order_key" ON "theory_sections"("unit_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "theory_section_source_pages_theory_section_id_page_number_key" ON "theory_section_source_pages"("theory_section_id", "page_number");

-- CreateIndex
CREATE UNIQUE INDEX "textbook_examples_unit_id_example_id_key" ON "textbook_examples"("unit_id", "example_id");

-- CreateIndex
CREATE UNIQUE INDEX "textbook_examples_unit_id_display_order_key" ON "textbook_examples"("unit_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "textbook_example_source_pages_textbook_example_id_page_numb_key" ON "textbook_example_source_pages"("textbook_example_id", "page_number");

-- CreateIndex
CREATE INDEX "exercises_question_type_idx" ON "exercises"("question_type");

-- CreateIndex
CREATE UNIQUE INDEX "exercises_unit_id_exercise_id_key" ON "exercises"("unit_id", "exercise_id");

-- CreateIndex
CREATE UNIQUE INDEX "exercises_unit_id_display_order_key" ON "exercises"("unit_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "exercise_word_bank_items_exercise_id_display_order_key" ON "exercise_word_bank_items"("exercise_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "questions_question_id_key" ON "questions"("question_id");

-- CreateIndex
CREATE INDEX "questions_exercise_id_idx" ON "questions"("exercise_id");

-- CreateIndex
CREATE INDEX "questions_is_example_idx" ON "questions"("is_example");

-- CreateIndex
CREATE INDEX "questions_content_origin_idx" ON "questions"("content_origin");

-- CreateIndex
CREATE UNIQUE INDEX "questions_exercise_id_display_order_key" ON "questions"("exercise_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "question_source_pages_question_id_page_number_key" ON "question_source_pages"("question_id", "page_number");

-- CreateIndex
CREATE UNIQUE INDEX "question_options_question_id_option_key_key" ON "question_options"("question_id", "option_key");

-- CreateIndex
CREATE UNIQUE INDEX "question_options_question_id_display_order_key" ON "question_options"("question_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "question_blanks_question_id_blank_index_key" ON "question_blanks"("question_id", "blank_index");

-- CreateIndex
CREATE UNIQUE INDEX "blank_accepted_answers_blank_id_display_order_key" ON "blank_accepted_answers"("blank_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "question_parts_question_id_part_id_key" ON "question_parts"("question_id", "part_id");

-- CreateIndex
CREATE UNIQUE INDEX "question_parts_question_id_display_order_key" ON "question_parts"("question_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "part_accepted_answers_part_id_display_order_key" ON "part_accepted_answers"("part_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "accepted_answers_question_id_display_order_key" ON "accepted_answers"("question_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "answer_keys_question_id_key" ON "answer_keys"("question_id");

-- CreateIndex
CREATE INDEX "answer_keys_exercise_number_idx" ON "answer_keys"("exercise_number");

-- CreateIndex
CREATE UNIQUE INDEX "answer_key_source_pages_answer_key_id_page_number_key" ON "answer_key_source_pages"("answer_key_id", "page_number");

-- CreateIndex
CREATE UNIQUE INDEX "explanations_question_id_key" ON "explanations"("question_id");

-- CreateIndex
CREATE INDEX "explanations_rule_reference_idx" ON "explanations"("rule_reference");

-- CreateIndex
CREATE UNIQUE INDEX "unit_validation_unit_id_key" ON "unit_validation"("unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "unresolved_items_unit_id_item_id_key" ON "unresolved_items"("unit_id", "item_id");

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_source_pages" ADD CONSTRAINT "unit_source_pages_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theory_sections" ADD CONSTRAINT "theory_sections_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theory_section_source_pages" ADD CONSTRAINT "theory_section_source_pages_theory_section_id_fkey" FOREIGN KEY ("theory_section_id") REFERENCES "theory_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "textbook_examples" ADD CONSTRAINT "textbook_examples_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "textbook_example_source_pages" ADD CONSTRAINT "textbook_example_source_pages_textbook_example_id_fkey" FOREIGN KEY ("textbook_example_id") REFERENCES "textbook_examples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_word_bank_items" ADD CONSTRAINT "exercise_word_bank_items_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_source_pages" ADD CONSTRAINT "question_source_pages_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_blanks" ADD CONSTRAINT "question_blanks_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blank_accepted_answers" ADD CONSTRAINT "blank_accepted_answers_blank_id_fkey" FOREIGN KEY ("blank_id") REFERENCES "question_blanks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_parts" ADD CONSTRAINT "question_parts_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_accepted_answers" ADD CONSTRAINT "part_accepted_answers_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "question_parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accepted_answers" ADD CONSTRAINT "accepted_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_keys" ADD CONSTRAINT "answer_keys_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_key_source_pages" ADD CONSTRAINT "answer_key_source_pages_answer_key_id_fkey" FOREIGN KEY ("answer_key_id") REFERENCES "answer_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "explanations" ADD CONSTRAINT "explanations_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_validation" ADD CONSTRAINT "unit_validation_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unresolved_items" ADD CONSTRAINT "unresolved_items_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- =============================================================================
-- CUSTOM SQL MIGRATION: Database Engine CHECK Constraints
-- =============================================================================

-- 1. Answer Polymorphism & JSONB Array Type Validation
-- Enforces mutual exclusivity and verifies that jsonb columns contain valid arrays.

ALTER TABLE questions ADD CONSTRAINT chk_question_correct_answer
  CHECK (
    (correct_answer_type = 'string' AND correct_answer_text IS NOT NULL AND correct_answer_array IS NULL) OR
    (correct_answer_type = 'array'  AND correct_answer_text IS NULL     AND correct_answer_array IS NOT NULL AND jsonb_typeof(correct_answer_array) = 'array') OR
    (correct_answer_type = 'null'   AND correct_answer_text IS NULL     AND correct_answer_array IS NULL)
  );

ALTER TABLE question_blanks ADD CONSTRAINT chk_blank_correct_answer
  CHECK (
    (correct_answer_type = 'string' AND correct_answer_text IS NOT NULL AND correct_answer_array IS NULL) OR
    (correct_answer_type = 'array'  AND correct_answer_text IS NULL     AND correct_answer_array IS NOT NULL AND jsonb_typeof(correct_answer_array) = 'array') OR
    (correct_answer_type = 'null'   AND correct_answer_text IS NULL     AND correct_answer_array IS NULL)
  );

ALTER TABLE question_parts ADD CONSTRAINT chk_part_correct_answer
  CHECK (
    (correct_answer_type = 'string' AND correct_answer_text IS NOT NULL AND correct_answer_array IS NULL) OR
    (correct_answer_type = 'array'  AND correct_answer_text IS NULL     AND correct_answer_array IS NOT NULL AND jsonb_typeof(correct_answer_array) = 'array') OR
    (correct_answer_type = 'null'   AND correct_answer_text IS NULL     AND correct_answer_array IS NULL)
  );

ALTER TABLE answer_keys ADD CONSTRAINT chk_answer_key_answer
  CHECK (
    (answer_type = 'string' AND answer_text IS NOT NULL AND answer_array IS NULL) OR
    (answer_type = 'array'  AND answer_text IS NULL     AND answer_array IS NOT NULL AND jsonb_typeof(answer_array) = 'array') OR
    (answer_type = 'null'   AND answer_text IS NULL     AND answer_array IS NULL)
  );

-- 2. Worked Example Answer Requirement
-- Questions marked as worked examples must have an example answer provided.
ALTER TABLE questions ADD CONSTRAINT chk_question_example_answer
  CHECK (is_example = FALSE OR example_answer IS NOT NULL);

-- 3. Source Page Range Validation
-- Murphy 4th Edition PDF contains exactly 399 pages. Page numbers must fall in [1, 399].
ALTER TABLE unit_source_pages ADD CONSTRAINT chk_unit_source_page_range
  CHECK (page_number >= 1 AND page_number <= 399);

ALTER TABLE theory_section_source_pages ADD CONSTRAINT chk_theory_section_source_page_range
  CHECK (page_number >= 1 AND page_number <= 399);

ALTER TABLE textbook_example_source_pages ADD CONSTRAINT chk_textbook_example_source_page_range
  CHECK (page_number >= 1 AND page_number <= 399);

ALTER TABLE question_source_pages ADD CONSTRAINT chk_question_source_page_range
  CHECK (page_number >= 1 AND page_number <= 399);

ALTER TABLE answer_key_source_pages ADD CONSTRAINT chk_answer_key_source_page_range
  CHECK (page_number >= 1 AND page_number <= 399);

-- 4. Non-Negative Display Order & 1-Based Blank Index
ALTER TABLE question_blanks ADD CONSTRAINT chk_blank_index_positive
  CHECK (blank_index >= 1);

ALTER TABLE theory_sections ADD CONSTRAINT chk_theory_sections_display_order
  CHECK (display_order >= 0);

ALTER TABLE textbook_examples ADD CONSTRAINT chk_textbook_examples_display_order
  CHECK (display_order >= 0);

ALTER TABLE exercises ADD CONSTRAINT chk_exercises_display_order
  CHECK (display_order >= 0);

ALTER TABLE exercise_word_bank_items ADD CONSTRAINT chk_word_bank_display_order
  CHECK (display_order >= 0);

ALTER TABLE questions ADD CONSTRAINT chk_questions_display_order
  CHECK (display_order >= 0);

ALTER TABLE question_options ADD CONSTRAINT chk_question_options_display_order
  CHECK (display_order >= 0);

ALTER TABLE blank_accepted_answers ADD CONSTRAINT chk_blank_accepted_answers_display_order
  CHECK (display_order >= 0);

ALTER TABLE question_parts ADD CONSTRAINT chk_question_parts_display_order
  CHECK (display_order >= 0);

ALTER TABLE part_accepted_answers ADD CONSTRAINT chk_part_accepted_answers_display_order
  CHECK (display_order >= 0);

ALTER TABLE accepted_answers ADD CONSTRAINT chk_accepted_answers_display_order
  CHECK (display_order >= 0);
