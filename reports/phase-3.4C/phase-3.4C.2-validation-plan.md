# GrammarPath — Phase 3.4C.2: Validation Plan
## Testing Framework, Synthetic Learner Simulation, and Psychometric Calibration Strategy

**Author:** Antigravity (Advanced Agentic Coding)  
**Milestone:** Phase 3.4C.2 (Design-Only Specification)  
**Date:** November 14, 2026  
**Status:** DESIGN-ONLY (Verification & Validation Strategy)  

---

## 1. Executive Summary & Epistemological Boundary

A fundamental tenet of assessment engineering is the distinction between **Software Verification** and **Psychometric Validation**:
- **Automated Synthetic Testing (Software Verification):** Proves that the code executes as specified, database constraints hold, edge cases are handled, and state transitions are mathematically deterministic.
- **Empirical Learner Testing (Psychometric Validation):** Proves that the assessment tool actually measures the latent cognitive trait it purports to measure (construct validity), exhibits high reliability (internal consistency), and generalizes across human populations.

### Absolute Invariant:
**Synthetic tests cannot and will never be used to claim psychometric validity.** 
Synthetic learner simulations verify algorithm mechanics and boundary handling only. Psychometric validity requires empirical trials with representative human learners.

---

## 2. Automated Test Scenarios (Unit & Integration)

The software verification suite for Transfer Assessment Architecture will cover seven core test scenarios in Phase 3.4C.3:

### Scenario 1: Context Deduplication Gating
- **Objective:** Verify that multiple approved questions sharing an identical prompt template do NOT satisfy the 3-context requirement.
- **Setup:** Create 4 approved items with template *"The IT technician is not at his desk because he _______ the server hardware in Room 3 right now"*.
- **Learner Actions:** Learner answers all 4 correctly.
- **Assertions:**
  - `distinctQuestionCount === 4`
  - `independentContextCount === 1`
  - `transferStatus === "insufficient_data"` (`reason: "insufficient_contexts"`)
  - `transferScore === null`

### Scenario 2: Multi-Context Sufficiency Transition
- **Objective:** Verify that answering 3 genuinely independent workplace contexts successfully triggers evaluation.
- **Setup:** Create 3 approved items across distinct domains (IT, Marketing, Logistics) with $D_{\text{ctx}} \ge 0.50$.
- **Learner Actions:** Learner answers all 3 correctly.
- **Assertions:**
  - `independentContextCount === 3`
  - `transferStatus in ["proficient", "mastered"]`
  - `transferScore !== null`

### Scenario 3: Graceful Reversion on Item Withdrawal
- **Objective:** Verify that withdrawing an item immediately revokes its context contribution and reverts mastery if $K_{\text{ctx}} < 3$.
- **Setup:** Learner has achieved `proficient` on 3 contexts.
- **Action:** Administrator withdraws Item 3 due to a defect.
- **Assertions:**
  - Active contexts drop to 2.
  - Transfer status reverts to `"insufficient_data"`.
  - Historical attempt on Item 3 remains intact in `QuestionAttemptItem`.

### Scenario 4: Construct Exclusivity & Category Filtering
- **Objective:** Verify that vocabulary items, listening items, and reading passage items are completely ignored by the grammar transfer engine.
- **Setup:** Learner completes 5 vocabulary items (`primarySkill = "vocabulary"`) and 5 direct grammar items.
- **Assertions:**
  - Vocabulary attempts do not increment grammar $\tau$ evidence denominator.
  - Only direct grammar and approved word form items contribute.

### Scenario 5: Low-Confidence Mapping Exclusion
- **Objective:** Ensure items mapped with confidence $< 0.85$ are excluded from concept $\tau$.
- **Setup:** Learner answers item with `conceptMappingConfidence = 0.70`.
- **Assertions:**
  - `evidenceCount` does not increment for the target concept.

### Scenario 6: Superseded Version Archival
- **Objective:** Verify that when Version 2 is approved, attempts on Version 1 cease to contribute to live $\tau$.
- **Setup:** Learner answered Version 1. Version 2 is approved.
- **Assertions:**
  - Version 1 attempts excluded from live calculation.
  - Learner must attempt Version 2 to regain active context evidence.

### Scenario 7: Unanswered / Skipped Attempt Handling
- **Objective:** Verify skipped items (`attemptStatus = "unanswered"`) do not distort the denominator.
- **Assertions:**
  - Denominator only counts evaluated attempts (`isCorrect !== null`).

---

## 3. Synthetic Learner Simulation Profiles

To test algorithm boundary stability, Monte Carlo simulation scripts will execute against four synthetic learner behavioral archetypes:

```
                      SYNTHETIC LEARNER ARCHETYPES
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
   Profile A:                Profile B:                Profile C:
   "Classroom Master,        "Test-Wise Guesser,       "Struggling Novice"
    Context Novice"           Grammar Blind"           (Low θ, Low τ)
   (High θ, Low τ)           (Low θ, High τ)
```

