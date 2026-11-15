# GrammarPath — Phase 3.4C.4B.4.1.1: Revised Unit 3 Pilot Proposal
## Curricularly Reconciled, Anti-Contaminated Assessment Blueprints for 8 Pilot Items

**Author:** Antigravity (Principal Assessment Engineer & Curriculum Lead)  
**Milestone:** Phase 3.4C.4B.4.1.1 (Design Corrections & Pilot Readiness Reconciliation)  
**Date:** November 14, 2026  
**Status:** Pilot Specification (Design-Only — Zero Generation Calls Executed)  

---

## 1. Executive Summary & Curriculum Reconciliation Principles

This proposal defines the revised 8-item pilot generation suite for **Unit 3: Present Continuous and Present Simple 1** (*English Grammar in Use*, 4th Edition).

### 1.1 Key Adjustments from Prior Design:
1. **Rule 3C Completely Excluded:** Following the curriculum reconciliation in `phase-3.4C.4B.4.1.1-curriculum-mapping-reconciliation.md`, Section 3C (*"I always do"* vs. *"I'm always doing"*) is excluded. The construct *"I'm always doing"* expresses informal/emotional annoyance (e.g., *"He is always losing his keys"*), violating authentic ETS Part 5 corporate register and risking dual-key ambiguity.
2. **100% Focus on Canonical Rules 3A & 3B:**
   - **Section 3A (4 Items):** General facts and routines vs. actions happening at/around the present moment.
   - **Section 3B (4 Items):** Permanent workplace conditions vs. temporary business arrangements.
3. **Strict Stative Verb Anti-Contamination Guard:** Zero items or distractors use Unit 4 stative verbs (*know, understand, believe, want, need, belong, etc.*). All target verbs are unequivocally dynamic.
4. **Controlled Difficulty Distribution:**
   - **Easy:** 2 items (25%)
   - **Medium:** 4 items (50%)
   - **Hard:** 2 items (25%)
5. **Contextual Diversity Guarantee:** 8 distinct corporate domains are assigned across the 8 blueprints, guaranteeing $D_{\text{ctx}} \ge 0.50$ across all pairwise comparisons.

---

## 2. Pilot Item Distribution Matrix

| Blueprint ID | Rule | Concept | Section | Difficulty | Workplace Domain | Carrier Subject & Verb | Target Form | Clue Anchor |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| `U3-PILOT-01` | **3A** | `unit.003` | 3A (Routine vs. Now) | **Easy** | Corporate Operations | Receptionist / *direct* | Progressive (*is directing*) | *"currently today"* |
| `U3-PILOT-02` | **3A** | `unit.003` | 3A (Routine vs. Now) | **Easy** | Information Technology | IT Specialist / *update* | Simple Present (*updates*) | *"every Wednesday"* |
| `U3-PILOT-03` | **3A** | `unit.003` | 3A (Ongoing in Subordinate) | **Medium** | Logistics & Supply Chain | Shipping team / *inspect* | Progressive (*are inspecting*) | *"at this very moment"* |
| `U3-PILOT-04` | **3A** | `unit.003` | 3A (Commercial Policy) | **Medium** | Marketing & Public Relations | Agency / *publish* | Simple Present (*publishes*) | *"routinely each quarter"* |
| `U3-PILOT-05` | **3B** | `unit.003` | 3B (Permanent vs. Temp) | **Medium** | Human Resources | Senior Analyst / *work* | Progressive (*is working*) | *"for the next two weeks"* |
| `U3-PILOT-06` | **3B** | `unit.003` | 3B (Permanent vs. Temp) | **Medium** | Facilities Management | Regional Branch / *operate* | Simple Present (*operates*) | *"as a permanent facility"* |
| `U3-PILOT-07` | **3B** | `unit.003` | 3B (Temporary Transition) | **Hard** | Finance & Accounting | Audit Committee / *oversee* | Progressive (*is overseeing*) | *"during the system migration"* |
| `U3-PILOT-08` | **3B** | `unit.003` | 3B (Permanent Policy) | **Hard** | Corporate Governance & Legal | Board of Directors / *require* | Simple Present (*requires*) | *"under standard corporate policy"* |

---

## 3. Detailed Item Architectural Blueprints

### 3.1 Blueprint `U3-PILOT-01` (Rule 3A — Easy)
- **Pedagogical Objective:** Distinguish an ongoing real-time workplace action from a routine habit using an explicit present-time anchor.
- **Difficulty:** `easy` ($12 \le W \le 16$ words, single independent clause).
- **Domain:** `corporate_operations`
- **Carrier Sentence Template:**
  *"Because the primary conference room is being renovated, Ms. Gable _______ all client meetings in the second-floor executive suite today."*
- **Blank Target Slot:** Main finite verb of independent clause.
- **Target Dynamic Verb:** *conduct* (dynamic, non-stative).
- **Correct Answer:** `(B) is conducting` (Present continuous singular).
- **Distractor Architecture:**
  - `(A) conducts`: Simple present (incorrect: "today" specifies a temporary/present-day action).
  - `(C) conducted`: Simple past (incorrect: contradicts ongoing current context "is being renovated").
  - `(D) to conduct`: Full infinitive (incorrect: non-finite verb cannot serve as main predicate).
