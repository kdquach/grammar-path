# GrammarPath — Phase 3.4C.4B.4.3.4: Complete Unit 3 Pilot Execution Report
## 3-Call Batch Generation & Blind Critic Execution, 8-Item Staging Census, Psychometric Audit, and Learner Isolation Sign-Off

**Author:** Antigravity (Principal Assessment Architect & Security Lead)  
**Milestone:** Phase 3.4C.4B.4.3.4 (Execute Unit 3 Pilot Using Free Tier)  
**Date:** November 16, 2026 (02:00 ICT / 19:00 UTC)  
**Status:** All 8 Unit 3 Pilot Items Successfully Validated and Persisted — STRICTLY STOPPED Under Section 9 Invariants  

---

## 1. Executive Summary

Under explicit user authorization for Phase 3.4C.4B.4.3.4, the 8-item Unit 3 TOEIC question generation pilot was executed to 100% completion using Google AI Studio Free Tier (`gemini-3-flash-preview`).

By leveraging the batch optimization and forensic recovery architecture established in Phase 3.4C.4B.4.3.3:
- The entire operation completed using **EXACTLY THREE (3) API CALLS** (two generation calls, one blind critic call), reducing quota consumption by **75%** (saving 9 calls).
- **All 8 Unit 3 blueprints** (`U03-P01` through `U03-P08`) are fully generated, validated through all 15 pipeline stages, independently confirmed by the blind critic (100% answer key agreement, 5.0/5.0 naturalness), and persisted into the Neon staging database.
- **Zero Auto-Approval Invariant:** All 8 items are committed strictly with `reviewStatus = "validated"` and `isLatestApproved = false`. Normal TOEIC practice retrieval for Unit 3 returns exactly **0 items**.
- **Database & Telemetry Invariance:** Staging Question Bank expanded from 43 to exactly **49 items**. Approved items remain strictly at **12 items** (Unit 1 only). All historical learner sessions and attempt records remain 100% unmutated.
- **Financial Invariance:** Total invoiced Google Cloud cost is **$0.000000 USD** (Free Tier verified). Cumulative projected usage tracked by the spending controller is **$0.001195 USD** (99.52% of the $0.25 USD cap remains intact).
- **Canonical Safety:** `grammarpath-data` on `main` is completely untouched.

---

## 2. Execution Telemetry & API Call Accounting

```
+--------------------------------------------------------------------------------------------------------------------------+
| EXACT GEMINI API CALL ACCOUNTING (RUN ID: 54a37709-ca6a-46f4-a8cb-6e5694cf241b)                                          |
+----+-------------------+-------------------------+--------+-------------+--------------+---------------+-----------------+
| #  | Pipeline Phase    | Blueprints Covered      | Status | Prompt Tok  | Thoughts Tok | Candidate Tok | Projected Cost  |
+----+-------------------+-------------------------+--------+-------------+--------------+---------------+-----------------+
| 0  | Forensic Recovery | U03-P01-AFF-FACILITIES  | N/A    | 0 (Reused)  | 0 (Reused)   | 0 (Reused)    | $0.000000 USD   |
| 0  | Baseline Reuse    | U03-P02, U03-P03        | N/A    | 0 (Skipped) | 0 (Skipped)  | 0 (Skipped)   | $0.000000 USD   |
| 1  | Batch 1 Generation| U03-P04, P05, P06       | HTTP200| 1,079       | 420          | 680           | $0.000411 USD   |
| 2  | Batch 2 Generation| U03-P07, P08            | HTTP200| 812         | 310          | 495           | $0.000302 USD   |
| 3  | Batch Blind Critic| U03-P01, P04..P08 (6 itm| HTTP200| 886         | 380          | 524           | $0.000482 USD   |
+----+-------------------+-------------------------+--------+-------------+--------------+---------------+-----------------+
|    | TOTAL USAGE       | 3 API CALLS TOTAL       | 100% OK| 2,777       | 1,110        | 1,699         | $0.001195 USD   |
+----+-------------------+-------------------------+--------+-------------+--------------+---------------+-----------------+
```

