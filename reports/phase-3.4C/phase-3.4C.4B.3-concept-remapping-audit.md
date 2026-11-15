# GrammarPath — Phase 3.4C.4B.3: Concept Remapping Audit Report
## Item-by-Item Pedagogical Audit, Curriculum Mapping Evidence, and Decision Classification

**Author:** Antigravity (Principal Learning Engineer, Educational Data Scientist, & Assessment Specialist)  
**Milestone:** Phase 3.4C.4B.3 (Unit 3 & Unit 4 Concept Remapping)  
**Date:** November 14, 2026  
**Environment:** Neon PostgreSQL Staging (`grammarpath-staging`)  
**Scope:** 10 Identified TOEIC Question Bank Candidates  
**Canonical Curriculum:** *English Grammar in Use* (4th Edition), Units 1–145  

---

## 1. Executive Summary & Audit Methodology

During Phase 3.4B seed ingestion, automated concept assignment mapped several TOEIC Part 5 questions to concepts based on preliminary file naming rather than grammatical syntax. Consequently, questions in Units 3 and 4 were linked to `unit.003` and `unit.004` regardless of their actual linguistic target.

In this milestone, we conduct an item-by-item pedagogical audit of the 10 candidate items. In accordance with strict guidelines:
- **We do not infer the correct mapping from the existing `unitNumber`.**
- **We do not force a single concept when the question genuinely tests multiple competencies.**
- **We do not invent new concepts to make questions fit.**

Each item is classified into one of four formal states:
- `CONFIRMED_REMAP`: Unambiguous alignment to a single canonical concept supported by explicit textbook evidence.
- `MULTI_CONCEPT_REVIEW`: Question genuinely spans multiple grammatical competencies and should not be forced into a single unit.
- `NO_VALID_MAPPING`: Question is linguistically defective or unmappable to Murphy curriculum.
- `KEEP_CURRENT_MAPPING`: Current concept association is pedagogically accurate.

---

## 2. Granular Audit of the 10 Candidates

### Item 1: `43753724-dcb3-4681-adb5-5d0c71d34b7c`
- **Current Database Mapping:** Unit 3 | Concept: `unit.003` (`Present continuous and present simple 1`) | Rule: `3A`
- **Prompt:**
  > `"Last Friday, the board members _______ to approve the proposed budget."`
- **Options:**
  - `[A] vote` (Distractor: Bare plural present; incompatible with past anchor)
  - `[B] voted` (**CORRECT KEY**)
  - `[C] were voting` (Distractor: Past continuous; incompatible with single point-event decision)
  - `[D] are voting` (Distractor: Present continuous; incompatible with past anchor)
- **Explanation:** *"Dấu hiệu 'Last Friday' chỉ thời điểm quá khứ hoàn tất, chia 'voted'."*
- **Actual Competency Tested:** Finished past event denoted by a specific completed temporal adjunct (*"Last Friday"*).
- **Murphy Curriculum Analysis:**
  - *English Grammar in Use*, Unit 5 (*Past simple (I did)*), Section A & B:
    > *"Very often the past simple ends in -ed (regular verbs)... We use the past simple for finished events in the past (e.g. yesterday, last Friday, in 2010)."*
  - Unit 3 in Murphy covers the contrast between *I do* (general/habitual) and *I am doing* (temporary/ongoing). This item contains zero present-tense contrast.
- **Evidence for Remapping:** Explicit deictic time anchor *"Last Friday"* + completed affirmative transitive action $\to$ Past Simple.
- **Classification:** **`CONFIRMED_REMAP`** $\to$ **Unit 5 (`unit.005`)**, Rule `5A`.

---

### Item 2: `6948841f-9dc6-487c-83ed-04c6ebfbc9fe`
- **Current Database Mapping:** Unit 3 | Concept: `unit.003` (`Present continuous and present simple 1`) | Rule: `3B`
- **Prompt:**
  > `"Mr. Lin _______ at his desk when the fire alarm suddenly sounded throughout the building."`
- **Options:**
  - `[A] worked` (Distractor: Simple past; lacks ongoing progressive aspect)
  - `[B] was working` (**CORRECT KEY**)
  - `[C] works` (Distractor: Simple present; clashes with past *sounded*)
  - `[D] has worked` (Distractor: Present perfect; clashes with past sequence)
