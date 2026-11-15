# GrammarPath — Phase 3.4C.4B.4.1: Quality and Validation Specification
## Rigorous Standards, Syntactic Invariant Checkers, and Error Taxonomies for TOEIC Part 5 Items

**Author:** Antigravity (Principal Assessment Specialist & Lead Learning Engineer)  
**Milestone:** Phase 3.4C.4B.4.1 (AI TOEIC Question Generation Pipeline — Design & Readiness Audit)  
**Date:** November 14, 2026  
**Status:** Quality & Validation Specification (Design-Only)  

---

## 1. Item Quality Architecture

Every generated TOEIC Part 5 question must meet rigorous psychometric, linguistic, and pedagogical standards before being presented for human review.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TOEIC PART 5 ITEM QUALITY REQUIREMENTS                                                                  │
├───────────────────────────────┬─────────────────────────────────────────────────────────────────────────┤
│ Dimension                     │ Mandatory Standard                                                      │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
│ 1. Primary Grammar Objective  │ Assesses exactly 1 grammatical construct from English Grammar in Use.   │
│ 2. Sentence Length            │ Exactly 12 to 35 words (strict Part 5 bounds).                          │
│ 3. Blank Specification        │ Exactly one blank denoted by '_______'.                                  │
│ 4. Single Key Unambiguity     │ Exactly 1 grammatically flawless key; 3 demonstrably flawed distractors.│
│ 5. Register & Tone            │ Professional international business English (no casual slang).          │
│ 6. Collocational Authenticity │ Verbs and objects must follow natural corporate lexical collocations.   │
│ 7. Distractor Quality         │ Each distractor represents a distinct, plausible learner error class.   │
│ 8. Dual-Language Explanation  │ Clear pedagogical English rationale + Vietnamese clue-based guidance.   │
│ 9. Metadata Completeness      │ Exact Unit, sectionId, conceptId, domain, difficulty, model lineage.    │
└───────────────────────────────┴─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Automated Defect Checkers & Blocking Rules

To prevent recurrence of flaws discovered in historical versions (e.g. `is is reviewing`, `entering hardware`, `explaining hardware`), the validation engine must execute eleven automated blocking filters:

### 2.1 Double Auxiliary / Stutter Check (`BLK_STUTTER_AUX`)
- **Description:** Detects repetitive auxiliary or modal verbs caused by LLM token stuttering.
- **Automated Filter:**
  ```regex
  \b(is\s+is|are\s+are|was\s+was|were\s+were|have\s+have|has\s+has|had\s+had|will\s+will|do\s+do|does\s+does|did\s+did)\b
  ```
- **Action:** Any match in prompt or options triggers immediate rejection (`BLK_STUTTER_AUX`).

---

### 2.2 Subject-Verb Agreement Checker (`BLK_AGREEMENT`)
- **Description:** Verifies that the correct key agrees morphosyntactically with the subject.
- **Automated Rules:**
  1. Singular third-person subject noun phrases (*"The director"*, *"Ms. Patterson"*, *"The committee"*) + present tense must take 3rd-person singular verbs (`-s`, `-es`, `is`, `has`).
  2. Plural subject noun phrases (*"Customs officers"*, *"Board members"*, *"Software developers"*) + present tense must take plural verbs (`are`, `have`, base form).
  3. If option insertion violates number agreement, the option is rejected.

---

### 2.3 Semantic Collocation & Lexical Compatibility Filter (`BLK_COLLOCATION`)
- **Description:** Prevents unnatural verb-object combinations where a transitive verb selects an incompatible semantic argument.
- **Blacklisted Collocation Patterns (Derived from Audit):**
  - Motion verbs (*enter, arrive, visit*) + non-spatial abstract objects (*"entering the hardware"*, *"entering the policy"*).
  - Speech-act verbs (*explain, tell, announce*) + non-informational hardware objects (*"explaining the server hardware"*).
- **Automated Validation:** Verbs of physical motion must take architectural/spatial location direct objects (*suite, room, building, office*). Speech-act verbs must take informational or human recipients (*guidelines, policy, strategy, employees*).

---

### 2.4 Single Unambiguous Answer Key Check (`BLK_WRONG_KEY` & `BLK_AMBIGUITY`)
- **Description:** Exactly one option must evaluate to `isCorrect = true`.
- **Validation:**
  ```typescript
  const correctCount = options.filter(o => o.isCorrect).length;
  if (correctCount === 0) throw new ValidationError("BLK_WRONG_KEY");
  if (correctCount > 1) throw new ValidationError("BLK_AMBIGUITY");
  ```

