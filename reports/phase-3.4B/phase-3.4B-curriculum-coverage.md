# GrammarPath Phase 3.4B — Report 2: TOEIC Curriculum Coverage & Mapping Strategy
## Taxonomic Alignment of TOEIC Assessment Items to Grammar Concepts, Textbook Units, and Assessment Skills

**Date:** 2026-11-13  
**Auditor:** Principal Learning Systems Architect & Educational Data Scientist  
**Scope:** Curriculum Knowledge Graph, Skill Taxonomy, Multi-Part TOEIC Mapping, and Gap Analysis  
**Phase Status:** DESIGN ONLY (Phase 3.4B Stage 1)

---

## 1. Executive Summary

A core premise of GrammarPath is that mastery of Raymond Murphy’s *English Grammar in Use* directly transfers to improved performance on the TOEIC exam. To make this transfer measurable and actionable, every item in the TOEIC Question Bank must have a precise, principled relationship to the underlying curriculum knowledge graph.

This report establishes the **Curriculum Mapping Strategy** for Phase 3.4B. It defines how TOEIC assessment items connect to `GrammarConcept`, `ConceptTheoryLink`, `TheorySection`, and `Unit` entities, while establishing an explicit skill taxonomy that distinguishes direct grammar evaluation from vocabulary, reading comprehension, and listening comprehension. It also recognizes that **not every authentic TOEIC question should be artificially forced into a grammar concept mapping**—pure lexical, collocation, or discourse items are recognized as first-class citizens with nullable concept links.

---

## 2. Curriculum Knowledge Graph Baseline

The canonical curriculum database on Neon staging comprises:

```
┌────────────────────────────────────────────────────────┐
│                   Unit (145 units)                     │
│  - unitNumber (1..145), title, level, category         │
└───────────────────────────┬────────────────────────────┘
                            │ 1 : N
                            ▼
┌────────────────────────────────────────────────────────┐
│              TheorySection (542 sections)              │
│  - sectionId (e.g. "1A", "25B"), heading, sourceContent │
└───────────────────────────┬────────────────────────────┘
                            │ 1 : N
                            ▼
┌────────────────────────────────────────────────────────┐
│          ConceptTheoryLink (542 links)                 │
│  - confidence ("high" | "medium" | "needs_review")     │
└───────────────────────────┬────────────────────────────┘
                            │ N : 1
                            ▼
┌────────────────────────────────────────────────────────┐
│             GrammarConcept (161 concepts)              │
│  - code (e.g. "unit.001"), name, category, displayOrder│
└────────────────────────────────────────────────────────┘
```

Additionally, `UnitToeicMetadata` provides pre-computed metadata mapping all 145 units to 16 `ToeicRoadmapModule` records across 5 `ToeicRoadmapStage` bands (`0 → 350+`, `350 → 500+`, `500 → 650+`, `650 → 750+`, `750 → 850+`).

---

## 3. Skill & Assessment Typology

Authentic TOEIC questions assess distinct linguistic capabilities. In Phase 3.4B, every question bank item must be classified into one of five primary skill categories:

```
                            ┌────────────────────────────────────────┐
                            │      TOEIC Question Bank Item          │
                            └───────────────────┬────────────────────┘
                                                │
         ┌──────────────────┬───────────────────┼───────────────────┬──────────────────┐
         ▼                  ▼                   ▼                   ▼                  ▼
┌─────────────────┐┌─────────────────┐┌─────────────────┐┌─────────────────┐┌─────────────────┐
│ Direct Grammar  ││   Word Form /   ││   Vocabulary    ││     Reading     ││    Listening    │
│   Assessment    ││  Morphological  ││  & Collocation  ││  Comprehension  ││  Comprehension  │
│(Part 5 / Part 6)││(Part 5 / Part 6)││(Part 5 / Part 6)││(Part 6 / Part 7)││(Part 1 - Part 4)│
└─────────────────┘└─────────────────┘└─────────────────┘└─────────────────┘└─────────────────┘
```