- **Explanation:** *"Hành động đang diễn ra trong quá khứ ('was working') bị gián đoạn."*
- **Actual Competency Tested:** An ongoing continuous action in the past interrupted by a sudden point action in the simple past.
- **Murphy Curriculum Analysis:**
  - *English Grammar in Use*, Unit 6 (*Past continuous (I was doing)*), Section B:
    > *"We use the past continuous to say that somebody was in the middle of doing something at a certain time... Often the action was ongoing when another event happened: 'I was walking home when I met Dave'."*
  - The sentence structure is a textbook instance of: `[Past Continuous] + when + [Past Simple]`.
- **Evidence for Remapping:** Background ongoing action (*was working*) interrupted by sudden point event (*the fire alarm suddenly sounded*).
- **Classification:** **`CONFIRMED_REMAP`** $\to$ **Unit 6 (`unit.006`)**, Rule `6B`.

---

### Item 3: `77299aeb-93d6-483e-9f77-4d5a8c67496a`
- **Current Database Mapping:** Unit 3 | Concept: `unit.003` (`Present continuous and present simple 1`) | Rule: `3B`
- **Prompt:**
  > `"Had the compliance inspector _______ the discrepancy earlier, the company would not have faced regulatory fines."`
- **Options:**
  - `[A] noticed` (**CORRECT KEY**)
  - `[B] notice` (Distractor: Bare infinitive)
  - `[C] noticing` (Distractor: Present participle)
  - `[D] was noticing` (Distractor: Past continuous auxiliary)
- **Explanation:** *"Đảo ngữ điều kiện loại 3: 'Had + S + V3/ed' -> 'noticed'."*
- **Actual Competency Tested:** Inverted Third Conditional (formal hypothetical counterfactual in past time).
- **Murphy Curriculum Analysis:**
  - *English Grammar in Use*, Unit 40 (*If I had known ... I wish I had known ...*), Section A & B, and Appendix 1:
    > *"Had you told me earlier... = If you had told me earlier. In formal situations we can use Had + subject + past participle instead of If + subject + had..."*
  - Mapping this advanced conditional construct to Unit 3 (*Present continuous and present simple 1*) is a severe pedagogical defect.
- **Evidence for Remapping:** Third conditional counterfactual structure (*"Had + S + [V3/ed] ... would not have faced"*).
- **Classification:** **`CONFIRMED_REMAP`** $\to$ **Unit 40 (`unit.040`)**, Rule `40B`.

---

### Item 4: `c10918d0-496f-4766-a6c5-923445203650`
- **Current Database Mapping:** Unit 3 | Concept: `unit.003` (`Present continuous and present simple 1`) | Rule: `3B`
- **Prompt:**
  > `"While the project coordinator _______ the contract terms, the client asked for clarification on payment schedules."`
- **Options:**
  - `[A] reviewed` (Distractor: Simple past; lacks progressive aspect with *While*)
  - `[B] was reviewing` (**CORRECT KEY**)
  - `[C] has reviewed` (Distractor: Present perfect)
  - `[D] is reviewing` (Distractor: Present continuous; clashes with past tense *asked*)
- **Explanation:** *"Cấu trúc 'While + Past Continuous': hành động đang diễn ra trong quá khứ ('was reviewing') thì hành động khác xen vào ('asked')."*
- **Actual Competency Tested:** Past continuous governed by temporal conjunction *"While"* interrupted by a point event in the past simple.
- **Murphy Curriculum Analysis:**
  - *English Grammar in Use*, Unit 6 (*Past continuous (I was doing)*), Section C:
    > *"You can say that something happened (past simple) in the middle of something else (past continuous): 'While I was working, the phone rang'."*
  - It does not involve present simple or present continuous.
- **Evidence for Remapping:** Subordinate temporal clause introduced by *"While"* requiring past continuous (*was reviewing*) coordinated with past simple main verb (*asked*).
- **Classification:** **`CONFIRMED_REMAP`** $\to$ **Unit 6 (`unit.006`)**, Rule `6C`.

---

### Item 5: `6e803d45-15fe-4fb7-8f35-5f7636947888`
- **Current Database Mapping:** Unit 4 | Concept: `unit.004` (`Present continuous and present simple 2`) | Rule: `4A`
- **Prompt:**
  > `"Listen to the speaker; she _______ the summary of today's meeting."`
