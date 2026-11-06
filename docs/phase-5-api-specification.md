# GrammarPath Phase 5: REST API Specification

This document provides the comprehensive technical specification for the Phase 5 Express + TypeScript REST API backend (`grammarpath-app/backend/`).

---

## 1. Architecture Overview & Global Standards

### 1.1. Base URL
```
http://localhost:4000/api/v1
```
All API routes are namespaced under the `/api/v1` prefix.

### 1.2. Architecture Principles
- **Read-Only Neon PostgreSQL Database**: Locked 22-table schema. Zero DDL or write migrations permitted in Phase 5.
- **Stateless Operation**: Grading and answer evaluation endpoints do not persist user state or exercise attempts.
- **Pedagogical Anti-Spoiler Security**: Question and exercise endpoints strip all answer fields (`correctAnswerType`, `correctAnswerText`, `correctAnswerArray`, `acceptedAnswers`) by default, preventing cheating on the client-side until explicitly requested via query parameter (`includeAnswers=true`) or via dedicated solution endpoints.

### 1.3. Standard Response Envelopes

#### Success Envelope (`200 OK`)
```json
{
  "success": true,
  "data": T,
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 145,
    "totalPages": 8
  }
}
```
*(The `meta` object is included whenever pagination or auxiliary counts are returned).*

#### Error Envelope (`4xx / 5xx`)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "unitNumber: unitNumber must be at most 145",
    "details": []
  }
}
```

### 1.4. Common Error Codes
| HTTP Status | Error Code | Description |
|---|---|---|
| `400 Bad Request` | `VALIDATION_ERROR` | Request query, path parameter, or JSON body failed Zod validation |
| `404 Not Found` | `NOT_FOUND` | The requested unit, exercise, question, theory section, or route was not found |
| `500 Internal Error` | `INTERNAL_SERVER_ERROR` | Unhandled internal server or database error |

---

## 2. Curriculum & Theory Endpoints (Checkpoint 5.1)

### 2.1. Health Check
Checks live database connectivity and returns curriculum health status.

- **Route:** `GET /api/v1/health`
- **Authentication:** None
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "database": "connected",
    "totalUnits": 145
  }
}
```

---

### 2.2. Book Metadata & Curriculum Totals
Returns the singleton `Book` record along with global aggregate counts across the textbook.

- **Route:** `GET /api/v1/book`
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "English Grammar in Use",
    "edition": "4th Edition",
    "author": "Raymond Murphy",
    "publisher": "Cambridge University Press",
    "pdfFilename": "English Grammar In Use - 4th Edition - 2012.pdf",
    "totalPdfPages": 399,
    "totalUnits": 145,
    "totalExercises": 549,
    "totalQuestions": 4414,
    "totalTheorySections": 542,
    "totalTextbookExamples": 639
  }
}
```

---

### 2.3. Paginated Units List
Retrieves a paginated list of textbook units with search and range filter capabilities.

- **Route:** `GET /api/v1/units`
- **Query Parameters:**
  - `page` *(optional integer >= 1, default: 1)*
  - `limit` *(optional integer 1..145, default: 20)*
  - `search` *(optional string, case-insensitive match on title or exact match on numeric unitNumber)*
  - `fromUnit` *(optional integer 1..145)*
  - `toUnit` *(optional integer 1..145)*
- **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "5731e9cb-e644-4402-bab9-1293f9e96a02",
      "unitNumber": 1,
      "title": "Present continuous (I am doing)",
      "theoryPdfPage": 13,
      "exercisePdfPage": 14,
      "bookTheoryPage": 2,
      "bookExercisePage": 3,
      "bookAnswerKeyPage": 336,
      "confidenceLevel": "verified_visual",
      "counts": {
        "theorySections": 5,
        "textbookExamples": 14,
        "exercises": 4,
        "questions": 25
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 145,
    "totalPages": 8
  }
}
```

---

### 2.4. Unit Detail
Fetches unit metadata, ordered textbook source pages, summary of theory sections, and summary of exercises.

