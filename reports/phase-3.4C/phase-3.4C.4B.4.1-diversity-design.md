# GrammarPath — Phase 3.4C.4B.4.1: Contextual Diversity Design Specification
## Critical Review of Distance Metrics, Limitations of Mathematical Thresholds, and 5-Dimensional Diversity Reporting

**Author:** Antigravity (Educational Data Scientist & Psychometrician)  
**Milestone:** Phase 3.4C.4B.4.1 (AI TOEIC Question Generation Pipeline — Design & Readiness Audit)  
**Date:** November 14, 2026  
**Status:** Diversity Design Specification (Design-Only)  

---

## 1. Critical Audit of Existing Diversity Algorithm

In Phase 3.4C.3, GrammarPath introduced the Contextual Diversity Engine to compute pairwise distance:
$$D_{\text{ctx}} = 1 - S_{\text{carrier}}$$
where $S_{\text{carrier}} = \max(S_{\text{norm}}, 0.60 \cdot S_{\text{slot}} + 0.40 \cdot S_{\text{sem}})$.

### Strengths Verified in Code:
- Highly effective at detecting verbatim and near-verbatim template copies ($S_{\text{norm}} \ge 0.85$).
- Penalizes identical syntactic frames around the blank via 3-token context windows ($S_{\text{slot}}$).
- Identifies shared morphological suffix distributions among options ($S_{\text{dist}}$).

### Epistemic Limitations & Psychometric Risks:
1. **The Mathematical Fallacy:** A mathematical distance of $D_{\text{ctx}} \ge 0.50$ is a **necessary negative guard**, but it is **not sufficient proof of pedagogical transfer learning**.
   - *Example:* Two sentences can have completely different vocabularies ($D_{\text{ctx}} = 0.88$), yet test the exact same trivial visual clue (e.g. *right now* placed at the end of the sentence) without requiring deep grammar transfer.
2. **Keyword Domain Sensitivity:** Domain classification relies on static keyword matching (`DOMAIN_KEYWORDS`). Sentences with peripheral business terms can be misclassified, masking scenario overlap.
3. **Scalar Collapse:** Collapsing multi-faceted linguistic phenomena into a single scalar ($D_{\text{ctx}}$) hides the *cause* of similarity (lexical vs. structural vs. pedagogical).

---

## 2. The 5-Dimensional Diversity Framework