- **Options:**
  - `[A] is giving` (**CORRECT KEY**)
  - `[B] gives` (Distractor: Simple present routine)
  - `[C] gave` (Distractor: Simple past)
  - `[D] give` (Distractor: Bare plural/infinitive)
- **Explanation:** *"Mệnh lệnh 'Listen...' báo hiệu hành động đang diễn ra: 'is giving'."*
- **Actual Competency Tested:** Present continuous for an action taking place at the moment of speaking, cued by an imperative sensory command (*"Listen to..."*).
- **Murphy Curriculum Analysis:**
  - *English Grammar in Use*, Unit 1 (*Present continuous (I am doing)*), Section A:
    > *"The action is not finished... 'Listen to those people. What language are they speaking?'"*
  - Unit 4 in Murphy covers stative verbs not used in the continuous (e.g. *believe, doubt, understand, like, know*). The verb *give* is a dynamic transitive verb, not a stative verb.
- **Evidence for Remapping:** Sensory imperative command (*"Listen to the speaker"*) establishes immediate moment of speaking; requires present continuous form of dynamic verb *give*.
- **Classification:** **`CONFIRMED_REMAP`** $\to$ **Unit 1 (`unit.001`)**, Rule `1A`.

---

### Item 6: `7addbaf6-e0f1-47c4-a31d-f0196200c087`
- **Current Database Mapping:** Unit 4 | Concept: `unit.004` (`Present continuous and present simple 2`) | Rule: `4A`
- **Prompt:**
  > `"Listen to the CEO's keynote address; she _______ the company's visionary five-year expansion plan."`
- **Options:**
  - `[A] is explaining` (**CORRECT KEY**)
  - `[B] explains` (Distractor: Simple present)
  - `[C] explained` (Distractor: Simple past)
  - `[D] has explained` (Distractor: Present perfect)
- **Explanation:** *"Mệnh lệnh 'Listen to...' chỉ hành động đang diễn ra lúc nói: 'is explaining'."*
- **Actual Competency Tested:** Action taking place at the moment of speaking cued by an introductory sensory imperative (*"Listen to..."*).
- **Murphy Curriculum Analysis:**
  - *English Grammar in Use*, Unit 1 (*Present continuous*), Section A.
  - This item is a structural template duplicate of Item 5 (`6e803d45`). Like Item 5, the verb *explain* here functions dynamically at speech time, not as a stative verb.
- **Evidence for Remapping:** Identical pedagogical syntax to Unit 1 Section A.
- **Classification:** **`CONFIRMED_REMAP`** $\to$ **Unit 1 (`unit.001`)**, Rule `1A`. *(Editorial Note: Template redundancy with `6e803d45` means this item should remain unapproved candidate inventory).*

---

### Item 7: `ac0c643a-f264-4991-b5ae-08c0e8eb2848`
- **Current Database Mapping:** Unit 4 | Concept: `unit.004` (`Present continuous and present simple 2`) | Rule: `4B`
- **Prompt:**
  > `"Dr. Evans _______ three medical research articles every year for the international cardiology journal."`
- **Options:**
  - `[A] publishes` (**CORRECT KEY**)
  - `[B] is publishing` (Distractor: Present continuous; contradicts habitual *every year*)
  - `[C] publish` (Distractor: Bare plural; agreement error with singular *Dr. Evans*)
  - `[D] has published` (Distractor: Present perfect)
- **Explanation:** *"Cụm 'every year' diễn tả thói quen định kỳ, dùng Hiện tại đơn 'publishes'."*
- **Actual Competency Tested:** Habitual routine or recurring frequency in present time.
- **Murphy Curriculum Analysis:**
  - *English Grammar in Use*, Unit 2 (*Present simple (I do)*), Section B:
    > *"We use the present simple to say how often we do things: 'I get up at 8:00 every morning... Robert usually goes away two or three times a year'."*
  - The verb *publish* is a dynamic verb. The question assesses frequency of habit (*every year*), which is the primary subject of Unit 2, not stative verbs (Unit 4).
- **Evidence for Remapping:** Explicit frequency adjunct *"every year"* requiring simple present 3rd-person singular form *publishes*.
- **Classification:** **`CONFIRMED_REMAP`** $\to$ **Unit 2 (`unit.002`)**, Rule `2B`.

