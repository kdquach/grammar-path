# GrammarPath Phase 2.2 — Audit B: Grading Engine & Data Alignment Quality Report

**Date:** 2026-11-12  
**Scope:** All **4,414 canonical questions** (**3,753 interactive**, **661 textbook worked examples**) across **549 exercises** and **145 units** in `grammarpath-staging`.

---

## 1. Canonical Dataset Distribution (Live DB Sweep)

### 1.1 Exercise Types (`549` Exercises / `4,414` Questions)

| Exercise Type | Exercises | Total Questions | Interactive Questions |
| :--- | ---: | ---: | ---: |
| `fill_blank` | 361 | 2,974 | 2,546 |
| `transformation` | 113 | 771 | 640 |
| `sentence_correction` | 29 | 285 | 235 |
| `multiple_choice` | 25 | 239 | 210 |
| `other` | 11 | 64 | 51 |
| `matching` | 6 | 38 | 32 |
| `word_formation` | 4 | 43 | 39 |
| **Total** | **549** | **4,414** | **3,753** |

### 1.2 Interactive Question Structures (`3,753` Interactive Questions)

| Structure Branch | Interactive Count | Frontend Renderer / Grader Branch |
| :--- | ---: | :--- |
| `single_blank` | 1,750 | `FillBlankQuestionRenderer` / single-blank scalar |
| `sentence` | 1,565 | `SentenceQuestionRenderer` / full-sentence normalized match |
| `options_single` | 231 | `OptionQuestionRenderer` (single) / key & text cross-match |
| `multi_blank` | 167 | `FillBlankQuestionRenderer` / positional array |
| `multi_part` | 29 | `MultiPartQuestionRenderer` / keyed `Record<partId, string>` |
| `options_multi_select` | 10 | `OptionQuestionRenderer` (multi-select) / compound key-set match |
| `options_split_slash_multi_blank` | 1 | `FillBlankQuestionRenderer` via `isSplitBlankSlashOptionQuestion` (`86.4-q9`) |
| *Word bank auxiliary* | *1,233* | *Interactive fill-in exercises displaying exercise-level word banks* |
| *With alternative answers* | *1,897* | *Questions carrying >1 accepted answer at question/blank/part level* |

### 1.3 `correctAnswerArray` Schema Alignment Check

Audit B specifically inspected whether any question/blank/part relies solely on JSON `correctAnswerArray` without relational text / accepted-answer rows:
- `Question.correctAnswerArray !== null`: **55** rows; missing `correctAnswerText` / `acceptedAnswers` / `blanks` / `parts`: **0**.
- `QuestionBlank.correctAnswerArray !== null`: **0** rows; missing text/accepted: **0**.
- `QuestionPart.correctAnswerArray !== null`: **0** rows; missing text/accepted: **0**.

---

## 2. Defect Found & Fixed During Audit B

### Defect B-1: Empty-String `""` (Zero-Article / Zero-Preposition) Alternatives Dropped in `evaluateQuestion`

- **Symptom:** The initial 3,753-question sweep flagged **15 alternative-answer failures** across **17 canonical multi-blank zero-article/zero-preposition questions** (e.g., `73.1-q7` where Blank #1 allows both `"-"` and `""` [omit article], and Blank #2 requires `"the"`).
- **Root Cause:** [`pushUniqueAnswer`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/utils/grader.ts#L213-L217) checked `if (candidate && typeof candidate === "string")`, which silently filtered out explicit `""` rows in `BlankAcceptedAnswer`, `AcceptedAnswer`, and `PartAcceptedAnswer`. Submitting `["", "the"]` therefore failed even though `""` is in canonical accepted answers.
- **Fix Applied ([`backend/src/utils/grader.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/utils/grader.ts#L219-L232)):**
  - Added [`pushUniqueAcceptedAnswer`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/utils/grader.ts#L219-L226) for `acceptedAnswers` arrays so explicit empty-string `""` entries are retained during evaluation.
  - Added [`pickPrimaryDisplayAnswer`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/utils/grader.ts#L228-L232) so primary display output (`expectedAnswers`) continues showing non-empty `"-"` instead of a blank pill.
  - Kept [`isEmptyStudentAnswer`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/utils/grader.ts#L15-L44) strict on empty single-blank submissions (all-empty arrays/strings still reject with `400 EMPTY_ANSWER`).

---

## 3. Post-Fix Full-Corpus Grading Verification

Re-running the Audit B sweep across all `3,753` interactive questions in `grammarpath-staging` after the fix yielded:

| Verification Metric | Before Fix | After Fix |
| :--- | ---: | ---: |
| Frontend/Backend renderer mismatches | 0 | **0** |
| Interactive questions with empty `expectedAnswers` | 0 | **0** |
| Canonical input grading failures (`3,753` questions) | 0 | **0** |
| Wrong-answer rejection failures (`__DEFINITELY_WRONG_ANSWER_XYZ_999__`) | 0 | **0** |
| Normalization variant failures (uppercase + curly apostrophe + whitespace + `!!`) | 0 | **0** |
| Alternative accepted answer failures | 15 | **0** |

### Regression Tests Added
- Unit test: [`backend/tests/phase2-2-unit.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/phase2-2-unit.test.ts#L6-L42) — verifies `73.1-q7` accepts `["", "the"]` and `["-", "the"]`, rejects `["", "a"]`, and displays `expectedAnswers: ["-", "the"]`.
- Live Staging API test: [`backend/tests/phase2-2-qa.api.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/phase2-2-qa.api.test.ts#L31-L40) — posts `["", "the"]` to `POST /api/v1/questions/73.1-q7/check` against `grammarpath-staging` and asserts `200`, `isCorrect: true`, `expectedAnswers: ["-", "the"]`.

