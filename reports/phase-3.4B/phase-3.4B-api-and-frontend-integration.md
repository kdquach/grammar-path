# GrammarPath Phase 3.4B — Report 7: API Contracts & Frontend Integration Architecture
## REST Endpoint Specifications, Modal UI Workflows, Attempt Persistence & Mastery Bridge

**Date:** 2026-11-13  
**Auditor:** Principal Full-Stack Architect & UX Systems Engineer  
**Scope:** API Route Design, Anti-Spoiler Contracts, Client State Management, and Attempt Tracking  
**Phase Status:** DESIGN ONLY (Phase 3.4B Stage 1)

---

## 1. Executive Summary

This report defines the API contracts and frontend integration architecture for delivering pre-approved TOEIC Question Bank items to learners. 

The integration delivers three critical advancements:
1. **Instant Session Initialization (< 50ms):** Replaces the synchronous Gemini call with an indexed query against `ToeicQuestionBankItem`, eliminating loading spinners and timeout errors.
2. **Mastery Engine Bridge:** TOEIC answer checks now create a `QuestionAttemptItem` with `attemptSource: "toeic_practice"`, establishing the telemetry bridge needed for cross-skill mastery calculations in Phase 3.4C.
3. **Practice Modalities:** Supports untimed practice drills, timed practice modes, unit-grounded drills, and mixed Part 5 practice sets.

---

## 2. API Contract Specifications

To ensure 100% backward compatibility with the existing frontend while enabling advanced bank features, the endpoints preserve their existing URL paths while upgrading their underlying service implementation.

### 2.1 Endpoint 1: Practice Session Initialization
- **Route:** `POST /api/v1/adaptive/toeic-practice`
- **Auth:** `requireAuth` (JWT)
- **Rate Limit:** `submissionRateLimiter` (60 req/min per user)
- **Request Body (Zod):**
  ```typescript
  export const toeicPracticeRequestSchema = z.object({
    unitNumber: z.coerce.number().int().min(1).max(145).optional(),
    conceptId: z.string().uuid().optional(),
    part: z.enum(["part_5", "mixed"]).optional().default("part_5"),
    difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
    count: z.coerce.number().int().min(1).max(20).optional().default(5),
    mode: z.enum(["untimed", "timed"]).optional().default("untimed"),
  }).refine((data) => data.unitNumber !== undefined || data.conceptId !== undefined || data.part === "mixed", {
    message: "Must specify unitNumber, conceptId, or mixed part practice",
  });
  ```
- **Service Operation:**
  1. Queries `ToeicQuestionBankItem` with `where: { status: 'approved', unitNumber, difficulty }`.
  2. If bank has sufficient items, randomly samples `count` items.
  3. If bank has fewer items than requested, returns all available approved items without error (avoids throwing 422 errors).
  4. Records a `ToeicPracticeSession` in PostgreSQL for historical tracking.
  5. Strips `correctOptionKey`, `isCorrect`, and explanations (**Anti-Spoiler Enforcement**).
