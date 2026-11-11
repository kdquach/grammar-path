import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT_DIR = path.resolve(__dirname, "..");
const LOCK_FILE_PATH = path.join(ROOT_DIR, "prisma/migrations/migration_lock.toml");
const INIT_MIGRATION_PATH = path.join(
  ROOT_DIR,
  "prisma/migrations/20261105000000_init_schema/migration.sql"
);
const USER_MIGRATION_PATH = path.join(
  ROOT_DIR,
  "prisma/migrations/20261106000000_add_user_progress_tables/migration.sql"
);

const BASELINE_ENUMS = [
  "question_type_enum",
  "verification_status_enum",
  "content_origin_enum",
  "answer_type_enum",
];

const INCREMENTAL_ENUMS = ["learning_status_enum"];

const BASELINE_TABLES = [
  "books",
  "units",
  "unit_source_pages",
  "theory_sections",
  "theory_section_source_pages",
  "textbook_examples",
  "textbook_example_source_pages",
  "exercises",
  "exercise_word_bank_items",
  "questions",
  "question_source_pages",
  "question_options",
  "question_blanks",
  "blank_accepted_answers",
  "question_parts",
  "part_accepted_answers",
  "accepted_answers",
  "answer_keys",
  "answer_key_source_pages",
  "explanations",
  "unit_validation",
  "unresolved_items",
];

const INCREMENTAL_TABLES = [
  "users",
  "learning_progress",
  "exercise_attempts",
  "question_attempt_items",
];

const BASELINE_FKS = [
  { table: "units", fk: "units_book_id_fkey" },
  { table: "unit_source_pages", fk: "unit_source_pages_unit_id_fkey" },
  { table: "theory_sections", fk: "theory_sections_unit_id_fkey" },
  { table: "theory_section_source_pages", fk: "theory_section_source_pages_theory_section_id_fkey" },
  { table: "textbook_examples", fk: "textbook_examples_unit_id_fkey" },
  { table: "textbook_example_source_pages", fk: "textbook_example_source_pages_textbook_example_id_fkey" },
  { table: "exercises", fk: "exercises_unit_id_fkey" },
  { table: "exercise_word_bank_items", fk: "exercise_word_bank_items_exercise_id_fkey" },
  { table: "questions", fk: "questions_exercise_id_fkey" },
  { table: "question_source_pages", fk: "question_source_pages_question_id_fkey" },
  { table: "question_options", fk: "question_options_question_id_fkey" },
  { table: "question_blanks", fk: "question_blanks_question_id_fkey" },
  { table: "blank_accepted_answers", fk: "blank_accepted_answers_blank_id_fkey" },
  { table: "question_parts", fk: "question_parts_question_id_fkey" },
  { table: "part_accepted_answers", fk: "part_accepted_answers_part_id_fkey" },
  { table: "accepted_answers", fk: "accepted_answers_question_id_fkey" },
  { table: "answer_keys", fk: "answer_keys_question_id_fkey" },
  { table: "answer_key_source_pages", fk: "answer_key_source_pages_answer_key_id_fkey" },
  { table: "explanations", fk: "explanations_question_id_fkey" },
  { table: "unit_validation", fk: "unit_validation_unit_id_fkey" },
  { table: "unresolved_items", fk: "unresolved_items_unit_id_fkey" },
];

const INCREMENTAL_FKS = [
  { table: "learning_progress", fk: "learning_progress_user_id_fkey" },
  { table: "learning_progress", fk: "learning_progress_unit_id_fkey" },
  { table: "exercise_attempts", fk: "exercise_attempts_user_id_fkey" },
  { table: "exercise_attempts", fk: "exercise_attempts_exercise_id_fkey" },
  { table: "question_attempt_items", fk: "question_attempt_items_attempt_id_fkey" },
  { table: "question_attempt_items", fk: "question_attempt_items_user_id_fkey" },
  { table: "question_attempt_items", fk: "question_attempt_items_question_id_fkey" },
];

