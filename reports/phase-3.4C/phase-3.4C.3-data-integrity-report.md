# GrammarPath — Phase 3.4C.3: Data Integrity Report
## Staging Database Audited Mutations, Recoverable Snapshots & Attempt Preservation

**Author:** Antigravity (Advanced Agentic Coding)  
**Milestone:** Phase 3.4C.3 Implementation  
**Date:** November 14, 2026  
**Target Environment:** Neon PostgreSQL Staging (`ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging`)  
**Overall Verdict:** VERIFIED PASS  

---

## 1. Executive Summary & Safety Protocols

Phase 3.4C.3 enforced strict database safety protocols to guarantee that no unrecoverable mutations occurred and that historical attempt history remained completely immutable.

### Safety Measures Executed:
1. **Staging Isolation Guard:** All operations verified the connection target `ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging` prior to executing queries.
2. **Pre-Modification Backup:** A full JSON snapshot of all TOEIC tables (`ToeicQuestionBankItem`, `ToeicQuestionOption`, `QuestionAttemptItem`, `ToeicPracticeItem`, `ToeicPracticeSession`) was established in `backend/recovery/phase3-4c3-pre-backup/`.
3. **Reported Database Writes:** Exactly **1 persistent row** was modified during this milestone (the audited withdrawal of defective item `4a1223fc`).
4. **Zero Attempt Mutations:** All 4 historical attempt records remain bit-for-bit unchanged.
5. **Canonical Curriculum Immutability:** `grammarpath-data` remains 100% clean on `main`.

---

## 2. Pre-Modification Backup Snapshot

Prior to performing any write operation on Neon staging, a full data backup was saved to disk:

```
Backup Directory: backend/recovery/phase3-4c3-pre-backup/
├── bank_items.json         (37 ToeicQuestionBankItem records with options)
├── attempts.json           (4 QuestionAttemptItem records)
├── practice_items.json     (12 ToeicPracticeItem records)
└── practice_sessions.json  (8 ToeicPracticeSession records)
```

The backup was verified for completeness and successfully used to validate database restore procedures.

---

## 3. Mandatory Preflight: Audited Withdrawal of Item `4a1223fc`

### 3.1 Target Item Identity
- **Item ID:** `4a1223fc-84c4-4f57-8efa-dcc6d03d1fb2`
- **Root Question ID:** `6a54a874-c48b-4651-a3f5-b686dd51fb6b`
- **Version:** `2`
- **Prompt:** *"The IT technician is not at his desk because **he** _______ the server hardware in Room 3 right now."*
- **Defective Answer Key:** Option A: *"are / updating"* (`isCorrect: true`). Subject is 3rd-person singular pronoun *"he"*; *"he are updating"* is an objective grammatical error.

### 3.2 Precondition Verification
- Target item exists: Verified.
- `reviewStatus = "approved"` AND `isLatestApproved = true`: Verified.
- Attempt count in `QuestionAttemptItem` = **0**: Verified.
- Defective option verified: Option A text is `"are / updating"` and marked `isCorrect: true`: Verified.

### 3.3 Execution Log & Mutation Audit
Executed via [`backend/scripts/execute-phase3-4c3-withdrawal.mjs`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/scripts/execute-phase3-4c3-withdrawal.mjs):
```text
[Staging Isolation Guard] Verified .env.staging -> target=ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging
[Phase 3.4C.3 Withdrawal] Starting audited preflight for item: 4a1223fc-84c4-4f57-8efa-dcc6d03d1fb2
[Precondition Check] ALL PRECONDITIONS PASSED.
- Item ID: 4a1223fc-84c4-4f57-8efa-dcc6d03d1fb2
- RootQuestionId: 6a54a874-c48b-4651-a3f5-b686dd51fb6b
- Version: 2
- Defective key: Option A ("are / updating")
- Historical reviewer: fc2c140a-fa60-4146-b9f9-4b7f687e27c2
- Historical reviewedAt: 2026-11-13T19:15:44.925Z
- Historical reviewNotes: Approved updated Version 2.
[Phase 3.4C.3 Withdrawal] Item successfully transitioned.
- New reviewStatus: withdrawn
- New isLatestApproved: false
- WithdrawnReason: Withdrawn in Phase 3.4C.3 preflight audit: ungrammatical answer key (Option A 'are / updating' with 3rd-person singular subject 'he'). Originally approved by fc2c140a-fa60-4146-b9f9-4b7f687e27c2 at 2026-11-13T19:15:44.925Z.
- Audit reviewedBy preserved: fc2c140a-fa60-4146-b9f9-4b7f687e27c2
- Audit reviewedAt preserved: 2026-11-13T19:15:44.925Z
- Audit reviewNotes preserved: Approved updated Version 2.
[Post-Condition Check] Remaining approved items count: 3
  1. ID: 7d9abd94-df89-4762-8a86-a3217f0217b0, Root: 0fda8409-0926-49c0-8b86-1564d83497ac, Version: 2
  2. ID: 44931eb1-344b-4ec8-aceb-5524a952ed59, Root: 634add4d-5982-4de8-99de-6c4561c6ee44, Version: 2
  3. ID: 45e751fd-4915-4bac-a386-c7bae5295911, Root: b19ebb8c-9912-4cd7-8705-155d847282b0, Version: 2
[Phase 3.4C.3 Withdrawal] SUCCESS.
```
- **Affected Rows:** Exactly 1 row.
- **Idempotency:** Re-executing the script detects `item.reviewStatus === "withdrawn"` and exits cleanly without modifying the record.