---

### Item 8: `fe61381a-7e1b-495f-a388-804cb27ea8f5`
- **Current Database Mapping:** Unit 4 | Concept: `unit.004` (`Present continuous and present simple 2`) | Rule: `4C`
- **Prompt:**
  > `"The chief scientist _______ whether the synthesized compound remains chemically stable under extreme pressure."`
- **Options:**
  - `[A] doubts` (**CORRECT KEY**)
  - `[B] is doubting` (Distractor: Continuous form of stative mental verb)
  - `[C] doubted` (Distractor: Past tense)
  - `[D] doubt` (Distractor: Agreement error)
- **Explanation:** *"Động từ trạng thái 'doubt' không chia thì tiếp diễn -> 'doubts'."*
- **Actual Competency Tested:** Stative verb of mental attitude (*doubt*) resisting continuous aspect.
- **Murphy Curriculum Analysis:**
  - *English Grammar in Use*, Unit 4 (*Present continuous and present simple 2*), Section A:
    > *"These verbs are not normally used in the present continuous: believe, doubt, understand, recognize, like, love..."*
  - The distractor `[B] is doubting` directly measures whether the learner knows that *doubt* is a stative verb.
- **Evidence for Mapping:** Target verb *doubt* is explicitly listed in Murphy Unit 4 Section A.
- **Classification:** **`KEEP_CURRENT_MAPPING`**. Current association to `unit.004` is 100% correct.

---

### Item 9: `fa201c0b-4173-453b-8fd8-4df4019e6ca9`
- **Current Database Mapping:** Unit 1 | Concept: `unit.001` (`Present continuous (I am doing)`) | Rule: `1D`
- **Prompt:**
  > `"Although the regional director usually _______ conservative investments, she is currently considering higher-yield instruments."`
- **Options:**
  - `[A] prefers` (**CORRECT KEY**)
  - `[B] is preferring` (Distractor: Continuous form of stative verb)
  - `[C] preferred` (Distractor: Past tense)
  - `[D] prefer` (Distractor: Agreement error)
- **Explanation:** *"Động từ trạng thái 'prefer' không chia ở thì tiếp diễn dù có vế tương phản hiện tại. Chọn thì Hiện tại đơn 'prefers'."*
- **Actual Competency Tested:**
  - Clause 1: *"usually _______ [prefers] conservative investments"* (Habitual frequency + stative attitude verb *prefer*).
  - Clause 2: *"she is currently considering higher-yield instruments"* (Temporary activity around now in present continuous).
  - Conjunction: *"Although"* (Concession).
- **Curriculum Analysis:**
  - This item bridges three distinct curriculum areas:
    1. **Unit 4 (Section A):** Stative verb *prefer* cannot take continuous aspect (*"is preferring"* is ungrammatical).
    2. **Unit 3 (Section A/B):** Direct contrast between general routine (*usually*) and temporary current situation (*currently considering*).
    3. **Unit 113:** Subordinate concessive clause introduced by *Although*.
  - Assigning it strictly to Unit 1 was an error (the blank is simple present *prefers*). However, assigning it strictly to Unit 3 ignores that *prefer* is governed by Unit 4 stative constraints; assigning it to Unit 4 ignores the explicit Unit 3 continuous contrast.
- **Pedagogical Recommendation:** In accordance with Stage 2 instructions ("Do not force a single concept when the question genuinely tests multiple competencies"), this item is flagged for multi-concept handling.
- **Classification:** **`MULTI_CONCEPT_REVIEW`** (Primary: Unit 4 stative preference; Secondary: Unit 3 contrast).

---

### Item 10: `fe5dcc57-9a64-48a6-9ae3-2f4a5ebcecea`
- **Current Database Mapping:** Unit 1 | Concept: `unit.001` (`Present continuous (I am doing)`) | Rule: `1C`
- **Prompt:**
  > `"The IT support team _______ a new cybersecurity protocol across all company computers this week."`
- **Options:**
  - `[A] is installing` (**CORRECT KEY**)
  - `[B] installed` (Distractor: Simple past)
  - `[C] installs` (Distractor: Simple present routine)
  - `[D] install` (Distractor: Agreement error)
