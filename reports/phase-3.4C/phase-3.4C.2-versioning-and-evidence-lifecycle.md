# GrammarPath — Phase 3.4C.2: Versioning & Evidence Lifecycle
## Lifecycle State Machine, Historical Attempt Immutability, and Dynamic Evidence Projections

**Author:** Antigravity (Advanced Agentic Coding)  
**Milestone:** Phase 3.4C.2 (Design-Only Specification)  
**Date:** November 14, 2026  
**Status:** DESIGN-ONLY (Lifecycle & Data Integrity Architecture)  

---

## 1. Executive Summary & Core Data Invariants

In a high-stakes educational assessment system, content evolves: typographical errors are corrected, distractors are refined, items are reclassified, and flawed questions are withdrawn. 

A critical architectural challenge is ensuring that:
1. **Historical Attempt Immutability:** Learner attempt history in `QuestionAttemptItem` is **strictly append-only and immutable**. Never delete or mutate historical records.
2. **Dynamic Evidence Projections:** Current live measures of Transfer Competence ($\tau$), Foundational Competence ($\theta$), and Retention $R(t)$ must reflect only **active, valid, and uncompromised evidence**.
3. **Traceability:** Every transition from draft to approval, versioning, reclassification, or withdrawal must maintain a tamper-evident audit log.

This specification details the lifecycle state machine and defines exact computational behaviors across all lifecycle events.

---

## 2. Editorial Lifecycle State Machine

Each `ToeicQuestionBankItem` progresses through an explicit state machine:

```
                  ┌──────────────┐
                  │    DRAFT     │
                  └──────┬───────┘
                         │ Quality Engine passes (score >= 8.5)
                         ▼
                  ┌──────────────┐
                  │  VALIDATED   │ ◄─────────────────────────┐
                  └──────┬───────┘                           │
                         │ Authorized Admin Approval         │
                         ▼                                   │
                  ┌──────────────┐                           │ New Version
                  │   APPROVED   │ ──────────────────────────┤ authored
                  │ (isLatest=T) │                           │ (Version N+1)
                  └──────┬───────┘                           │
                         │                                   │
         ┌───────────────┼───────────────┐                   │
         │ Superseded by │ Defect        │ Reclassified to   │
         │ Version N+1   │ detected      │ another concept   │
         ▼               ▼               ▼                   │
  ┌──────────────┐┌──────────────┐┌──────────────┐           │
  │   ARCHIVED   ││  WITHDRAWN   ││ RECLASSIFIED │ ──────────┘
  │ (isLatest=F) ││ (isLatest=F) ││ (isLatest=F) │
  └──────────────┘└──────────────┘└──────────────┘
```

### State Definitions:
- **`draft`:** Initial generated or authored state. Incomplete or failed automated quality checks. Ineligible for practice.
- **`validated`:** Passed automated quality thresholds (`overallScore >= 8.5`, zero blocking defects). Awaiting human editorial review. Ineligible for practice.
- **`approved`:** Formally reviewed and signed off by an authorized human administrator (`isLatestApproved = true`). Actively served in learner practice and eligible for mastery evidence.
- **`archived`:** Superseded by an approved newer version (`version N+1`). Ceases to be served in new practice sessions. Ineligible for active live mastery calculation.
- **`withdrawn`:** Quarantined due to grammatical, pedagogical, or psychometric defects. Permanently disabled from practice and live mastery evidence.
- **`reclassified`:** Associated concept mapping was updated. Retains historical audit records while shifting evidence destination.

---

## 3. Behavior of Transfer Competence (τ) Across Lifecycle Events

### Event 1: An Approved Question is Withdrawn
*Example Case:* Staging item `7d24582b` (ungrammatical Option B *"am trying"* with subject *"he"*) or item `4a1223fc` (*"he are updating"*).

#### Protocol & Invariants:
1. **Database Mutation:**
   - Atomic update on `ToeicQuestionBankItem`:
     `reviewStatus = "withdrawn"`, `isLatestApproved = false`, `withdrawnReason = "<audit rationale>"`.
   - Historical reviewer ID (`reviewedBy`) and timestamp (`reviewedAt`) are preserved.
2. **Historical Attempts:**
   - All records in `QuestionAttemptItem` with `questionBankItemId = targetId` remain **completely untouched**.
   - No rows are deleted. The learner's submitted answer (`studentAnswer`), timestamps, and session linkage remain intact.
3. **Impact on Live Transfer Competence ($\tau$):**
   - The query filter in `mastery.service.ts` requires:
     `{ reviewStatus: "approved", isLatestApproved: true }`.
   - The withdrawn item's attempts **immediately drop out of the live evidence set**.
   - If the learner previously had 3 distinct contexts and the withdrawn item was 1 of them, the learner's active context count drops from $K_{\text{ctx}} = 3$ to $K_{\text{ctx}} = 2$.
   - **State Transition:** The concept's transfer status immediately reverts from `proficient` or `mastered` back to **`insufficient_data`** (`reason: "withdrawn_evidence"`).
   - This prevents defective content from certifying unearned mastery.

---

### Event 2: An Approved Question is Superseded by Version N+1
*Example Case:* Item `Q1` (Version 1) has its prompt wording refined for business realism, creating Version 2.

