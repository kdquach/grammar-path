# GrammarPath — Phase 3.4C.2: Assessment Blueprint
## Construct Definition, Skill Category Eligibility, and Transfer Evidence Framework

**Author:** Antigravity (Advanced Agentic Coding)  
**Milestone:** Phase 3.4C.2 (Design-Only Specification)  
**Date:** November 14, 2026  
**Status:** DESIGN-ONLY (Evidence Architecture Blueprint)  

---

## 1. Executive Summary & Assessment Philosophy

An assessment of Transfer Competence ($\tau$) must measure the target construct—the learner's ability to apply grammatical concepts in novel contexts—while strictly minimizing **construct-irrelevant variance** (such as specialized domain jargon, acoustic decoding hurdles, or text reading speed) and **construct underrepresentation** (such as relying on a single repetitive scenario).

This blueprint evaluates the five major language assessment categories commonly present in TOEIC preparation:
1. **Direct Grammar Application**
2. **Word Form and Morphology**
3. **Vocabulary and Collocation**
4. **Reading Comprehension**
5. **Listening Comprehension**

**Key Architectural Finding:** Not all five categories are psychometrically eligible to contribute to Grammar Transfer Mastery ($\tau$). Testing whether a student understands financial idioms or audio acoustics does not assess grammar transfer. Including them would introduce severe construct contamination.

---

## 2. In-Depth Category Evaluation Framework

### 2.1 Category 1: Direct Grammar Application (Part 5 Incomplete Sentences)

#### A. Construct Measured:
The learner's ability to analyze sentence syntax, identify the missing grammatical constituent, and select the correct inflectional or functional form (e.g., tense, aspect, voice, mood, modal auxiliary, subject-verb agreement, or relative clause connector) within a single-sentence professional context.

#### B. What Counts as Valid Evidence:
- **Format:** Part 5 single-sentence incomplete sentences (`format = "PART5_INCOMPLETE_SENTENCE"`).
- **Option Design:** All four options share the same root lexical lemma or provide pure functional contrasts (e.g., `is launching`, `launches`, `launched`, `launch`).
- **Target Concept Alignment:** The blank requires resolving the specific rule of the mapped concept (e.g., temporary action in progress at the time of speaking for Unit 1).
- **Primary Skill:** Must be explicitly tagged `primarySkill = "direct_grammar"`.
- **Eligibility for $\tau$:** **PRIMARY VALID EVIDENCE (100% Eligible).**

#### C. What Must Be Excluded:
- Items where the correct option can be chosen purely through keyword association without reading the grammatical structure (e.g., seeing `"yesterday"` and blindly matching `-ed` without checking voice).
- Items containing multiple errors across options that confound the grammatical focus.
- Ungrammatical sentences or ambiguous keys (e.g. `4a1223fc: "he are updating"`).

#### D. Context Independence Evaluation:
- Must have $D_{\text{ctx}} \ge 0.50$ against both the canonical textbook exercises and all other items attempted by the learner.
- Varied workplace domains: Corporate Management, IT / Technical Operations, Maritime Logistics, Financial Accounting, Healthcare Administration, Hospitality, Manufacturing.

#### E. Representation of Confidence & Insufficient Data:
- Requires verified `conceptMappingConfidence >= 0.85`.
- If fewer than 3 independent context domains are present, status remains `insufficient_data`.

---

### 2.2 Category 2: Word Form and Morphology (Part 5 Incomplete Sentences)

#### A. Construct Measured:
The learner's ability to parse the syntactic frame of a workplace sentence, determine the required grammatical part of speech (noun, verb, adjective, adverb), and select the appropriate derivational affix (e.g., `-tion`, `-ive`, `-ly`, `-ment`).