### Profile A: "Classroom Master, Context Novice"
- **Behavioral Parameters:**
  - Textbook question success rate: $P(\text{correct} \mid \text{Textbook}) = 0.95$
  - TOEIC item success rate: $P(\text{correct} \mid \text{TOEIC}) = 0.40$ (confused by complex business vocabulary)
- **Expected System Output:**
  - $\theta \ge 90$, Status: `mastered`
  - $\tau \approx 40$, Status: `developing`
  - Intervention: Recommends Part 5 vocabulary-scaffolded practice. Zero distortion of $\theta$.

### Profile B: "Test-Wise Guesser, Grammar Blind"
- **Behavioral Parameters:**
  - Textbook question success rate: $P(\text{correct} \mid \text{Textbook}) = 0.45$
  - TOEIC item success rate: $P(\text{correct} \mid \text{TOEIC}) = 0.85$ (exploiting superficial word patterns)
- **Expected System Output:**
  - $\theta \approx 45$, Status: `developing`
  - $\tau$: Flagged as **Anomalous Profile** ($\tau \gg \theta$).
  - Intervention: Forces foundational textbook review before allowing transfer certification.

### Profile C: "Struggling Novice"
- **Behavioral Parameters:**
  - Success rate across all formats: $P(\text{correct}) = 0.35$
- **Expected System Output:**
  - $\theta \approx 35$, $\tau \approx 35$.
  - System holds TOEIC items in reserve; assigns foundational theory sections first.

### Profile D: "Comprehensive Bilingual Professional"
- **Behavioral Parameters:**
  - Success rate across all formats: $P(\text{correct}) = 0.95$ across 5 distinct domains.
- **Expected System Output:**
  - $\theta \ge 95$, $\tau \ge 95$, $R(t) \ge 0.90$.
  - Status: `mastered` across both dimensions.

---

## 4. Human Editorial Review Protocol (Content Validation)

Automated quality engine scores are necessary but insufficient for publishing assessment items. All items must pass the **Editorial Quality Gate**:

```
[AI Draft Generation] ──► [Automated Quality Engine] ──► [Admin Editorial Review] ──► [Published / Approved]
                           • Score >= 8.5                 • 4-Eye Review
                           • Zero blocking defects        • Contextual Diversity
                           • Linguistic sanity check      • Ambiguity check
```

### 4.1 Editorial Review Checklist:
1. **Linguistic Naturalness:** Does the carrier sentence read as authentic, contemporary business English?
2. **Grammatical Unambiguity:** Is the designated answer key 100% indisputably correct? Are all three distractors 100% grammatically incorrect within the sentence frame?
3. **Absence of Subject-Verb Defects:** Does the subject agree in number and person with the verb across all options? (Specifically guarding against defects like `"he are updating"` or `"he am trying"`).
4. **Contextual Independence:** Does this item present a scenario distinct from existing items in this unit? ($D_{\text{ctx}} \ge 0.50$).
5. **Construct Relevance:** Does solving the question require applying the target grammar rule, or can it be solved by isolated keyword matching?

---

## 5. Future Empirical Real-User Psychometric Validation Plan

Once Phase 3.4C.5 is deployed, genuine psychometric validation will proceed in two empirical phases:

### Phase 1: Classical Test Theory (CTT) Field Trial ($N = 100 - 250$ Learners)
- **Item Facility / Difficulty ($p$-value):**
  $$p_j = \frac{\text{Number of correct responses to item } j}{\text{Total attempts on item } j}$$
  Target acceptable range: $0.25 \le p_j \le 0.85$.
- **Item Discrimination ($r_{\text{pbis}}$):**
  Point-biserial correlation between item success and overall grammar score:
  $$r_{\text{pbis}} = \frac{\bar{X}_1 - \bar{X}_0}{s_X} \sqrt{p(1-p)}$$
  Target acceptable range: $r_{\text{pbis}} \ge 0.30$. Items with $r_{\text{pbis}} < 0.20$ flagged for editorial revision.

### Phase 2: Item Response Theory (IRT) Calibration ($N \ge 500$ Learners)
- **Model Estimation:** Fit 2PL IRT model using Marginal Maximum Likelihood.
- **Item Characteristic Curve (ICC) Fit:** Test for item misfit via Signed Chi-Square ($S\text{-}X^2$).
- **Criterion-Related Construct Validity:** Correlate learner $\tau$ scores with external standardized test results (e.g. actual official TOEIC Listening & Reading scores). Expected correlation: $r \ge 0.65$.

---

## 6. Validation Summary

| Tier | Validation Method | Purpose | Authority / Limitation |
|---|---|---|---|
| **Tier 1** | Vitest Automated Test Suite | Code logic, state transitions, API contracts | Software verification only. Zero psychometric claim. |
| **Tier 2** | Monte Carlo Synthetic Simulation | Extreme values, edge cases, stability | Behavioral boundary check. Zero psychometric claim. |
| **Tier 3** | Human Editorial Review | Content validity, linguistic correctness | Mandatory editorial gate for question approval. |
| **Tier 4** | Empirical Learner Trials (Future) | Psychometric construct validity, IRT parameters | Sole valid method for claiming psychometric validity. |

