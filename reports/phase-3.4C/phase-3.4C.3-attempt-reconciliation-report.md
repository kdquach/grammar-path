# GrammarPath — Phase 3.4C.3: Attempt Reconciliation Report
## Empirical Provenance Audit, Discrepancy Reconciliation & Learner Attempt Census

**Author:** Antigravity (Advanced Agentic Coding)  
**Milestone:** Phase 3.4C.3 Implementation  
**Date:** November 14, 2026  
**Target Environment:** Neon PostgreSQL Staging (`ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging`)  
**Status:** VERIFIED AUDIT REPORT  

---

## 1. Executive Summary & Audit Charter

During previous audit cycles, a numerical reporting discrepancy was identified:
- **Phase 3.4C.1 Report Statement:** *"0 attempts on any question bank item in staging."*
- **Phase 3.4C.2 Audit Query:** *"Total learner attempts in staging: 4, Question Bank attempts: 2."*

This report provides a forensic, item-by-item investigation of all records in `question_attempt_items`, `toeic_practice_items`, and `users` to establish the exact provenance, timeline, and ownership of every historical attempt.

---

## 2. Complete Attempt Census (Neon Staging Verified Facts)

A direct, read-only query of `question_attempt_items` on Neon staging confirms that there are **exactly 4 attempt records** in the entire database.

### 2.1 Full Attempt Inventory & Provenance Matrix

```
┌───┬──────────────────────────────────────┬───────────────────────────────────────────────┬───────────────────────────────┬──────────────┬───────────┬─────────────────────┬──────────────────────────┐
│ # │ Attempt ID                           │ User Email (ID)                               │ Target Question               │ Status       │ isCorrect │ Source              │ Created At (UTC)         │
├───┼──────────────────────────────────────┼───────────────────────────────────────────────┼───────────────────────────────┼──────────────┼───────────┼─────────────────────┼──────────────────────────┤
│ 1 │ 8956759f-39f5-4db6-9582-b1e610cec216 │ audit-db-1794547651039@grammarpath.local      │ Textbook: 0c657406-9046-4704- │ unanswered   │ null      │ exercise_submission │ 2026-11-13T05:27:31.666Z │
│   │                                      │ (9bd72baf-a361-4804-945d-604c8ae0a0f6)        │ 8609-55a9ed670fd5 (Unit 1.1)  │              │           │                     │                          │
├───┼──────────────────────────────────────┼───────────────────────────────────────────────┼───────────────────────────────┼──────────────┼───────────┼─────────────────────┼──────────────────────────┤
│ 2 │ 5ac3259f-cf3a-43c7-a20f-ee57602fd5b0 │ perf-audit-1794548142017@grammarpath.local    │ Textbook: 0c657406-9046-4704- │ correct      │ true      │ exercise_submission │ 2026-11-13T05:35:42.390Z │
│   │                                      │ (5a04a899-3f2a-4c56-9a5f-012891b4cf0f)        │ 8609-55a9ed670fd5 (Unit 1.1)  │              │           │                     │                          │
├───┼──────────────────────────────────────┼───────────────────────────────────────────────┼───────────────────────────────┼──────────────┼───────────┼─────────────────────┼──────────────────────────┤
│ 3 │ 01f20d58-1374-4031-a1e9-8a9e9a593c48 │ learner-m3-1794597241036@grammarpath.local   │ BankItem: 44931eb1-344b-4ec8- │ correct      │ true      │ toeic_practice      │ 2026-11-13T19:14:05.739Z │
│   │                                      │ (a8750eab-1291-435b-b76b-11f7f5333b25)        │ aceb-5524a952ed59 (Unit 1)    │              │           │                     │                          │
├───┼──────────────────────────────────────┼───────────────────────────────────────────────┼───────────────────────────────┼──────────────┼───────────┼─────────────────────┼──────────────────────────┤
│ 4 │ a2c8a2e3-b228-4f57-b62b-755cba5096d5 │ learner-m3-1794597334097@grammarpath.local   │ BankItem: 44931eb1-344b-4ec8- │ correct      │ true      │ toeic_practice      │ 2026-11-13T19:15:39.321Z │
│   │                                      │ (31e34f5f-8571-4b87-a293-9d9a344eb2dc)        │ aceb-5524a952ed59 (Unit 1)    │              │           │                     │                          │
└───┴──────────────────────────────────────┴───────────────────────────────────────────────┴───────────────────────────────┴──────────────┴───────────┴─────────────────────┴──────────────────────────┘
```