### 3.1 Direct Grammar Assessment (Grammar-Centric)
- **Target Operations:** Tense selection, voice (active vs passive), modal verbs, conditional structures, relative clauses, subjunctive mood, subject-verb agreement, gerunds vs infinitives, inversion.
- **Distractor Architecture:** Distractors share the same base lexeme but vary in grammatical inflection, auxiliary verb, aspect, or voice (e.g., `has conducted`, `is conducting`, `conducted`, `was conducted`).
- **Concept Linkage:** **MANDATORY (`primaryConceptId` NOT NULL).** Directly mapped to a target `GrammarConcept` and specific `TheorySection`.
- **Mastery Impact:** Directly updates `UserConceptMastery` and retention stability for the target concept.

### 3.2 Word Form / Morphological Assessment (Derivational Grammar)
- **Target Operations:** Distinguishing parts of speech (noun, verb, adjective, adverb) based on syntactic position in the clause (e.g., preceding noun modifiers, following copular verbs, adverbial qualification).
- **Distractor Architecture:** Distractors share the same word root with differing derivational affixes (e.g., `compete`, `competition`, `competitive`, `competitively`).
- **Concept Linkage:** Mapped to structural concepts (e.g., Unit 98–101: Adjectives and Adverbs; Unit 105: Noun Compounds).
- **Mastery Impact:** Updates part-of-speech concepts.

### 3.3 Vocabulary, Collocation & Prepositional Idiom (Lexical-Centric)
- **Target Operations:** Business collocations, fixed prepositional phrases (*in accordance with*, *prior to*, *eligible for*), phrasal verbs, context-dependent word choice.
- **Distractor Architecture:** Distractors share the same part of speech and syntax but carry different semantic meanings (e.g., `allocated`, `estimated`, `designated`, `regulated`).
- **Concept Linkage:** **OPTIONAL / NULLABLE (`primaryConceptId` MAY BE NULL).** Prepositional questions map to Units 121–136 (Prepositions), while pure lexical word choice questions are tagged as `grammarConceptId = null` with `unitNumber = null`.
- **Mastery Impact:** Contributes to overall TOEIC readiness metrics, but does not distort narrow grammar concept mastery scores.

### 3.4 Contextual & Discourse Grammar (Part 6 Text Completion)
- **Target Operations:** Cohesive discourse markers (*furthermore*, *nevertheless*, *consequently*), sentence insertion, cross-sentence pronoun reference.
- **Concept Linkage:** Mapped to conjunctions and clauses (Units 113–120: Conjunctions and Clauses).

### 3.5 Reading & Listening Comprehension (Parts 1–4, Part 7)
- **Target Operations:** Inference, gist, factual details, photo descriptions.
- **Concept Linkage:** Indirect linkage to foundational stages in roadmap metadata.

---

## 4. Multi-Tiered Mapping Rules

To ensure database consistency and prevent data pollution, every question in the bank must adhere to the following mapping rules:

```typescript
interface ToeicMappingRule {
  toeicPart: "part_1" | "part_2" | "part_3" | "part_4" | "part_5" | "part_6" | "part_7";
  skillCategory: "grammar" | "word_form" | "vocabulary" | "reading" | "listening";
  primaryConceptId: string | null;  // Must be valid GrammarConcept UUID if skillCategory === 'grammar'
  secondaryConceptId?: string | null;
  unitNumber: number | null;        // Must match primaryConcept's mapped unit if specified
  theorySectionId: string | null;   // Cites specific section, e.g. "5A", "26B"
  difficulty: "easy" | "medium" | "hard";
  targetScoreBand: "0-350" | "350-500" | "500-650" | "650-750" | "750-850";
}
```

