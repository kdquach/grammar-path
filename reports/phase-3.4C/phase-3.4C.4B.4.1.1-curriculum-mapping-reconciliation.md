# GrammarPath — Phase 3.4C.4B.4.1.1: Curriculum Mapping Reconciliation Report
## Source Data Verification for Units 3 & 4 (*English Grammar in Use*, 4th Edition)

**Author:** Antigravity (Principal Learning Engineer & Curriculum Specialist)  
**Milestone:** Phase 3.4C.4B.4.1.1 (Design Corrections & Pilot Readiness Reconciliation)  
**Date:** November 14, 2026  
**Canonical Repository:** `grammarpath-data` (Inspected Read-Only)  
**Source Data Files:** `data/units/unit-003.json`, `data/units/unit-004.json`  

---

## 1. Executive Summary

A line-by-line inspection of canonical curriculum files in `grammarpath-data` was conducted to reconcile the exact structural boundaries between **Unit 3** and **Unit 4**.

### Key Epistemic Findings:
1. **Rule 3C Location Confirmed:** In canonical `grammarpath-data`, the rule comparing *"I always do"* vs. *"I'm always doing"* is explicitly located in **Unit 3 (`section_id: "3C"` in `unit-003.json`)**, not Unit 4.
2. **Unit 4 Scope Confirmed:** Unit 4 (`unit-004.json`) is strictly reserved for **stative verbs and dual-aspect mental/perception verbs** (4A: Stative list; 4B: *Think*; 4C: Perception verbs; 4D: *Look/Feel*; 4E: *Be being*). It contains zero rules regarding *"always doing"*.
3. **Assessment Reconciliation for TOEIC Part 5:** Although Section 3C belongs to Unit 3 in the textbook, the construct *"I'm always doing"* expresses informal/emotional annoyance (e.g. *"He's always complaining"*), which violates ETS Part 5 professional register and easily introduces distractor ambiguity.
4. **Action Taken for Unit 3 Pilot:** In accordance with instructions to prevent register contamination and cross-unit confusion, **Section 3C is removed from the Unit 3 Pilot allocation**. The pilot is 100% focused on **Section 3A (General facts/habits vs. ongoing actions)** and **Section 3B (Permanent vs. temporary situations)**.

---

## 2. Canonical Evidence Inventory: Unit 3 (`unit-003.json`)

