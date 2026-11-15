# GrammarPath — Phase 3.0 Workstreams E & F: Personalization & TOEIC Training Design

> **Phase:** 3.0 — Design & Audit Only  
> **Date:** 2026-11-13  
> **Scope:** Personalized Practice Engine (Workstream E) and TOEIC Grammar Training Suite (Workstream F).

---

## Part 1 — Workstream E: Personalized Practice Design

### E1. Weak Concept Detection & Prioritization

Unlike Phase 2's [adaptive.controller.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/adaptive.controller.ts), which ranks weaknesses purely by raw error counts (including null unanswered items), Phase 3 ranks assessed concepts (`distinctQuestionsAttempted >= 3` OR `unresolvedMistakeCount >= 1`) using a deterministic `WeaknessPriority` score:

$$\text{WeaknessPriority}(c) = 0.50 \times (100 - M_c) + \min(30,\; 8 \times U_{\text{unresolved},c}) + 20 \times \text{dueUrgency}(c) + \text{priorityBoost}(c)$$

Where:
- `dueUrgency(c)` = `clamp(0, 1, (daysOverdue + (1 - R_c)) / 2)` if `nextReviewAt <= now` or `R_c < 0.70`, else `0`.
- `priorityBoost(c)` = `+10` if `GrammarConcept.priority === 'core'`, `+5` if `'recommended'`, `+0` if `'advanced'`.
- Unassessed concepts (`N_distinct === 0`) are **never** falsely labeled "Weak"; they appear under *"Next Curriculum Path"* rather than weakness alarms.

### E2. Recommendation Selection Engine (`recommendation.service.ts`)

Produces up to **4 prioritized, explainable recommendations** per user without relying on LLM guesswork:

