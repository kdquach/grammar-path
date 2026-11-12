# GrammarPath Phase 2.2 — Audit D: Anti-Spoiler Security & Authorization Report

**Date:** 2026-11-12  
**Target:** Live Express REST API backed by `grammarpath-staging` (`audit_a_d_e.ts` + `phase2-1-remediation.api.test.ts` + `adaptive-toeic.api.test.ts`).

---

## 1. Forbidden Spoiler Key Verification

Every pre-submission response payload was recursively scanned (`scanForSpoilerKeys`) against the forbidden spoiler field set:
- `correctAnswerText`
- `correctAnswerArray`
- `acceptedAnswers`
- `blankAcceptedAnswers`
- `partAcceptedAnswers`
- `answerKey`
- `correctAnswer`
- `correctAnswers`
- `expectedAnswers`
- `aiExplanation`

---

## 2. Read Route Sweep (**14 Routes x Guest & Authenticated = 28 Calls**)

Verified across representative single-blank, multi-blank, multi-part, slash-option, sentence-correction, and zero-article items:
- `GET /api/v1/units?page=1&limit=5`
- `GET /api/v1/units/1`
- `GET /api/v1/units/1/theory`
- `GET /api/v1/units/1/exercises`
- `GET /api/v1/units/17/exercises`
- `GET /api/v1/units/24/exercises`
- `GET /api/v1/units/110/exercises`
- `GET /api/v1/exercises/1.1`
- `GET /api/v1/exercises/1.2`
- `GET /api/v1/questions/1.1-q2`
- `GET /api/v1/questions/1.2-q1`
- `GET /api/v1/questions/73.1-q7`
- `GET /api/v1/theory/sections/1A`
- `GET /api/v1/book`

**Result:** **28 / 28 HTTP 200**, **0** forbidden spoiler keys in any payload.

---

## 3. Query Parameter Bypass Sweep (**24 Probe Calls**)

Tested `8` bypass query parameters (`includeAnswers=true`, `includeAnswers=1`, `includeAnswers=yes`, `includeAnswers=`, `includeSolutions=true`, `showAnswers=true`, `revealAnswers=on`, `withAnswers=1`) across `3` core endpoints:
- `/api/v1/units/1/exercises?<param>`
- `/api/v1/exercises/1.1?<param>`
- `/api/v1/questions/1.1-q2?<param>`

**Result:** **24 / 24 rejected with HTTP 403 and error code `SPOILER_FORBIDDEN`**.

---

## 4. Solution Endpoint Gating & Selective Per-Question Unlock

| Endpoint / State | Expected Response | Observed Response |
| :--- | :--- | :--- |
| Guest `GET /api/v1/exercises/1.1/solutions` | `401 Unauthorized` | **401** |
| Guest `GET /api/v1/questions/1.1-q2/solution` | `401 Unauthorized` | **401** |
| Authenticated (0 attempts) `GET /api/v1/exercises/1.1/solutions` | `403 SOLUTION_LOCKED` | **403 `SOLUTION_LOCKED`** |
| Authenticated (0 attempts) `GET /api/v1/questions/1.1-q2/solution` | `403 SOLUTION_LOCKED` | **403 `SOLUTION_LOCKED`** |
| Authenticated after partial submit on `1.1-q2` ONLY -> `POST /exercises/1.1/check` response for sibling `1.1-q3` | `expectedAnswers: []`, `explanation: null`, `studentAnswer: null` | **Verified redacted** |
| Authenticated after partial submit on `1.1-q2` -> `GET /questions/1.1-q2/solution` | `200 OK` (unlocked) | **200** |
| Authenticated after partial submit on `1.1-q2` -> sibling `GET /questions/1.1-q3/solution` | `403 SOLUTION_LOCKED` (still unattempted) | **403 `SOLUTION_LOCKED`** |
| Authenticated after submitting `1.1` -> `GET /exercises/1.1/solutions` | `200 OK` (exercise attempted) | **200** |

---

## 5. Adaptive Quiz, TOEIC Practice & Cross-User Isolation

- **`POST /api/v1/adaptive/quiz/generate`:** **0** spoiler keys leaked across generated diagnostic/remedial questions.
- **`POST /api/v1/adaptive/toeic-practice`:** **0** spoiler keys leaked across Units `1`, `98`, `110`, `145` (verified across `audit_a_d_e.ts`, `phase2-1-remediation.api.test.ts`, and `phase2-2-qa.api.test.ts`).
- **Progress Analytics & Recommendations:** `GET /progress/overview`, `GET /adaptive/analytics`, `GET /adaptive/recommendations` returned **0** spoiler keys.
- **Cross-User Session Ownership (`User B` targeting `User A` sessions):**
  - `POST /api/v1/adaptive/quiz/check` -> **HTTP 403**
  - `POST /api/v1/adaptive/toeic-practice/check` -> **HTTP 403**
  - Also covered in [`phase2-1-remediation.api.test.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/tests/phase2-1-remediation.api.test.ts) (Scenarios 7 & 8).

