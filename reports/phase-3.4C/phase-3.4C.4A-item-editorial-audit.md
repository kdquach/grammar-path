# GrammarPath — Phase 3.4C.4A: Item Editorial Quality Audit
## Rigorous Linguistic, Syntactic, and Pedagogical Assessment of Bank Inventory

**Author:** Antigravity (Principal Learning Engineer & Assessment Specialist)  
**Milestone:** Phase 3.4C.4A (Question Bank Curation & Editorial Readiness)  
**Date:** November 14, 2026  
**Environment:** Neon PostgreSQL Staging  
**Items Evaluated:** 30 Active Items (3 Approved + 27 Validated)  

---

## 1. Editorial Assessment Principles & Methodology

Automated parsers and LLM quality scoring algorithms evaluate structural markers (e.g., presence of 4 options, sentence length, absence of forbidden regex patterns). However, **automated quality scores do NOT equal editorial validity or pedagogical fitness**.

Every active question item in GrammarPath must satisfy eight non-negotiable linguistic and psychometric criteria:
1. **Unambiguous Correct Answer:** Exactly one option completes the sentence grammatically and semantically.
2. **Grammatical Correctness:** The sentence as completed adheres to standard North American/International Business English grammar.
3. **Natural Workplace Collocation:** Verbs and objects must reflect authentic business usage (e.g., technicians do not *"enter"* hardware; they *repair* or *configure* it).
4. **Distractor Plausibility:** Distractors must represent typical learner error archetypes (e.g., tense confusion, aspect error, subject-verb agreement) rather than nonsensical gibberish.
5. **Calibrated Difficulty:** Difficulty rating (easy, medium, hard) must reflect cognitive load, syntactic embedding, and distractor subtlety.
6. **Explanation Accuracy:** Rationales must clearly state why the correct option is required and why distractors fail, referencing canonical grammar rules.
7. **Pedagogical Alignment:** The sentence blank must isolate the target grammar concept mapped to the item, rather than testing unrelated peripheral structures.
8. **Contextual Independence:** Carrier scenarios must vary across distinct workplace domains to prevent priming effects.

---

## 2. In-Depth Audit of Approved Items (3 Records)