- **File Path:** `/Users/kd.quach03/Documents/grammarpath-data/data/units/unit-003.json`
- **Unit Number:** 3
- **Title:** `Present continuous and present simple 1 (I am doing and I do)`
- **Source Textbook:** *English Grammar in Use* (4th Edition), pages 17, 18, 347.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ CANONICAL THEORY SECTIONS IN UNIT 3                                                                    │
├────────────┬─────────────────────────────┬─────────────────────────────────┬───────────────────────────┤
│ Section ID │ Heading                     │ Core Grammatical Rule           │ Canonical Textbook Ex     │
├────────────┼─────────────────────────────┼─────────────────────────────────┼───────────────────────────┤
│ 3A         │ Compare: Present continuous │ Continuous: Action happening at │ - The water is boiling.   │
│            │ (I am doing) vs             │ or around time of speaking.     │ - What language are they  │
│            │ Present simple (I do)       │ Simple: Things in general or    │   speaking?               │
│            │                             │ happening repeatedly.           │ - Water boils at 100 C.   │
│            │                             │                                 │ - What do you usually do? │
├────────────┼─────────────────────────────┼─────────────────────────────────┼───────────────────────────┤
│ 3B         │ Temporary situations vs     │ Continuous: Temporary situations│ - I'm living with friends │
│            │ Permanent situations        │ around the present.             │   until I find a place.   │
│            │                             │ Simple: Permanent situations or │ - My parents live in      │
│            │                             │ long-term ongoing states.       │   London (lived all life).│
│            │                             │                                 │ - Joe works hard most time│
├────────────┼─────────────────────────────┼─────────────────────────────────┼───────────────────────────┤
│ 3C         │ I always do and             │ 'I always do' = every time.     │ - I always go by car.     │
│            │ I'm always doing            │ 'I'm always doing' = very often,│ - I'm always losing things│
│            │                             │ too often, or more than normal. │ - He's always complaining.│
└────────────┴─────────────────────────────┴─────────────────────────────────┴───────────────────────────┘
```

---

## 3. Canonical Evidence Inventory: Unit 4 (`unit-004.json`)

- **File Path:** `/Users/kd.quach03/Documents/grammarpath-data/data/units/unit-004.json`
- **Unit Number:** 4
- **Title:** `Present continuous and present simple 2 (I am doing and I do)`
- **Source Textbook:** *English Grammar in Use* (4th Edition), pages 19, 20, 347.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ CANONICAL THEORY SECTIONS IN UNIT 4                                                                    │
├────────────┬─────────────────────────────┬─────────────────────────────────┬───────────────────────────┤
│ Section ID │ Heading                     │ Core Grammatical Rule           │ Canonical Examples        │
├────────────┼─────────────────────────────┼─────────────────────────────────┼───────────────────────────┤
│ 4A         │ Verbs not normally used     │ Stative verbs resist continuous │ like, want, need, prefer, │
│            │ in the continuous           │ aspect (mental, emotional, poss)│ know, realise, suppose,   │
│            │                             │                                 │ mean, understand, believe │
├────────────┼─────────────────────────────┼─────────────────────────────────┼───────────────────────────┤
│ 4B         │ Think                       │ Think = opinion/believe (simple)│ I think Mary is Canadian. │
│            │                             │ Think = consider (continuous)   │ Nicky is thinking of...   │
├────────────┼─────────────────────────────┼─────────────────────────────────┼───────────────────────────┤
│ 4C         │ See, hear, smell, taste     │ Sensory perception verbs        │ Do you see that man?      │
│            │                             │ normally in present simple      │ This room smells.         │
├────────────┼─────────────────────────────┼─────────────────────────────────┼───────────────────────────┤
│ 4D         │ Look, feel                  │ Both simple & continuous allowed│ You look well today /     │
│            │                             │ for present physical state      │ You're looking well today │
├────────────┼─────────────────────────────┼─────────────────────────────────┼───────────────────────────┤
│ 4E         │ He is selfish and           │ 'is being' = temporary behavior │ He is being selfish (now) │
│            │ He is being selfish         │ 'is' = permanent character      │ He is very selfish (all)  │
└────────────┴─────────────────────────────┴─────────────────────────────────┴───────────────────────────┘
```

---

## 4. Reconciled Curricular Boundaries for Unit 3 Pilot

### Boundary 1: Total Exclusion of Stative Verbs (Unit 4 Territory)
Verbs from Section 4A (*prefer, doubt, believe, understand, belong, contain*) must **never** be the target key of a Unit 3 question. If a question tests whether a learner knows that *prefer* resists continuous aspect, that question belongs to Unit 4 (e.g. `fe61381a` or `fa201c0b`), NOT Unit 3.

### Boundary 2: Pure Dynamic Contrast in Unit 3
Unit 3 questions must use **dynamic action verbs** (*operate, inspect, conduct, audit, negotiate, deliver, construct, renovate*) where **both** the simple present and present continuous forms are grammatically possible in English, but the **contextual temporal indicators** dictate which form is correct:
- Explicit indicators requiring Simple Present: *usually, generally, every Monday, on weekdays, standard procedure*.
- Explicit indicators requiring Present Continuous: *this week, currently, until next month, temporarily, for the time being*.

### Boundary 3: Treatment of Section 3C (*I always do* vs *I'm always doing*)
- **Textbook Status:** Section 3C is canonically in Unit 3.
- **Pedagogical Recommendation:** Because *"I'm always doing"* represents an emotional/complaint idiom that is unnatural in objective corporate Part 5 sentences, **Section 3C is formally excluded from the 8-question Unit 3 Pilot**.
- **Revised Pilot Allocation:**
  - **Section 3A (General truths / routines vs. actions happening around now):** **4 items**.
  - **Section 3B (Permanent workplace situations vs. temporary projects/arrangements):** **4 items**.
  - **Total:** **8 items** of pure, uncompromised business English contrast.