### Invariants:
1. **Rule 1 (Grammar Integrity):** If `skillCategory == 'grammar'`, `primaryConceptId` **must not be null**, and the target concept must exist in `grammar_concepts`.
2. **Rule 2 (No Artificial Forcing):** If an authentic TOEIC question assesses business vocabulary (e.g., choosing between *affordable*, *subsequent*, *durable*, *reliable*), it must be classified as `skillCategory = 'vocabulary'` with `primaryConceptId = null`.
3. **Rule 3 (Rule Reference Verification):** `theorySectionId` must reference a valid `sectionId` in `theory_sections` whenever a concept is attached.
4. **Rule 4 (Unit Consistency):** If `unitNumber` is provided, it must match the `unitNumber` associated with the target `GrammarConcept` via `ConceptTheoryLink` → `TheorySection` → `Unit`.

---

## 5. Curriculum Coverage Gap Analysis

An audit of curriculum alignment across the 145 Murphy units highlights significant coverage disparities:

```
Stage 1: Units 1-4 (Present Continuous & Simple)
  Curated TOEIC Items: 30 items | Coverage: 100% (Units 1-4 covered)

Stage 2: Units 5-52 (Past, Present Perfect, Passive, Future, Modals)
  Curated TOEIC Items: 0 items  | Coverage: 0.0% (CRITICAL GAP)

Stage 3: Units 53-81 (Gerunds, Infinitives, Reporting, Conditionals)
  Curated TOEIC Items: 0 items  | Coverage: 0.0% (HIGH GAP)

Stage 4: Units 82-112 (Nouns, Pronouns, Modifiers, Adjectives, Adverbs)
  Curated TOEIC Items: 0 items  | Coverage: 0.0% (HIGH GAP)

Stage 5: Units 113-145 (Conjunctions, Prepositions, Phrasal Verbs)
  Curated TOEIC Items: 0 items  | Coverage: 0.0% (HIGH GAP)
```

### Critical Findings:
1. **The "Stage 2 Chasm" (Units 5–52):** Units 5–52 represent the core grammatical backbone of the English language: past simple, past continuous, present perfect, past perfect, passives, future forms, and modal auxiliaries (*can*, *could*, *must*, *should*, *would*). **These units represent over 60% of all grammar-tested points on TOEIC Part 5.** Yet currently, there are zero curated questions for these units.
2. **Seeding Priority for Phase 3.4B:**
   - **Priority Tier 1 (Immediate Scope for 3.4B):** Units 5–52 (48 units). Generating and validating 5–10 approved TOEIC Part 5 items per unit across Easy, Medium, and Hard tiers will create an initial seed bank of ~250–350 high-quality questions.
   - **Priority Tier 2 (Future Phase 3.4C/3.4D):** Units 53–145.

---

## 6. Unsupported TOEIC Question Types in Current Architecture

| Question Type | TOEIC Part | Current Status | Technical Gap / Blocker | Proposed Treatment in Phase 3.4B |
| :--- | :--- | :--- | :--- | :--- |
| **Incomplete Sentences** | Part 5 | Supported | Needs persistent bank table & quality gates. | **Primary Focus of Phase 3.4B.** |
| **Text Completion (Cloze Passage)** | Part 6 | Unsupported | Requires passage schema (`passageText`), multiple embedded blanks per passage, and inter-sentence distractors. | Model data schema to support `passageText` in 3.4B; defer rendering to Phase 3.4D. |
| **Reading Passages (Single/Double)** | Part 7 | Unsupported | Requires document formatting, multi-question passage containers, and graphic interpretation. | Out of scope for Murphy grammar alignment; roadmap only. |
| **Photographs** | Part 1 | Unsupported | Requires audio assets, photograph images, and audio player UI. | Out of scope for current webapp infrastructure. |
| **Question-Response / Audio Drills** | Parts 2, 3, 4 | Unsupported | Requires synthesized/native audio streams, transcript timestamps, and audio playback controls. | Out of scope for text-centric grammar engine. |

**Architectural Recommendation:** Focus Phase 3.4B implementation on **Part 5 (Incomplete Sentences)**, while designing the database schema (`ToeicQuestionBankItem`) with optional fields (`passageText`, `audioUrl`, `imageUrl`) to future-proof support for Part 6 and listening parts without schema breaking changes.