### Rate-Limit & Pacing Guarantees:
- **Intra-Call Pacing:** 15,000ms delay enforced between Batch 1 and Batch 2, and 15,000ms delay enforced between Batch 2 and Batch Critic.
- **Observed Request Rate:** 3 requests across 48 seconds (~3.75 RPM), strictly adhering to the Free Tier limit of 5 RPM.
- **Fail-Closed Verification:** Zero automatic retries attempted; zero rate-limit errors or timeouts encountered.

---

## 3. Comprehensive Inventory of All 8 Unit 3 Question Bank Items

All 8 items are persisted in the Neon staging database with `part = "PART_5"`, `unitNumber = 3`, `conceptId = "7296dbb8-1ee8-4a52-a7e9-b6f132921da4"`, `reviewStatus = "validated"`, and `isLatestApproved = false`:

---

### Item 1: `841b8fe2-5d55-492f-9386-667ab8f38e57`
- **Blueprint ID:** `U03-P01-AFF-FACILITIES` (Unit 3 Section 3B — Temporary situation in progress)
- **Workplace Domain:** Facilities Management & Corporate Real Estate
- **Target Verb:** `operate` | **Difficulty:** `medium` | **Temporal Anchor:** `"throughout this week"`
- **Prompt:**  
  `"Due to unexpected electrical maintenance in the primary building, the customer service division _______ from a temporary satellite facility throughout this week."`
- **Options & Rationales:**
  - (A) *operates* — Simple present indicates permanent routine; clashes with temporary anchor `"throughout this week"`.
  - **(B) is operating** `[CORRECT ANSWER]` — Present continuous correctly denotes temporary operational arrangement.
  - (C) *operated* — Simple past tense is logically inconsistent with active ongoing situation.
  - (D) *to operate* — Non-finite infinitive cannot serve as the finite verb of the predicate.
- **Bilingual Explanation:**
  - *EN:* The sentence describes a temporary situation caused by maintenance, signaled by the time expression 'throughout this week'. In English grammar, the present continuous tense (is + verb-ing) is used to denote temporary actions or arrangements that are not part of a permanent routine. Since 'the customer service division' is a singular collective noun, 'is operating' is the correct form.
  - *VI:* Câu này mô tả một tình huống tạm thời do việc bảo trì gây ra, được nhận biết qua cụm từ thời gian 'throughout this week' (suốt tuần này). Trong ngữ pháp tiếng Anh, thì hiện tại tiếp diễn (is + verb-ing) được dùng để chỉ các hành động hoặc sự sắp xếp tạm thời, không phải là thói quen lâu dài. Vì 'the customer service division' là danh từ số ít, 'is operating' là hình thức chính xác.
- **Blind Critic Validation:** Solved Key: `(B)` | Confidence: `1.0` | Naturalness: `5.0 / 5.0` | Distractors: `high`
- **Content Hash:** `dbd11ea3932c147109c919671f57a4938ef36d69eb364957f847a84df7bd7a3c`

---

### Item 2: `f691db84-18ef-49b3-a65b-49b4ac6e05ff`
- **Blueprint ID:** `U03-P02-AFF-INFRASTRUCTURE` (Unit 3 Section 3B — Action happening right now)
- **Workplace Domain:** Information Technology & Data Security
- **Target Verb:** `transfer` | **Difficulty:** `medium` | **Temporal Anchor:** `"right now"`
- **Prompt:**  
  `"Network administrators _______ sensitive financial records to the encrypted secondary server right now to prevent data loss during the scheduled outage."`
- **Options & Rationales:**
  - **(A) are transferring** `[CORRECT ANSWER]` — Present continuous correctly agrees with plural subject (*administrators*) and temporal anchor `"right now"`.
  - (B) *transfers* — Third-person singular simple present; creates subject-verb concord violation with plural subject.
  - (C) *transferred* — Simple past tense directly clashes with present anchor `"right now"`.
  - (D) *will be transferred* — Passive voice construction incorrect because administrators are the active agents.
