# GrammarPath — Phase 3.4C.4B.4.3: Sanitized Unit 3 Pilot Execution Report
## Empirical Pipeline Execution, Staging Database Verification, Free-Tier Quota Findings, and Item Quality Audit

**Author:** Antigravity (Principal Assessment Architect & Security Lead)  
**Milestone:** Phase 3.4C.4B.4.3 (Sanitized Unit 3 Pilot Execution — 8 Items)  
**Date:** November 15, 2026  
**Status:** Pilot Execution Completed — STOPPED Under Section 7 Invariants (Zero Auto-Approvals)  

---

## 1. Preflight Results & Staging Isolation Guard Verification

Prior to dispatching any generation requests, all 5 mandatory preflight security gates were executed and verified against live staging:

```
+----------------------------------------------------------------------------------------------------+
| MANDATORY PREFLIGHT AUDIT MATRIX                                                                   |
+----+--------------------------------+-----------------+--------------------------------------------+
| Gate | Dimension                    | Status          | Live Verification Findings                 |
+----+--------------------------------+-----------------+--------------------------------------------+
| G-1| Database Identity Guard        | **PASS (100%)** | Target host verified:                      |
|    |                                |                 | ep-small-dream-a1lqsn1r...aws.neon.tech    |
|    |                                |                 | Database: grammarpath-staging (Neon AWS)   |
| G-2| Model & Free-Tier Pinning      | **PASS (100%)** | Pinned: gemini-3-flash-preview             |
|    |                                |                 | Live ping returned HTTP 200 OK (35 thought)|
|    |                                |                 | ServiceTier: standard (Zero billing)       |
| G-3| Spending Controller Hard Cap   | **PASS (100%)** | Initialized jobType: unit3_pilot           |
|    |                                |                 | Hard cap: $0.2500 USD | Remaining: $0.2500 |
| G-4| Baseline Staging Inventory     | **PASS (100%)** | Total items: 41 | Approved latest: 12      |
|    |                                |                 | Unit 3 items: 0 | Telemetry: 10/15/5       |
| G-5| Blueprint Compliance Audit     | **PASS (100%)** | 8 sanitized blueprints verified:           |
|    |                                |                 | 0% stative verbs, 0% Section 3C idioms,    |
|    |                                |                 | 0% Murphy content, 0% learner PII          |
+----+--------------------------------+-----------------+--------------------------------------------+
```

---

## 2. Model & Free-Tier Verification Evidence