1. **Priority 1 — Unresolved Mistake / Urgent SRS Review (`type: 'review_due'`):** Triggered when `dueCount > 0` or `unresolvedMistakeCount >= 3`. Targets the 1–2 highest-urgency concepts with overdue intervals.
2. **Priority 2 — Weakest Assessed Concept Drill (`type: 'weak_concept'`):** Targets the top `WeaknessPriority` concept (`M_c < 65`), generating a 6–8 item mixed-format Personalized Practice session.
3. **Priority 3 — TOEIC Application Bridge (`type: 'toeic_bridge'`):** Triggered when a `core` TOEIC concept crosses `M_c >= 65` in textbook exercises (`exercise_submit`/`single_check`) but has `< 3` TOEIC-mode items—recommending a 5-item TOEIC Part 5 drill to test transfer.
4. **Priority 4 — Next Unfinished Textbook Unit (`type: 'next_unit'`):** Follows the 5-Stage curriculum order (`1 -> 145` or user's TOEIC stage priority) for the earliest unit with `status != 'completed'`.
   - *Cold-start learner (`0` attempts):* Emits an explicit onboarding recommendation (*"Start Unit 1 or take a 10-item Stage 1 diagnostic"*) cleanly marked as baseline onboarding.

### E3. Hybrid Question Generation & 5-Gate Validation Pipeline

GrammarPath cannot ship raw LLM outputs directly to students without correctness guarantees. Existing [toeic-generator.service.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-generator.service.ts) checks only basic JSON shape and string length on Gemini responses. Phase 3 enforces a **two-tier generator with a strict 5-Gate Validator**:

#### Generation Tiers
1. **Tier 1 — Deterministic Canonical & Rule-Template Engine (Zero-Hallucination Primary):**
   - **Canonical Selector:** Picks (a) failed canonical items due for spaced retry (at least `>= 24h` old, or re-ordered), and (b) unseen interactive textbook questions in weak/adjacent `GrammarConcept`s (including `fill_blank`, `sentence_correction`, `transformation`, `multiple_choice` so practice isn't MCQ-only).
   - **Rule-Template Parameterizer:** Curated grammatical templates per `toeicCategory` (e.g., word-form slots `[noun / adj / adv / verb]`, preposition pairs `[since / for / during / while]`, pronoun case matrices, active/passive verb forms) that construct deterministic 4-option or fill-blank items with verified single-answer keys.
2. **Tier 2 — LLM-Assisted Generation via Gemini (Supplementary Context Diversification):**
   - Grounded strictly in the target `GrammarConcept`, `Unit.title`, `TheorySection.sourceContent`, and known learner error patterns (via [gemini.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/lib/gemini.ts)).
   - Prompt forbids creating questions requiring images, audio, or ambiguous multi-correct options, and requires returning the exact `ruleReference` section ID (`e.g. "13B"`).

#### Mandatory 5-Gate Validator (`practice-validator.service.ts`)

Every Tier-2 generated item **must pass all 5 gates** before persistence into `practice_session_items` (or `toeic_practice_items`):

| Gate | Rule Verified | Failure Action |
|---|---|---|
| **1. Structural Integrity** | Non-empty stem containing exactly 1 blank token (`____` / `_____`) for cloze/MCQ; 4 unique non-empty options (`A`..`D`) for MCQ; valid `correctAnswer` key; non-empty explanation. | Reject item |
| **2. Anti-Leak & Option Hygiene** | Correct option text does not verbatim-appear adjacent to the blank in stem; no two options are case-insensitive / whitespace / punctuation duplicates; option lengths & grammatical forms aren't trivially mismatched. | Reject item |
| **3. Rule Grounding** | `ruleReference` exists in `theory_sections` belonging to one of the target `GrammarConcept`'s linked units (falls back to concept's primary `sectionId` only if rule explanation coherently matches). | Reject item |
| **4. Secondary Consistency Check (AI Items)** | Lightweight deterministic / self-consistency verifier confirms: (a) none of the 3 distractors forms an equally valid standard English completion (common failure on `although/though`, `will/going to`, `which/that`!), and (b) explanation cites the same option/answer as `correctAnswer`. | Reject item |
| **5. Anti-Spoiler DTO & Safe Fallback** | Strip `correctAnswer`, `explanation`, and `validationMeta` from all `GET` / `POST generate` payloads. If Gemini fails any gate or circuit breaker is open (`60s` cooldown), **transparently top up remaining slots from Tier 1** and tag `contentOrigin` accurately (`textbook` / `human_authored` / `ai_generated`)—never throwing 500 or serving unvalidated AI items. | Top up from Tier 1 |

### E4. Persistence & Mastery Update Loop

- Generated items are persisted in `practice_sessions` + `practice_session_items` (separate from the 4,414 canonical `questions`), while canonical items checked inside Practice also write a `QuestionAttemptItem` with `attemptSource = 'personalized_practice'` and `practiceSessionId`.
- On grading (`POST /api/v1/practice/sessions/:id/submit`), server evaluates answers deterministically (`correct` / `incorrect` / `unanswered`), returns feedback + `ruleReference`, recomputes `UserConceptMastery` (`w_src = 0.95` for personalized practice, `1.00` for canonical production), advances/regresses `srsStage`, and resolves matching open mistakes if answered correctly on a spaced attempt.

---

## Part 2 — Workstream F: TOEIC Grammar Training Design

### F1. Scope, Truthfulness Guardrails & Official Separation

- **TOEIC 800 Framing:** GrammarPath supports the **grammar accuracy and sentence-parsing foundation** required toward TOEIC 800. Every TOEIC hub header and roadmap view explicitly clarifies: *"Mastery of these grammar units supports TOEIC Reading & Listening accuracy, especially Part 5 and grammar items in Part 6. Achieving TOEIC 800+ also requires dedicated Listening practice, business vocabulary expansion, and timed full-length Reading comprehension."*
- **Non-ETS Provenance:** Every session header and item payload explicitly labels drills as **TOEIC-Style Grammar Practice** grounded in *English Grammar in Use*, never official ETS test material.

### F2. Realistic Part 5 & Part 6 Coverage + Dataset Gap Analysis

| TOEIC Section | Phase 3 Support | Concrete Data Capabilities & Gaps Identified in Audit |
|---|---|---|
| **Part 5: Incomplete Sentences (30 items/test)** | **Full Support (Primary Target)** | 100% grammar-focused single-sentence 4-option cloze. Currently, curated TOEIC bank in [toeic-generator.service.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-generator.service.ts) covers **Units 1–4 only** (`4/145` units = 2.8%). Dynamic fallback covers `145/145` units at 5 items, dropping to `142/145` at 10 and `127/145` at 20. Major gap: only **43 `word_formation`** questions exist in canonical data, whereas Word Form (`noun/adj/adv/verb`) is one of the highest-frequency Part 5 trap categories; plus Murphy vocabulary is general/conversational rather than business/office register. |
| **Part 6: Text Completion (Grammar Slots Only)** | **Scoped Support (Curated / Validated Short Memos)** | Real Part 6 contains 4-sentence workplace memos/emails with 3 grammar/vocab blanks + 1 whole-sentence insertion item. **Gap:** Isolated canonical Murphy sentences cannot be stitched blindly into coherent passages, and sentence-insertion items test discourse rather than unit grammar. **Decision:** Phase 3.4 supports **Grammar-Only Part 6 Mini-Passages** (3-blank workplace memos testing tense consistency, pronoun reference, connectors, and word forms) sourced from a **curated/validated business passage bank** (plus strictly validated Gemini memos grounded in 2–3 linked concepts), explicitly excluding ungrounded auto-stitched canonical sentences and full-test Reading Part 7 simulation. |
| **Parts 1–4 & Part 7** | **Advisory Tagging Only (Out of Training Scope)** | Retained as `toeicParts` metadata on `GrammarConcept` (normalizing the frontend typos `"Listening Part 2"` -> `"Part 2"` and `"Reading Part 5"` -> `"Part 5"`), not simulated as audio or multi-passage reading tests. |

### F3. TOEIC Training Modes & Category Breakdown

Extending existing `ToeicPracticeSession` and `ToeicPracticeItem` (avoiding redundant tables):

1. **`unit_drill` (Unit Bridge):** 5–10 Part 5 items aligned to a specific Unit / `GrammarConcept` (`easy` / `medium` / `hard`). Preserves Phase 2 entry point from `UnitPage` and `ToeicRoadmapPage`.
2. **`weak_topics` (Targeted Repair):** 10 Part 5 items weighted toward the user's top 3 weakest `core` TOEIC `GrammarConcept`s (`Mastery < 65` or unresolved mistakes).
3. **`mixed_grammar` (Part 5 Mixed Set):** 15 or 30 items sampled deterministically across the **6 TOEIC Grammar Categories** proportional to real Part 5 weightings:
   - `parts_of_speech_word_forms` (~25%)
   - `tenses_voice_verb_forms` (~22%)
   - `prepositions_modals` (~18%)
   - `clauses_connectors` (~15%)
   - `pronouns_determiners` (~12%)
   - `comparatives_structures` (~8%)
4. **`timed_sprint` (Pace Trainer):** 10 items / `300s` (30 sec/item target) or 20 items / `540s` (27 sec/item target). Server persists `startedAt` and `timeLimitSeconds`, computes authoritative `elapsedSeconds = min(timeLimitSeconds, now - startedAt)`, flags overtime submissions honestly (`timedOut: boolean`), and records `avgSecondsPerItem` for pacing analytics without corrupting grammar mastery.
5. **`part6_grammar` (Workplace Context Passage):** 1–2 short business memos/emails (3 grammar slots each, explicitly tagged as *Part 6 Grammar Practice — Word Form, Tense & Connector Cohesion*).

### F4. Curated Content Expansion Plan (Closing the Units 5–145 Gap)

To avoid over-relying on conversational textbook cloze fallbacks in TOEIC mode:
- **Wave 1 (Phase 3.4):** Author verified business-register Part 5 items + word-form family templates covering the **Top 25 highest-weight `core` TOEIC units** beyond Units 1–4 (e.g., Units `69–71` articles/nouns, `82–91` pronouns/quantifiers, `98–108` adj/adv/comparatives, `113–118` connectors/prepositions, `42–46` passive, `53–68` gerund/infinitive, `92–97` relative clauses) plus 8–12 curated 3-blank Part 6 business memos.
- **Wave 2 (Ongoing):** Progressively fill remaining `core` units (to cover all `73/73` core units with zero generic fallback) using the 5-Gate Validator + human spot-review tags (`ContentOrigin = human_authored`).