To replace reliance on a single composite number, the generation pipeline evaluates five independent dimensions:

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 5-DIMENSIONAL CONTEXTUAL DIVERSITY PROFILE                                                            │
├───────────────────────────────┬───────────────────────────────────┬───────────────────────────────────┤
│ Dimension                     │ Metric / Signal                   │ Analytical Scope                  │
├───────────────────────────────┼───────────────────────────────────┼───────────────────────────────────┤
│ 1. Lexical Similarity         │ Content Token Jaccard             │ Vocabulary and lemma overlap.     │
│ 2. Sentence Structure         │ Syntactic Tree / Clause Frame     │ Main vs. subordinate, blank slot. │
│ 3. Semantic Context           │ Business Communicative Scenario   │ Domain, action, corporate role.   │
│ 4. Grammatical Construct      │ Sub-rule & Morphological Target   │ Exact sectionId and verb aspect.  │
│ 5. Learning Objective         │ Diagnostic Error Mechanism        │ Misconception tested by foils.    │
└───────────────────────────────┴───────────────────────────────────┴───────────────────────────────────┘
```

---

## 3. Dimensional Breakdown & Evaluation Methodology

### Dimension 1: Lexical Similarity ($L_{\text{lex}} \in [0.00, 1.00]$)
- **Scope:** Measures surface vocabulary reuse, excluding closed-class stopwords.
- **Formula:** Jaccard similarity of lemmatized content nouns, verbs, adjectives, and adverbs.
- **Pedagogical Target:** $L_{\text{lex}} \le 0.30$. High values indicate superficial lexical cloning.

### Dimension 2: Sentence Structure Similarity ($L_{\text{struct}} \in [0.00, 1.00]$)
- **Scope:** Measures syntactic parallelism, clause subordination, and blank position.
- **Evaluation:** Evaluates sentence skeleton:
  - Clause pattern: Simple SVO vs. Complex (Adverbial clause + Main clause) vs. Compound.
  - Blank offset: Relative word position of `_______` in sentence (start, middle, end).
  - Punctuation markers: Presence of semicolons, imperatives, or question marks.
- **Pedagogical Target:** $L_{\text{struct}} \le 0.50$. Prevents repetitive introductory clauses (*"The [job] is not at his desk because..."*).

### Dimension 3: Semantic Context Similarity ($L_{\text{ctx}} \in [0.00, 1.00]$)
- **Scope:** Evaluates communicative scenario and business setting.
- **Evaluation:** Categorizes scenario into authentic TOEIC domains:
  `finance_accounting`, `logistics_shipping`, `it_technology`, `marketing_sales`, `corporate_management`, `manufacturing_production`, `human_resources`, `hospitality_travel`.
- **Pedagogical Target:** A valid unit pool must distribute questions across at least **3 distinct domains**.

### Dimension 4: Grammatical Construct Similarity ($L_{\text{gram}} \in [0.00, 1.00]$)
- **Scope:** Evaluates the exact sub-rule and grammatical form evaluated.
- **Evaluation:** Compares `ruleReference` (e.g. Unit 3.A vs 3.B vs 3.C).
- **Pedagogical Target:** A balanced unit pool requires representation across all major sub-rules of that unit, avoiding over-sampling a single sub-rule.

### Dimension 5: Learning Objective Similarity ($L_{\text{obj}} \in [0.00, 1.00]$)
- **Scope:** Evaluates the cognitive diagnostic mechanism of the distractors.
- **Evaluation:** Compares the distractor error archetypes (ERR_TENSE, ERR_ASPECT, ERR_AGREE, ERR_STATIVE).
- **Pedagogical Target:** Items must not all present the exact same distractor set. A robust pool must vary the diagnostic trap across items.

---

## 4. Multi-Dimensional Diversity Report Specification

Whenever a candidate item is generated, an automated 5-dimensional report is generated against all approved items in the target unit:

```json
{
  "candidateItemId": "new-gen-uuid",
  "targetUnit": 3,
  "closestApprovedItem": {
    "id": "existing-approved-uuid",
    "prompt": "Ms. Patterson is conducting a review right now.",
    "overallCompositeDistance": 0.812
  },
  "dimensionalProfile": {
    "lexicalSimilarity": 0.12,
    "structuralSimilarity": 0.35,
    "semanticContextOverlap": 0.00,
    "grammaticalConstructOverlap": 0.85,
    "learningObjectiveOverlap": 0.60
  },
  "domainDistribution": {
    "candidateDomain": "logistics_shipping",
    "existingPoolDomains": ["it_technology", "finance_accounting", "marketing_sales"]
  },
  "diversityStatus": "PASS_INDEPENDENT",
  "pedagogicalIndependenceConfirmed": true,
  "warnings": []
}
```

---

## 5. Review & Rejection Policy

1. **No Automatic Approval by Score Alone:** Even if $D_{\text{ctx}} = 0.95$, an item cannot be published without human editorial review.
2. **No Automatic Rejection by Composite Score Alone:** If an item exhibits a borderline distance ($0.50 \le D < 0.60$), it is not automatically rejected; the 5-dimensional breakdown is surfaced to the editorial board to determine whether the structural parallelism is pedagogically intentional.
3. **Hard Failure Condition:** If $D_{\text{ctx}} < 0.50$ OR $L_{\text{lex}} > 0.65$ against any approved item, the item is classified as a `TEMPLATE_DUPLICATE` and automatically quarantined.