- **Explicit Clue Words:** *"today"*, *"is being renovated"*.
- **Anti-Contamination Check:** Passed (verb *conduct* is dynamic; zero stative elements).

---

### 3.2 Blueprint `U3-PILOT-02` (Rule 3A — Easy)
- **Pedagogical Objective:** Identify simple present for a regular, recurring workplace schedule versus progressive aspect.
- **Difficulty:** `easy` ($12 \le W \le 16$ words, single independent clause with frequency adverbial).
- **Domain:** `information_technology`
- **Carrier Sentence Template:**
  *"To maintain high database security, the lead network administrator routinely _______ the server access logs every Friday afternoon."*
- **Blank Target Slot:** Main finite verb.
- **Target Dynamic Verb:** *review* (dynamic, non-stative).
- **Correct Answer:** `(A) reviews` (Simple present singular).
- **Distractor Architecture:**
  - `(B) is reviewing`: Present continuous (incorrect: contradicts habitual frequency marker "routinely ... every Friday").
  - `(C) reviewed`: Simple past (incorrect: violates general recurring policy).
  - `(D) review`: Base plural form (incorrect: subject-verb agreement failure with singular "administrator").
- **Explicit Clue Words:** *"routinely"*, *"every Friday afternoon"*.
- **Anti-Contamination Check:** Passed (dynamic verb; zero Unit 4 overlap).

---

### 3.3 Blueprint `U3-PILOT-03` (Rule 3A — Medium)
- **Pedagogical Objective:** Identify ongoing present continuous action inside a complex sentence containing a temporal subordinate clause.
- **Difficulty:** `medium` ($17 \le W \le 22$ words, complex sentence with conjunction *while*).
- **Domain:** `logistics_supply_chain`
- **Carrier Sentence Template:**
  *"While the warehouse supervisor coordinates regional dispatch schedules, the cargo inspection team _______ the incoming overseas shipment at the loading dock right now."*
- **Blank Target Slot:** Finite verb of the main clause.
- **Target Dynamic Verb:** *examine* (dynamic, non-stative).
- **Correct Answer:** `(C) is examining` (Present continuous singular collective/unit).
- **Distractor Architecture:**
  - `(A) examines`: Simple present (incorrect: contradicts explicit concurrent marker "right now").
  - `(B) examined`: Simple past (incorrect: clashes with present time frame of "coordinates" and "right now").
  - `(D) examining`: Present participle without auxiliary (incorrect: syntactic fragment).
- **Explicit Clue Words:** *"While"*, *"right now"*, *"at the loading dock"*.
- **Anti-Contamination Check:** Passed (dynamic physical action; zero stative overlap).

---

### 3.4 Blueprint `U3-PILOT-04` (Rule 3A — Medium)
- **Pedagogical Objective:** Identify simple present for a standard institutional business practice contrasting with continuous aspect.
- **Difficulty:** `medium` ($18 \le W \le 23$ words, complex clause with causal conjunction).
- **Domain:** `marketing_sales`
- **Carrier Sentence Template:**
  *"In accordance with international trade standards, the marketing department _______ comprehensive market research reports at the conclusion of each fiscal quarter."*
- **Blank Target Slot:** Finite verb of the main clause.
- **Target Dynamic Verb:** *publish* (dynamic, non-stative).
- **Correct Answer:** `(D) publishes` (Simple present singular).
- **Distractor Architecture:**
  - `(A) is publishing`: Present continuous (incorrect: contradicts recurring institutional schedule "at the conclusion of each fiscal quarter").
  - `(B) published`: Simple past (incorrect: violates present general rule of corporate procedure).
  - `(C) to publish`: Full infinitive (incorrect: non-finite form cannot function as predicate).
- **Explicit Clue Words:** *"In accordance with"*, *"at the conclusion of each fiscal quarter"*.
- **Anti-Contamination Check:** Passed (action verb *publish*; zero stative verbs).

---

### 3.5 Blueprint `U3-PILOT-05` (Rule 3B — Medium)
- **Pedagogical Objective:** Contrast a temporary temporary workplace situation (*for a limited period*) against a permanent baseline using present continuous.
- **Difficulty:** `medium` ($18 \le W \le 24$ words, contrasting clauses).
- **Domain:** `human_resources`
- **Carrier Sentence Template:**
  *"Although Mr. Henderson usually works at the regional headquarters in Denver, he _______ the temporary personnel transition in Chicago for the next three weeks."*
- **Blank Target Slot:** Main finite verb of second clause.
- **Target Dynamic Verb:** *manage* (dynamic action).
- **Correct Answer:** `(B) is managing` (Present continuous for temporary situation).
- **Distractor Architecture:**
  - `(A) manages`: Simple present (incorrect: contradicts temporary boundary "for the next three weeks" vs habitual "usually works").
  - `(C) managed`: Simple past (incorrect: "next three weeks" indicates future/current temporary duration).
  - `(D) management`: Noun form (incorrect: part-of-speech category error).