const EXPECTED_CHECKS = [
  { table: "questions", name: "chk_question_correct_answer" },
  { table: "question_blanks", name: "chk_blank_correct_answer" },
  { table: "question_parts", name: "chk_part_correct_answer" },
  { table: "answer_keys", name: "chk_answer_key_answer" },
  { table: "questions", name: "chk_question_example_answer" },
  { table: "unit_source_pages", name: "chk_unit_source_page_range" },
  { table: "theory_section_source_pages", name: "chk_theory_section_source_page_range" },
  { table: "textbook_example_source_pages", name: "chk_textbook_example_source_page_range" },
  { table: "question_source_pages", name: "chk_question_source_page_range" },
  { table: "answer_key_source_pages", name: "chk_answer_key_source_page_range" },
  { table: "question_blanks", name: "chk_blank_index_positive" },
  { table: "theory_sections", name: "chk_theory_sections_display_order" },
  { table: "textbook_examples", name: "chk_textbook_examples_display_order" },
  { table: "exercises", name: "chk_exercises_display_order" },
  { table: "exercise_word_bank_items", name: "chk_word_bank_display_order" },
  { table: "questions", name: "chk_questions_display_order" },
  { table: "question_options", name: "chk_question_options_display_order" },
  { table: "blank_accepted_answers", name: "chk_blank_accepted_answers_display_order" },
  { table: "question_parts", name: "chk_question_parts_display_order" },
  { table: "part_accepted_answers", name: "chk_part_accepted_answers_display_order" },
  { table: "accepted_answers", name: "chk_accepted_answers_display_order" },
];

const BASELINE_INDEXES = [
  "books_title_edition_key",
  "units_unit_number_idx",
  "units_book_id_unit_number_key",
  "unit_source_pages_page_number_idx",
  "unit_source_pages_unit_id_page_number_page_role_key",
  "theory_sections_section_id_idx",
  "theory_sections_unit_id_section_id_key",
  "theory_sections_unit_id_display_order_key",
  "theory_section_source_pages_theory_section_id_page_number_key",
  "textbook_examples_unit_id_example_id_key",
  "textbook_examples_unit_id_display_order_key",
  "textbook_example_source_pages_textbook_example_id_page_numb_key",
  "exercises_question_type_idx",
  "exercises_unit_id_exercise_id_key",
  "exercises_unit_id_display_order_key",
  "exercise_word_bank_items_exercise_id_display_order_key",
  "questions_question_id_key",
  "questions_exercise_id_idx",
  "questions_is_example_idx",
  "questions_content_origin_idx",
  "questions_exercise_id_display_order_key",
  "question_source_pages_question_id_page_number_key",
  "question_options_question_id_option_key_key",
  "question_options_question_id_display_order_key",
  "question_blanks_question_id_blank_index_key",
  "blank_accepted_answers_blank_id_display_order_key",
  "question_parts_question_id_part_id_key",
  "question_parts_question_id_display_order_key",
  "part_accepted_answers_part_id_display_order_key",
  "accepted_answers_question_id_display_order_key",
  "answer_keys_question_id_key",
  "answer_keys_exercise_number_idx",
  "answer_key_source_pages_answer_key_id_page_number_key",
  "explanations_question_id_key",
  "explanations_rule_reference_idx",
  "unit_validation_unit_id_key",
  "unresolved_items_unit_id_item_id_key",
];

const INCREMENTAL_INDEXES = [
  "users_email_key",
  "learning_progress_user_id_status_idx",
  "learning_progress_user_id_unit_id_key",
  "exercise_attempts_user_id_exercise_id_idx",
  "exercise_attempts_user_id_submitted_at_idx",
  "question_attempt_items_user_id_is_correct_idx",
  "question_attempt_items_user_id_question_id_idx",
];

