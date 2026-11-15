# GrammarPath Phase 3.4B — Report 6: TOEIC Quality Evaluation Framework & Rubric
## Measurable Rubrics, Automated Heuristics, Blocking Gates, and Educational Standards

**Date:** 2026-11-13  
**Auditor:** Principal Learning Systems Architect & Educational Psychometrician  
**Scope:** Assessment Quality Rubric, Scoring Algorithms, Automated Validators, and Editorial Review Standards  
**Phase Status:** DESIGN ONLY (Phase 3.4B Stage 1)

---

## 1. Executive Summary

A successful assessment engine requires an explicit, objective standard for what constitutes a "high-quality" TOEIC question. Without clear metrics, quality degradation happens silently through awkward collocations, accidental secondary correct answers, or irrelevant distractors.

This report establishes the **GrammarPath TOEIC Quality Evaluation Framework (GP-TQE)**. It defines an 11-dimension scoring rubric with quantitative thresholds, distinguishes between **Hard Blocking Failures** (which trigger immediate automated rejection) and **Soft Review Warnings** (which route items to human editors), and details which evaluations are automated versus those requiring human pedagogical review.

> [!IMPORTANT]
> **Regulatory & Trademark Notice:** GrammarPath questions are original assessment items designed to teach grammar principles in the format of the TOEIC exam. They are **not official ETS questions** and must never be represented or marketed as official ETS material. All user-facing interfaces must maintain clear attribution disclaimers.

---

## 2. The 11-Dimension Quality Rubric

Every candidate question is evaluated against 11 core dimensions. Each dimension is scored from 0.0 to 1.0, weighted to produce an aggregate **Quality Score (0.00 to 10.00)**:

| # | Dimension | Weight | Target Standard | Evaluation Mode |
| :---: | :--- | :---: | :--- | :--- |
| **D1** | **Answer Correctness & Unambiguity** | `0.20` | Exactly one option is grammatically and semantically correct; zero secondary interpretations. | Automated (Dual-Pass Blind) |
| **D2** | **Distractor Plausibility** | `0.15` | All 3 distractors represent credible learner confusions; strictly ungrammatical in context. | Automated & Rule Engine |
| **D3** | **Linguistic Naturalness & Register** | `0.10` | Authentic North American / International business English; zero awkward or translated phrasing. | Automated (Perplexity/LLM) |
| **D4** | **Grammar Concept Alignment** | `0.15` | Tested point strictly exercises the target Murphy rule (e.g. past continuous vs past simple). | Automated (Rule Reference Check) |
| **D5** | **Part 5 Format Compliance** | `0.05` | Exactly 1 blank (`_______`); sentence between 15 and 32 words; exactly 4 choices. | Automated (Schema/Regex) |
| **D6** | **Vocabulary Appropriateness** | `0.05` | Words within CEFR B1–C1 range; appropriate corporate, office, or commercial setting. | Automated (Lexical Frequency) |
| **D7** | **Explanation Quality & Pedagogy** | `0.10` | Vietnamese explanation explicitly cites the grammar rule, translates key vocabulary, and explains why distractors fail. | Automated & Human Review |
| **D8** | **Difficulty Tier Consistency** | `0.05` | Easy/Med/Hard tier accurately reflects sentence complexity and distractor subtlety. | Automated (Flesch-Kincaid & Rules) |
| **D9** | **Lexical & Semantic Novelty** | `0.05` | < 70% word overlap with existing items in bank; no prompt collision. | Automated (Jaccard Similarity) |
| **D10** | **Positional & Length Balance** | `0.05` | Options of similar word length; correct answer evenly distributed across A/B/C/D. | Automated (Length Variance) |
| **D11** | **Disclaimer Compliance** | `0.05` | Contains mandatory non-official attribution metadata and educational notices. | Automated (Schema Check) |
| **SUM** | **Total Composite Score** | `1.00` | Normalized to **0.00 – 10.00** scale. Minimum approval threshold: **8.50**. | — |

---

## 3. Hard Blocking Failures vs Soft Review Warnings

The quality framework partitions validation failures into two strict categories:

```
Candidate Question
        │
        ├── Any Blocking Failure? ──YES──► [REJECTED] (Discarded from pipeline)
        │
        └── All Blocking Checks Pass
                 │
                 ├── Any Review Warnings? ──YES──► [VALIDATED: REVIEW QUEUE] (Requires Editor)
                 │
                 └── Zero Warnings & Score >= 9.0 ──► [VALIDATED: AUTO-ELIGIBLE]
```

### 3.1 Hard Blocking Failures (Automated Immediate Rejection)
If any of these conditions occur, the question is **immediately marked `rejected`** without human intervention:

1. **Dual-Pass Disagreement:** The secondary blind AI evaluator selects an option different from the candidate answer key.
2. **Ambiguity Flagged:** Secondary evaluator flags that two options could both be grammatically correct.
3. **Non-Word Distractor:** Any distractor fails dictionary validation (e.g. invented inflection like *confusible*).
4. **Length Violation:** Prompt has fewer than 12 words or more than 35 words.
5. **Blank Count Violation:** Prompt does not contain exactly one `_______` blank.
6. **Option Count Violation:** Fewer or more than 4 options.
7. **Missing Rule Linkage:** Grammar item lacks valid `primaryConceptId` or `theorySectionId`.
8. **High Duplicate Similarity:** Jaccard similarity >= 75% against any existing bank item.
9. **Casual British Murphy Leakage:** Prompt mentions conversational British textbook terms (*Sarah's flat*, *cinema*, *pub*).

### 3.2 Soft Review Warnings (Routed to Human Editorial Staging)
If blocking checks pass, but soft warnings are raised, the item is saved with `status: "validated"` and flagged for human review:

1. **Option Length Disparity Warning:** One option is more than twice as long as the other three options (can create a visual bias for test-takers).
2. **High Vocabulary Difficulty Warning:** More than 2 words fall outside the standard B2 CEFR lexicon.
3. **Explanation Brevity Warning:** Vietnamese explanation is under 50 characters or does not cite the rule explicitly.
4. **Moderate Similarity Warning:** Jaccard similarity between 55% and 74% against an existing item.

---

## 4. Automation Capability Matrix

| Quality Check | Automation Reliability | Automation Method | Human Review Requirement |
| :--- | :---: | :--- | :---: |
| **Schema & Syntax** | 100% | Zod schema parser, regex checks | None (Fully Automated) |
| **Answer Key Unambiguity** | 92% | Dual-pass blind LLM evaluation | Fallback on disagreement |
| **Vocabulary Register** | 95% | Lexicon matching (Business Corpus) | Low |
| **Grammar Alignment** | 90% | Pattern matching against TheorySection rules | Low |
| **Distractor Plausibility** | 85% | Part-of-speech & morphology checkers | Medium |
| **Vietnamese Explanation Pedagogy** | 80% | Length, keyword, and rule-citation parsers | Medium |
| **Subtle Cultural / Idiomatic Tone** | 70% | LLM naturalness scoring | **High (Human Auditor)** |

---

## 5. Scoring & Approval Thresholds

To attain `approved` status and become eligible for learner practice:
- **Composite Quality Score:** Must achieve **>= 8.50 / 10.00**.
- **Blocking Failures:** Exactly 0.
- **Editorial Confirmation:**
  - Automated Approval: Available only for items with **Quality Score >= 9.20**, 100% blind evaluator agreement, and 0 warnings.
  - Manual Editorial Approval: Any item between 8.50 and 9.19 requires explicit confirmation via the editorial tool.