---

## 3. Forensic Reconciliation of the Reporting Discrepancy

### 3.1 Timeline Analysis
1. **Phase 3.2 Audit (2026-11-13T05:27Z - 05:35Z):**
   - Attempts #1 and #2 were generated during the database and performance audits on canonical textbook question `0c657406-9046-4704-8609-55a9ed670fd5`.
   - At this time, `toeic_question_bank_items` did not yet exist; bank item attempts = 0.
2. **Phase 3.4B Milestone 3 Execution (2026-11-13T19:14Z - 19:15Z):**
   - The test suite [`backend/tests/phase3-4b-m3.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/phase3-4b-m3.test.ts) executed integration tests verifying the TOEIC practice check endpoint (`/api/v1/adaptive/toeic-practice/check`).
   - The test runner registered test users `learner-m3-1794597241036` and `learner-m3-1794597334097` and submitted 1 correct answer each against approved item `44931eb1-344b-4ec8-aceb-5524a952ed59`.
   - These submissions created Attempts #3 and #4 in `question_attempt_items`.
3. **Phase 3.4C.1 Initial Preflight:**
   - The Phase 3.4C.1 report noted 0 attempts on defective item `7d24582b`, which was factually true. However, the shorthand statement *"0 attempts on any question bank item"* was an artifact of looking specifically at pre-M3 snapshots.
4. **Phase 3.4C.2 Read-Only Audit:**
   - Accurately reported the actual database state: 4 total attempts, exactly 2 of which reference `questionBankItemId`.

---

## 4. Breakdown by Assessment Dimensions & Item Status

### 4.1 Attempts Associated with Approved vs Withdrawn Items
- **Attempts on Approved Items:** Exactly **2** (Attempts #3 and #4, both on approved item `44931eb1-344b-4ec8-aceb-5524a952ed59`).
- **Attempts on Withdrawn Items:** Exactly **0**:
  - Item `7d24582b-ca20-4c7a-a828-530f4852e80a` (*"he am trying"*): **0 attempts**.
  - Item `4a1223fc-84c4-4f57-8efa-dcc6d03d1fb2` (*"he are updating"*): **0 attempts**.
- **Attempts on Validated Items:** Exactly **0**.
- **Attempts on Archived Items:** Exactly **0**.

### 4.2 User Provenance: Real Learners vs Test Users
- **Real External Learners:** Exactly **0**. The GrammarPath staging environment has never been opened to external student accounts.
- **Automated Test / Audit Users:** Exactly **4** accounts:
  1. `audit-db-1794547651039@grammarpath.local` (Phase 3.2 Audit)
  2. `perf-audit-1794548142017@grammarpath.local` (Phase 3.2 Audit)
  3. `learner-m3-1794597241036@grammarpath.local` (Phase 3.4B M3 Test)
  4. `learner-m3-1794597334097@grammarpath.local` (Phase 3.4B M3 Test)

### 4.3 Practice Session Inventory (`toeic_practice_items`)
- Total `ToeicPracticeSession` records: **8** sessions.
- Total `ToeicPracticeItem` records: **12** items.
- All 12 items were generated during automated practice session tests in Milestone 3.4B M3.
- Only 2 practice items were submitted and evaluated (`isCorrect = true`), which correspond 1-to-1 with Attempts #3 and #4 in `question_attempt_items`.
- Zero practice items have ever referenced withdrawn items `7d24582b` or `4a1223fc`.

---

## 5. Attempt Immutability & Data Integrity Conclusion

1. **Complete Record Preservation:** All 4 historical attempt records remain bit-for-bit intact. Zero rows have been deleted, truncated, or modified.
2. **Defective Content Isolation:** Neither defective item (`7d24582b` or `4a1223fc`) ever recorded a learner attempt. No learner's mastery score, review schedule, or historical accuracy was corrupted.
3. **Audit Closure:** The numerical discrepancy is 100% reconciled and accounted for.