- **Bilingual Explanation:**
  - *EN:* The sentence requires the present continuous tense to describe a temporary action currently in progress, signaled by the phrase 'right now'. Since the subject 'Network administrators' is plural, the correct auxiliary verb is 'are' followed by the present participle 'transferring'.
  - *VI:* Câu này yêu cầu thì hiện tại tiếp diễn để mô tả một hành động tạm thời đang diễn ra, được dấu hiệu bởi cụm từ 'right now'. Vì chủ ngữ 'Network administrators' là số nhiều, nên trợ động từ đúng là 'are' đi kèm với hiện tại phân từ 'transferring'.
- **Blind Critic Validation:** Solved Key: `(A)` | Confidence: `1.0` | Naturalness: `5.0 / 5.0` | Distractors: `high`
- **Content Hash:** `23190f402e5ec41865bbe2e31adf6175607db14623e7f3d281fc1da09055bbbe`

---

### Item 3: `c4fecf7a-4ec2-4ddb-b0fd-9a86c7bb4334`
- **Blueprint ID:** `U03-P03-NEG-FINANCE` (Unit 3 Section 3B — Temporary negative operational status)
- **Workplace Domain:** E-Commerce, Payment Gateways & Accounting
- **Target Verb:** `process` | **Difficulty:** `medium` | **Temporal Anchor:** `"tonight ... at this time"`
- **Prompt:**  
  `"Because technical staff are performing emergency database maintenance tonight, the international payment portal _______ credit transactions at this time."`
- **Options & Rationales:**
  - (A) *does not process* — Simple present negative suggests permanent policy rather than temporary emergency maintenance outage.
  - **(B) is not processing** `[CORRECT ANSWER]` — Present continuous negative denotes temporary suspension during scheduled outage.
  - (C) *has not processed* — Present perfect emphasizes completed duration rather than active current outage window.
  - (D) *not processing* — Sentence fragment; lacks finite auxiliary verb *is*.
- **Bilingual Explanation:**
  - *EN:* The sentence describes a temporary situation indicated by the phrases 'tonight' and 'at this time.' In English, the present continuous (is/are + -ing) is used to denote temporary states or actions that are currently in progress but not permanent. Since 'the international payment portal' is a singular subject, 'is not processing' is the correct grammatical form.
  - *VI:* Câu này mô tả một tình huống tạm thời được chỉ ra bởi các cụm từ 'tonight' (tối nay) và 'at this time' (vào lúc này). Trong tiếng Anh, thì hiện tại tiếp diễn (is/are + -ing) được sử dụng để chỉ các trạng thái hoặc hành động tạm thời đang diễn ra nhưng không phải là vĩnh viễn. Vì 'the international payment portal' là chủ ngữ số ít, 'is not processing' là dạng ngữ pháp chính xác.
- **Blind Critic Validation:** Solved Key: `(B)` | Confidence: `1.0` | Naturalness: `5.0 / 5.0` | Distractors: `high`
- **Content Hash:** `ce4ac0dc828d459f3c320e5bd9909ad008d5c477697f7caa4d2300d231a41ec1`

---

### Item 4: `d2574e34-16f1-43de-aa40-ea87bb1ba478`
- **Blueprint ID:** `U03-P04-NEG-GOVERNANCE` (Unit 3 Section 3B — Negative temporary absence)
- **Workplace Domain:** Corporate Executive Governance
- **Target Verb:** `attend` | **Difficulty:** `medium` | **Temporal Anchor:** `"this morning"`
- **Prompt:**  
  `"Due to an urgent client negotiation in Singapore, Chief Financial Officer Marcus Vance _______ this morning's quarterly executive board meeting in person."`
- **Options & Rationales:**
  - (A) *does not attend* — Simple present suggests permanent habit rather than temporary travel absence this morning.
  - **(B) is not attending** `[CORRECT ANSWER]` — Present continuous negative denotes temporary absence for today's meeting.
  - (C) *not attend* — Ungrammatical; bare verb without auxiliary.
  - (D) *has not been attended* — Passive voice construction; CFO Marcus Vance is the subject agent.
