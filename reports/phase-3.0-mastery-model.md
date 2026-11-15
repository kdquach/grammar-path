# GrammarPath — Phase 3.0 Workstream C: Mastery Model Design

> **Phase:** 3.0 — Design & Audit Only  
> **Date:** 2026-11-13  
> **Scope:** Transparent Deterministic Mastery Baseline, Signal Definitions, Anti-Inflation & Recovery Rules, Decay/Retention Math, Unanswered Guardrails, and Worked Numerical Examples.

---

## 1. Core Architectural Principle: Separate Four Distinct Dimensions

A single percentage cannot capture learning state. GrammarPath Phase 3 evaluates four independent metrics per **Grammar Concept** (and rolls them up to **Module**, **Unit**, and **Curriculum** views):

| Dimension | Range | Question Answered | Can It Drop? |
|---|---|---|---|
| **1. Completion** | `0–100%` | *Has the learner worked through the textbook exercises?* | Only if new canonical exercises are added (sticky once unit completed) |
| **2. Accuracy** | `0–100%` | *What share of non-skipped graded answers were correct?* | Yes (rolling window / cumulative non-null ratio) |
| **3. Mastery Score (`M`)** | `0–100` (+ Tier) | *How reliably can the learner apply this concept across formats and time?* | Yes (recent failures, unresolved mistakes, or decay) |
| **4. Retention (`R`)** | `0.00–1.00` | *How likely is the learner to still recall the concept today?* | Yes (decays exponentially as days since last successful recall grow) |

> **Strict Unanswered Guardrail:** Any `QuestionAttemptItem` where `studentAnswer === null` / `attemptStatus === 'unanswered'` (such as omitted questions in partial exercise submissions) is **excluded completely** from `Accuracy`, `Mastery`, `Retention`, `N_distinct`, and `errorCount`. It only informs exercise completion coverage (`answered / totalQuestions`).

---

## 2. Signals Used (and Signals Explicitly Deferred)

| Signal | Included in Phase 3 Baseline? | Source in DB | Weight / Role |
|---|---|---|---|
| **Correctness (`isCorrect`)** | **Yes** | `QuestionAttemptItem`, `PracticeSessionItem`, `ToeicPracticeItem` | Primary correctness outcome (strictly excluding `unanswered`) |
| **Distinct Item Breadth (`N_distinct`)** | **Yes** | Count of unique `(questionId \| itemFingerprint)` graded non-null | Prevents single-question farming; gates confidence tier |
| **Session Spacing (`N_sessions` & `deltaDays`)** | **Yes** | Distinct calendar days / sessions `>= 24h` apart | Controls retry-cap lift & SRS interval advancement |
| **Question Format / Difficulty (`w_q`)** | **Yes** | `Question.questionType`, multi-blank/part flags, TOEIC difficulty | Productive formats (`transformation`, multi-blank) carry higher signal than 4-option recognition |
| **Attempt Source Weight (`w_src`)** | **Yes** | `attemptSource` (`exercise_submit`, `single_check`, `mistake_retry`, `practice`, `toeic`) | Moderates same-day retry & pure MCQ inflation |
| **Unresolved Mistakes (`U_unresolved`)** | **Yes** | Distinct items whose latest graded attempt is `incorrect` | Bounded penalty encouraging error closure |
| **Time Since Last Success (`t_days`)** | **Yes** | `now - lastSuccessfulAt` | Drives exponential retention decay `R(t)` and SRS `nextReviewAt` |
| **Response Time (`responseTimeMs`)** | **Secondary (TOEIC pace only)** | `ToeicPracticeSession` / `elapsedSeconds` | Displayed as TOEIC pacing insight (`sec/item`), **not** penalized inside grammar mastery to avoid rushing careful learners |

---

## 3. Deterministic Mastery Formula (Concept Level)

### Step 1: Per-Question Effective Score `s_q` (Anti-Inflation & Recovery)

For each distinct interactive question `q` mapped to concept `c` that has `>= 1` graded non-unanswered attempt (`a_1, a_2, ..., a_k` ordered oldest -> newest):

1. Compute recency-weighted correctness across attempts on `q` (`alpha = 0.65` weight on newer vs previous cumulative score):
   - Initialize `r_1 = isCorrect(a_1) ? 1.0 : 0.0`
   - For each subsequent attempt `j = 2..k` on `q`:  
     `r_j = alpha * (isCorrect(a_j) ? 1.0 : 0.0) + (1 - alpha) * r_{j-1}`