#### Protocol & Invariants:
1. **Version Creation:**
   - Version 2 is authored with identical `rootQuestionId` and `version = 2`.
   - Version 2 begins in `reviewStatus = "draft"` or `"validated"` with `isLatestApproved = false`.
   - Version 1 remains `reviewStatus = "approved"`, `isLatestApproved = true` while Version 2 is in review.
2. **Version Promotion:**
   - Upon administrative approval of Version 2:
     - Version 1 atomically transitions to `reviewStatus = "archived"`, `isLatestApproved = false`.
     - Version 2 atomically transitions to `reviewStatus = "approved"`, `isLatestApproved = true`.
3. **Impact on Historical & Live Attempts:**
   - Historical attempts on Version 1 remain in the database with `questionBankItemId = v1.id`.
   - **Live Evidence Rule:** Because Version 1 now has `isLatestApproved = false`, attempts on Version 1 cease to contribute to live $\tau$ calculation.
   - Only attempts on the active Version 2 contribute to live evidence.
   - *Pedagogical Rationale:* When an item is improved or corrected, learner competence must be demonstrated against the verified current standard.

---

### Event 3: Question Reclassified to Another Concept
*Example Case:* Item `Q_A` was initially mapped to Unit 1 (Present Continuous), but editorial review determines it primarily tests Unit 4 (Present Continuous with Stative Verbs).

#### Protocol & Invariants:
1. **Reclassification Workflow:**
   - Instead of in-place mutation of the approved record, a new Version $N+1$ is generated with the corrected `conceptId`.
   - Old version is archived.
2. **Impact on Evidence Projection:**
   - Old concept (Unit 1): Attempts on the old version are removed from Unit 1's live evidence pool. Unit 1 is recalculated; if context count drops below 3, Unit 1 reverts to `insufficient_data`.
   - New concept (Unit 4): Attempts on the old version do **NOT** automatically transfer to Unit 4 unless explicitly re-evaluated by an admin migration script.
   - Learner is queued to practice Unit 4 in their next adaptive session.

---

### Event 4: Question Found to Contain Incorrect Answer Key
*Example Case:* An item where Option A was keyed correct, but external review confirms Option C was the grammatically correct answer.

#### Protocol & Invariants:
1. **Quarantine:**
   - Emergency withdrawal is executed immediately (`reviewStatus = "withdrawn"`, `isLatestApproved = false`).
2. **Rescoring Dilemma & Architectural Decision:**
   - **Do NOT silently flip `isCorrect` on historical attempt rows.**
   - Flipping `isCorrect` without full session context corrupts auditability and confuses learners who reviewed their historical feedback.
   - Instead, the item is withdrawn so its attempts no longer contribute to current live mastery $\tau$.
   - A corrected Version $N+1$ is authored, approved, and served in future practice sessions.

---

## 4. Separation of Immutable History vs Live Evidence Projections

To maintain architectural integrity, the application separates the **Write Model (History)** from the **Read Model (Evidence Projections)**:

```
  ┌─────────────────────────────────────────────────────────────┐
  │                 WRITE MODEL (APPEND-ONLY)                   │
  │                                                             │
  │  QuestionAttemptItem (Permanent Learner History)            │
  │  ├─ id: uuid                                                │
  │  ├─ userId: uuid                                            │
  │  ├─ questionBankItemId: uuid                                │
  │  ├─ studentAnswer: "B"                                      │
  │  ├─ isCorrect: true (as evaluated at submission time)       │
  │  ├─ attemptStatus: "correct"                                │
  │  └─ createdAt: 2026-11-13T17:34:56Z                         │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 │ Dynamic Filtering Query:
                                 │ WHERE questionBankItem.reviewStatus = 'approved'
                                 │   AND questionBankItem.isLatestApproved = true
                                 │   AND questionBankItem.conceptMappingConfidence >= 0.85
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                 READ MODEL (LIVE PROJECTION)                │
  │                                                             │
  │  UserConceptMastery (Live Transfer & Foundational State)    │
  │  ├─ foundationalScore (θ): 92.5                             │
  │  ├─ transferStatus (τ): "insufficient_data"                │
  │  ├─ distinctContextCount: 2 (was 3 prior to withdrawal)     │
  │  ├─ retentionScore: 0.94                                    │
  │  └─ lastCalculatedAt: 2026-11-14T03:00:00Z                 │
  └─────────────────────────────────────────────────────────────┘
```

---

## 5. Audit Logging & State Transition Traceability

In Phase 3.4C.3, every state transition will be immutably recorded in a dedicated audit table:

```prisma
model ToeicItemAuditLog {
  id              String    @id @default(uuid())
  itemId          String    @map("item_id")
  rootQuestionId  String    @map("root_question_id")
  version         Int
  previousStatus  String    @map("previous_status")
  newStatus       String    @map("new_status")
  performedBy     String    @map("performed_by") // Admin User ID
  action          String    // "approve" | "withdraw" | "archive" | "reclassify"
  reason          String?
  timestamp       DateTime  @default(now())

  @@index([itemId])
  @@index([rootQuestionId])
  @@map("toeic_item_audit_logs")
}
```

---

## 6. Summary of Lifecycle Invariants

1. **Attempts are Forever:** No learner attempt row is ever deleted or mutated.
2. **Mastery is Dynamic:** Live competence calculations evaluate exclusively against active, approved, uncompromised items.
3. **Graceful Degradation:** When an item is withdrawn, affected concepts gracefully revert to `insufficient_data` without crashing or reporting inaccurate proficiency.

