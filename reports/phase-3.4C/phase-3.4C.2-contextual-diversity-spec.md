# GrammarPath — Phase 3.4C.2: Contextual Diversity Specification
## Multi-Tier Similarity Metrics, Template Deduplication, and Context Independence

**Author:** Antigravity (Advanced Agentic Coding)  
**Milestone:** Phase 3.4C.2 (Design-Only Specification)  
**Date:** November 14, 2026  
**Status:** DESIGN-ONLY (Quality & Diversity Architecture)  

---

## 1. Executive Summary & Problem Formulation

In assessing Transfer Competence ($\tau$), a core psychometric fallacy is equating **Question Count ($N$)** with **Contextual Diversity ($K_{\text{ctx}}$)**.

As discovered during the Neon staging audit, four approved TOEIC items in Unit 1 shared the exact same prompt:
> *"The IT technician is not at his desk because he _______ the server hardware in Room 3 right now."*

While the system recorded 4 distinct item IDs, a learner taking these items encounters only **1 unique situational context**. Repeated exposures within the same carrier sentence reduce cognitive load to superficial grammatical guessing rather than authentic workplace reading comprehension.

This specification designs a **Multi-Tier Contextual Diversity Engine** that detects template duplication, quantifies contextual distance, and surfaces warning signals to human editorial reviewers.

---

## 2. Audit of Existing Duplicate Detection & Failure Modes