2. Apply **Same-Day Retry Cap** (`cap_q`):
   - If `a_1` was **correct**: `cap_q = 1.00`.
   - If `a_1` was **incorrect** (`0`), check distinct spaced calendar days (`>= 24h` after `a_1`) on which `q` was answered **correctly**:
     - `0` spaced correct days (corrected only on the same day): `cap_q = 0.70` *(credits error recognition without letting instant brute-force retries hit 100% mastery)*.
     - `1` spaced correct day (`>= 24h` later): `cap_q = 0.90`.
     - `>= 2` spaced correct days: `cap_q = 1.00` *(full recovery verified)*.
3. Final per-question score:  
   `s_q = min(r_k, cap_q)`

### Step 2: Question Weight `w_q`

`w_q = formatWeight(q) * sourceWeight(latestSource)`

| Format / Question Characteristic | `formatWeight` | Source Mode | `sourceWeight` |
|---|---:|---|---:|
| `multiple_choice` (canonical or TOEIC `easy`) | `1.00` | Canonical `exercise_submit` / `single_check` | `1.00` |
| `fill_blank`, `matching`, `word_formation` | `1.10` | Personalized Practice (`practice`) | `0.95` |
| `sentence_correction`, TOEIC `medium` | `1.20` | TOEIC Grammar (`toeic`) | `0.90` |
| `transformation`, multi-blank (`>1`), multi-part, TOEIC `hard` | `1.30` | Mistake Retry (`mistake_retry`) | `0.90` |

### Step 3: Evidence-Damped Base Ability (`Mastery_base`)

To prevent `1/1 = 100%` false precision, apply a Bayesian Beta-style prior shrinkage toward `p_0 = 0.40` with prior strength `m = 4.0`:

$$\text{Mastery}_{\text{base}} = 100 \times \frac{\sum_{q \in Q_c} (w_q \cdot s_q) + m \cdot p_0}{\sum_{q \in Q_c} w_q + m}$$

*Limitation check:* With `m = 4.0, p_0 = 0.40`, even 3 perfect easy items (`sum w_q = 3.0`) yield `(3.0 + 1.6)/(3.0 + 4.0) = 65.7`, while 15 perfect `fill_blank` items (`sum w_q = 16.5`) yield `(16.5 + 1.6)/(16.5 + 4.0) = 88.3`. A learner truly reaches the `Mastered (83+)` tier only through substantial, multi-question evidence.

### Step 4: Unresolved Mistake Penalty (`P_err`)

Let `U_unresolved` = number of distinct questions in concept `c` whose **latest** graded attempt is `incorrect`:

$$P_{\text{err}} = \min(15,\; 3 \times U_{\text{unresolved}})$$

Once a mistake is corrected on a retry (especially a spaced retry), `U_unresolved` drops immediately, modeling clean error recovery.

### Step 5: Retention Decay (`R(t)`) & Final Mastery Score (`M`)

Each `(userId, conceptId)` maintains a deterministic Spaced Repetition stage `srsStage` in `{0, 1, 2, 3, 4, 5}` mapped to half-life `H` days:

| `srsStage` | Half-life `H` (days) | Next Scheduled Review (`nextReviewAt` offset) | Advancement / Regression Rule |
|---:|---:|---:|---|
| `0` | `2` | `+1 day` | Initial assessment or failed review/session `< 50%` |
| `1` | `4` | `+3 days` | Pass session/review on concept (`>= 75%` across `>= 2` items) |
| `2` | `9` | `+7 days` | Pass after `srsStage = 1` interval elapsed (`>= 2 days` later) |
| `3` | `18` | `+14 days` | Pass after `srsStage = 2` interval elapsed (`>= 5 days` later) |
| `4` | `38` | `+30 days` | Pass after `srsStage = 3` interval elapsed |
| `5` | `75` | `+60 days` | Pass after `srsStage = 4` interval elapsed |

*(Fail rule: scoring `< 60%` during a due review regresses `srsStage = max(0, srsStage - 2)`.)*

Given `t_days = max(0, daysSince(lastSuccessfulAt))`:

$$R(t) = 2^{-t_{\text{days}} / H}$$

Final displayed Mastery Score (`0–100`, rounded to integer):