- **Pinned Generation Model:** `gemini-3-flash-preview`
- **Pinned Critic Model:** `gemini-3-flash-preview` (Blind Psychometric Review Persona)
- **Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent`
- **Preflight Live Probe Evidence:**
  - Status: `HTTP 200 OK`
  - Usage Metadata: `promptTokenCount: 2`, `thoughtsTokenCount: 35`, `candidatesTokenCount: 1`, `totalTokenCount: 38`
  - Service Tier: `standard` (Google AI Studio Free Tier active)
  - Actual Cloud Invoiced Cost: **$0.000000 USD**

---

## 3. Actual API Requests, Pipeline Execution & Upstream Responses

The 8 sanitized blueprints (`U03-P01` to `U03-P08`) were orchestrated through the canonical 15-stage pipeline with the following empirical results:

```
+-------------------------------------------------------------------------------------------------------------------------+
| LIVE PIPELINE EXECUTION AUDIT LOG                                                                                       |
+---------+-----------------------------+-------------------+---------------+-------------+-------------------------------+
| Item ID | Blueprint Domain            | Target Sub-Rule   | Pipeline Disp.| HTTP Status | Outcome / Failure Reason      |
+---------+-----------------------------+-------------------+---------------+-------------+-------------------------------+
| U03-P01 | Facilities Management       | Rule 3B (operate) | Rejected      | 200 / 429   | Stage 13 Critic HTTP 429      |
| U03-P02 | IT Cloud Infrastructure     | Rule 3B (transfer)| **VALIDATED** | 200 / 200   | **Persisted: f691db84 (14/14)**|
| U03-P03 | E-Commerce / Payment Portal | Rule 3B (process) | **VALIDATED** | 200 / 200   | **Persisted: c4fecf7a (14/14)**|
| U03-P04 | Executive Governance        | Rule 3B (attend)  | Rejected      | 200 OK      | Stage 6 Truncation (194 pos)  |
| U03-P05 | Environmental QA            | Rule 3B (inspect) | Rejected      | HTTP 429    | Upstream Quota: 20 RPD cap    |
| U03-P06 | Corporate Legal Affairs     | Rule 3B (review)  | Rejected      | HTTP 429    | Upstream Quota: 20 RPD cap    |
| U03-P07 | Supply Chain Logistics      | 3A vs 3B (dispatch| Rejected      | HTTP 429    | Upstream Quota: 20 RPD cap    |
| U03-P08 | HR International Talent     | 3A vs 3B (recruit)| Rejected      | HTTP 429    | Upstream Quota: 20 RPD cap    |
+---------+-----------------------------+-------------------+---------------+-------------+-------------------------------+
```

### Critical Discovery: Google AI Studio Free Tier Quota Limits
During the live execution, the upstream Google API returned the exact metric limit that governs the Free Tier for `gemini-3-flash`:
1. **Requests Per Minute (RPM) Cap:** `limit: 5 requests per minute`.
2. **Requests Per Day (RPD) Cap:** `generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20 per day`.
3. When the 20th request was reached across prior probes, benchmark runs, and pilot calls, Google's API fail-closed with:
   `Generate content requests per day limit exceeded on Free Tier. Please retry in 13h39m.`
4. **Pipeline Fail-Closed Integrity:** When HTTP 429 was encountered, the pipeline aborted immediately, released reservations, did not attempt silent fallbacks, and did NOT persist incomplete or corrupted records to staging.

---

## 4. Token Usage & Cost Reconciliation

```
+----------------------------------------------------------------------------------------------------+
| SPENDING CONTROLLER AUDIT SUMMARY (unit3_pilot)                                                    |
+---------------------------------------+------------------------------------------------------------+
| Metric Parameter                      | Verified Value                                             |
+---------------------------------------+------------------------------------------------------------+
| Pipeline Hard Budget Cap              | $0.250000 USD                                              |
| Actual Google Cloud Billed Cost       | **$0.000000 USD (Free Tier Active)**                       |
| Accounting Token Projected Cost       | $0.000648 USD                                              |
| Remaining Pilot Budget                | $0.249352 USD (99.74% intact)                              |
| Total Prompt / Input Tokens           | 2,068 tokens                                               |
| Total Output / Candidate Tokens       | 1,643 tokens                                               |
| Total Generation API Calls            | 4 calls                                                    |
| Total Critic API Calls                | 2 calls                                                    |
| Budget Exhaustion Status              | **FALSE (Budget 99.74% available)**                        |
+---------------------------------------+------------------------------------------------------------+
```

---

## 5. Detailed Blueprint-by-Blueprint Results

### Item U03-P02 (VALIDATED & PERSISTED TO STAGING)
- **Database Item ID:** `f691db84-18ef-49b3-a65b-49b4ac6e05ff`
- **Root Question ID:** `f138af1c-4f25-49cb-94d6-deaff6b05c89` (Version: 1)
- **Lifecycle Status:** `reviewStatus = "validated"`, `isLatestApproved = false`
- **Curriculum Mapping:** Unit 3 | Sub-skill: `present_continuous_temporary` | Concept: `7296dbb8-1ee8-4a52-a7e9-b6f132921da4` (Unit 3 Concept)
- **Workplace Domain:** Information Technology & Data Security
- **Question Stem:**  
  `"Network administrators _______ sensitive financial records to the encrypted secondary server right now to prevent data loss during the scheduled outage."`
- **Options & Distractor Rationales:**
  - **(A) are transferring** `[CORRECT KEY]`  
    *Rationale:* This is the correct present continuous form for a plural subject (*administrators*) describing an ongoing temporary action indicated by the time marker *"right now"*.
  - **(B) transfers**  
    *Rationale:* Third-person singular present simple; creates subject-verb disagreement with the plural subject *administrators*.
  - **(C) transferred**  
    *Rationale:* Past simple tense; logically clashes with the present time marker *"right now"*.
  - **(D) will be transferred**  
    *Rationale:* Passive voice construction; grammatically incorrect because *Network administrators* is the active agent performing the transfer.
- **Pedagogical Explanation:**
  - *English:* The sentence requires the present continuous tense to describe a temporary action currently in progress, signaled by the phrase *"right now"*. Since the subject *"Network administrators"* is plural, the correct auxiliary verb is *"are"* followed by the present participle *"transferring"*.
  - *Vietnamese:* Câu này yêu cầu thì hiện tại tiếp diễn để mô tả một hành động tạm thời đang diễn ra, được dấu hiệu bởi cụm từ *"right now"*. Vì chủ ngữ *"Network administrators"* là số nhiều, nên trợ động từ đúng là *"are"* đi kèm với hiện tại phân từ *"transferring"*.
- **Content Hash:** `23190f402e5ec41865bbe2e31adf6175607db14623e7f3d281fc1da09055bbbe`
- **Stage 13 Blind Critic Review:** Solved Key: `(A)` | Confidence: `1.0` | Naturalness Score: `5.0 / 5.0` | Single Defensible Key: `true`

---

### Item U03-P03 (VALIDATED & PERSISTED TO STAGING)
- **Database Item ID:** `c4fecf7a-4ec2-4ddb-b0fd-9a86c7bb4334`
- **Root Question ID:** `32cbef29-cb53-4886-90ad-58dc71fcae13` (Version: 1)
- **Lifecycle Status:** `reviewStatus = "validated"`, `isLatestApproved = false`
- **Curriculum Mapping:** Unit 3 | Sub-skill: `present_continuous_temporary` | Concept: `7296dbb8-1ee8-4a52-a7e9-b6f132921da4` (Unit 3 Concept)
- **Workplace Domain:** E-Commerce, Payment Gateways & Accounting
- **Question Stem:**  
  `"Because technical staff are performing emergency database maintenance tonight, the international payment portal _______ credit transactions at this time."`
- **Options & Distractor Rationales:**
  - **(A) does not process**  
    *Rationale:* Present simple is used for permanent facts or routines, but the time markers *"tonight"* and *"at this time"* indicate a temporary situation.
  - **(B) is not processing** `[CORRECT KEY]`  
    *Rationale:* Present continuous negative is the correct choice to describe a temporary service suspension happening at the current moment.
  - **(C) has not processed**  
    *Rationale:* Present perfect focuses on completion or duration up to now, which is less appropriate than continuous aspect for a specific temporary operational outage.
  - **(D) not processing**  
    *Rationale:* Grammatical fragment; present participle requires finite auxiliary verb (*is*) to function as predicate.
- **Pedagogical Explanation:**
  - *English:* The sentence describes a temporary situation indicated by the phrases *"tonight"* and *"at this time"*. In English, the present continuous tense (*is/are + -ing*) is used to indicate temporary states or actions that are currently taking place but are not permanent. Because *"the international payment portal"* is a singular third-person subject, *"is not processing"* is the grammatically correct form.
  - *Vietnamese:* Câu này mô tả một tình huống tạm thời được chỉ ra bởi các cụm từ *"tonight"* (tối nay) và *"at this time"* (vào thời điểm này). Trong tiếng Anh, thì hiện tại tiếp diễn (*is/are + -ing*) được sử dụng để chỉ các trạng thái hoặc hành động tạm thời đang diễn ra nhưng không phải là vĩnh viễn. Vì *"the international payment portal"* là chủ ngữ số ít, *"is not processing"* là dạng ngữ pháp chính xác.
- **Content Hash:** `ce4ac0dc828d459f3c320e5bd9909ad008d5c477697f7caa4d2300d231a41ec1`
- **Stage 13 Blind Critic Review:** Solved Key: `(B)` | Confidence: `1.0` | Naturalness Score: `5.0 / 5.0` | Single Defensible Key: `true`

---

## 6. Contextual Diversity & Similarity Analysis

Pairwise contextual distance between the newly persisted items was evaluated using the multi-tier diversity engine:
- **Item A:** `f691db84` (IT Infrastructure / Data Security: *"Network administrators _______ sensitive financial records to the encrypted secondary server right now..."*)
- **Item B:** `c4fecf7a` (E-Commerce / Payment Gateways: *"Because technical staff are performing emergency database maintenance tonight, the international payment portal _______ credit transactions at this time."*)
- **Metrics Calculated:**
  - Template Similarity ($S_{\text{norm}}$): `0.08`
  - Lexical / Semantic Overlap ($S_{\text{sem}}$): `0.14`
  - Carrier Context Similarity ($S_{\text{carrier}}$): `0.12`
  - **Contextual Distance ($D_{\text{ctx}}$):** $1 - 0.12 = \mathbf{0.88}$ (Threshold requirement: $\ge 0.50$)
- **Verdict:** **HIGH CONTEXTUAL DIVERSITY.** The items belong to completely independent corporate scenarios with zero template duplication.

---

## 7. Staging Database Census & Invariance Verification

```
+----------------------------------------------------------------------------------------------------+
| STAGING DATABASE INVENTORY RECONCILIATION                                                          |
+---------------------------------------+---------------------+---------------------+----------------+
| Table / Category                      | Preflight Baseline  | Post-Pilot Census   | Delta / State  |
+---------------------------------------+---------------------+---------------------+----------------+
| Total Question Bank Items             | 41 items            | **43 items**        | **+2 items**   |
| Approved Items (isLatestApproved=true)| 12 items            | **12 items**        | **0 (NO AUTO)**|
| Validated Items (pending human review)| 20 items            | **22 items**        | **+2 items**   |
| Archived Items                        | 5 items             | 5 items             | 0 (Unchanged)  |
| Withdrawn Items                       | 4 items             | 4 items             | 0 (Unchanged)  |
| Unit 3 Items in Question Bank         | 0 items             | **2 items**         | **+2 validated**|
| Practice Sessions (Telemetry)         | 10 sessions         | 10 sessions         | 0 (Unchanged)  |
| Practice Items (Telemetry)            | 15 items            | 15 items            | 0 (Unchanged)  |
| Historical Attempt Items (Telemetry)  | 5 attempts          | 5 attempts          | 0 (Unchanged)  |
+---------------------------------------+---------------------+---------------------+----------------+
```

### Practice Retrieval & Learner Isolation Verification
- **Query Executed:** `SELECT COUNT(*) FROM toeic_question_bank_items WHERE unit_number = 3 AND review_status = 'approved' AND is_latest_approved = true;`
- **Result:** **0 items.**
- **Verification:** Both newly authored Unit 3 items have `reviewStatus: "validated"` and `isLatestApproved: false`. They are completely invisible to regular learner practice sessions and are excluded from adaptive mastery aggregations.

---

## 8. Test Execution Results

```
+----------------------------------------------------------------------------------------------------+
| AUTOMATED TEST SUITE VERIFICATION LOG                                                              |
+----+-----------------------------------------------+-----------+-----------+-----------------------+
| ID | Test Suite File                               | Tests Run | Exit Code | Verification Summary  |
+----+-----------------------------------------------+-----------+-----------+-----------------------+
| T1 | phase3-4c-spending-controller.test.ts         | 8 passed  | Code 0    | Hard caps & multi-tok |
| T2 | phase3-4c-canonical-pipeline.test.ts          | 6 passed  | Code 0    | 15 stages & critic    |
| T3 | phase3-4c-e2e-pipeline.test.ts                | 7 passed  | Code 0    | E2E deterministic flow|
| T4 | phase3-4c-gemini-client.test.ts               | 5 passed  | Code 0    | Fail-closed & redact  |
| T5 | phase3-4c-data-integrity.test.ts (Live Neon)  | 5 passed  | Code 0    | 43 items & telemetry  |
+----+-----------------------------------------------+-----------+-----------+-----------------------+
|    | TOTAL TEST RESULTS                            | 31 / 31   | Code 0    | 100% PASS RATE        |
+----+-----------------------------------------------+-----------+-----------+-----------------------+
```

---

## 9. Final Verdict & Stop Condition

### Milestone Status: **PILOT EXECUTION COMPLETE & STOPPED**
1. **Pilot Delivery:** Exactly 2 high-quality, psychometrically validated Unit 3 Part 5 items (`f691db84` and `c4fecf7a`) have been generated, validated through all 14 stages, and safely persisted to `grammarpath-staging` with `isLatestApproved: false`.
2. **Quota Barrier Documented:** Google AI Studio Free Tier enforces a hard daily ceiling of **20 Requests Per Day (RPD)**. Generating the remaining 6 items on Free Tier requires waiting for the daily quota reset (in ~13 hours).
3. **Alternative Path for Expansion:** Linking Google Cloud Pay-As-You-Go ($0.075 / $0.30 per M tokens) removes the 20 RPD cap, costing approximately **$0.0008 USD per item** ($0.005 USD for the remaining 6 items), while remaining protected by our $0.25 USD hard spending cap.
4. **Final Stop Invariant:** Under Section 7 directives, live execution is **STOPPED**. No additional questions have been generated, no items auto-approved, no billing enabled, and no canonical data modified.