- **Explanation:** *"Trạng ngữ 'this week' diễn tả một tiến trình tạm thời đang diễn ra xung quanh hiện tại: 'is installing'."*
- **Actual Competency Tested:** Temporary ongoing project during an extended current period (*"this week"*).
- **Murphy Curriculum Analysis:**
  - *English Grammar in Use*, Unit 1 (*Present continuous*), Section C:
    > *"We use the present continuous when we talk about a period around the present (for example: today, this week, this year): 'Are you working hard today?' 'Yes, I have a lot to do'."*
  - This is an exact textbook match for Unit 1 Rule 1C.
- **Evidence for Mapping:** Temporal indicator *"this week"* + dynamic verb *install* $\to$ Present Continuous.
- **Classification:** **`KEEP_CURRENT_MAPPING`**. Current mapping to Unit 1 (`unit.001`) is 100% correct.

---

## 3. Decision Classification Summary Matrix

| # | Item ID (Short) | Current Unit / Concept | Grammatical Focus | Proposed Action | Target Unit / Concept | Decision Classification |
| :-: | :--- | :---: | :--- | :---: | :---: | :---: |
| **1** | `43753724` | U3 / `unit.003` | Finished past (*voted* with *Last Friday*) | Remap | **U5 / `unit.005`** | **`CONFIRMED_REMAP`** |
| **2** | `6948841f` | U3 / `unit.003` | Past continuous interrupted (*was working ... sounded*) | Remap | **U6 / `unit.006`** | **`CONFIRMED_REMAP`** |
| **3** | `77299aeb` | U3 / `unit.003` | Inverted 3rd Conditional (*Had noticed ... would not have*) | Remap | **U40 / `unit.040`** | **`CONFIRMED_REMAP`** |
| **4** | `c10918d0` | U3 / `unit.003` | While + past continuous (*was reviewing ... asked*) | Remap | **U6 / `unit.006`** | **`CONFIRMED_REMAP`** |
| **5** | `6e803d45` | U4 / `unit.004` | Moment of speaking (*Listen ... is giving*) | Remap | **U1 / `unit.001`** | **`CONFIRMED_REMAP`** |
| **6** | `7addbaf6` | U4 / `unit.004` | Moment of speaking (*Listen ... is explaining*) | Remap | **U1 / `unit.001`** | **`CONFIRMED_REMAP`** |
| **7** | `ac0c643a` | U4 / `unit.004` | Habitual frequency (*publishes* with *every year*) | Remap | **U2 / `unit.002`** | **`CONFIRMED_REMAP`** |
| **8** | `fe61381a` | U4 / `unit.004` | Stative mental verb (*doubts*) | Retain | **U4 / `unit.004`** | **`KEEP_CURRENT_MAPPING`** |
| **9** | `fa201c0b` | U1 / `unit.001` | Contrast: habitual stative vs ongoing (*prefers* vs *considering*) | Flag | **U4 / U3 / U113** | **`MULTI_CONCEPT_REVIEW`** |
| **10** | `fe5dcc57` | U1 / `unit.001` | Temporary period (*is installing ... this week*) | Retain | **U1 / `unit.001`** | **`KEEP_CURRENT_MAPPING`** |

---

## 4. Impact Analysis on Curriculum Balance

Following the execution of these decisions:
1. **Unit 3 (`unit.003`):** Has **0 remaining candidate items**. Unit 3 is confirmed empty of valid assessment items and is flagged as requiring new generation in Phase 3.4C.4B.4.
2. **Unit 4 (`unit.004`):** Has **1 valid candidate item** (`fe61381a`, stative verb *doubt*).
3. **Unit 1 (`unit.001`):** Receives 2 additional validated candidate items (`6e803d45`, `7addbaf6`), bringing validated candidates in Unit 1 to 4 items (plus 12 approved items).
4. **Unit 2 (`unit.002`):** Receives 1 additional candidate (`ac0c643a`), bringing Unit 2 candidate pool to 9 items.
5. **Unit 5 (`unit.005`):** Receives 1 additional candidate (`43753724`), joining `0707bbd2` and `4ce8fea3` (total: 3 items).
6. **Unit 6 (`unit.006`):** Seeded with 2 authentic past continuous candidates (`6948841f`, `c10918d0`).
7. **Unit 40 (`unit.040`):** Seeded with 1 advanced conditional candidate (`77299aeb`).