$$M = \text{clamp}\Big(0,\; 100,\; \big(\text{Mastery}_{\text{base}} - P_{\text{err}}\big) \times \big(0.65 + 0.35 \cdot R(t)\big)\Big)$$

Notice that even after severe inactivity (`R(t) -> 0`), score decays smoothly toward `65%` of proven prior ability rather than resetting to zero, while `R(t) < 0.70` or `now >= nextReviewAt` places the concept into the **Review Due** queue.

---

## 4. Evidence Sufficiency, Confidence & Mastery Tiers

| `N_distinct` (non-null items) | `N_sessions` (`>= 1h` apart) | `confidenceLevel` | UI Display Rule |
|---|---|---|---|
| `0` | `0` | `none` | `"Not started"` (`--`) |
| `1–2` | any | `low` | **`"Not enough practice data"`** (`insufficient_data`) — hides tier badge & suppresses numerical ranking |
| `3–5` | any | `low` | Displays score + `"Low confidence · Early signal"` |
| `6–14` (or `>= 15` in 1 session) | `< 2` or `>= 1` | `medium` | Displays score + `"Moderate confidence"` |
| `>= 15` | `>= 2` (and `>= 24h` span) | `high` | Full confidence; eligible for **`Mastered`** tier |

When `N_distinct >= 3`, assign `masteryLevel`:
- `novice`: `M < 40`
- `developing`: `40 <= M < 65`
- `proficient`: `65 <= M < 83` (also caps `M >= 83` to `proficient` if `confidenceLevel != 'high'`, `U_unresolved > 0`, or `R(t) < 0.75`)
- `mastered`: `M >= 83` **AND** `confidenceLevel === 'high'` **AND** `U_unresolved === 0` **AND** `R(t) >= 0.75`

---

## 5. Worked Numerical Examples

### Example 1: Strong First-Attempt Learner (vs Single-Click Inflation)
- **Case 1A (1 item only):** Learner answers **1** `fill_blank` question correctly on first try (`w_1 = 1.1, s_1 = 1.0`).
  - `Mastery_base = 100 * (1.1 + 1.6) / (1.1 + 4.0) = 52.9`.
  - Because `N_distinct = 1 < 3`, system assigns `masteryLevel = "insufficient_data"`, `confidenceLevel = "low"`, and UI renders **"Not enough practice data (1/3 items)"**. Zero false precision.
- **Case 1B (15 distinct items across 2 days):** Learner answers **10** `fill_blank` (`w=1.1`) and **5** `transformation` (`w=1.3`) questions correctly on first attempt across Day 1 and Day 3 (`srsStage = 1`, `t_days = 0`, `R(0) = 1.0`, `U_unresolved = 0`).
  - `sum(w_q) = 10*(1.1) + 5*(1.3) = 17.5`; `sum(w_q * s_q) = 17.5`.
  - `Mastery_base = 100 * (17.5 + 1.6) / (17.5 + 4.0) = 100 * 19.1 / 21.5 = 88.84`.
  - `P_err = 0`, `R(0) = 1.0` -> **`M = 89`**, `confidenceLevel = "high"`, `masteryLevel = "mastered"`.

### Example 2: Repeated Same Mistake + Same-Day Retry Inflation Protection
Learner practices **6** `fill_blank` questions (`w_q = 1.1`) on Day 1:
- Answers **Q1, Q2** correctly on first attempt (`s_1 = s_2 = 1.0`).
- Fails **Q3, Q4, Q5, Q6** twice (`0 -> 0`). Right now:
  - `sum(w_q * s_q) = 2*(1.1) + 0 = 2.2`; `sum(w_q) = 6.6`.
  - `Mastery_base = 100 * (2.2 + 1.6) / (6.6 + 4.0) = 35.85`.
  - `U_unresolved = 4` -> `P_err = min(15, 3*4) = 12`.
  - `M = max(0, 35.85 - 12) = 24` -> **`novice`** (correctly flagged as weak concept!).