---

### 2.5 Distractor Diversity & Plausibility Check (`BLK_DISTRACTOR`)
- All 4 option texts must be distinct (case-insensitive, whitespace-trimmed).
- No option may be empty or contain non-word characters.
- Distractors must share the same base lemma or closely related grammatical paradigm (e.g. `reviews`, `is reviewing`, `reviewed`, `was reviewing`). Mixed part-of-speech distractors (e.g. mixing an adverb with a verb) are prohibited unless testing word-form units.

---

### 2.6 Dual-Language Explanation Integrity (`BLK_EXPLANATION`)
- **English Explanation:** Must identify the grammatical rule, the deictic time indicator, and why each distractor fails.
- **Vietnamese Explanation:** Must be at least 40 characters in length and explicitly cite grammatical keywords (*thì*, *dấu hiệu*, *chủ ngữ*, *tiếp diễn*, *hoàn thành*, *bị động*).

---

## 3. Distractor Error Taxonomy

Every question blueprint must specify exactly which error archetype each of the three distractors represents:

| Error Code | Error Archetype Name | Description | Example Foil (for target: *is reviewing*) |
| :--- | :--- | :--- | :--- |
| **ERR_TENSE** | Tense Confusion | Uses completed past or future when present context is required. | `reviewed` (conflicts with *currently*) |
| **ERR_ASPECT** | Aspect Confusion | Uses simple aspect for continuous, or continuous for simple stative. | `reviews` (habitual vs temporary ongoing) |
| **ERR_AGREE** | Morphosyntactic Agreement | Uses incorrect singular/plural verb form. | `are reviewing` (with singular *she*) |
| **ERR_VOICE** | Voice Inversion | Uses passive voice for active, or active for passive. | `is being reviewed` (inverts agent/theme) |
| **ERR_STATIVE** | Stative Rule Violation | Applies continuous aspect to an inherently stative verb. | `is doubting` (stative mental verb *doubt*) |
| **ERR_FORM** | Non-Finite Confusion | Uses bare infinitive or participle without auxiliary. | `reviewing` (lacks auxiliary *is*) |

---

## 4. Comprehensive Blocking Defect Taxonomy

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ QUALITY BLOCKING DEFECT CODES                                                                          │
├────────────────────┬─────────────────────────────────────────────────┬─────────────────────────────────┤
│ Blocking Code      │ Failure Condition                               │ Severity                        │
├────────────────────┼─────────────────────────────────────────────────┼─────────────────────────────────┤
│ BLK_FORMAT         │ Prompt missing blank, multiple blanks, length   │ Critical Abort                  │
│ BLK_WRONG_KEY      │ Zero correct options marked                     │ Critical Abort                  │
│ BLK_AMBIGUITY      │ More than 1 correct option marked               │ Critical Abort                  │
│ BLK_DISTRACTOR     │ Empty or duplicate option text                  │ Critical Abort                  │
│ BLK_STUTTER_AUX    │ Repetitive auxiliary tokens ('is is')           │ Critical Abort                  │
│ BLK_AGREEMENT      │ Subject-verb agreement failure in completed key │ Critical Abort                  │
│ BLK_COLLOCATION    │ Unnatural verb-object semantic clash            │ Critical Abort                  │
│ BLK_EXPLANATION    │ Missing, too short, or lacks grammar citation   │ Quality Demotion to Draft       │
│ BLK_REGISTER       │ Sentence lacks authentic business context       │ Quality Demotion to Draft       │
│ BLK_DUPLICATE      │ Content hash or Levenshtein > 0.85 duplicate    │ Critical Abort                  │
│ BLK_MAPPING        │ Item does not assess the target Unit/Concept    │ Rejection / Routing to Audit    │
└────────────────────┴─────────────────────────────────────────────────┴─────────────────────────────────┘
```

---

## 5. Scoring Rubric (10.00 Point Maximum)

```
Overall Score = Linguistic Accuracy (3.0) + Business Realism (2.5) + Distractor Validity (2.5) + Pedagogical Explanation (2.0)
```
- **Score $\ge 8.50$ AND Zero Blocking Defects:** Eligible for `validated` candidate inventory.
- **Score $< 8.50$ OR Any Non-Critical Warnings:** Staged as `draft` candidate requiring manual revision.
- **Any Critical Blocking Defect:** Rejected immediately; never inserted into question bank.