- **Route:** `GET /api/v1/units/:unitNumber`
- **Path Parameters:**
  - `unitNumber` *(required integer 1..145)*
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "5731e9cb-e644-4402-bab9-1293f9e96a02",
    "unitNumber": 1,
    "title": "Present continuous (I am doing)",
    "theoryPdfPage": 13,
    "exercisePdfPage": 14,
    "sourcePages": [
      { "id": "...", "pageNumber": 13, "pageRole": "theory" },
      { "id": "...", "pageNumber": 14, "pageRole": "exercise" },
      { "id": "...", "pageNumber": 347, "pageRole": "answer_key" }
    ],
    "theorySections": [
      { "sectionId": "1A", "heading": "Study this example situation:", "displayOrder": 1 },
      { "sectionId": "1B", "heading": "I am doing something = I'm in the middle of doing it...", "displayOrder": 2 }
    ],
    "exercises": [
      {
        "exerciseId": "1.1",
        "exerciseNumber": "1.1",
        "questionType": "matching",
        "instruction": "The sentences on the right follow those on the left. Which sentence goes with which?",
        "hasVisualContext": false,
        "displayOrder": 1,
        "questionCount": 8,
        "wordBankCount": 0
      }
    ]
  }
}
```

---

### 2.5. Unit Theory & Textbook Examples
Retrieves the complete theory payload for a unit, including theory sections with page numbers and textbook example sentences translated into Vietnamese.

- **Route:** `GET /api/v1/units/:unitNumber/theory`
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "unitNumber": 1,
    "title": "Present continuous (I am doing)",
    "theorySections": [
      {
        "id": "44c874a0-e0be-4004-a9a5-4a8c17e5916a",
        "sectionId": "1A",
        "heading": "Study this example situation:",
        "sourceContent": "Sarah is in her car. She is on her way to work. She is driving to work...",
        "displayOrder": 1,
        "sourcePages": [13]
      }
    ],
    "textbookExamples": [
      {
        "id": "cdfb5473-7ded-42c7-9b59-cbcbc8d71d32",
        "exampleId": "1-ex-01",
        "originalText": "Sarah is driving to work.",
        "translationVi": "Sarah đang lái xe đi làm.",
        "displayOrder": 1,
        "sourcePages": [13]
      }
    ]
  }
}
```

---

### 2.6. Theory Section Lookup by Section ID
Resolves a specific theory section (case-insensitive, e.g. `1B` or `1b`) along with parent unit context and questions citing it in their explanation rule reference.

- **Route:** `GET /api/v1/theory/sections/:sectionId`
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "a99f2d77-cde4-4235-abec-01389f64083d",
    "sectionId": "1B",
    "heading": "I am doing something = I'm in the middle of doing it; I've started doing it and I haven't finished:",
    "sourceContent": "...",
    "displayOrder": 2,
    "sourcePages": [13],
    "unit": {
      "unitNumber": 1,
      "title": "Present continuous (I am doing)"
    },
    "linkedQuestions": {
      "count": 6,
      "questionIds": ["1.1-q1", "1.1-q7", "1.3-q1", "1.3-q2", "1.3-q3", "1.3-q10"]
    }
  }
}
```

---

## 3. Exercises & Anti-Spoiler Mode Endpoints (Checkpoint 5.2)

### 3.1. List Unit Exercises
Returns all exercises for a specified unit with their questions, word bank items, options, blanks, and parts.

- **Route:** `GET /api/v1/units/:unitNumber/exercises`
- **Query Parameters:**
  - `includeAnswers` *(optional boolean, default: `false`)*
- **Anti-Spoiler Guard:**
  - When `includeAnswers=false` (default), test items (`isExample=false`) have `correctAnswerType`, `correctAnswerText`, `correctAnswerArray`, and `acceptedAnswers` stripped from questions, blanks, and parts.
  - When `includeAnswers=true`, answers and accepted alternatives are returned.
- **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "32cc4a3b-ecaf-4e54-abe5-f70fa746543f",
      "exerciseId": "1.1",
      "exerciseNumber": "1.1",
      "questionType": "matching",
      "instruction": "The sentences on the right follow those on the left. Which sentence goes with which?",
      "hasVisualContext": false,
      "displayOrder": 1,
      "wordBankItems": [],
      "questions": [
        {
          "questionId": "1.1-q1",
          "questionContent": "1 Please don't make so much noise.",
          "isExample": true,
          "exampleAnswer": "f",
          "displayOrder": 1,
          "options": [
            { "optionKey": "a", "optionText": "It's getting late.", "displayOrder": 1 },
            { "optionKey": "f", "optionText": "I'm trying to work.", "displayOrder": 6 }
          ],
          "blanks": [],
          "parts": []
        },
        {
          "questionId": "1.1-q2",
          "questionContent": "2 I need to eat something soon.",
          "isExample": false,
          "exampleAnswer": null,
          "displayOrder": 2,
          "options": [ ... ],
          "blanks": [],
          "parts": []
        }
      ]
    }
  ],
  "meta": {
    "unitNumber": 1,
    "totalExercises": 4
  }
}
```

