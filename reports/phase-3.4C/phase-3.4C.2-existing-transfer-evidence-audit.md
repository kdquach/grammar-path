# GrammarPath — Phase 3.4C.2: Existing Transfer Evidence Audit
## Comprehensive Empirical Investigation of Question Bank & Contextual Diversity

**Author:** Antigravity (Advanced Agentic Coding)  
**Milestone:** Phase 3.4C.2 (Design-Only Audit)  
**Date:** November 14, 2026  
**Target Environment:** Neon PostgreSQL Staging (`ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging`)  
**Mode:** READ-ONLY / DESIGN-ONLY AUDIT  

---

## 1. Executive Summary & Audit Charter

This audit provides a factual, empirical examination of the TOEIC Question Bank items and learner attempt data currently residing in the GrammarPath staging database. The objective is to evaluate whether current question inventory, duplicate detection mechanisms, and attempt write paths provide valid, psychometrically sound evidence for measuring Transfer Competence ($\tau$).

### Strict Safety & Environmental Constraints Enforced:
- **Zero Database Writes:** Executed strictly in read-only mode via the Staging Isolation Guard (`backend/scripts/run-with-staging-env.mjs`).
- **Zero Schema / Code Mutations:** No application source code, Prisma schema, or migration files were modified.
- **Zero Curriculum JSON Mutations:** `grammarpath-data` remains 100% clean on `main`.
- **Preservation of Phase 3.4C.1:** Defective item `7d24582b-ca20-4c7a-a828-530f4852e80a` remains safely quarantined in `reviewStatus = "withdrawn"`.

---

## 2. Empirical Database Census (Neon Staging Verified Facts)

A complete census of the `toeic_question_bank_items` table was executed on Neon staging on November 14, 2026.

### 2.1 Inventory Breakdown by Review Status and Latest Approval Flag

```
┌─────────────────┬────────────────────┬───────────────┐
│ reviewStatus    │ isLatestApproved   │ Item Count    │
├─────────────────┼────────────────────┼───────────────┤
│ validated       │ false              │ 27            │
│ archived        │ false              │ 5             │
│ approved        │ true               │ 4             │
│ withdrawn       │ false              │ 1             │
├─────────────────┴────────────────────┼───────────────┤
│ TOTAL TOEIC QUESTION BANK ITEMS      │ 37            │
└──────────────────────────────────────┴───────────────┘
```

### 2.2 Inventory Distribution by Unit Number

```
┌──────────────┬───────────┬──────────┬──────────┬───────────┬─────────┐
│ Unit Number  │ Validated │ Archived │ Approved │ Withdrawn │ Total   │
├──────────────┼───────────┼──────────┼──────────┼───────────┼─────────┤
│ Unit 1       │ 9         │ 5        │ 4        │ 1         │ 19      │
│ Unit 2       │ 8         │ 0        │ 0        │ 0         │ 8       │
│ Unit 3       │ 4         │ 0        │ 0        │ 0         │ 4       │
│ Unit 4       │ 4         │ 0        │ 0        │ 0         │ 4       │
│ Unit 5       │ 2         │ 0        │ 0        │ 0         │ 2       │
├──────────────┼───────────┼──────────┼──────────┼───────────┼─────────┤
│ TOTAL        │ 27        │ 5        │ 4        │ 1         │ 37      │
└──────────────┴───────────┴──────────┴──────────┴───────────┴─────────┘
```

All 37 items are categorized with `primarySkill = "direct_grammar"`, `part = "PART_5"`, and `format = "PART5_INCOMPLETE_SENTENCE"`.

---

## 3. Deep-Dive Audit: The Approved Items Anomaly

Four items in the staging database currently hold `reviewStatus = "approved"` and `isLatestApproved = true`. All four items belong to Unit 1 (Concept `201b07e6-1731-4105-ac7e-e1d763f54049`: Present Continuous).

### 3.1 Item-by-Item Detailed Inspection