function checkBalancedParentheses(sqlContent: string, label: string): void {
  let openParens = 0;
  let closeParens = 0;
  let inSingleQuote = false;

  for (let i = 0; i < sqlContent.length; i++) {
    const c = sqlContent[i];
    if (c === "'" && (i === 0 || sqlContent[i - 1] !== "\\")) {
      inSingleQuote = !inSingleQuote;
    }
    if (!inSingleQuote) {
      if (c === "(") openParens++;
      if (c === ")") closeParens++;
    }
  }
  assert.equal(
    openParens,
    closeParens,
    `${label}: unbalanced parentheses (${openParens} open != ${closeParens} close)`
  );
}

function main() {
  assert.ok(fs.existsSync(LOCK_FILE_PATH), "Missing prisma/migrations/migration_lock.toml");
  const lock = fs.readFileSync(LOCK_FILE_PATH, "utf-8");
  assert.ok(lock.includes('provider = "postgresql"'), "migration_lock.toml must specify postgresql");

  assert.ok(fs.existsSync(INIT_MIGRATION_PATH), "Missing 20261105000000_init_schema/migration.sql");
  assert.ok(
    fs.existsSync(USER_MIGRATION_PATH),
    "Missing 20261106000000_add_user_progress_tables/migration.sql"
  );

  const initSql = fs.readFileSync(INIT_MIGRATION_PATH, "utf-8");
  const userSql = fs.readFileSync(USER_MIGRATION_PATH, "utf-8");
  const combinedSql = `${initSql}\n${userSql}`;

  checkBalancedParentheses(initSql, "20261105000000_init_schema");
  checkBalancedParentheses(userSql, "20261106000000_add_user_progress_tables");

  const allEnums = [...BASELINE_ENUMS, ...INCREMENTAL_ENUMS];
  for (const e of allEnums) {
    assert.ok(
      new RegExp(`CREATE\\s+TYPE\\s+"?${e}"?\\s+AS\\s+ENUM`, "i").test(combinedSql),
      `Missing enum ${e}`
    );
  }

  const allTables = [...BASELINE_TABLES, ...INCREMENTAL_TABLES];
  for (const t of allTables) {
    assert.ok(
      new RegExp(`CREATE\\s+TABLE\\s+"?${t}"?\\s*\\(`, "i").test(combinedSql),
      `Missing table ${t}`
    );
  }

  const allFks = [...BASELINE_FKS, ...INCREMENTAL_FKS];
  for (const fk of allFks) {
    assert.ok(
      new RegExp(
        `ALTER\\s+TABLE\\s+"?${fk.table}"?\\s+ADD\\s+CONSTRAINT\\s+"?${fk.fk}"?\\s+FOREIGN\\s+KEY`,
        "i"
      ).test(combinedSql),
      `Missing FK ${fk.fk} on ${fk.table}`
    );
  }

  for (const chk of EXPECTED_CHECKS) {
    assert.ok(
      new RegExp(
        `ALTER\\s+TABLE\\s+"?${chk.table}"?\\s+ADD\\s+CONSTRAINT\\s+"?${chk.name}"?\\s+CHECK`,
        "i"
      ).test(combinedSql),
      `Missing CHECK ${chk.name} on ${chk.table}`
    );
  }

  const allIndexes = [...BASELINE_INDEXES, ...INCREMENTAL_INDEXES];
  for (const idx of allIndexes) {
    assert.ok(
      new RegExp(`CREATE\\s+(?:UNIQUE\\s+)?INDEX\\s+"?${idx}"?\\s+ON`, "i").test(combinedSql),
      `Missing index ${idx}`
    );
  }

  // Chronological order check: incremental migration folder sorts after baseline
  assert.ok("20261105000000_init_schema" < "20261106000000_add_user_progress_tables");

  console.log(
    `[PASS] Backend migration SQL verified offline: ${allEnums.length} enums, ${allTables.length} tables, ${allFks.length} FKs, ${EXPECTED_CHECKS.length} CHECK constraints, ${allIndexes.length} indexes.`
  );
}

main();