In Phase 3.4B, three items were approved for Unit 1. A critical finding of this audit is that **two of the three approved items suffer from severe semantic collocation defects** introduced when sentence templates were standardized.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ SUMMARY OF APPROVED ITEMS AUDIT                                                                 │
├─────────────────────┬───────────────────┬──────────────┬───────────────────────────┬────────────┤
│ Item ID             │ Sentence Blank    │ Target Key   │ Workplace Context         │ Verdict    │
├─────────────────────┼───────────────────┼──────────────┼───────────────────────────┼────────────┤
│ 7d9abd94 (Root 0fda)│ _______ hardware  │ is entering  │ IT Server Maintenance     │ REJECT (A) │
│ 44931eb1 (Root 634a)│ _______ hardware  │ is explaining│ IT Server Maintenance     │ REJECT (B) │
│ 45e751fd (Root b19e)│ _______ hardware  │ is repairing │ IT Server Maintenance     │ ACCEPT     │
└─────────────────────┴───────────────────┴──────────────┴───────────────────────────┴────────────┘
(A) Severe verb-object collocation error ("enter hardware").
(B) Semantic anomaly ("explain hardware" to a room/object).
```

### Forensic Analysis:
1. **Item `7d9abd94` (`Root 0fda8409`, Version 2):**
   - *Prompt:* `"The IT technician is not at his desk because he _______ the server hardware in Room 3 right now."`
   - *Correct Option:* `[A] is entering`
   - *Linguistic Finding:* In standard English, the transitive verb *enter* selects a spatial destination (e.g., *"enter the conference hall"*) or data/records (e.g., *"enter the passcode"*). One cannot syntactically or semantically "enter hardware."
   - *Provenance Root Cause:* Version 1 (`33581778`) had prompt: *"The marketing director _______ the main conference hall with our new client"*. When Version 2 swapped the carrier sentence to the IT technician template, the original option set (`is entering / enters / entered / enter`) was retained without adjusting the object.
   - *Editorial Decision:* **WITHDRAW OR REVISE IMMEDIATELY**. Disqualify from live learner exposure and transfer evidence.

2. **Item `44931eb1` (`Root 634add4d`, Version 2):**
   - *Prompt:* `"The IT technician is not at his desk because he _______ the server hardware in Room 3 right now."`
   - *Correct Option:* `[B] is explaining`
   - *Linguistic Finding:* The verb *explain* requires an intellectual topic, problem, or procedure as its direct object (e.g., *"explain the new protocol"*). One does not "explain hardware" without an explicit prepositional adjunct (e.g., *"explain the operation of..."*).
   - *Provenance Root Cause:* Version 1 (`5131bba7`) had prompt: *"Our team leader _______ the new safety protocols in the auditorium"*. Replacing the prompt with the server hardware template caused a collocation failure.
   - *Editorial Decision:* **WITHDRAW OR REVISE IMMEDIATELY**. Disqualify from live learner exposure and transfer evidence.

3. **Item `45e751fd` (`Root b19ebb8c`, Version 2):**
   - *Prompt:* `"The IT technician is not at his desk because he _______ the server hardware in Room 3 right now."`
   - *Correct Option:* `[B] is repairing`
   - *Linguistic Finding:* Syntactically sound, natural business collocation (*"repair hardware"*), single unambiguous key, valid distractors (`repairs`, `repaired`, `repair`).
   - *Editorial Decision:* **KEEP APPROVED**. This is the **only genuinely valid approved item** currently in the staging bank for Unit 1.

---

## 3. In-Depth Audit of Validated Items (27 Records)

The 27 validated items represent candidates awaiting human editorial approval. Our audit partitions them into three distinct quality categories:

```
┌────────────────────────────────────────────────────────────────────────┐
│ VALIDATED ITEMS QUALITY DISTRIBUTION (27 ITEMS)                        │
├────────────────────────────────────────────────────────────────────────┤
│ 1. HIGH QUALITY / EDITORIALLY READY (18 Items)                         │
│    • Unit 1: 7 items (b7c4793c, c46da3b7, 0f51d836, 2afc939e,         │
│                       2997562b, 7a3359ae, 322c0e5c)                    │
│    • Unit 2: 8 items (32ed699c, a47fbe81, eb746b7c, a6c7ae58,         │
│                       f5381446, f89aceea, 92a0e4b0, a9d29ec3)          │
│    • Unit 4: 1 item  (fe61381a)                                        │
│    • Unit 5: 2 items (0707bbd2, 4ce8fea3)                              │
├────────────────────────────────────────────────────────────────────────┤
│ 2. SEVERELY MISALIGNED CONCEPT MAPPING (7 Items)                       │
│    • Unit 3: 4 items (6948841f -> Unit 6; c10918d0 -> Unit 6;          │
│                       77299aeb -> Unit 38/40; 43753724 -> Unit 5)      │
│    • Unit 4: 3 items (ac0c643a -> Unit 2; 6e803d45 -> Unit 1;         │
│                       7addbaf6 -> Unit 1)                              │
├────────────────────────────────────────────────────────────────────────┤
│ 3. PERIPHERAL / DUPLICATE / NEEDING REVISION (2 Items)                 │
│    • Unit 1: fa201c0b (tests Unit 3/4 stative contrast "prefers")      │
│    • Unit 1: fe5dcc57 (collides in IT domain with 45e751fd)            │
└────────────────────────────────────────────────────────────────────────┘
```

### Detailed Findings by Curriculum Unit:

#### A. Unit 1 Validated Items (9 items)
- **`b7c4793c` (Market share growth):** Excellent. Authentic TOEIC Part 5 financial reporting context (*"market share is growing steadily"*). Distractors test tense and voice (`grew`, `grows`, `was grown`). Ready for approval.
- **`c46da3b7` (Leave policy debate):** Excellent. Tests question syntax and continuous aspect (*"Why are so many employees debating... today?"*). Distractors plausible (`do / debate`, `have / debated`). Ready for approval.
- **`0f51d836` (Marketing director phone call):** High quality. Natural executive workplace scenario (*"is calling an important client"*). Contrasts temporary action with habitual. Ready for approval.
- **`2afc939e` (Financial review):** High quality. Professional executive scenario (*"is conducting a comprehensive quarterly financial review"*). Ready for approval.
- **`2997562b` (Automotive robotics):** Excellent advanced TOEIC item (*"is incorporating more and more automated robotic units"*). Tests dynamic process of change (Rule 1E). Ready for approval.
- **`7a3359ae` (Executive committee merger):** High quality (*"is meeting foreign representatives all afternoon"*). Tests temporary arrangement (Rule 1C). Ready for approval.
- **`322c0e5c` (Logistics customs delays):** Excellent. Logistics shipping domain (*"are experiencing unusually severe customs delays these weeks"*). Ready for approval.
- **`fa201c0b` (Investment preferences):** *Editorial Revision Required*. The sentence blank targets `"prefers"` (Present Simple stative verb), while the continuous verb `"is currently considering"` is already supplied in the subordinate clause. It belongs in Unit 3/4, not Unit 1.
- **`fe5dcc57` (Cybersecurity protocol):** Well-formed Part 5 item (*"is installing a new cybersecurity protocol"*), but belongs to the IT technology domain, sharing high semantic overlap with item `45e751fd`. Can be retained in bank as alternate item.

#### B. Unit 2 Validated Items (8 items)
All 8 items are linguistically sound, display strong distractor balance, and accurately assess Present Simple habits, routines, schedules, and general business truths:
- `32ed699c` (Courier deliveries - logistics schedule)
- `a47fbe81` (Software developer cubicles - permanent workplace state)
- `eb746b7c` (Express shuttle timetable - scheduled public transit)
- `a6c7ae58` (Legal department contract approval - policy negative form)
- `f5381446` (Negative inversion with *Seldom does* - advanced Part 5 syntax)
- `f89aceea` (Office hours - standard corporate operating schedule)
- `92a0e4b0` (HR verification letters - standard corporate procedure)
- `a9d29ec3` (Economic currency volatility - business cause-and-effect truth)

#### C. Unit 3 Validated Items: Critical Structural Misalignment (4 items)
Unit 3 in *English Grammar in Use* covers **Present continuous and present simple 1 (I am doing and I do)** (contrasting ongoing temporary actions vs habitual/general states). 

Our audit discovered that **zero of the four validated items in Unit 3 test Unit 3 grammar**:
1. **`6948841f`:** *"Mr. Lin _______ at his desk when the fire alarm suddenly sounded..."* Correct: `was working`. **This is Past Continuous (Unit 6), not Unit 3.**
2. **`c10918d0`:** *"While the project coordinator _______ the contract terms, the client asked..."* Correct: `was reviewing`. **This is Past Continuous (Unit 6), not Unit 3.**
3. **`77299aeb`:** *"Had the compliance inspector _______ the discrepancy earlier, the company would not have faced..."* Correct: `noticed`. **This is an Inverted Third Conditional (Unit 38/40), not Unit 3.**
4. **`43753724`:** *"Last Friday, the board members _______ to approve the proposed budget."* Correct: `voted`. **This is Past Simple (Unit 5), not Unit 3.**

*Editorial Impact:* Approving these items under `unit.003` would catastrophically corrupt learner mastery calculations, measuring conditional and past-tense competence as present-tense contrast.

#### D. Unit 4 Validated Items (4 items)
Unit 4 covers **Present continuous and present simple 2 (Stative verbs not used in continuous)**:
1. **`fe61381a`:** *"The chief scientist _______ whether the synthesized compound remains chemically stable..."* Correct: `doubts`. **Properly aligned.** Tests stative verb of mental attitude (*doubt*).
2. **`ac0c643a`:** *"Dr. Evans _______ three medical research articles every year..."* Correct: `publishes`. **Misaligned.** Tests frequency habit (*every year*), which is standard Unit 2 grammar, not stative verbs.
3. **`6e803d45`:** *"Listen to the speaker; she _______ the summary of today's meeting."* Correct: `is giving`. **Misaligned.** Tests action at moment of speaking (Unit 1).
4. **`7addbaf6`:** *"Listen to the CEO's keynote address; she _______ the company's visionary plan."* Correct: `is explaining`. **Misaligned and Template Duplicate.** Replicates prompt structure of `6e803d45` and tests Unit 1 grammar.

#### E. Unit 5 Validated Items (2 items)
- `0707bbd2` (*"The technician found the problem..."*) and `4ce8fea3` (*"Ms. Tanaka delivered the marketing report..."*).
- Both correctly assess Unit 5 Past Simple (irregular and regular verb forms).
- Both include detailed Vietnamese distractor explanations generated during Phase 3.4B. High pedagogical quality; ready for approval.

---

## 4. Synthesis of Items Requiring Editorial Remediation

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ACTIONABLE EDITORIAL REMEDIATION MATRIX                                                          │
├────────────┬─────────────┬─────────────┬──────────────────────────┬──────────────────────────────┤
│ Item ID    │ Current Unit│ Correct Unit│ Remediation Type         │ Specific Justification       │
├────────────┼─────────────┼─────────────┼──────────────────────────┼──────────────────────────────┤
│ 7d9abd94   │ Unit 1      │ Unit 1      │ Revise / Re-author v3    │ "enter hardware" collocation │
│ 44931eb1   │ Unit 1      │ Unit 1      │ Revise / Re-author v3    │ "explain hardware" anomaly   │
│ fa201c0b   │ Unit 1      │ Unit 3      │ Reclassify Concept ID    │ Tests simple/cont contrast   │
│ 6948841f   │ Unit 3      │ Unit 6      │ Reclassify Concept ID    │ Past Continuous structure    │
│ c10918d0   │ Unit 3      │ Unit 6      │ Reclassify Concept ID    │ Past Continuous structure    │
│ 77299aeb   │ Unit 3      │ Unit 38/40  │ Reclassify Concept ID    │ Inverted 3rd Conditional     │
│ 43753724   │ Unit 3      │ Unit 5      │ Reclassify Concept ID    │ Past Simple time marker      │
│ ac0c643a   │ Unit 4      │ Unit 2      │ Reclassify Concept ID    │ Habitual frequency "publishes│
│ 6e803d45   │ Unit 4      │ Unit 1      │ Reclassify Concept ID    │ Sensory prompt "Listen!"     │
│ 7addbaf6   │ Unit 4      │ Unit 1      │ Archive / Reclassify     │ Near-duplicate of 6e803d45   │
└────────────┴─────────────┴─────────────┴──────────────────────────┴──────────────────────────────┘
```

---

## 5. Editorial Conclusion & Next Steps

1. **Unit 1 has 7 pristine, high-diversity validated items** (`b7c4793c`, `c46da3b7`, `0f51d836`, `2afc939e`, `2997562b`, `7a3359ae`, `322c0e5c`) ready for immediate editorial approval by the system owner.
2. **Approved items `7d9abd94` and `44931eb1` must be re-authored or quarantined**, leaving `45e751fd` as the primary approved benchmark.
3. **No items from Unit 3 should be approved under `unit.003`** until proper present-tense contrast items are authored.