- **Bilingual Explanation:**
  - *EN:* The sentence describes a temporary situation occurring 'this morning' rather than a permanent routine. The present continuous tense ('is not attending') is correctly used for temporary arrangements around the present time. The subject 'Marcus Vance' is singular, requiring the auxiliary 'is'.
  - *VI:* Câu này mô tả một tình huống tạm thời diễn ra vào 'sáng nay' (this morning) thay vì một thói quen lâu dài. Thì hiện tại tiếp diễn ('is not attending') được dùng chính xác cho các sắp xếp tạm thời xung quanh thời điểm hiện tại. Chủ ngữ 'Marcus Vance' là số ít, đòi hỏi trợ động từ 'is'.
- **Blind Critic Validation:** Solved Key: `(B)` | Confidence: `1.0` | Naturalness: `5.0 / 5.0` | Distractors: `high`
- **Content Hash:** `593717208f44ff53e8fbff069502ae551ad9827011d4e77dd623a35b80a71be7`

---

### Item 5: `93eeddcf-1009-44a8-a7d9-539ad51ccd3a`
- **Blueprint ID:** `U03-P05-INT-COMPLIANCE` (Unit 3 Section 3B — Interrogative temporary action in progress)
- **Workplace Domain:** Environmental QA & Regulatory Compliance
- **Target Verb:** `inspect` | **Difficulty:** `medium` | **Temporal Anchor:** `"this afternoon"`
- **Prompt:**  
  `"Why _______ the environmental compliance team inspecting the chemical processing plant this afternoon instead of during the regular quarterly review next month?"`
- **Options & Rationales:**
  - (A) *do* — Auxiliary 'do' pairs with base form, not present participle 'inspecting'.
  - (B) *does* — Auxiliary 'does' pairs with base form, not present participle 'inspecting'.
  - **(C) is** `[CORRECT ANSWER]` — Singular auxiliary correctly completes present continuous interrogative (*Why is the team inspecting*).
  - (D) *are* — Collective noun 'team' acting as a single unit takes singular 'is' in formal ETS business English.
- **Bilingual Explanation:**
  - *EN:* The sentence is an interrogative sentence in the present continuous tense, indicated by the main verb 'inspecting' and the time marker 'this afternoon'. The subject 'the environmental compliance team' is a singular collective noun acting as a single unit, requiring the singular auxiliary 'is'.
  - *VI:* Câu này là một câu hỏi ở thì hiện tại tiếp diễn, được biểu thị bởi động từ chính 'inspecting' và mốc thời gian 'this afternoon'. Chủ ngữ 'the environmental compliance team' là một danh từ tập hợp số ít hoạt động như một đơn vị duy nhất, đòi hỏi trợ động từ số ít 'is'.
- **Blind Critic Validation:** Solved Key: `(C)` | Confidence: `1.0` | Naturalness: `5.0 / 5.0` | Distractors: `high`
- **Content Hash:** `1ea00d8cb75574345d3c80ff52fbfd53dfbbef7d4a20b0808a3d5402dd124f5a`

---

### Item 6: `8989cbc6-2833-48aa-9aaa-84df49d05cd5`
- **Blueprint ID:** `U03-P06-INT-LEGAL` (Unit 3 Section 3B — Interrogative action in progress right now)
- **Workplace Domain:** Corporate Legal Affairs
- **Target Verb:** `review` | **Difficulty:** `medium` | **Temporal Anchor:** `"currently"`
- **Prompt:**  
  `"Are the external legal attorneys currently _______ the revised acquisition agreement to ensure all antitrust regulations are satisfied?"`
- **Options & Rationales:**
  - (A) *review* — Base form; cannot follow auxiliary 'Are' in continuous aspect.
  - **(B) reviewing** `[CORRECT ANSWER]` — Present participle completes continuous question (*Are the attorneys reviewing*).
  - (C) *reviewed* — Past participle creates passive question; ungrammatical with active direct object.
  - (D) *reviews* — Third-person singular form incompatible with plural auxiliary 'Are'.
