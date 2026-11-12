# GrammarPath Phase 2.2 — Audit C: TOEIC Part 5 Content Quality Report

**Date:** 2026-11-12  
**Scope:** Exhaustive deterministic sweep across all **145 units** (`count = 5, 10, 20` -> **435 generator calls**) in [`toeic-generator.service.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-generator.service.ts) + [`adaptive.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/adaptive.controller.ts) + [`ToeicPracticeModal.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/adaptive/ToeicPracticeModal.tsx).

---

## 1. Initial Audit Findings (Before Fixes)

An automated structural & content sweep across all `145 x 3 = 435` deterministic calls (`GEMINI_API_KEY` unset to exercise canonical DB-grounded dynamic generation + curated banks) uncovered **306 structural/content defects**:
1. Embedded multi-line option stems leaking into prompts (e.g., Unit `24.1-q2` `"a ... b ... c ... d ..."`).
2. `sentence_correction` exercises yielding `"OK"`, `"right"`, `"wrong"` as option texts (Unit `110`, etc.).
3. Multi-part questions lacking `parts` metadata in controller queries, creating mismatched `2`-blank stems (`1.2-q1`).
4. Blind fallback appending ` _______` to the end of sentences when ellipsis/blank markers were absent.
5. Parenthetical cues containing `...` (e.g., Unit `98` `"(exhaust...)"`) being corrupted into blank tokens inside cues.
6. Inline 2-option slash prompts (`"interesting / interested"`) left unmasked in Unit `98.2` while `"interested"` was an option, giving away the answer in the prompt.
7. Canonical accepted alternative answers / slash fragments appearing as distractors (so 2 options were grammatically correct, e.g., Unit `145.2`).
8. Bare option key letters (`"B"`, `"C"`, etc.) appearing as distractor strings (Unit `17`) or ungrammatical morphology swaps (`"I" -> "he"/"she"/"they"`, naive `"the" -> "a"/"an"`, unguarded `e -> eing`).
9. Curated 2-blank correlative options (`"are / debating"` in Unit `1` Q4) filling both blanks with `"are / debating"` in the UI ([`ToeicPracticeModal.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/adaptive/ToeicPracticeModal.tsx)).

---

## 2. Remediations Implemented