---

### 3.2. Exercise Detail
Fetches single exercise detail by `exerciseId` (e.g. `1.1`, `1.4`).

- **Route:** `GET /api/v1/exercises/:exerciseId`
- **Query Parameters:**
  - `includeAnswers` *(optional boolean, default: `false`)*
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "exerciseId": "1.4",
    "exerciseNumber": "1.4",
    "questionType": "fill_blank",
    "instruction": "Complete the sentences using the following verbs:",
    "wordBankItems": [
      { "id": "...", "word": "start", "displayOrder": 1 },
      { "id": "...", "word": "get", "displayOrder": 2 },
      { "id": "...", "word": "increase", "displayOrder": 3 },
      { "id": "...", "word": "change", "displayOrder": 4 },
      { "id": "...", "word": "rise", "displayOrder": 5 }
    ],
    "questions": [ ... ]
  }
}
```

---

### 3.3. Question Detail
Looks up a single question by `questionId` with parent exercise context.

- **Route:** `GET /api/v1/questions/:questionId`
- **Query Parameters:**
  - `includeAnswers` *(optional boolean, default: `false`)*
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "questionId": "1.1-q1",
    "questionContent": "1 Please don't make so much noise.",
    "isExample": true,
    "exampleAnswer": "f",
    "displayOrder": 1,
    "options": [ ... ],
    "sourcePages": [14],
    "exercise": {
      "exerciseId": "1.1",
      "exerciseNumber": "1.1",
      "questionType": "matching",
      "unit": {
        "unitNumber": 1,
        "title": "Present continuous (I am doing)"
      }
    }
  }
}
```

---

### 3.4. Single Question Solution
Returns the complete pedagogical solution for a single question.

- **Route:** `GET /api/v1/questions/:questionId/solution`
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "questionId": "1.1-q1",
    "questionContent": "1 Please don't make so much noise.",
    "isExample": true,
    "exampleAnswer": "f",
    "correctAnswerType": "string",
    "correctAnswerText": "f",
    "acceptedAnswers": ["f", "I'm trying to work."],
    "blanks": [],
    "parts": [],
    "answerKey": {
      "exerciseNumber": "1.1",
      "answerType": "string",
      "answerText": "f",
      "notes": "Pre-filled example question on exercise page.",
      "sourcePages": [347]
    },
    "explanation": {
      "aiExplanation": "Hành động đang diễn ra tại thời điểm nói: 'Tôi đang cố gắng làm việc' (I'm trying to work) giải thích lý do yêu cầu đừng làm ồn.",
      "explanationLanguage": "vi",
      "ruleReference": "1B",
      "theorySection": {
        "sectionId": "1B",
        "heading": "I am doing something = I'm in the middle of doing it; I've started doing it and I haven't finished:"
      }
    }
  }
}
```

---

### 3.5. Exercise Solutions (All Questions)
Returns complete pedagogical solutions for all questions belonging to an exercise.

- **Route:** `GET /api/v1/exercises/:exerciseId/solutions`
- **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "questionId": "1.1-q1",
      "correctAnswerText": "f",
      "answerKey": { ... },
      "explanation": { ... }
    },
    {
      "questionId": "1.1-q2",
      "correctAnswerText": "e",
      "answerKey": { ... },
      "explanation": { ... }
    }
  ],
  "meta": {
    "exerciseId": "1.1",
    "exerciseNumber": "1.1",
    "totalSolutions": 8
  }
}
```