- **10 minutes later (same day):** Learner immediately retries Q3–Q6 and gets all 4 right using memory/feedback (`0 -> 0 -> 1`).
  - For Q3–Q6: `r_2 = 0.65*0 + 0.35*0 = 0`, then `r_3 = 0.65*1.0 + 0.35*0 = 0.65` (and capped by `cap_q = 0.70` for same-day retry). `s_{3..6} = 0.65`.
  - `U_unresolved` drops from `4` to `0` (`P_err = 0`).
  - `Mastery_base = 100 * (2*1.1*1.0 + 4*1.1*0.65 + 1.6) / (6.6 + 4.0) = 100 * (2.2 + 2.86 + 1.6) / 10.6 = 62.83`.
  - **`M = 63`** (`developing`, `medium` confidence)—same-day retries recover the penalty, **but** cannot jump straight to `mastered` (`>= 83`).
- **Day 4 (spaced recall):** Learner retries Q3–Q6 cleanly (`1.0` after `>= 24h`), raising `r_4 = 0.65*1 + 0.35*0.65 = 0.8775`, `cap_q = 0.90` -> `s_{3..6} = 0.8775`, lifting `Mastery_base` to `72.3` (`proficient`).

### Example 3: Initial Success Followed by Long Gap & Late Failure
Learner reached **`M = 84` (`mastered`)** on Unit 13 Present Perfect (`srsStage = 3`, `H = 18` days, `sum(w_q) = 16.0`, `sum(w*s) = 15.2`, `Mastery_base = 84.0`, `U_unresolved = 0`).
- **After `t = 36` days inactive (no practice):**
  - `R(36) = 2^(-36 / 18) = 0.25`.
  - `M = 84.0 * (0.65 + 0.35 * 0.25) = 84.0 * 0.7375 = 61.95 -> 62`.
  - Because `R(36) = 0.25 < 0.70` and `now > nextReviewAt`, tier automatically moves to **`developing` (Review Due)**, placing it at top of the Review Queue.
- **Day 37 Review Session:** Learner solves 2 due items: gets 1 right (`w=1.1`), fails 1 (`w=1.1`, `0% -> 50% < 60%`).
  - `U_unresolved = 1` (`P_err = 3`), `srsStage` regresses `3 -> 1` (`H = 4`, `nextReviewAt = +1 day` or `+3 days` depending on review fail), `t_days` resets partially via the successful item or waits for the failed review resolution (`M` sits around `~76` once penalty subtracted at `t=0`, capped below `mastered` because `U_unresolved = 1`).
  - As soon as the user passes the follow-up review 3 days later (`U_unresolved -> 0`, `srsStage -> 2`), mastery cleanly recovers to `proficient/mastered`.

### Example 4: Partial Textbook Exercise Submission with 4 Skipped Questions
Exercise `2.1` has 8 `fill_blank` questions (`w = 1.1`). Learner answers Q1–Q4 (`3 correct, 1 incorrect`) and clicks **Check All**, leaving Q5–Q8 blank.
- Backend records `Q1..Q3` (`correct`), `Q4` (`incorrect`), and `Q5..Q8` (`attemptStatus = 'unanswered', studentAnswer = null`).
- Mastery engine filters `attemptStatus != 'unanswered'`:
  - `N_distinct = 4` (NOT 8!), `Accuracy = 3/4 = 75.0%` (NOT `3/8 = 37.5%`!).
  - `Mastery_base = 100 * (3*1.1 + 1.6) / (4*1.1 + 4.0) = 100 * 4.9 / 8.4 = 58.3`, `P_err = 3` -> `M = 55` (`developing`, `low` confidence).
  - Unanswered items trigger zero penalty and zero false errors in Weak Topics or Mistake Review.

---

## 6. Model Limitations & Event Update Mechanics

1. **Known Limitations:**
   - Assumes canonical concept granularity (~95 concepts) has roughly balanced difficulty within a concept; mixed-skill concepts with very hard transformation items vs easy MCQs rely on `w_q` (`1.0–1.3`) as an approximation rather than full Item Response Theory (IRT 2PL).
   - Cold-start learners (`< 3` items) have no prior diagnostic placement test unless they opt into a Phase 3 diagnostic check; all concepts start unassessed rather than assuming novice/advanced.
2. **Incremental Event Pipeline:**
   - Rather than scanning full `question_attempt_items` history on every dashboard read, each grading transaction (Exercise submit, Single check, Mistake retry, Personalized Practice check, TOEIC check) invokes `recomputeConceptMastery(userId, affectedConceptIds)` synchronously inside or right after the transaction, computing only over the items belonging to those 1–3 affected concepts (`< 10ms` typical query) and upserting `user_concept_mastery`, `user_daily_activity`, and today's `user_mastery_snapshots`.