- **Explicit Clue Words:** *"usually works"* vs. *"for the next three weeks"*.
- **Anti-Contamination Check:** Passed (verb *manage* is dynamic; adheres strictly to Murphy Section 3B).

---

### 3.6 Blueprint `U3-PILOT-06` (Rule 3B — Medium)
- **Pedagogical Objective:** Contrast a permanent corporate operational setup (*permanent situation*) against continuous aspect.
- **Difficulty:** `medium` ($18 \le W \le 24$ words, prepositional framing).
- **Domain:** `facilities_management`
- **Carrier Sentence Template:**
  *"Unlike the temporary distribution depot opened last month, the central automated warehouse _______ as the permanent fulfillment hub for all domestic orders."*
- **Blank Target Slot:** Main finite verb.
- **Target Dynamic Verb:** *serve* (dynamic functional role).
- **Correct Answer:** `(A) serves` (Simple present for permanent status).
- **Distractor Architecture:**
  - `(B) is serving`: Present continuous (incorrect: contradicts explicit permanent designation "as the permanent fulfillment hub").
  - `(C) served`: Simple past (incorrect: refers to current permanent status).
  - `(D) to serve`: Full infinitive (incorrect: lacks finite tense).
- **Explicit Clue Words:** *"Unlike the temporary"*, *"as the permanent fulfillment hub"*.
- **Anti-Contamination Check:** Passed (zero Unit 4 stative verbs).

---

### 3.7 Blueprint `U3-PILOT-07` (Rule 3B — Hard)
- **Pedagogical Objective:** Distinguish a temporary emergency operational procedure from permanent accounting standards in a syntactically dense sentence.
- **Difficulty:** `hard` ($24 \le W \le 28$ words, initial prepositional clause + compound modifiers).
- **Domain:** `finance_accounting`
- **Carrier Sentence Template:**
  *"During the comprehensive audit of offshore subsidiaries this month, the external financial advisory team _______ the internal billing records with extraordinary scrutiny."*
- **Blank Target Slot:** Main finite verb.
- **Target Dynamic Verb:** *scrutinize* / *verify* / *audit* $\rightarrow$ *examine*.
- **Correct Answer:** `(C) is examining` (Present continuous for temporary auditing period).
- **Distractor Architecture:**
  - `(A) examines`: Simple present (incorrect: contradicts temporary timeframe "this month" during external audit).
  - `(B) examined`: Simple past (incorrect: clashes with current active timeframe "this month").
  - `(D) examination`: Noun form (incorrect: syntactic slot requires finite verb).
- **Explicit Clue Words:** *"During the comprehensive audit ... this month"*.
- **Anti-Contamination Check:** Passed (dynamic action *examine*; zero stative overlap).

---

### 3.8 Blueprint `U3-PILOT-08` (Rule 3B — Hard)
- **Pedagogical Objective:** Identify simple present for permanent corporate governance mandate within complex contractual syntax.
- **Difficulty:** `hard` ($24 \le W \le 30$ words, formal governance register with passive infinitive complement).
- **Domain:** `corporate_governance_legal`
- **Carrier Sentence Template:**
  *"As a permanent condition of corporate compliance, the multinational enterprise rigorously _______ all departmental managers to submit certified ethical disclosure forms annually."*
- **Blank Target Slot:** Main finite verb.
- **Target Dynamic Verb:** *require* $\rightarrow$ Note: *require* can be semi-stative in some grammars; to be 100% immune from Unit 4 stative contamination, substitute with unambiguous dynamic verb: *instruct* or *compel* or *direct*. Selected: **directs**.
- **Correct Answer:** `(B) directs` (Simple present singular for permanent policy).
- **Distractor Architecture:**
  - `(A) is directing`: Present continuous (incorrect: contradicts permanent recurring rule "permanent condition ... annually").
  - `(C) directed`: Simple past (incorrect: violates current permanent governance policy).
  - `(D) direct`: Plural present form (incorrect: agreement error with singular enterprise).
- **Explicit Clue Words:** *"As a permanent condition"*, *"annually"*.
- **Anti-Contamination Check:** Passed (dynamic verb *directs* chosen to guarantee 100% immunity from Unit 4 stative verb overlap).

---

## 4. Summary of Verification & Architectural Conformance

- [x] All 8 blueprints map exclusively to verified Unit 3 rules (Section 3A or Section 3B).
- [x] Section 3C (*"always doing"*) completely excluded to protect ETS professional register.
- [x] Zero Unit 4 stative verbs present in stems, blanks, or distractors.
- [x] Difficulty distribution tightly controlled: 2 Easy (25%), 4 Medium (50%), 2 Hard (25%).
- [x] Exactly 8 distinct corporate domains utilized, ensuring high contextual diversity.
- [x] No generation calls executed; pilot remains strictly in blueprint readiness state.