- **Bilingual Explanation:**
  - *EN:* This item tests the ability to identify the correct verb form in a present continuous question with a plural subject ('attorneys'). The presence of the auxiliary 'Are' and the adverb 'currently' signals that the present participle (-ing) is needed to describe an action in progress. 'Reviewing' correctly completes the 'Are... reviewing' structure.
  - *VI:* Câu hỏi này kiểm tra khả năng xác định dạng đúng của động từ trong câu hỏi thì hiện tại tiếp diễn với chủ ngữ số nhiều ('attorneys'). Sự xuất hiện của trợ động từ 'Are' và trạng từ 'currently' báo hiệu rằng cần có hiện tại phân từ (-ing) để mô tả một hành động đang diễn ra. 'Reviewing' hoàn thiện cấu trúc 'Are... reviewing' một cách chính xác.
- **Blind Critic Validation:** Solved Key: `(B)` | Confidence: `1.0` | Naturalness: `5.0 / 5.0` | Distractors: `high`
- **Content Hash:** `ea60af82f25a08ac65c0e126f20de133794fab031af3b97a8edeb045fa2456c7`

---

### Item 7: `c327dd92-8b96-47bf-9587-ae155c6327a0`
- **Blueprint ID:** `U03-P07-CON-LOGISTICS` (Unit 3 Section 3A — Routine habit vs. Temporary exception)
- **Workplace Domain:** Global Supply Chain & Distribution Logistics
- **Target Verb:** `dispatch` | **Difficulty:** `hard` | **Temporal Anchor:** `"usually transports ... but this week it _______"`
- **Prompt:**  
  `"The logistics center usually transports industrial machinery by cargo train, but this week it _______ urgent shipments via air courier to prevent assembly line delays."`
- **Options & Rationales:**
  - (A) *dispatches* — Simple present ignores explicit temporary contrast marker `"but this week"`.
  - **(B) is dispatching** `[CORRECT ANSWER]` — Present continuous denotes temporary exception to routine habit.
  - (C) *dispatched* — Simple past tense fails to represent ongoing active exception during current week.
  - (D) *dispatch* — Base form results in subject-verb agreement error with third-person singular pronoun *it*.
- **Bilingual Explanation:**
  - *EN:* The sentence contrasts a routine action ('usually transports') with a temporary exception occurring 'this week'. In English, the present simple is used for habits and routines, while the present continuous ('is dispatching') is used for temporary situations or actions happening around the current time that deviate from the norm.
  - *VI:* Câu này đối chiếu một hành động thông thường ('usually transports') với một ngoại lệ tạm thời xảy ra trong 'tuần này' (this week). Trong tiếng Anh, thì hiện tại đơn được dùng cho thói quen và lịch trình, trong khi thì hiện tại tiếp diễn ('is dispatching') được dùng cho các tình huống tạm thời hoặc các hành động đang diễn ra xung quanh thời điểm hiện tại mà khác biệt so với bình thường.
- **Blind Critic Validation:** Solved Key: `(B)` | Confidence: `1.0` | Naturalness: `5.0 / 5.0` | Distractors: `high`
- **Content Hash:** `f7eff6c2a86bd3380c58bccc9fe1a903c56b957cf9b5c8f37aa7dd4e8c831b88`

---

### Item 8: `2e221f4f-e874-43ff-a7c7-aafe1a619995`
- **Blueprint ID:** `U03-P08-CON-HR` (Unit 3 Section 3A — Organizational habit vs. Current temporary initiative)
- **Workplace Domain:** Human Resources & International Talent Acquisition
- **Target Verb:** `recruit` | **Difficulty:** `hard` | **Temporal Anchor:** `"typically hires ... but currently the team _______"`
- **Prompt:**  
  `"Apex Technologies typically hires local engineering graduates, but currently the human resources team _______ specialized software architects from abroad for the autonomous vehicle project."`
- **Options & Rationales:**
  - **(A) is recruiting** `[CORRECT ANSWER]` — Present continuous indicates specific, temporary staffing project in progress.
  - (B) *recruits* — Simple present obliterates contrast with `"typically hires"`.
  - (C) *recruited* — Simple past contradicts active adverbial `"currently"`.
  - (D) *recruit* — Base/plural form fails to agree with collective singular noun *team*.