---

## 4. Post-Withdrawal Question Bank State

The current staging database inventory is partitioned as follows:

```
┌─────────────────┬────────────────────┬───────────────┐
│ reviewStatus    │ isLatestApproved   │ Item Count    │
├─────────────────┼────────────────────┼───────────────┤
│ validated       │ false              │ 27            │
│ archived        │ false              │ 5             │
│ approved        │ true               │ 3             │
│ withdrawn       │ false              │ 2             │
├─────────────────┴────────────────────┼───────────────┤
│ TOTAL TOEIC QUESTION BANK ITEMS      │ 37            │
└──────────────────────────────────────┴───────────────┘
```

The two withdrawn items are:
1. `7d24582b-ca20-4c7a-a828-530f4852e80a` (Withdrawn in Phase 3.4C.1: *"he am trying"*).
2. `4a1223fc-84c4-4f57-8efa-dcc6d03d1fb2` (Withdrawn in Phase 3.4C.3: *"he are updating"*).

---

## 5. Attempt Immutability & Learner Record Integrity

A complete check of `question_attempt_items` confirms:
- **Total Attempt Records:** `4`
- **Rows Deleted:** `0`
- **Rows Mutated:** `0`
- **Attempts on Withdrawn Items:** `0`
- **Attempts on Approved Items:** `2` (both on `44931eb1-344b-4ec8-aceb-5524a952ed59`)
- **Attempts on Textbook Items:** `2` (both on canonical question `0c657406-9046-4704-8609-55a9ed670fd5`)
- **Baseline Users Preserved:**
  - `audit-db-1794547651039@grammarpath.local` — **Preserved**
  - `perf-audit-1794548142017@grammarpath.local` — **Preserved**
  - `phase32-e2e-1794547108109@grammarpath.local` — **Preserved**

---

## 6. Canonical Data Integrity (`grammarpath-data`)

The canonical curriculum repository was inspected via git:
- **Repository Path:** `/Users/kd.quach03/Documents/grammarpath-data`
- **Branch:** `main`
- **Working Tree:** 100% clean, 0 modified files, 0 untracked files.
- **Verification:** Canonical units (1–145), exercises (549), and questions (4,414) remain unaltered.

---

## 7. Complete Summary of Database Writes in Milestone 3.4C.3

```
┌───────────────────────────────────────┬────────────┬──────────────┬────────────────────────────┐
│ Operation Description                 │ Target DB  │ Rows Affected│ Audit / Recovery Status    │
├───────────────────────────────────────┼────────────┼──────────────┼────────────────────────────┤
│ Audited withdrawal of item 4a1223fc   │ Staging    │ 1 update     │ Logged in withdrawnReason  │
│ Ephemeral test item creation & cleanup│ Staging    │ 0 net delta  │ 100% deleted by afterAll   │
├───────────────────────────────────────┴────────────┼──────────────┼────────────────────────────┤
│ NET PERSISTENT DATABASE DELTA                      │ 1 row        │ 100% Audited & Recoverable │
└────────────────────────────────────────────────────┴──────────────┴────────────────────────────┘
```

---

## 8. Data Integrity Verdict

All data safety constraints were strictly obeyed. Zero learner data loss occurred, all historical records were preserved, and the defective item was cleanly quarantined.

**Data Integrity Verdict: VERIFIED PASS**

