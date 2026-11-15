# GrammarPath — Phase 3.4C Stage 1J: Database & API Impact Analysis

## 1. Executive Summary & Governance Mandate

A hallmark of enterprise software stability is the **principle of additive, non-destructive evolution**. Changes to data contracts and database schemas must enhance pedagogical precision without breaking existing services, corrupting historical learning records, or requiring destructive database resets.

Per Stage 1 strict safety rules:
- **Zero schema modifications, migrations, or database writes are executed in this stage.**
- Historical attempt records (`QuestionAttemptItem`), user profiles (`User`), and question bank assets (`ToeicQuestionBankItem`) must be 100% preserved.
- Phase 3.4B rollback data boundaries must remain clean and intact.

---

## 2. Reusable Existing Architecture & Data Models

GrammarPath's existing database architecture already contains strong structural abstractions that should be preserved and reused:

| Existing Entity | Current Role | Phase 3.4C Architectural Reuse |
| :--- | :--- | :--- |
| `UserConceptMastery` | Aggregates concept-level learning metrics | Extended to store dual-latent dimensions ($\theta_{\text{foundational}}$, $\tau_{\text{transfer}}$) and calibrated 7-tier status. |
| `QuestionAttemptItem` | Fine-grained attempt event log with tri-state status | Primary evidence ledger; augmented with transfer tier classifications. |
| `ToeicQuestionBankItem` | Versioned TOEIC question bank repository | Retained as the source of approved Tier 6 transfer questions. |
| `ToeicQuestionOption` | 4-option multiple-choice structure | Retained; enforced distractor rationales for Mode 5 misconception diagnosis. |
| `ConceptReviewSchedule` | Spaced repetition intervals and stability | Consumed by the Adaptive Coordinator to schedule Mode 3 retention reviews. |
| `DailyLearningPlan` | Structured daily learning tasks | Upgraded to enforce the Single-Reservation Invariant with Adaptive Quiz. |
| `GrammarConcept` | 161 grammar nodes (16 modules, 145 units) | Vertices of the new Prerequisite DAG. |

---

## 3. Proposed Schema Extensions (Phase 3.4C Target Design)

### 3.1 Extended `UserConceptMastery`

```prisma
// Extension proposal for Phase 3.4C.1
model UserConceptMastery {
  // Existing fields preserved...
  id                     String           @id @default(uuid()) @db.Uuid
  userId                 String           @map("user_id") @db.Uuid
  conceptId              String           @map("concept_id") @db.Uuid
  masteryScore           Float?           @map("mastery_score")           // Represents theta_foundational
  masteryStatus          MasteryStatus    @default(not_started) @map("mastery_status")
  retentionScore         Float            @default(1.0) @map("retention_score")
  evidenceCount          Int              @default(0) @map("evidence_count")
  distinctQuestionCount  Int              @default(0) @map("distinct_question_count")
  
  // ─── Phase 3.4C Additive Fields ──────────────────────────────────────────────
  transferScore          Float?           @map("transfer_score")          // Represents tau_transfer
  transferStatus         TransferStatus   @default(not_started) @map("transfer_status")
  distinctTransferCount  Int              @default(0) @map("distinct_transfer_count")
  contrastiveScore       Float?           @map("contrastive_score")       // Represents CDI
  crossContextConsistency Float?          @map("cross_context_consistency") // Represents CCC
  compositeMastery       Float?           @map("composite_mastery")       // 0.60*theta + 0.40*tau

  // Relations & Indexes preserved...
  @@unique([userId, conceptId])
  @@index([userId, masteryStatus])
  @@index([userId, transferStatus])
}

enum MasteryStatus {
  not_started
  learning
  developing
  proficient
  strong_transfer
  needs_review
  insufficient_evidence
}

enum TransferStatus {
  not_started
  insufficient_data
  struggling
  competent
  advanced
}
```

### 3.2 New Table: `ConceptPrerequisite` (Justified for Prerequisite DAG)

A dedicated join table is mathematically required to support the Directed Acyclic Graph (many-to-many directed dependencies between concepts):

```prisma
// Proposed new table for Phase 3.4C.3
model ConceptPrerequisite {
  id                    String              @id @default(uuid()) @db.Uuid
  conceptId             String              @map("concept_id") @db.Uuid
  prerequisiteConceptId String              @map("prerequisite_concept_id") @db.Uuid
  dependencyType        PrerequisiteType    @default(mandatory) @map("dependency_type")
  confidence            Float               @default(1.0)
  linguisticRationale   String              @map("linguistic_rationale") @db.Text
  createdAt             DateTime            @default(now()) @map("created_at") @db.Timestamptz(6)

  concept               GrammarConcept      @relation("ConceptSuccessors", fields: [conceptId], references: [id], onDelete: Cascade)
  prerequisiteConcept   GrammarConcept      @relation("ConceptPredecessors", fields: [prerequisiteConceptId], references: [id], onDelete: Cascade)

  @@unique([conceptId, prerequisiteConceptId])
  @@index([conceptId])
  @@index([prerequisiteConceptId])
  @@map("concept_prerequisites")
}

enum PrerequisiteType {
  mandatory
  recommended
}
```