| Item ID | Root Question ID | Ver. | Prompt Text | Options (Key: Text [Status]) | Reviewed At |
|---|---|:---:|---|---|---|
| `4a1223fc-84c4-4f57-8efa-dcc6d03d1fb2` | `6a54a874-c48b-4651-a3f5-b686dd51fb6b` | 2 | *"The IT technician is not at his desk because he _______ the server hardware in Room 3 right now."* | **A: are / updating (CORRECT)**<br>B: do / update<br>C: did / update<br>D: have / updated | 2026-11-13T19:15:44Z |
| `7d9abd94-df89-4762-8a86-a3217f0217b0` | `0fda8409-0926-49c0-8b86-1564d83497ac` | 2 | *"The IT technician is not at his desk because he _______ the server hardware in Room 3 right now."* | **A: is entering (CORRECT)**<br>B: enters<br>C: entered<br>D: enter | 2026-11-13T17:42:06Z |
| `44931eb1-344b-4ec8-aceb-5524a952ed59` | `634add4d-5982-4de8-99de-6c4561c6ee44` | 2 | *"The IT technician is not at his desk because he _______ the server hardware in Room 3 right now."* | A: explains<br>**B: is explaining (CORRECT)**<br>C: explained<br>D: explain | 2026-11-13T19:13:16Z |
| `45e751fd-4915-4bac-a386-c7bae5295911` | `b19ebb8c-9912-4cd7-8705-155d847282b0` | 2 | *"The IT technician is not at his desk because he _______ the server hardware in Room 3 right now."* | A: repairs<br>**B: is repairing (CORRECT)**<br>C: repaired<br>D: repair | 2026-11-13T17:49:32Z |

---

## 4. Critical Findings & Vulnerabilities

### Finding 1: Severe Carrier Template Duplication (Identical Context)
**Empirical Fact:** All 4 approved items—as well as the withdrawn item `7d24582b`—share the exact same carrier prompt sentence:
> *"The IT technician is not at his desk because he _______ the server hardware in Room 3 right now."*

The only elements that vary across these questions are the lexical verb choices in the options (`update`, `enter`, `explain`, `repair`).

#### Psychometric Implication:
If a learner is presented with these questions across multiple practice sessions:
1. After solving the first question, the learner has already decoded the sentence context (`"IT technician"`, `"server hardware"`, `"Room 3"`, `"right now"`).
2. For the subsequent questions, cognitive load drops to pure pattern-matching for `-ing` without reading comprehension.
3. While the system registers `distinctQuestionCount = 4`, the learner has been tested on **only 1 unique context**.
4. Treating 4 identical-prompt items as 4 independent data points for Transfer Competence ($\tau$) would introduce severe construct inflation and false-positive mastery claims.

### Finding 2: Discovery of Defective Approved Item `4a1223fc`
**Empirical Fact:** In item `4a1223fc-84c4-4f57-8efa-dcc6d03d1fb2`, the prompt subject is third-person singular:
> *"The IT technician is not at his desk because **he** _______ the server hardware..."*

The designated correct answer is **Option A: "are / updating"**.
- This produces the sentence: *"The IT technician is not at his desk because he are updating the server hardware..."*
- This is an **objective subject-verb agreement defect**.
- Root Cause: During the execution of integration test `backend/tests/phase3-4b-m2.test.ts`, the test created a Version 2 with defective options and immediately invoked the admin `/approve` endpoint. Because `/approve` only checked that `isCorrect` count was 1, the defective question became live and active in staging!

### Finding 3: Root Cause of Template Duplication in Staging
Inspection of `backend/tests/phase3-4b-m2.test.ts` lines 218–221 reveals:
```typescript
const res = await request(app)
  .post(`/api/v1/admin/toeic/items/${testItemId}/version`)
  .set("Authorization", `Bearer ${adminToken}`)
  .set("x-admin-key", "staging-admin-secret-key-2026")
  .send({
    prompt: "The IT technician is not at his desk because he _______ the server hardware in Room 3 right now.",
    explanation: "Cập nhật giải thích chi tiết hơn cho người học.",
  });
```
Every time the test suite ran against staging without a transaction rollback, it converted a distinct validated item into a Version 2 with this hardcoded prompt text and approved it.

---

## 5. Audit of Existing Duplicate Detection & Quality Logic

