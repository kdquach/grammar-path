# GrammarPath — Phase 3.4B.1: TOEIC Quality & Editorial Approval Specification

**Auditor:** Senior Educational Assessment Specialist, QA Engineer, AI Safety Lead  
**Date:** November 13, 2026  
**Status:** SPECIFICATION & QUALITY AUDIT PROTOCOL  
**Safety Scope:** Multi-Stage Quality Gates, Automated Evaluation & Editorial Rubrics  

---

## 1. Dual-Pass Blind Evaluation Architecture

The quality gate incorporates a dual-pass evaluation pipeline to screen candidate questions before human editorial review.

> [!IMPORTANT]
> **Core Architectural Principle:**  
> **Automated AI evaluation is a supplementary filter, NOT conclusive proof of grammatical or pedagogical correctness.**  
> An AI-generated quality score—even a score exceeding $9.5/10$—**never** automatically publishes a question to `approved` status. It merely qualifies the question for `validated` status in the editorial review queue.

```mermaid
flowchart TD
    A[Raw Candidate Question] --> B[Automated Structural Sanity Check]
    B -->|Fails Structure| C[Direct Rejection: FORMAT_ERROR]
    B -->|Passes Structure| D[Pass 1: Blind AI Solver]
    
    D --> E{Solver Key Matches Declared Key?}
    E -->|No / Ambiguous| F[Immediate Rejection: KEY_DISCREPANCY]
    E -->|Yes (Single Key)| G[Pass 2: Pedagogical & Register Rubric]
    
    G --> H{Quality Score >= 8.50 AND 0 Blocking Defects?}
    H -->|No| I[Rejection / Queue for Auto-Refinement]
    H -->|Yes| J[Promote to VALIDATED Queue]
    
    J --> K[Human Editorial Review & Approval Gate]
    K -->|Approved by Certified Reviewer| L[Status: APPROVED (Active for Learners)]
    K -->|Rejected by Reviewer| M[Status: REJECTED (With Audit Notes)]
```

### 1.1 Pass 1: Independent Blind Solver
- **Mechanism:** The candidate stem and four option texts (A, B, C, D) are submitted to an independent LLM instance without revealing the author's declared answer key or explanation.
- **Evaluation Prompt:** The model is instructed to act as an expert test taker, select the uniquely correct option, identify any secondary grammatical possibilities, and justify its choice.
- **Pass 1 Gate Criteria:**
  - If the solver picks an option different from the declared key $\rightarrow$ **FLAGGED / REJECTED** (`DEFECT_KEY_MISMATCH`).
  - If the solver identifies more than one defensible option $\rightarrow$ **FLAGGED / REJECTED** (`DEFECT_AMBIGUOUS_KEY`).
  - If the solver's confidence is $< 0.95$ $\rightarrow$ **FLAGGED** (`DEFECT_SOLVER_UNCERTAIN`).

### 1.2 Pass 2: Pedagogical, Linguistic & Register Evaluator
- **Mechanism:** A specialized evaluation agent inspects the full question package (stem, options, key, explanation, and mapped unit/concept).
- **Automated Rubric Weights (Total 10.00 Points):**
  1. **Linguistic Correctness & Grammar Focus (3.0 pts):** Accurately tests the designated Murphy grammar rule; no peripheral grammatical flaws in the sentence.
  2. **ETS TOEIC Register Realism (2.5 pts):** Authentic business setting (purchasing, accounting, human resources, office logistics, travel, board meetings). Free of colloquialism, slang, or fairytale themes.
  3. **Distractor Plausibility & Discrimination (2.5 pts):** Distractors are realistic, grammatically plausible common learner errors (wrong tense, incorrect inflection, confusion between adjective/adverb), not nonsensical filler words.
  4. **Pedagogical Explanation Quality (2.0 pts):** Vietnamese explanation clearly explains the grammatical rule, cites the sentence clue, and explicitly clarifies why distractors are disqualified.

---

## 2. Explicit Blocking Conditions