### 3.3 Additive Fields on `ToeicQuestionBankItem`

To prevent near-duplicate question saturation (Audit Section 3.2) and support multi-concept attribution:
1. `contextualClusterHash String? @map("contextual_cluster_hash") @db.VarChar(64)`: Blank-masked normalized token hash.
2. `secondaryConceptId String? @map("secondary_concept_id") @db.Uuid`: Secondary grammar target.
3. `secondaryConceptConfidence Float? @map("secondary_concept_confidence")`: Weight discount for secondary concept ($0.30$).

---

## 4. API Endpoints & Contract Evolutions

### 4.1 Progress & Dashboard APIs

#### `GET /api/progress/dashboard`
- **Current Behavior:** Returns flat list of units with completion percentages and binary `mastered` count.
- **Phase 3.4C Evolution:**
  ```json
  {
    "overallMetrics": {
      "totalConcepts": 161,
      "proficientCount": 18,
      "strongTransferCount": 6,
      "developingCount": 4,
      "needsReviewCount": 2,
      "notStartedCount": 131
    },
    "dimensionAverages": {
      "foundationalCompetence": 0.88,
      "transferQuotient": 0.72,
      "retentionHealth": 0.81
    },
    "activeRecommendations": [
      {
        "mode": "MODE_3_REVIEW_FORGETTING",
        "conceptId": "201b07e6-...",
        "conceptName": "Present Continuous",
        "urgency": "HIGH",
        "reasonVi": "Độ bền trí nhớ ước tính giảm còn 58%. Cần làm 3 câu ôn tập nhanh."
      }
    ]
  }
  ```

#### `GET /api/progress/concept/:conceptId`
- **New Endpoint:** Delivers detailed diagnostic card data for a single concept, including evidence counts broken down by tier, retention decay curve, and bilingual diagnosis.

### 4.2 Adaptive Quiz Generator API

#### `POST /api/adaptive/quiz/generate`
- **Request Contract:**
  ```json
  {
    "questionCount": 5,
    "targetUnitNumbers": [1, 2],
    "requestedMode": "MODE_4_PRACTICE_TRANSFER"
  }
  ```
- **Engine Processing:**
  1. Validates readiness gate ($\theta_{\text{foundational}} \ge 0.80$, $N \ge 4$). If unready, automatically downgrades to `MODE_2_REINFORCE_WEAKNESS` with explanatory warning.
  2. Queries active task reservations in `DailyLearningPlan` to prevent assigning questions currently queued for the day's study plan.
  3. Returns questions tagged with `transferTier` and non-spoiler metadata.

---

## 5. Frontend Component Evolutions

1. **`ProgressDashboardPage.tsx`:**
   - Replace the simplistic circular progress gauge with a **Tri-Dimensional Competence Radar** (Foundational, Transfer, Retention).
   - Display the 7-tier status badges (`NOT_STARTED`, `DEVELOPING`, `PROFICIENT`, `STRONG_TRANSFER`, etc.) with tooltips explaining the entry criteria.
2. **`AdaptiveQuizPage.tsx`:**
   - Display activity mode indicator at top of session: e.g., *"Luyện tập Vận dụng TOEIC Part 5 (Mode 4)"*.
   - Present bilingual diagnostic cards at completion rather than raw score alone.
3. **`ReviewCenterPage.tsx`:**
   - Prioritize items strictly flagged by $R(t) \le 0.60$ or unresolved contrastive errors.
   - Show retention recovery stats upon session submission (e.g., *"Độ bền trí nhớ đã phục hồi lên 95%"*).

---

## 6. Migration Safety & Historical Preservation Plan

### 6.1 Strict Preservation of Historical Learner Attempts

The Neon staging database currently contains:
- 3 historical registered learner profiles.
- 2 textbook exercise attempt sessions containing validated tri-state attempts.
- 35 TOEIC question bank items (3 approved, 29 validated, 3 archived).
- 144 enqueued TOEIC generation jobs.

> [!IMPORTANT]
> **Zero Historical Deletions**:
> 1. No historical attempts will be deleted or mutated.
> 2. The database enum `MasteryStatus` migration must use safe PostgreSQL ALTER statements (`ALTER TYPE ... ADD VALUE IF NOT EXISTS`) without table locking or row rewrites.
> 3. Historical records with legacy status `'mastered'` will be safely mapped to `'proficient'` via idempotent data migration scripts, preserving learner accomplishments.
> 4. Attempts lacking an explicit `transferTier` will default to `tier_1_canonical` (for textbook questions) or `tier_6_toeic` (for TOEIC bank questions) through non-null column defaults.

### 6.2 Phase 3.4B Rollback Boundary Integrity

- The Phase 3.4B rollback boundary (`ToeicQuestionBankItem`, `ToeicQuestionOption`, `ToeicGenerationJob`, and `UnitToeicMetadata`) remains completely undisturbed.
- Phase 3.4C operates strictly as a consumer of approved TOEIC items (`reviewStatus = 'approved'`), isolating question generation pipelines from adaptive mastery algorithms.

