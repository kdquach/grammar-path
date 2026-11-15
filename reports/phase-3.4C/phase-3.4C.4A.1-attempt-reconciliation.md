# GrammarPath — Phase 3.4C.4A.1: Attempt Reconciliation Report
## Forensic Provenance and Telemetry Audit of Staging Learner Attempts

**Author:** Antigravity (Educational Data Scientist & Database Auditor)  
**Milestone:** Phase 3.4C.4A.1 (Audit Reconciliation & C.4B Authorization Readiness)  
**Date:** November 14, 2026  
**Environment:** Neon PostgreSQL Staging  
**Target Tables:** `question_attempts`, `question_attempt_items`, `users`  
**Status:** READ-ONLY AUDIT — ZERO RECORDS MODIFIED OR PURGED  

---

## 1. Executive Summary & Reconciliation Verdict

This report presents an exhaustive forensic audit of all attempt records in the staging database. 

### Core Forensic Findings:
1. **Total Attempt Item Count Reconciled (5 Records):**
   - The database contains exactly **5 records** in `question_attempt_items`.
   - **2 records** belong to canonical textbook exercise submissions on question `0c657406-9046-4704-8609-55a9ed670fd5`.
   - **3 records** belong to adaptive TOEIC practice submissions on question bank item `44931eb1-344b-4ec8-aceb-5524a952ed59`.
   - The 3rd bank attempt was created during the Phase 3.4C.3 automated regression verification run (`tests/phase3-4b-m3.test.ts`).
2. **Zero Attempts on Withdrawn Items:**
   - Both withdrawn items (`7d24582b` and `4a1223fc`) have **0 attempts**.
   - No learner historical data or mastery state was ever contaminated by defective items.
3. **100% Synthetic Test User Provenance:**
   - All 5 user accounts associated with attempts are synthetic test fixtures (`@grammarpath.local`).
   - Zero real external student accounts exist on staging.
4. **Mastery Dimension Telemetry Isolation:**
   - In accordance with Phase 3.4C.1, TOEIC bank attempts do not alter foundational competence ($\theta$).
   - Transfer competence ($\tau$) remains in an explicit `insufficient_data` state with `score = null`.
   - No composite score exists.

---

## 2. Granular Attempt Item Telemetry Table

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ QUESTION ATTEMPT ITEMS AUDIT MATRIX                                                                    │
├────────────┬─────────────────────────────┬─────────────┬─────────────┬────────┬───────────┬────────────┤
│ Attempt ID │ User Email & Classification │ Source Type │ Target Ref. │ Status │ IsCorrect │ Timestamp  │
├────────────┼─────────────────────────────┼─────────────┼─────────────┼────────┼───────────┼────────────┤
│ 8956759f   │ audit-db-1794547651039      │ exercise_   │ Canonical Q │ unans- │ null      │ 2026-11-13 │
│            │ (Synthetic DB Test Fixture) │ submission  │ 0c657406    │ wered  │           │ 05:27:31Z  │
├────────────┼─────────────────────────────┼─────────────┼─────────────┼────────┼───────────┼────────────┤
│ 5ac3259f   │ perf-audit-1794548142017    │ exercise_   │ Canonical Q │ correct│ true      │ 2026-11-13 │
│            │ (Synthetic Perf Fixture)    │ submission  │ 0c657406    │        │           │ 05:35:42Z  │
├────────────┼─────────────────────────────┼─────────────┼─────────────┼────────┼───────────┼────────────┤
│ 01f20d58   │ learner-m3-1794597241036    │ toeic_      │ Bank Item   │ correct│ true      │ 2026-11-13 │
│            │ (Synthetic M3 Test Fixture) │ practice    │ 44931eb1    │        │           │ 19:14:05Z  │
├────────────┼─────────────────────────────┼─────────────┼─────────────┼────────┼───────────┼────────────┤
│ a2c8a2e3   │ learner-m3-1794597334097    │ toeic_      │ Bank Item   │ correct│ true      │ 2026-11-13 │
│            │ (Synthetic M3 Test Fixture) │ practice    │ 44931eb1    │        │           │ 19:15:39Z  │
├────────────┼─────────────────────────────┼─────────────┼─────────────┼────────┼───────────┼────────────┤
│ 3e103036   │ learner-m3-1794633426172    │ toeic_      │ Bank Item   │ correct│ true      │ 2026-11-14 │
│            │ (Synthetic C3 Test Fixture) │ practice    │ 44931eb1    │        │           │ 05:17:12Z  │
└────────────┴─────────────────────────────┴─────────────┴─────────────┴────────┴───────────┴────────────┘
```

---

## 3. Contribution to Educational Dimensions

We traced each attempt through GrammarPath's four educational measurement engines:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ MEASUREMENT ENGINE CONTRIBUTION AUDIT                                                            │
├────────────┬─────────────────────┬───────────────────┬────────────────────┬──────────────────────┤
│ Attempt ID │ Foundational Theta  │ Transfer Tau      │ Accuracy Metric    │ Spaced Repetition    │
├────────────┼─────────────────────┼───────────────────┼────────────────────┼──────────────────────┤
│ 8956759f   │ Ignored (unanswered)│ Not applicable    │ Counted as unansw. │ None                 │
├────────────┼─────────────────────┼───────────────────┼────────────────────┼──────────────────────┤
│ 5ac3259f   │ INCREMENTS THETA    │ Not applicable    │ 100% textbook acc. │ Initial schedule set │
│            │ (Textbook mastery)  │                   │                    │                      │
├────────────┼─────────────────────┼───────────────────┼────────────────────┼──────────────────────┤
│ 01f20d58   │ ISOLATED (Zero)     │ HELD INSUFFICIENT │ TOEIC practice acc.│ Mastery event logged │
├────────────┼─────────────────────┼───────────────────┼────────────────────┼──────────────────────┤
│ a2c8a2e3   │ ISOLATED (Zero)     │ HELD INSUFFICIENT │ TOEIC practice acc.│ Mastery event logged │
├────────────┼─────────────────────┼───────────────────┼────────────────────┼──────────────────────┤
│ 3e103036   │ ISOLATED (Zero)     │ HELD INSUFFICIENT │ TOEIC practice acc.│ Mastery event logged │
└────────────┴─────────────────────┴───────────────────┴────────────────────┴──────────────────────┘
```

### Forensic Analysis:
1. **Attempt `5ac3259f` (Canonical Question `0c657406`):**
   - Correctly answered `"I'm not listening"` for Exercise 1.2 on Unit 1.
   - Updates `UserConceptMastery` for `unit.001` with incremented $\theta$.
   - Valid, compliant with Phase 3.2 textbook mastery engine.
2. **Attempts `01f20d58`, `a2c8a2e3`, `3e103036` (Item `44931eb1`):**
   - All three test sessions completed successfully on item `44931eb1`.
   - Because `44931eb1` has been identified in Phase 3.4C.4A as having a verb-object collocation anomaly (*"explain hardware"*), these attempts will be permanently excluded from future $\tau$ calculation when item `44931eb1` is retired.
   - However, in accordance with database immutability constraints, **the attempt rows themselves will NEVER be deleted or edited**. They remain preserved in the audit log.

---

## 4. Invariant Compliance Checklist

- [x] All 5 attempt records preserved in database.
- [x] Zero attempts modified, updated, or deleted.
- [x] Withdrawn items (`7d24582b`, `4a1223fc`) confirmed to have 0 attempts.
- [x] Absence of real external student accounts confirmed.
- [x] Full append-only historical integrity verified.