#### B. What Counts as Valid Evidence:
- **Format:** Part 5 incomplete sentences (`format = "PART5_INCOMPLETE_SENTENCE"`).
- **Option Design:** Four morphological variants of a common business base word (e.g., `compete`, `competition`, `competitive`, `competitively`).
- **Concept Alignment:** Mapped to structural concepts (e.g., Unit 98–101: Adjectives and Adverbs; Unit 4: Present tenses in stative verbs).
- **Primary Skill:** Tagged `primarySkill = "word_form_morphology"`.
- **Eligibility for $\tau$:** **SECONDARY VALID EVIDENCE (Eligible for Morpho-Syntactic Concepts Only).**

#### C. What Must Be Excluded:
- Morphological items mapped to pure verbal aspect concepts (e.g. using `repetition / repeatedly` cannot assess Present Perfect Continuous).
- Rare, archaic, or highly irregular derivational suffixes not relevant to TOEIC business contexts.

#### D. Context Independence Evaluation:
- Context must feature varied clausal embeddings (e.g., modifying subject noun phrases vs predicate adjective complements vs adverbial sentence-initial clauses).

#### E. Representation of Confidence & Insufficient Data:
- Mapping confidence must be $\ge 0.90$ to confirm that the syntactic slot specifically tests the target concept.

---

### 2.3 Category 3: Vocabulary and Collocation (Part 5)

#### A. Construct Measured:
Lexical semantic knowledge, phrasal verbs, prepositional idioms, and fixed business collocations (e.g. `conduct a survey`, `acquire a subsidiary`, `adhere to guidelines`).

#### B. Psychometric Analysis & Threat to Construct Validity:
- **Construct Irrelevant Variance:** If a learner fails a question because they do not know the rare financial term `amortize`, this failure does **NOT** indicate a lack of grammatical competence in Present Continuous or Past Simple.
- **Confounding Effect:** Conflating lexical breadth with grammatical transfer obscures the diagnostic feedback loop.

#### C. What Must Be Excluded:
- **ALL pure vocabulary items (`primarySkill = "vocabulary"`) are STRICTLY EXCLUDED from Grammar Transfer Competence ($\tau$).**
- Vocabulary items must never contribute evidence to concept mastery, accuracy, retention, or grammar spaced reviews.
- *Future Architectural Note:* Vocabulary items will feed a separate, orthogonal **Lexical Breadth Index ($L$)** in Phase 4, keeping grammar pure.

---

### 2.4 Category 4: Reading Comprehension (Part 6 Text Completion & Part 7 Passages)

#### A. Construct Measured:
Discourse-level grammatical coherence, cross-sentence aspectual flow, and textual cohesion across multi-sentence paragraphs (emails, memos, notice boards).