---

## 4. Stateless Answer Evaluation & Grading Endpoints (Checkpoint 5.3)

### 4.1. Check Question Answer
Evaluates a student's answer for a single question using smart normalization (trimming whitespace, normalizing inner spacing, case-folding, flexible trailing punctuation, and curly quote normalization) against all acceptable variants.

- **Route:** `POST /api/v1/questions/:questionId/check`
- **Request Body:**
  ```json
  {
    "answer": "f"
  }
  ```
  *(For multi-blank/multi-part questions, `answer` can be an array `["What's he studying", "Is he enjoying"]` or a record `{"1": "...", "2": "..."}` or `{"4.1-q9.1": "...", "4.1-q9.2": "..."}`).*

- **Response (200 OK - Correct Answer):**
```json
{
  "success": true,
  "data": {
    "questionId": "1.1-q2",
    "isCorrect": true,
    "studentAnswer": "I'm getting hungry.",
    "expectedAnswers": ["e", "I'm getting hungry."],
    "correctAnswers": ["e", "I'm getting hungry."],
    "explanation": "'Tôi cần ăn gì đó sớm' phù hợp nhất với trạng thái đang tiến triển 'Tôi đang thấy đói' (I'm getting hungry).",
    "ruleReference": "1E"
  }
}
```

- **Response (200 OK - Incorrect Answer):**
```json
{
  "success": true,
  "data": {
    "questionId": "1.1-q2",
    "isCorrect": false,
    "studentAnswer": "wrong answer",
    "expectedAnswers": ["e", "I'm getting hungry."],
    "correctAnswers": ["e", "I'm getting hungry."],
    "explanation": "'Tôi cần ăn gì đó sớm' phù hợp nhất với trạng thái đang tiến triển 'Tôi đang thấy đói' (I'm getting hungry).",
    "ruleReference": "1E"
  }
}
```

---

### 4.2. Check Exercise Answers (Whole Exercise Grading)
Evaluates an entire exercise submission, grading each question against its primary answer and all accepted alternatives, and returning aggregate statistics.

- **Route:** `POST /api/v1/exercises/:exerciseId/check`
- **Request Body:**
```json
{
  "answers": {
    "1.1-q1": "f",
    "1.1-q2": "e",
    "1.1-q3": "g",
    "1.1-q4": "a",
    "1.1-q5": "d",
    "1.1-q6": "h",
    "1.1-q7": "b",
    "1.1-q8": "c"
  }
}
```

- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "exerciseId": "1.1",
    "exerciseNumber": "1.1",
    "totalQuestions": 8,
    "correctCount": 8,
    "scorePercentage": 100,
    "results": [
      {
        "questionId": "1.1-q1",
        "isCorrect": true,
        "studentAnswer": "f",
        "correctAnswers": ["f", "I'm trying to work."],
        "expectedAnswers": ["f", "I'm trying to work."],
        "explanation": "Hành động đang diễn ra tại thời điểm nói...",
        "ruleReference": "1B"
      },
      {
        "questionId": "1.1-q2",
        "isCorrect": true,
        "studentAnswer": "e",
        "correctAnswers": ["e", "I'm getting hungry."],
        "expectedAnswers": ["e", "I'm getting hungry."],
        "explanation": "'Tôi cần ăn gì đó sớm' phù hợp nhất với trạng thái đang tiến triển...",
        "ruleReference": "1E"
      }
    ]
  }
}
```

---

## 5. Test Suite Coverage Summary

All endpoints are validated through automated Vitest + Supertest integration tests against the live Neon PostgreSQL database:
- `backend/tests/curriculum.api.test.ts`: 9 tests (Health, Book, Unit pagination, Search, Unit theory, Section lookup, 404s).
- `backend/tests/exercises.api.test.ts`: 8 tests (Unit exercises, anti-spoiler stripping, spoiler enablement, exercise detail, word bank items, question solutions).
- `backend/tests/grading.api.test.ts`: 8 tests (Exact matching, alternative accepted answers, multi-blank arrays, multi-part records, feedback explanations, exercise-level scoring, stateless DB verification, validation errors).

**Total Test Count:** 25 integration tests (100% passing).