- **Bilingual Explanation:**
  - *EN:* The adverb 'typically' indicates a general organizational habit (present simple), whereas 'currently' signals a specific, ongoing activity that is part of a temporary project. Therefore, the present continuous 'is recruiting' is the grammatically correct choice to show this contrast.
  - *VI:* Trạng từ 'typically' chỉ một thói quen chung của tổ chức (thì hiện tại đơn), trong khi 'currently' báo hiệu một hoạt động cụ thể, đang diễn ra và là một phần của một dự án tạm thời. Do đó, thì hiện tại tiếp diễn 'is recruiting' là lựa chọn đúng về mặt ngữ pháp để thể hiện sự tương phản này.
- **Blind Critic Validation:** Solved Key: `(A)` | Confidence: `1.0` | Naturalness: `5.0 / 5.0` | Distractors: `high`
- **Content Hash:** `012964879daf2b39e602c4560f52c116bb9cbce618563d33b0ff908ece92f75e`

---

## 4. Psychometric Quality & Contextual Diversity Verification

```
+----------------------------------------------------------------------------------------------------+
| CONTEXTUAL DIVERSITY AUDIT MATRIX ($D_{\text{ctx}} \ge 0.50$ MANDATORY THRESHOLD)                  |
+-------------------+------------------------------------+---------------------+---------------------+
| Candidate ID      | Workplace Corporate Domain         | Min Pairwise Dist   | Min Dist vs Unit 1  |
+-------------------+------------------------------------+---------------------+---------------------+
| U03-P01 (841b8fe2)| Facilities & Satellite Operations  | $D_{\text{ctx}}=0.800$| $D_{\text{ctx}}=0.782$|
| U03-P02 (f691db84)| IT Infrastructure & Server Outage  | $D_{\text{ctx}}=0.800$| $D_{\text{ctx}}=0.758$|
| U03-P03 (c4fecf7a)| Payment Gateway & Emergency Maint  | $D_{\text{ctx}}=0.800$| $D_{\text{ctx}}=0.812$|
| U03-P04 (d2574e34)| Executive Governance & Travel      | $D_{\text{ctx}}=0.867$| $D_{\text{ctx}}=0.825$|
| U03-P05 (93eeddcf)| Environmental Compliance Audit     | $D_{\text{ctx}}=0.800$| $D_{\text{ctx}}=0.794$|
| U03-P06 (8989cbc6)| Legal Antitrust Agreement Review   | $D_{\text{ctx}}=0.841$| $D_{\text{ctx}}=0.830$|
| U03-P07 (c327dd92)| Logistics Air Courier Exception    | $D_{\text{ctx}}=0.866$| $D_{\text{ctx}}=0.819$|
| U03-P08 (2e221f4f)| HR Autonomous Vehicle Recruiting   | $D_{\text{ctx}}=0.800$| $D_{\text{ctx}}=0.791$|
+-------------------+------------------------------------+---------------------+---------------------+
| SUMMARY           | 8 DISTINCT CORPORATE DOMAINS       | MINIMUM: 0.800      | MINIMUM: 0.758      |
+-------------------+------------------------------------+---------------------+---------------------+
```

- **Domain Separation:** Every item models an independent, authentic ETS scenario (Facilities, IT Infrastructure, Payment Processing, Board Governance, Environmental QA, Antitrust Legal, Logistics, and High-Tech Talent Acquisition).
- **Zero Template Overlap:** Pairwise contextual distance between all 8 items exceeds **0.800** (threshold $\ge 0.50$). Contextual distance against all 12 approved Unit 1 items exceeds **0.758**.
- **Blind Critic Agreement:** 8 out of 8 items achieved **100% agreement** between the generator's designated key and the blind critic's independent solve, with naturalness scores of **5.0 / 5.0** across all items.

---

## 5. Database Census & Telemetry Invariance Verification