#### B. Psychometric Analysis:
- **Part 6 (Text Completion):** Contains 16 questions in 4 passages. Approximately 8–10 of these test pure grammar in discourse (e.g. choosing the correct tense that matches a previous sentence's timeline).
  - **Verdict for Part 6:** **CONDITIONALLY ELIGIBLE (Subject to Passage-Level Modeling).**
- **Part 7 (Reading Comprehension Passages):** Tests reading rate, skimming, scanning, vocabulary-in-context, and pragmatic business inference.
  - **Verdict for Part 7:** **STRICTLY EXCLUDED.** The variance in Part 7 is overwhelmingly dominated by reading speed and vocabulary comprehension, not grammatical rule application.

#### C. Valid Evidence Criteria for Part 6 (Future Milestone):
- Only the specific gap-fill items in Part 6 that test grammatical inflections (not whole-sentence insertions or lexical choices).
- Requires a multi-item passage data model where context dependencies are explicitly tracked.

---

### 2.5 Category 5: Listening Comprehension (Part 1, 2, 3, 4)

#### A. Construct Measured:
Acoustic phonological decoding, connected speech parsing (elision, assimilation), spoken stress and intonation patterns, and real-time auditory working memory.

#### B. Psychometric Analysis & Severe Construct Irrelevance:
- In audio comprehension, grammatical processing is heavily confounded by acoustic factors: speaker accents, playback speed, background office noise, and fleeting memory decay.
- A learner who speaks and writes grammatically perfect English may fail a listening item due to auditory processing latency.

#### C. Absolute Mandate:
- **ALL listening items are 100% EXCLUDED from Grammar Transfer Competence ($\tau$).**
- GrammarPath's core mission is grammar mastery; listening tests a separate modality.

---

## 3. Assessment Blueprint & Eligibility Matrix

| Category | Primary Format | Target Construct | Eligible for Grammar $\tau$? | Weight in $\tau$ | Minimum Contexts Req. | Primary Exclusion Rule |
|---|---|---|:---:|:---:|:---:|---|
| **1. Direct Grammar** | Part 5 Incomplete Sentences | Morphosyntactic rule application | **YES (Primary)** | $70\% - 100\%$ | $K_{\text{ctx}} \ge 3$ | Exclude vocabulary distractors; exclude ambiguous keys. |
| **2. Word Form & Morphology** | Part 5 Incomplete Sentences | Syntactic slot parsing & affixation | **YES (Secondary)** | $0\% - 30\%$ | $K_{\text{ctx}} \ge 3$ | Eligible only for concepts where part of speech is target. |
| **3. Vocabulary & Collocation** | Part 5 Incomplete Sentences | Lexical semantics & idioms | **NO (Excluded)** | $0\%$ | N/A | 100% excluded (Construct-irrelevant variance). |
| **4. Reading (Part 6)** | Part 6 Text Completion | Discourse-level grammar flow | **CONDITIONAL** | Phase 3.4C.4 | $K_{\text{pass}} \ge 2$ | Exclude sentence insertions & lexical gaps. |
| **4. Reading (Part 7)** | Part 7 Reading Passages | Textual inference & scanning | **NO (Excluded)** | $0\%$ | N/A | 100% excluded (Reading speed & vocab dominant). |
| **5. Listening** | Part 1–4 Audio Tasks | Acoustic phonological parsing | **NO (Excluded)** | $0\%$ | N/A | 100% excluded (Acoustic decoding confound). |

---

## 4. Concept Blueprint: Minimum Context Distribution per Unit

To guarantee psychometric validity, every grammar concept requires an approved item bank adhering to the **3-3-3 Diversification Rule**:

```
                       TARGET DIVERSITY BLUEPRINT PER CONCEPT
                                (Minimum 6 Items)
                                       │
         ┌─────────────────────────────┴─────────────────────────────┐
         ▼                                                           ▼
  3 Distinct Workplace Domains                                3 Difficulty Levels
  ├─ Domain A (e.g. IT Operations)                             ├─ Easy (b = -1.0)
  ├─ Domain B (e.g. Marketing / Sales)                         ├─ Medium (b = 0.0)
  └─ Domain C (e.g. Logistics / Supply Chain)                  └─ Hard (b = +1.0)
```

### Contextual Diversity Requirements:
1. **Domain Spread:** At least 3 different business domains per unit (no single domain may represent $> 50\%$ of a unit's question bank).
2. **Subject Diversity:** Items must alternate between third-person singular human agents (`Ms. Patterson`, `the technician`), corporate entities (`the manufacturing plant`, `our logistics hubs`), plural teams (`board members`, `software developers`), and clausal subjects (`operating the new software`).
3. **Temporal Clue Variation:** Explicit adverbials (`right now`, `currently`, `these days`) must not be identical across items; at least 30% of items should require inferring the aspect from surrounding narrative context rather than an isolated keyword.

---

## 5. Summary of Architectural Guardrails

1. **Construct Purity:** $\tau$ measures grammar transfer alone. Vocabulary, listening, and general reading comprehension items are structurally quarantined.
2. **Evidence Exclusivity:** Only approved, latest-version Part 5 items with high confidence ($\ge 0.85$) tagged `direct_grammar` or `word_form_morphology` may enter the transfer evidence pipeline.
3. **Zero Compromise on Quality:** Any item displaying ambiguous answer keys, ungrammatical options, or template duplication is rejected or withdrawn.

