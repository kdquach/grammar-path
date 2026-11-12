# GrammarPath — Phase 1.9 Post-Import Data Reconciliation Report

> **Date:** 2026-11-12  
> **Phase:** 1.9 — Controlled Dataset Import & API Re-Verification (Step 5: Post-Import Data Reconciliation)  
> **Target Staging Database:** `ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech` / `grammarpath-staging` (Neon Project `summer-resonance-11737918`, Branch `br-blue-meadow-a1uyxgfp`, PostgreSQL `18.6`)  
> **Reconciliation Verdict:** **`PASS` (100% concordance across all 22 canonical tables, 4 user-table zero-state guards, all 145 Units, and 4,414 Questions/AnswerKeys/Explanations)**

---

## 1. Execution Summary

Immediately following Step 4's controlled staging import (`npm run import:staging`: `145 imported, 0 skipped`, `exit 0`), two independent verification layers were executed against `grammarpath-staging`:

1. **Canonical Verification Suite (`npm run verify:staging` -> [`verify-import.ts`](file:///Users/kd.quach03/Documents/grammarpath-data/scripts/import/verify-import.ts)):** Exited **`0`** — passed all `22` canonical table count checks, `1:1` raw SQL cardinality checks, Triple-Key SHA-256 provenance checks on all `145` Units, and field-by-field structural concordance across all `4,414` Question entities.
2. **Extended Live Staging SQL & Deep JSON-vs-DB Reconciliation (`COUNT(*)`, orphan/FK/duplicate/empty checks, Unit `100`/`110` cross-reference audit, and deep nested spot checks across all 8 required sample categories):** Passed **`100%`** (`exit 0`, zero anomalies or drift).

---

## 2. Exact Live Staging Table Counts (All 26 Application Tables + `_prisma_migrations`)

| Category | Table Name | Expected Baseline | Live Staging Count | Delta | Status |
|---|---|---:|---:|---:|---|
| Catalog | `books` | `1` | **`1`** | `0` | **PASS** |
| Curriculum | `units` | `145` | **`145`** | `0` | **PASS** |
| Source Pages | `unit_source_pages` | `454` | **`454`** | `0` | **PASS** |
| Theory | `theory_sections` | `542` | **`542`** | `0` | **PASS** |
| Source Pages | `theory_section_source_pages` | `542` | **`542`** | `0` | **PASS** |
| Examples | `textbook_examples` | `639` | **`639`** | `0` | **PASS** |
| Source Pages | `textbook_example_source_pages` | `639` | **`639`** | `0` | **PASS** |
| Exercises | `exercises` | `549` | **`549`** | `0` | **PASS** |
| Word Bank | `exercise_word_bank_items` | `1,117` | **`1,117`** | `0` | **PASS** |
| Questions | `questions` | `4,414` | **`4,414`** | `0` | **PASS** |
| Source Pages | `question_source_pages` | `5,007` | **`5,007`** | `0` | **PASS** |
| Options | `question_options` | `697` | **`697`** | `0` | **PASS** |
| Blanks | `question_blanks` | `2,619` | **`2,619`** | `0` | **PASS** |
| Blank Answers | `blank_accepted_answers` | `4,467` | **`4,467`** | `0` | **PASS** |
| Parts | `question_parts` | `75` | **`75`** | `0` | **PASS** |
| Part Answers | `part_accepted_answers` | `123` | **`123`** | `0` | **PASS** |
| Accepted Answers | `accepted_answers` | `8,425` | **`8,425`** | `0` | **PASS** |
| Answer Keys | `answer_keys` | `4,414` | **`4,414`** | `0` | **PASS** |
| Source Pages | `answer_key_source_pages` | `4,414` | **`4,414`** | `0` | **PASS** |
| Explanations | `explanations` | `4,414` | **`4,414`** | `0` | **PASS** |
| Validation | `unit_validation` | `145` | **`145`** | `0` | **PASS** |
| Unresolved | `unresolved_items` | `0` | **`0`** | `0` | **PASS** |
| User Table | `users` | `0` | **`0`** | `0` | **PASS** |
| User Table | `learning_progress` | `0` | **`0`** | `0` | **PASS** |
| User Table | `exercise_attempts` | `0` | **`0`** | `0` | **PASS** |
| User Table | `question_attempt_items` | `0` | **`0`** | `0` | **PASS** |
| Prisma | `_prisma_migrations` | `2` | **`2`** | `0` | **PASS** |

### Verified Sub-Metrics & Distributions

- **Worked examples (`questions.is_example = true`):** **`661`**
- **Practice/test items (`questions.is_example = false`):** **`3,753`** (`661 + 3,753 = 4,414`)
- **Exercises containing a Word Bank (`COUNT(DISTINCT exercise_id)` in `exercise_word_bank_items`):** **`172`**
- **Unit range:** `MIN(unit_number) = 1`, `MAX(unit_number) = 145`, completed `unit_validation = 145` (`0` non-completed)
- **Distinct `theory_sections.section_id` values:** **`542`** across **`542`** rows (`0` global collisions)
- **Explanations with non-null `rule_reference`:** **`4,414`** / `4,414` (`0` null, `0` unresolved intra-unit references)
- **Correct answer representation (`questions.correct_answer_type`):** `string = 4,359`, `array = 55`
- **Exercise `question_type` breakdown (`549` exercises / `4,414` questions):**
  - `fill_blank`: `361` exercises, `2,974` questions (`428` examples, `2,546` test items)
  - `transformation`: `113` exercises, `771` questions (`131` examples, `640` test items)
  - `sentence_correction`: `29` exercises, `285` questions (`50` examples, `235` test items)
  - `multiple_choice`: `25` exercises, `239` questions (`29` examples, `210` test items)
  - `other`: `11` exercises, `64` questions (`13` examples, `51` test items)
  - `word_formation`: `4` exercises, `43` questions (`4` examples, `39` test items)
  - `matching`: `6` exercises, `38` questions (`6` examples, `32` test items)

---

## 3. SQL Integrity, Duplicate, Orphan & Null-Content Audit

Every relational, uniqueness, content, and FK integrity query executed cleanly against `grammarpath-staging`:

| Integrity Check | Live Result | Verdict |
|---|---:|---|
| Duplicate canonical `(book_id, unit_number)` rows | `0` | **PASS** |
| Units outside `[1, 145]` (`unit-template.json` or rogue units) | `0` | **PASS** |
| Duplicate `(unit_id, exercise_id)` rows | `0` | **PASS** |
| Duplicate `question_id` rows | `0` | **PASS** |
| Duplicate `theory_sections.section_id` rows globally | `0` | **PASS** |
| Orphan `exercises`, `questions`, `question_blanks`, `blank_accepted_answers`, `question_parts`, `part_accepted_answers`, `question_options`, `accepted_answers`, `exercise_word_bank_items` | `0` | **PASS** |
| Orphan rows across all 5 `*_source_pages` tables | `0` | **PASS** |
| Questions missing an `AnswerKey` / AnswerKeys missing a `Question` | `0` / `0` | **PASS** |
| Questions missing an `Explanation` / Explanations missing a `Question` | `0` / `0` | **PASS** |
| Explanations whose `rule_reference` fails to resolve within the same `unit_id`'s `theory_sections` | `0` | **PASS** |
| Empty strings (`TRIM(...) = ''`) in `units.title`, `theory_sections`, `textbook_examples`, `exercises.instruction`, `questions.question_content`, `explanations.ai_explanation`, `question_options`, or `exercise_word_bank_items` | `0` | **PASS** |
| String/array `questions`, `answer_keys`, `question_blanks`, or `question_parts` missing direct answer payload (`correct_answer_text` / `correct_answer_array`) | `0` | **PASS** |
| `question_parts` missing `part_accepted_answers` | `0` | **PASS** |
| `questions` lacking both direct answer payload AND child accepted answers | `0` | **PASS** |
| `verification_status != 'verified'` or `explanations.based_on_source = false` | `0` | **PASS** |
| `question_blanks` without rows in `blank_accepted_answers` | `45` *(verified expected — see Note below)* | **PASS** |

> [!NOTE]
> **Audit Note on `45` Blanks Without Child `blank_accepted_answers` Rows:**
> Cross-checking `grammarpath-staging` against all `145` canonical JSON files confirmed that **all `45` cases** come exclusively from canonical Units **`144`** (`144.2..144.4`) and **`145`** (`145.1..145.4`), where the canonical JSON omitted `accepted_answers` on single-blank objects (`blanks: [{ blank_index: 1, correct_answer: "..." }]`) while populating both `blank.correct_answer` (`question_blanks.correct_answer_text`) AND top-level `accepted_answers` (`accepted_answers` rows). Live query confirmed **`0` blanks lack direct `correct_answer_text`/`correct_answer_array`**, and [`grader.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/utils/grader.ts#L311-L318) handles both `blank.correctAnswerText` and `blank.acceptedAnswers`.

---

## 4. Unit 110 & Unit 100 Cross-Reference Verification

- **Unit `110` (`"Word order 2: adverbs with the verb"`):**
  - `source_file_sha256`: `445560da7115562e8bc617bb867e83669c0ea3fcdad2811c638d8e1a73e8c123` (100% byte-identical match with [`unit-110.json`](file:///Users/kd.quach03/Documents/grammarpath-data/data/units/unit-110.json))
  - `mapping_version`: `1.0.0`, `unit_validation.status`: `completed`
  - `theory_sections`: `['110A', '110B', '110C', '110D']` (`4` sections, `3` illustrative examples, `3` exercises, `38` questions)
  - `explanations.rule_reference` distribution across Unit `110`: `110A = 17`, `110B = 14`, `110C = 5`, `110D = 2` (`100A = 0`; every reference resolves cleanly to Unit `110`'s own `theory_sections`).
- **Unit `100` (`"Adjectives and adverbs 1 (quick/quickly)"`):**
  - `source_file_sha256`: `ed90d2b1c36d73449699a804e5c3d47328574f1a1a12aa2b9368ff8b76414d61` (exact match with [`unit-100.json`](file:///Users/kd.quach03/Documents/grammarpath-data/data/units/unit-100.json))
  - `theory_sections`: `['100A', '100B', '100C']` (`3` sections, `4` exercises, `35` questions)
  - `explanations.rule_reference` distribution across Unit `100`: `100B = 21`, `100C = 14` (`0` collisions, zero regression).

---

## 5. Deep JSON-vs-DB Representative Sample Comparison (All 8 Required Categories)

Field-by-field assertions (Unit metadata, SHA-256, `theory_sections` + source pages, `textbook_examples` + source pages, `exercises`, `word_bank_items`, `questions`, `options`, `blanks` + `blank_accepted_answers`, `parts` + `part_accepted_answers`, `accepted_answers`, `answer_keys` + source pages, and `explanations`) matched **100%** across all inspected canonical Units (`1, 4, 17, 46, 69, 70, 100, 110, 145`):

| Category | Verified Unit / Question ID(s) | Verified Live Staging DB State vs Canonical JSON | Result |
|---|---|---|---|
| **1. Unit 1** | [`unit-001.json`](file:///Users/kd.quach03/Documents/grammarpath-data/data/units/unit-001.json) (`unitNumber = 1`) | Title `"Present continuous (I am doing)"`, `3` source pages, `5` theory (`1A..1E`), `14` examples, `4` exercises (`1.1..1.4`), `25` questions (`4` examples), `64` options, `6` blanks / `12` blank answers, `6` parts / `12` part answers, `5` word-bank items. 100% match. | **PASS** |
| **2. Unit 69 (fill-in + sentence correction)** | [`unit-069.json`](file:///Users/kd.quach03/Documents/grammarpath-data/data/units/unit-069.json) (`69.1..69.3`) | Title `"Countable and uncountable 1"`, `4` source pages, `3` theory (`69A..69C`), `4` examples, `3` exercises, `41` questions (`5` examples), `41` blanks / `75` blank answers, `24` word-bank items (`69.2` + `69.3`). `69.1-q3` preserves `correct_answer_text = "We went to a very nice restaurant last weekend."` + `3` accepted answers + `answer_key = "We went to a very nice restaurant ..."`. `69.2-q1` resolves `rule_reference = "69B"`. | **PASS** |
| **3. Unit 110** | [`unit-110.json`](file:///Users/kd.quach03/Documents/grammarpath-data/data/units/unit-110.json) (`110.1..110.3`) | `4` theory (`110A..110D`), `3` exercises, `38` questions (`110.1-q1` example `rule_reference = "110A"`, `110.1-q4` `correct = "OK"` / `rule_reference = "110A"`). Zero `"100A"` stale refs. | **PASS** |
| **4. Unit 145** | [`unit-145.json`](file:///Users/kd.quach03/Documents/grammarpath-data/data/units/unit-145.json) (`145.1..145.4`) | Title `"Phrasal verbs 9 away/back"`, `3` theory (`145A..145C`), `4` exercises (`fill_blank`), `27` questions (`4` examples), `27` blanks (`correct_answer_text` populated on `27/27`, top-level `accepted_answers` preserved, e.g., `145.1-q1` `"waved back"` / `rule_reference = "145C"`, `145.1-q2` `"blew away"` / `rule_reference = "145A"`). | **PASS** |
| **5. `multiple_choice` options (prefixed & fallback)** | `17.2-q1`, `46.1-q1`, `70.1-q1` | Prefixed uppercase (`17.2-q1`): `A -> "have you got"`, `B -> "are you having"`, `C -> "do you have"` (`correct = "A and C"`). Parenthesized (`46.1-q1`): `a -> "Sarah is cutting her hair."`, `b -> "Sarah is having her hair cut."` (`correct = "b"`). Positional fallback (`70.1-q1`): `a -> "noise"`, `b -> "a noise"` (`correct = "a noise"`). 100% match with [`option-parser.ts`](file:///Users/kd.quach03/Documents/grammarpath-data/scripts/import/option-parser.ts). | **PASS** |
| **6. Multi-blank & Multi-part** | `1.2-q2`, `4.1-q9` | `1.2-q2`: `4` ordered blanks (`blankIndex 1..4`) & `4` parts (`1.2-q2.1..1.2-q2.4`), e.g., blank 1 `["'s your new job going", "is your new job going"]`, blank 3 `["he isn't enjoying", "he's not enjoying", "he is not enjoying"]` (`answer_type = null_value`). `4.1-q9`: `2` blanks & `2` parts (`["I think"]`, `["You don't use", "You do not use"]`). | **PASS** |
| **7. Word Bank exercises** | `1.4`, `69.2` | `1.4`: `5` ordered items `["start", "get", "increase", "change", "rise"]`. `69.2`: `12` ordered items `["accident", "biscuit", "blood", ..., "sugar"]`. Exact `display_order` preserved. | **PASS** |
| **8. Worked Examples** | `1.1-q1`, `69.1-q1`, `110.1-q1`, `145.1-q1` | All have `is_example = true`, populated `example_answer`, linked `answer_keys` + `explanations`, plus corresponding `accepted_answers` (`1.1-q1` also preserves `8` matching options & `rule_reference = "1B"`). | **PASS** |