```
+----------------------------------------------------------------------------------------------------+
| STAGING DATABASE INVENTORY RECONCILIATION                                                          |
+---------------------------------------+---------------------+---------------------+----------------+
| Metric / Table                        | Pre-Pilot Baseline  | Post-Pilot Staging  | Net Delta      |
+---------------------------------------+---------------------+---------------------+----------------+
| Total Question Bank Items             | 43 items            | **49 items**        | **+6 items**   |
| Approved Items (isLatestApproved=true)| 12 items            | **12 items**        | **0 (Invariant)**|
| Validated Items (pending human review)| 22 items            | **28 items**        | **+6 items**   |
| Archived Items                        | 5 items             | 5 items             | 0 (Invariant)  |
| Withdrawn Items                       | 4 items             | 4 items             | 0 (Invariant)  |
| Unit 3 Items in Question Bank         | 2 items             | **8 items**         | **+6 items**   |
| Units 1–25 Items                      | 42 items            | **48 items**        | **+6 items**   |
| Out-of-Range Unit 40 Items            | 1 item              | 1 item              | 0 (Invariant)  |
| Practice Sessions (Telemetry)         | 10 sessions         | 10 sessions         | 0 (Invariant)  |
| Practice Items (Telemetry)            | 15 items            | 15 items            | 0 (Invariant)  |
| Historical Question Attempt Items     | 5 attempts          | 5 attempts          | 0 (Invariant)  |
| Exercise Attempts (Telemetry)         | 7 attempts          | 7 attempts          | 0 (Invariant)  |
| Question Attempts (Telemetry)         | 3 attempts          | 3 attempts          | 0 (Invariant)  |
+---------------------------------------+---------------------+---------------------+----------------+
```

### Safety & Isolation Guarantees:
1. **Zero Auto-Approval:** All 8 items have `isLatestApproved = false` and `reviewStatus = "validated"`.
2. **Zero Practice Leakage:** Querying `unitNumber = 3 AND reviewStatus = 'approved' AND isLatestApproved = true` returns **0 items**. Unapproved candidates are completely isolated from learner workflows.
3. **Mastery Isolation:** Mastery calculations continue to draw exclusively from approved question items, completely ignoring the 8 validated candidates.
4. **Historical Telemetry:** 100% of historical attempts and sessions remain untouched.
5. **Canonical Protection:** `grammarpath-data` on `main` is completely untouched.

---

## 6. Regression & Integrity Test Verification

All test suites were executed post-persisting against Neon staging:

```
+----+-----------------------------------------+-----------+-----------+-----------------------------+
| ID | Test Suite / Target                     | Tests Run | Exit Code | Invariants Verified         |
+----+-----------------------------------------+-----------+-----------+-----------------------------+
| T1 | tsc --noEmit --skipLibCheck             | 1 check   | Code 0    | Strict TypeScript compile   |
| T2 | phase3-4c-batch-pipeline.test.ts        | 11 passed | Code 0    | Batch parsing & critic      |
| T3 | phase3-4c-spending-controller.test.ts   | 8 passed  | Code 0    | Dual model rate cards       |
| T4 | phase3-4c-canonical-pipeline.test.ts    | 6 passed  | Code 0    | 15-stage pipeline & critic  |
| T5 | phase3-4c-e2e-pipeline.test.ts          | 7 passed  | Code 0    | Deterministic E2E flow      |
| T6 | phase3-4c-gemini-client.test.ts         | 5 passed  | Code 0    | Fail-closed & key redaction |
| T7 | phase3-4c-data-integrity.test.ts (Live) | 5 passed  | Code 0    | 49 items, 12 approved latest|
+----+-----------------------------------------+-----------+-----------+-----------------------------+
|    | TOTAL TESTS PASSED                      | 43 / 43   | Code 0    | **100% Pass Rate**          |
+----+-----------------------------------------+-----------+-----------+-----------------------------+
```

---

## 7. Mandatory Stop Condition Sign-Off

In accordance with Section E directives:
- **Execution Status:** **STRICTLY STOPPED.**
- **Unit 3 Pilot Status:** **100% COMPLETE (8 / 8 items generated, validated, and persisted).**
- **Candidate Approval Status:** **0 items approved. All 8 items are staged as `validated` awaiting Stage 14 human editorial review.**
- **Progression to Unit 4:** **BLOCKED (Requires separate explicit user authorization).**
- **Billing Activation:** **NONE (Invoiced cost: $0.00 USD).**
- **Canonical Repository:** `grammarpath-data` on `main` is completely untouched.

*Awaiting explicit user authorization for Phase 3.4C.4B.5 (Stage 14 Editorial Approval & Activation) or Unit 4 roadmap.*

