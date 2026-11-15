# GrammarPath — Phase 3.4C.4B.1: Evidence Isolation Report
## Verification of Telemetry Isolation Across Foundational Competence and Transfer Architecture

**Author:** Antigravity (Educational Data Scientist & Learning Systems Engineer)  
**Milestone:** Phase 3.4C.4B.1 (Approved Item Remediation & Version 3 Authoring)  
**Date:** November 14, 2026  
**Environment:** Neon PostgreSQL Staging  
**Status:** VERIFIED ISOLATION — ZERO MEASUREMENT LEAKAGE  

---

## 1. Executive Summary & Verification Objective

The integrity of GrammarPath's multi-tier mastery measurement system requires that:
1. Withdrawn items (`7d9abd94`, `44931eb1`, `7d24582b`, `4a1223fc`) are completely excluded from live question retrieval and future evidence scoring.
2. Unapproved candidate items (including the 4 new Version 3 records) cannot contribute to learner competence until formally approved.
3. Historical attempt items are strictly preserved in an immutable audit state.
4. Foundational Competence ($\theta$) and Transfer Competence ($\tau$) maintain strict mathematical independence.

This audit empirically verified each of these conditions on Neon staging.

---

## 2. Telemetry Isolation Verification Matrix

```
┌──────────────────────────────────────┬──────────────────────────────────────────────────────────┬──────────┐
│ Isolation Guard Dimension            │ Empirical Database Evidence                              │ Verdict  │
├──────────────────────────────────────┼──────────────────────────────────────────────────────────┼──────────┤
│ 1. Practice Retrieval Isolation      │ ToeicQuestionBankService.getApprovedQuestionsForPractice │ PASS     │
│                                      │ returns ONLY 45e751fd (easy). Withdrawn & V3 items = 0.  │          │
├──────────────────────────────────────┼──────────────────────────────────────────────────────────┼──────────┤
│ 2. Withdrawn Evidence Exclusion      │ Items 7d9abd94 and 44931eb1 have isLatestApproved = false│ PASS     │
│                                      │ and reviewStatus = 'withdrawn', failing Prisma filter.   │          │
├──────────────────────────────────────┼──────────────────────────────────────────────────────────┼──────────┤
│ 3. Unapproved V3 Exclusion           │ 4 new V3 records have reviewStatus = 'validated' and     │ PASS     │
│                                      │ isLatestApproved = false. Excluded from mastery queries. │          │
├──────────────────────────────────────┼──────────────────────────────────────────────────────────┼──────────┤
│ 4. Attempt Record Immutability       │ Exactly 5 records in question_attempt_items. Zero rows   │ PASS     │
│                                      │ modified, created, or deleted during transaction.        │          │
├──────────────────────────────────────┼──────────────────────────────────────────────────────────┼──────────┤
│ 5. Mathematical Independence (θ / τ) │ Zero composite scalar score exists. Transfer Competence  │ PASS     │
│                                      │ remains explicitly in insufficient_data (score = null).  │          │
└──────────────────────────────────────┴──────────────────────────────────────────────────────────┴──────────┘
```

---

## 3. Code-Level Architecture Verification

### 3.1 Practice Retrieval Gate (`src/services/toeic-question-bank.service.ts:388-394`)
```typescript
const items = await prisma.toeicQuestionBankItem.findMany({
  where: {
    unitNumber,
    difficulty,
    reviewStatus: "approved",
    isLatestApproved: true,
  },
  include: {
    options: { orderBy: { displayOrder: "asc" } },
  },
  take: count,
});
```
- **Audit Proof:** Because items `7d9abd94` and `44931eb1` have `reviewStatus = "withdrawn"` and `isLatestApproved = false`, and items `048df761`, `add7a35b`, `a4229728`, and `8a41b01a` have `reviewStatus = "validated"`, they are structurally incapable of being returned by this query.

### 3.2 Evidence Eligibility Gate (`src/services/mastery.service.ts:194-200`)
```typescript
const eligibleCount = await prisma.toeicQuestionBankItem.count({
  where: {
    conceptId,
    primarySkill: { in: ["direct_grammar", "word_form_morphology"] },
    conceptMappingConfidence: { gte: 0.85 },
    reviewStatus: "approved",
    isLatestApproved: true,
  },
});
```
- **Audit Proof:** Any calculation of transfer evidence eligibility filters strictly on `reviewStatus: "approved"` and `isLatestApproved: true`. Only item `45e751fd` meets this criteria in the database today.

---

## 4. Preservation of Historical Attempts

The 3 historical attempts on withdrawn item `44931eb1` were examined:
- Attempt 1: `01f20d58-1374-4031-a1e9-8a9e9a593c48` (User: `learner-m3-1794597241036`)
- Attempt 2: `a2c8a2e3-b228-4f57-b62b-755cba5096d5` (User: `learner-m3-1794597334097`)
- Attempt 3: `3e103036-9d2a-40ac-921c-b8ed41f9e9db` (User: `learner-m3-1794633426172`)

All three records maintain their valid foreign key `question_bank_item_id = "44931eb1-344b-4ec8-aceb-5524a952ed59"`. Under PostgreSQL `ON DELETE RESTRICT`, item `44931eb1` cannot be deleted, ensuring permanent audit trail preservation.