### 5.1 Content Hash Mechanism
In [`backend/src/services/toeic-quality-engine.service.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-quality-engine.service.ts#L265):
```typescript
const contentHash = computeToeicItemContentHash(candidate.prompt, normalizedOptions);
```
- The content hash hashes **both the prompt AND the normalized options**.
- Because items `4a1223fc`, `7d9abd94`, `44931eb1`, and `45e751fd` have different options (`updating`, `entering`, `explaining`, `repairing`), their content hashes are completely different.
- Consequently, database unique constraint checks on `content_hash` did not trigger.

### 5.2 Soft Duplicate Detection Logic
In [`toeic-quality-engine.service.ts#L283-L305`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-quality-engine.service.ts#L283-L305):
- Levenshtein string similarity (`calculateStringSimilarity`) is computed against existing items in the same unit.
- If similarity $> 0.85$, it pushes defect `BLK_DUPLICATE`.
- **Why did it fail to prevent the duplicate approved items?**
  1. `createNewVersion` in `toeic-question-bank.service.ts` invokes `validateToeicQuestionQuality`, but if defects are found, it simply sets `reviewStatus = "draft"` instead of aborting the operation.
  2. The admin `/approve` endpoint (`approveQuestion` in `toeic-question-bank.service.ts#L140-L190`) **does not re-evaluate duplicate warnings or quality gates**. It permits an administrator (or test runner) to approve any non-withdrawn item with 1 correct option.
  3. No cross-item context grouping exists in the data model.

---

## 6. Textbook vs TOEIC Transfer Context Comparison

To measure genuine transfer, TOEIC items must present situational contexts that differ meaningfully from the canonical textbook exercises in `grammarpath-data`.

### 6.1 Empirical Comparison (Unit 1: Present Continuous)

| Source | Exercise ID | Canonical Content / Prompt | Contextual Domain | Linguistic Register |
|---|---|---|---|---|
| **Textbook** | `1.1-q1` | *"Please don't make so much noise. [I'm trying] to work."* | Domestic / Daily life | Informal, first-person conversational |
| **Textbook** | `1.1-q4` | *"The cost of living [is rising]. Every year things are more expensive."* | General economics | General declarative statement |
| **Textbook** | `1.2-q7` | *"Paul and Sally have had an argument. [They aren't speaking] to each other."* | Interpersonal relationship | Social, third-person narrative |
| **TOEIC Bank** | `0f51d836` | *"Please speak quietly in the lobby because the marketing director _______ an important client on the phone."* | Corporate Workplace (Office Lobby) | Formal business operational |
| **TOEIC Bank** | `2997562b` | *"Noticeably, the automotive manufacturing plant _______ more and more automated robotic units to accelerate assembly."* | Industrial / Manufacturing | Technical corporate news |
| **TOEIC Bank** | `322c0e5c` | *"Our overseas logistics hubs _______ unusually severe customs delays these weeks due to the new maritime trade treaty."* | International Supply Chain | Commercial maritime logistics |

### 6.2 Key Observation on Contextual Validity
- The validated items (`0f51d836`, `2997562b`, `322c0e5c`) exhibit genuine **situational transfer**: they embed the present continuous aspect within complex business environments (logistics, manufacturing, executive communications) with domain-specific vocabulary and realistic distractors.
- However, when test scripts mutated items into the IT technician template, that diversity was completely lost among the approved items.

---

## 7. Learner Attempt Census & Historical Contamination

Inspection of `question_attempt_items` confirms:
- **Total Learner Attempts in Staging:** `4` records.
- **Attempts on Textbook Questions:** `2` records (both on `0c657406-9046-4704-8609-55a9ed670fd5`).
- **Attempts on Question Bank Items:** `2` records (ephemeral test attempts on `44931eb1` and `7d9abd94` during integration testing).
- **Learner Mastery Impact:** 0 real learners have ever taken these items. No production learner or historical staging baseline profile has had their mastery score corrupted.

---

## 8. Summary of Facts, Observations, and Design Directives

| Category | Finding | Evidence / Reference | Impact on Phase 3.4C.2 Design |
|---|---|---|---|
| **Verified Database Fact** | 4 approved items in Unit 1 share identical prompt text. | Neon staging query on `toeic_question_bank_items`. | Proves that question count $\ne$ transfer context count. Minimum 3 independent contexts required. |
| **Verified Database Fact** | Item `4a1223fc` has defective Option A (`"are / updating"` for subject `"he"`). | Option record in staging database. | Requires immediate quarantine recommendation in design decision. |
| **Code Observation** | Admin `/approve` endpoint does not enforce duplicate or quality thresholds. | [`toeic-question-bank.service.ts#L140-L190`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-question-bank.service.ts#L140-L190) | Need explicit editorial warning signals for high similarity before approval. |
| **Code Observation** | `content_hash` hashes prompt + options, missing prompt template duplicates. | [`toeic-quality-engine.service.ts#L265`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/toeic-quality-engine.service.ts#L265) | Need template-level similarity metric independent of options. |
| **Design Proposal** | Distinguish $N_{\text{items}}$ from $K_{\text{contexts}}$. | Phase 3.4C.2 Assessment Blueprint. | Transfer Competence ($\tau$) requires evidence across $\ge 3$ distinct workplace contexts. |

---

## 9. Audit Conclusion

The existing question bank in staging contains valid validated items with rich business contexts, but the currently approved inventory is compromised by template duplication and a defective answer key. Phase 3.4C.2 must establish an architecture that guarantees contextual diversity, isolates construct-relevant grammar evidence, and prevents duplicate templates from falsely satisfying mastery requirements.