If any candidate question triggers even one of the following blocking conditions, automated validation is immediately aborted and the item is rejected:

| Defect Code | Blocking Condition | Severity | Description & Example |
|---|---|---|---|
| `BLK_AMBIGUITY` | Multiple Defensible Answers | **BLOCKING** | More than one option is grammatically valid in the sentence context (e.g. both simple past and present perfect are acceptable without a specific time anchor). |
| `BLK_WRONG_KEY` | Incorrect Answer Key | **BLOCKING** | The declared answer key is grammatically incorrect or conflicts with canonical English rules. |
| `BLK_EXPLANATION` | Defective / Contradictory Explanation | **BLOCKING** | The Vietnamese explanation states a rule that contradicts the declared answer, gives incorrect grammatical advice, or contains factual errors. |
| `BLK_DISTRACTOR` | Invalid / Absurd Distractors | **BLOCKING** | Distractors include non-existent words (e.g. *costed* where inappropriate), typographical nonsense, or words completely unrelated in form/function. |
| `BLK_REGISTER` | Non-Business Register | **BLOCKING** | Sentences set in unrealistic contexts (e.g. fantasy fiction, children's cartoons, colloquial teen slang) instead of standard ETS business environments. |
| `BLK_FORMAT` | TOEIC Part 5 Format Violation | **BLOCKING** | Sentence lacks a blank `_______`, contains multiple blanks, does not have exactly 4 choices (A, B, C, D), or exceeds standard sentence length limits (10–35 words). |
| `BLK_DUPLICATE` | Duplicate / Near-Duplicate Content | **BLOCKING** | Exact duplicate `contentHash` or Levenshtein / embedding similarity $> 0.85$ against an existing item in the bank. |
| `BLK_MAPPING` | Unsupported Curriculum Mapping | **BLOCKING** | Item claims to test a concept (e.g. Unit 24 *Will/Shall*) but the actual test blank targets a completely different grammar point (e.g. preposition of place). |

---

## 3. Human Editorial Approval Requirements

### 3.1 Authorized Editorial Roles
Only authenticated users with one of the following system roles are authorized to transition an item from `validated` to `approved`:
1. `CONTENT_SPECIALIST`: Certified English language teacher or educational content editor.
2. `EDITORIAL_LEAD`: Senior language architect with master sign-off authority.
3. `SYSTEM_ADMIN`: Platform administrator executing audited content releases.

> [!CAUTION]
> **Strict Operational Rule:**  
> **If a question cannot be independently verified and signed off by a human editor, it MUST NOT be approved.**  
> Batch automated generation scripts are forbidden from executing `UPDATE ... SET review_status = 'approved'`. All AI-generated items must remain in `validated` until reviewed.

### 3.2 Editorial Approval Workflow in Stage 2
1. **The Validation Queue:** Editors access the editorial dashboard filtered by `reviewStatus = 'validated'`.
2. **Side-by-Side Verification:**
   - Left pane: Stem, options, highlighted correct answer, and Vietnamese explanation.
   - Right pane: Mapped Murphy unit/concept, theory section excerpt, and automated rubric scores.
3. **One-Click Editorial Decisions:**
   - **Approve:** Sets `reviewStatus = 'approved'`, `isLatestApproved = true`, logs `reviewedBy = editor.id`, `reviewedAt = now()`.
   - **Edit & Approve:** Opens inline editor to fix a minor typo or clarify explanation; creates new version, marks old draft, and approves version 2.
   - **Reject:** Prompts for defect code (`BLK_*`) and mandatory comment; updates `reviewStatus = 'rejected'`.

### 3.3 Audit Trail Retention
Every editorial action records an immutable row in the `audit_logs` table:
- `action`: `TOEIC_ITEM_APPROVAL` | `TOEIC_ITEM_REJECTION` | `TOEIC_ITEM_REVISION`
- `actorId`: User ID of editor
- `entityId`: `ToeicQuestionBankItem.id`
- `payload`: JSON diff of changes and comments