### Backend (`adaptive.controller.ts` & `toeic-generator.service.ts`)
1. **Forward `parts` metadata:** [`generateToeicPracticeHandler`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/adaptive.controller.ts#L584-L614) now queries and passes `parts` into `unitQuestions` so `buildUnitGroundedDynamicQuestions` filters out all multi-part items.
2. **Option hygiene filter ([`isCleanToeicOptionText`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-generator.service.ts#L862-L888)):** Rejects `"OK"`, `"right"`, `"wrong"`, `"yes"`, `"no"`, bare keys `b..z` (keeping `"a"` and `"I"`), `"..."`, `"/"`, `"(no ..."`, `";"`, compound `"At or On"` / `"is true"`, and strings >5 words or >60 chars.
3. **Question filtering & masking ([`buildUnitGroundedDynamicQuestions`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-generator.service.ts#L1064-L1371)):**
   - Excludes `sentence_correction`, `matching`, multi-blank (`>1`), multi-part (`>0`), and compound `"a or b"` multi-select answers; never falls back to `options[0]`.
   - Protects parenthetical cues (`(exhaust...)` -> `(exhaust)`), rejects embedded `a ... b ... c ... d ...` stems and numbered sub-blanks, removes blind end-of-sentence ` _______` fallback in Pass 1/2, and requires strictly 1 `_______`.
   - Masks inline two-option slash prompts (e.g. `98.2` `"interesting / interested"` -> `"_______"`).
4. **Cloze & Distractor safety:**
   - [`maskSentenceForCloze`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-generator.service.ts#L1000-L1062) skips meta-grammar explanation sentences (`(not ...)`, `(=...)`), expands safe target patterns to prepositions/adverbs/quantifiers, and uses exact `match.index` offsets.
   - [`buildOptionsForTarget`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-generator.service.ts#L890-L944) enforces `forbiddenDistractors` (canonical alternative answers never become distractors) and matches initial capitalization.
   - [`generateStructuredGrammarVariants`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-generator.service.ts#L682-L778) and [`generateMorphologicalVariants`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-generator.service.ts#L780-L860) fix silent-`e` stripping and remove ungrammatical pronoun/article swaps.
   - Separated sibling distractor pools into sentence vs phrase shapes and stripped bare option keys (`"B"` in Unit 17).

### Frontend (`ToeicPracticeModal.tsx`)
- Updated [`ToeicPracticeModal.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/adaptive/ToeicPracticeModal.tsx#L408-L436) to split `" / "` option texts when filling multi-blank prompts (`Why are so many employees debating ...?` instead of `are / debating`).

---

## 3. Post-Fix Sweep Results (145 Units x 5 / 10 / 20 = 435 Calls)

| Metric | Before Fixes | After Fixes |
| :--- | :---: | :---: |
| Total structural/content defects across 435 calls | 306 | **0** |
| Curated & dynamic single-blank integrity (`blankCount === 1`, or curated 2-blank `A / B`) | Failed | **100% Pass (0 defects)** |
| Suspicious options (`"OK"`, `"B"`, `"..."`, duplicates, missing answer, short expl) | Failed | **0** |
| **`count = 5`** success across 145 units | — | **145 / 145 (100%)** (`0` `422`) |
| **`count = 10`** success across 145 units | — | **142 / 145 (97.9%)** (`3` honest `422 INSUFFICIENT_CONTENT`: Units `92, 109, 114`) |
| **`count = 20`** success across 145 units | — | **127 / 145 (87.6%)** (`18` honest `422 INSUFFICIENT_CONTENT`: Units `29, 37, 40, 47, 50, 76, 77, 81, 91, 92, 93, 95, 96, 99, 109, 111, 114, 116`) |

*Note on sparse units:* When deterministic content has fewer than 10 or 20 clean single-blank/cloze items (without Gemini live generation enabled), failing closed with `422 INSUFFICIENT_CONTENT` instead of synthesizing broken or duplicate drills is the designed Phase 2.1/2.2 quality contract. Notice [`AdaptiveQuiz` / `ToeicPracticeModal`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/adaptive/ToeicPracticeModal.tsx) also supports `count = 5` cleanly across **all 145/145 units**.

### Representative Sampled Inspection (Units 1, 2, 17, 24, 32, 70, 86, 98, 110, 121, 136, 145)
- **Unit 1 (`curated`) & Unit 2 (`mixed`):** Business/TOEIC stems + clean dynamic cloze; zero option leakage.
- **Unit 17 (`dynamic`):** Distractor pool contains well-formed negative clauses (`He didn't have a map.` vs `I don't have a ladder.`), no bare `"B"` key distractors.
- **Unit 24 (`dynamic`):** Multi-choice `24.1` excluded; clean single-blank `24.2` stems remain (`we'll be playing`, `We'll have finished`, `I'll be working`, `he'll have spent`).
- **Unit 98 (`dynamic`):** `(exhaust...)` normalized to `(exhaust)`; `98.2` `"interesting / interested"` masked to `"_______"` cleanly.
- **Unit 110 (`dynamic`):** `110.1` `"OK"` items excluded; clean word-order blanks + grounded explanations match canonical rule references (`110A`, `110B`, `110C`).
- **Units 121, 136, 145 (`dynamic`):** Clean prepositions (`on 14 February`, `at weekends`), prepositional verbs (`happened to`, `divided into`, `believe in`), and phrasal verbs (`blew away`, `put it back`, `walked away`, `threw it back (to her)`, `threw them away`) with non-overlapping distractors.