### 2.1 Existing Implementation Architecture
The existing codebase implements two duplicate checks in [`backend/src/services/toeic-quality-engine.service.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-quality-engine.service.ts):
1. **Content Hash Match:**
   ```typescript
   const contentHash = computeToeicItemContentHash(candidate.prompt, normalizedOptions);
   ```
   Uses SHA-256 over `prompt.trim().toLowerCase()` concatenated with sorted option texts.
2. **Soft Duplicate Check:**
   ```typescript
   const sim = calculateStringSimilarity(candidate.prompt, item.prompt);
   if (sim > 0.85) blockingDefects.push({ code: "BLK_DUPLICATE" });
   ```
   Uses character-level Levenshtein edit distance normalized by string length.

### 2.2 Why Existing Checks Failed on Staging
1. **Content Hash Blindness to Carrier Templates:**
   Because the options differed across items (`updating`, `entering`, `explaining`, `repairing`), their SHA-256 content hashes were completely unique. The database unique constraint on `content_hash` never fired.
2. **Missing Quality Gating in Versioning & Approval Endpoints:**
   - When `createNewVersion` was called, it generated a quality validation report, but if defects were present, it merely created the item in `"draft"` status instead of preventing creation.
   - The admin `/approve` endpoint (`approveQuestion`) verified only that the item was not withdrawn and had 1 correct option. It **did not check duplicate warnings or template similarity**.
3. **Lack of Cross-Root Template Tracking:**
   The system possessed no mechanism to recognize that four different root questions shared an identical carrier prompt.

---

## 3. The 5-Dimensional Contextual Similarity Framework

To evaluate genuine contextual transfer, any candidate question $Q_A$ is compared against an existing question $Q_B$ across five distinct linguistic dimensions:

```
                            CANDIDATE QUESTION PAIR (QA, QB)
                                           │
         ┌───────────────────┬─────────────┴───────┬───────────────────┐
         ▼                   ▼                     ▼                   ▼
  1. Normalized       2. Syntactic Slot     3. Distractor       4. Semantic Scenario
     Template            Alignment             Morphology          Clustering
   (S_norm: 0-1)       (S_slot: 0-1)         (S_dist: 0-1)       (S_sem: 0-1)
```

---

### 3.1 Dimension 1: Normalized Template Similarity ($S_{\text{norm}}$)
Measures the lexical skeleton of the carrier sentence, ignoring the blank slot.
- **Normalization Pipeline:**
  1. Replace blank slots (`_______`, `[___]`, `...`) with token `[BLANK]`.
  2. Strip punctuation, convert to lowercase, normalize whitespace.
  3. Tokenize into word $n$-grams ($n = 2, 3$).
- **Metric:** Jaccard similarity over word bigrams combined with token-level Levenshtein distance:
  $$S_{\text{norm}}(Q_A, Q_B) = 0.50 \cdot J_{2\text{-gram}}(Q_A, Q_B) + 0.50 \cdot \left(1 - \frac{\text{Levenshtein}(T_A, T_B)}{\max(|T_A|, |T_B|)}\right)$$
- *Staging Case:* Between *"The IT technician is not at his desk because he _______ the server hardware in Room 3 right now"* and its duplicates, $S_{\text{norm}} = 1.00$ (100% duplicate).

---

### 3.2 Dimension 2: Syntactic Blank-Slot Alignment ($S_{\text{slot}}$)
Measures whether the blank slot occupies the identical syntactic environment.
- **Syntactic Window:** Extract the immediate context: 3 tokens to the left ($W_L$) and 3 tokens to the right ($W_R$).
- **Part-of-Speech Tagging:** Map tokens to coarse POS tags:
  $$\text{Frame} = [\text{POS}_{-3}, \text{POS}_{-2}, \text{POS}_{-1}] + [\text{BLANK}] + [\text{POS}_{+1}, \text{POS}_{+2}, \text{POS}_{+3}]$$
- *Example:* `[because, he]` + `[BLANK]` + `[the, server, hardware]` $\rightarrow$ `[SCONJ, PRON]` + `[BLANK]` + `[DET, NOUN, NOUN]`.
- **Metric:**
  $$S_{\text{slot}}(Q_A, Q_B) = \frac{|\text{Frame}_A \cap \text{Frame}_B|}{|\text{Frame}_A \cup \text{Frame}_B|}$$
- If two questions share the identical grammatical frame and subject pronoun, $S_{\text{slot}} \approx 1.00$.

---

### 3.3 Dimension 3: Distractor Morphological Overlap ($S_{\text{dist}}$)
Measures whether the distractors rely on the identical error-generation strategy.
- **Lemmatization:** Extract root lemmas for all four options in $Q_A$ and $Q_B$.
- **Affix Profile:** Vector of inflectional/derivational suffixes represented (`-ing`, `-ed`, `-s`, base form, `-tion`, `-ly`).
- **Metric:** Cosine similarity of the distractor affix distribution vectors:
  $$S_{\text{dist}}(Q_A, Q_B) = \cos(\mathbf{v}_{\text{affix}, A}, \mathbf{v}_{\text{affix}, B})$$
- If both questions offer: (A) base form, (B) present continuous, (C) simple past, (D) simple present, $S_{\text{dist}} = 1.00$.

---

### 3.4 Dimension 4: Concept & Micro-Rule Overlap ($S_{\text{rule}}$)
Measures whether both questions test the identical pedagogical nuance:
- **Concept Link:** `conceptId_A === conceptId_B` ($1.0$ or $0.0$).
- **Sub-Skill / Pedagogical Tag:** e.g., `temporary_action_vs_habitual`, `stative_verb_exception`, `passive_voice_agent`.
- **Metric:** $S_{\text{rule}} = 1.0$ if both items test the same sub-rule of the concept; $0.5$ if same concept but different sub-rule; $0.0$ if different concepts.

---

### 3.5 Dimension 5: Semantic Scenario & Entity Clustering ($S_{\text{sem}}$)
Measures whether the items take place within the identical workplace setting.
- **Entity Extraction:** Extract the business domain tuple:
  $$\text{Tuple} = \langle \text{Domain}, \text{AgentRole}, \text{Setting}, \text{Object} \rangle$$
  - *Item A:* $\langle \text{IT}, \text{"IT technician"}, \text{"Room 3"}, \text{"server hardware"} \rangle$
  - *Item B:* $\langle \text{Logistics}, \text{"hub manager"}, \text{"maritime port"}, \text{"customs cargo"} \rangle$
- **Semantic Distance:** Using domain taxonomy matching:
  - If domains match (both IT): $0.50$ base.
  - If agent and setting match: $S_{\text{sem}} \ge 0.90$.

---

## 4. The Composite Context Distance Metric ($D_{\text{ctx}}$)

The overall Contextual Distance between two questions $Q_A$ and $Q_B$ is defined as the complement of maximum structural and semantic overlap:

$$D_{\text{ctx}}(Q_A, Q_B) = 1.0 - \max\Big(S_{\text{norm}}(Q_A, Q_B), \; 0.60 \cdot S_{\text{slot}} + 0.40 \cdot S_{\text{sem}}\Big)$$

### 4.1 Threshold Classification

| Distance Range | Classification | Impact on Learner Practice & Evidence |
|:---:|---|---|
| **$0.00 \le D_{\text{ctx}} < 0.20$** | **Definite Template Duplicate** | Belongs to same context class. Distinct questions count as **1 context**. Triggers critical warning in admin queue. |
| **$0.20 \le D_{\text{ctx}} < 0.50$** | **Near-Duplicate / High Overlap** | High syntactic/lexical resemblance. Belongs to same context class. |
| **$0.50 \le D_{\text{ctx}} \le 1.00$** | **Independent Context** | Qualifies as an **Independent Transfer Context**. Satisfies $K_{\text{ctx}}$ requirement. |

---

## 5. Human Editorial Review Warning Signals (Not Automatic Drops)

### 5.1 The Governance Invariant
**Algorithmic similarity thresholds must serve as warning signals for human editorial reviewers, NEVER as automatic silent rejections or unreviewed auto-approvals.**

Automated systems can misclassify valid pedagogical variations (e.g., intentional contrasting sentence pairs like *"He is working today"* vs *"He works every day"* designed to test aspectual contrast). Therefore, human editorial discretion is required.

### 5.2 Editorial Review Queue UI Specification
When an administrator reviews questions in the queue (`/api/v1/admin/toeic/queue`), the interface surfaces explicit contextual warning badges:

```
┌────────────────────────────────────────────────────────────────────────┐
│ QUEUE ITEM: Q-7d9abd94 (Unit 1 - Present Continuous)                   │
├────────────────────────────────────────────────────────────────────────┤
│ Prompt: "The IT technician is not at his desk because he _______ the   │
│          server hardware in Room 3 right now."                         │
│                                                                        │
│ ⚠️ CONTEXTUAL DIVERSITY WARNING (Confidence: 98%):                     │
│ • Template Similarity: 100% duplicate with approved item Q-45e751fd    │
│ • Shared Scenario: IT Operations (IT technician / server hardware)     │
│ • Distance Score: D_ctx = 0.00 (Threshold requires >= 0.50)            │
│                                                                        │
│ System Recommendation: REVISE PROMPT SCENARIO BEFORE APPROVAL         │
│                                                                        │
│ [View Comparison with Q-45e751fd]  [Edit Prompt Scenario]  [Approve]   │
└────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Warning Signal Codes for Reviewers

| Warning Code | Severity | Description | Editorial Guidance |
|---|:---:|---|---|
| `WARN_IDENTICAL_TEMPLATE` | **CRITICAL** | $S_{\text{norm}} \ge 0.90$. Carrier sentence is identical to existing bank item. | Require author to rewrite prompt in a new workplace domain (e.g. Sales, Healthcare). |
| `WARN_HIGH_SYNTACTIC_OVERLAP` | **MEDIUM** | $S_{\text{slot}} \ge 0.85$. Blank slot occupies identical syntactic and POS frame. | Verify whether item tests distinct micro-rule. |
| `WARN_DOMAIN_CONCENTRATION` | **LOW** | Single domain (e.g. IT) represents $> 50\%$ of items in this unit. | Encourage generation of items in underrepresented domains. |
| `WARN_TEXTBOOK_PARAPHRASE` | **MEDIUM** | $D_{\text{ctx}} < 0.40$ against canonical textbook exercise. | Ensure item does not merely substitute one word from the textbook sentence. |

---

## 6. Storage & Database Schema Design (Phase 3.4C.3 Ready)

In Phase 3.4C.3, the Prisma schema will be extended to persist contextual metadata and prevent runtime recalculation latency:

```prisma
model ToeicQuestionBankItem {
  // Existing fields...
  id                          String    @id @default(uuid())
  prompt                      String
  
  // New Contextual Diversity Metadata (Phase 3.4C.3)
  normalizedTemplate          String?   @map("normalized_template")
  workplaceDomain             String?   @map("workplace_domain") // e.g. "it_operations", "marketing", "logistics"
  contextSignature            String?   @map("context_signature") // Hash of normalized template + POS frame
  contextEquivalenceGroupId   String?   @map("context_equivalence_group_id") // Auto-assigned cluster ID
  
  @@index([contextEquivalenceGroupId])
  @@index([workplaceDomain])
}
```

---

## 7. Summary & Architectural Invariants

1. **Context Distinction:** $K_{\text{ctx}}$ (independent contexts) is decoupled from $N$ (question IDs).
2. **Deterministic Distance:** $D_{\text{ctx}} \ge 0.50$ is the objective boundary for context independence.
3. **Editorial Authority:** Similarity algorithms guide human reviewers via explainable warnings, preserving editorial accountability.