- **Response Structure (HTTP 200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "sessionId": "a823b145-c491-49b8-b4b1-87a192c73291",
      "unitNumber": 5,
      "title": "Past simple (I did)",
      "difficulty": "medium",
      "source": "curated_bank",
      "isOfficialToeic": false,
      "sourceNotice": "Câu hỏi luyện tập dạng TOEIC Part 5 từ Ngân hàng Đề thi GrammarPath (không phải đề thi chính thức của ETS).",
      "requestedCount": 5,
      "actualCount": 5,
      "mode": "untimed",
      "questions": [
        {
          "itemId": "b34e5678-1234-5678-abcd-ef0123456789",
          "itemOrder": 1,
          "source": "curated_bank",
          "difficulty": "medium",
          "prompt": "Ms. Jenkins _______ the quarterly sales report before the executive board convened this morning.",
          "options": [
            { "key": "A", "text": "review" },
            { "key": "B", "text": "reviewed" },
            { "key": "C", "text": "is reviewing" },
            { "key": "D", "text": "reviews" }
          ],
          "ruleReference": "5A"
        }
      ]
    }
  }
  ```

---

### 2.2 Endpoint 2: Server-Authoritative Question Grader & Mastery Bridge
- **Route:** `POST /api/v1/adaptive/toeic-practice/check`
- **Auth:** `requireAuth`
- **Rate Limit:** `submissionRateLimiter`
- **Request Body (Zod):**
  ```typescript
  export const checkToeicPracticeSchema = z.object({
    sessionId: z.string().uuid(),
    itemId: z.string().uuid(),
    studentAnswer: z.enum(["A", "B", "C", "D"]),
    submissionId: z.string().trim().min(1).max(128).optional(),
  });
  ```
- **Service Operation & ACID Transaction:**
  Wrapped inside `prisma.$transaction(async (tx) => { ... })`:
  1. Validates session ownership: `session.userId === req.user.id` (IDOR defense: 403 Forbidden).
  2. Retrieves question from bank: `bankItem = await tx.toeicQuestionBankItem.findUnique({ where: { id: itemId } })`.
  3. Evaluates correctness: `isCorrect = studentAnswer === bankItem.correctOptionKey`.
  4. Updates `ToeicPracticeItem`: updates `studentAnswer`, `isCorrect`, `answeredAt`.
  5. **The Mastery Telemetry Bridge:**
     ```typescript
     // If question is linked to a GrammarConcept, persist QuestionAttemptItem
     if (bankItem.primaryConceptId) {
       await tx.questionAttemptItem.create({
         data: {
           attemptId: null,
           userId,
           questionId: bankItem.primaryQuestionId || placeholderId, // Concept bridge
           studentAnswer: studentAnswer,
           isCorrect: isCorrect,
           attemptStatus: isCorrect ? "correct" : "incorrect",
           attemptSource: "toeic_practice", // PRESERVES ENUM INTEGRITY!
           createdAt: new Date(),
         },
       });
     }
     ```
- **Response Structure (HTTP 200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "sessionId": "a823b145-c491-49b8-b4b1-87a192c73291",
      "itemId": "b34e5678-1234-5678-abcd-ef0123456789",
      "isCorrect": true,
      "studentAnswer": "B",
      "correctAnswer": "B",
      "explanation": "Quy tắc Unit 5A: Dùng Past Simple (reviewed) vì hành động đã hoàn tất trong quá khứ trước khi cuộc họp diễn ra ('this morning').",
      "ruleReference": "5A",
      "distractorRationales": {
        "A": "Dạng nguyên thể 'review' không phù hợp với chủ ngữ số ít Ms. Jenkins trong quá khứ.",
        "C": "Hiện tại tiếp diễn 'is reviewing' diễn tả hành động đang xảy ra, mâu thuẫn với 'this morning'.",
        "D": "Hiện tại đơn 'reviews' không phù hợp với ngữ cảnh sự việc đã xảy ra."
      }
    }
  }
  ```

---

## 3. Practice Modalities Supported

| Practice Mode | Selection Criteria | Target User Objective | UI Entry Point |
| :--- | :--- | :--- | :--- |
| **Unit-Grounded Drill** | Filter by `unitNumber` & `difficulty` | Reinforce grammar learned in Murphy textbook with TOEIC context. | `ToeicPracticeModal` from Roadmap or Unit page. |
| **Concept Targeted Drill** | Filter by `primaryConceptId` | Review weak concepts flagged by Spaced Repetition engine. | Review Center / Weak Concepts list. |
| **Part 5 Speed Drill (Timed)** | Filter by `toeicPart: 'part_5'`, 30 seconds per item countdown | Train exam pacing and rapid grammatical pattern recognition. | Roadmap header "Luyện nhanh Part 5". |
| **Diagnostic Mode** | Balanced sample across 16 Modules | Baseline TOEIC band assessment during onboarding. | Onboarding Diagnostic Assessment. |

---

## 4. Frontend Component Upgrades (`ToeicPracticeModal.tsx`)

1. **Elimination of Loading Delays:** The modal transitions from "Đang tạo câu hỏi bằng AI..." (2–5s spinner) to instant load (< 100ms) with skeleton animation.
2. **Detailed Distractor Feedback:** When the user checks an answer, the UI displays not only the correct answer explanation, but expands an accordion showing **why each distractor was wrong** (`distractorRationales`), transforming mistakes into high-impact learning opportunities.
3. **Timer Support:** Adds an optional lightweight stopwatch/timer widget for learners training for exam pacing.
4. **Attribution Notice:** Displays clear non-ETS attribution: *"Câu hỏi luyện tập định dạng TOEIC Part 5 do GrammarPath biên soạn (không phải tài liệu chính thức của ETS)."*

