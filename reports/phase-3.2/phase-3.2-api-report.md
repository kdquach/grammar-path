# GrammarPath Phase 3.2 — REST API Contract & Integration Report
**Mastery, Spaced Reviews, and Personalized Practice Recommendation Endpoints**

- **Date:** 2026-11-13
- **Author:** Senior Backend Engineer & API Architect
- **Base URL:** `/api/v1`
- **Authentication:** `Bearer <JWT_TOKEN>` required on all Phase 3.2 endpoints

---

## 1. Overview of New Endpoints

Phase 3.2 introduces 8 new authenticated endpoints mounted in [`backend/src/routes/index.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/routes/index.ts):

| Method | Endpoint | Handler | Controller |
|---|---|---|---|
| `GET` | `/api/v1/mastery` | `getMasterySummaryHandler` | [`mastery.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/mastery.controller.ts) |
| `GET` | `/api/v1/mastery/concepts/:conceptId` | `getConceptMasteryDetailHandler` | [`mastery.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/mastery.controller.ts) |
| `POST` | `/api/v1/mastery/recalculate` | `recalculateMasteryHandler` | [`mastery.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/mastery.controller.ts) |
| `GET` | `/api/v1/reviews/due` | `getDueReviewsHandler` | [`review.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/review.controller.ts) |
| `GET` | `/api/v1/reviews/all` | `getAllReviewsHandler` | [`review.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/review.controller.ts) |
| `POST` | `/api/v1/reviews/complete` | `completeReviewHandler` | [`review.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/review.controller.ts) |
| `GET` | `/api/v1/recommendations` | `getRecommendationsHandler` | [`recommendations.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/recommendations.controller.ts) |
| `GET` | `/api/v1/recommendations/next` | `getNextRecommendationHandler` | [`recommendations.controller.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/controllers/recommendations.controller.ts) |

---

## 2. Detailed Endpoint Contracts

### 2.1 `GET /api/v1/mastery`
Retrieves learner's aggregate mastery statistics, counts across all 7 statuses, and active concept masteries.
- **Response 200 OK:**
```json
{
  "status": "success",
  "data": {
    "totalConcepts": 161,
    "startedConcepts": 12,
    "statusCounts": {
      "not_started": 149,
      "insufficient_data": 3,
      "developing": 2,
      "practicing": 4,
      "proficient": 2,
      "mastered": 1,
      "needs_review": 0
    },
    "averageMastery": 78.4,
    "averageRetention": 0.88,
    "dueReviewsCount": 0,
    "masteries": [
      {
        "conceptId": "73c6b245-a927-4467-bc1a-5d6666ba8405",
        "conceptCode": "unit.001.present_continuous",
        "conceptName": "Present Continuous for actions happening now",
        "category": "present_tenses",
        "masteryStatus": "mastered",
        "masteryScore": 92.5,
        "retentionScore": 0.95,
        "distinctQuestionCount": 6,
        "evidenceCount": 7,
        "lastPracticedAt": "2026-11-13T09:30:00.000Z"
      }
    ]
  }
}
```

### 2.2 `GET /api/v1/mastery/concepts/:conceptId`
Provides detailed evidence breakdown, audit events, and natural language explainability.
- **Validation:** Zod UUID validation on `:conceptId`.
- **Response 200 OK:**
```json
{
  "status": "success",
  "data": {
    "concept": {
      "id": "73c6b245-a927-4467-bc1a-5d6666ba8405",
      "code": "unit.001.present_continuous",
      "name": "Present Continuous for actions happening now",
      "description": "Actions happening at the time of speaking",
      "category": "present_tenses",
      "relatedUnits": [
        {
          "unitNumber": 1,
          "unitTitle": "Present continuous (I am doing)",
          "sectionId": "1A",
          "confidence": "high"
        }
      ]
    },
    "mastery": {
      "status": "mastered",
      "score": 92.5,
      "retentionScore": 0.95,
      "evidenceCount": 7,
      "distinctQuestionCount": 6,
      "correctCount": 6,
      "incorrectCount": 1,
      "repeatedAttemptCount": 1,
      "lastPracticedAt": "2026-11-13T09:30:00.000Z",
      "nextReviewDueAt": "2026-11-20T09:30:00.000Z",
      "reviewState": "scheduled",
      "stabilityDays": 7.0,
      "explanationVi": "Xuất sắc! Bạn đã chứng minh sự am hiểu vững chắc với 6 câu hỏi khác nhau và điểm số 92.5%.",
      "recommendedActionVi": "Duy trì lịch ôn tập ngắt quãng (Spaced Repetition) khi đến hạn để không quên kiến thức."
    },
    "historyEvents": [
      {
        "id": "8fa85b13-9a4f-4d33-bc99-1a7bb0de1891",
        "previousStatus": "practicing",
        "newStatus": "mastered",
        "previousScore": 81.0,
        "newScore": 92.5,
        "reason": "exercise_submission",
        "createdAt": "2026-11-13T09:30:00.000Z"
      }
    ]
  }
}
```

### 2.3 `POST /api/v1/reviews/complete`
Records learner review performance and updates memory stability.
- **Request Body:**
```json
{
  "conceptId": "73c6b245-a927-4467-bc1a-5d6666ba8405",
  "correctCount": 3,
  "totalCount": 3,
  "unansweredCount": 0
}
```
- **Response 200 OK:**
```json
{
  "status": "success",
  "data": {
    "status": "success",
    "accuracy": 100,
    "stabilityDays": 14.0,
    "intervalDays": 14,
    "dueAt": "2026-11-27T09:30:00.000Z",
    "messageVi": "Xuất sắc! Bạn đạt 100% độ chính xác. Độ ổn định trí nhớ tăng lên 14 ngày."
  }
}
```

### 2.4 `GET /api/v1/recommendations/next`
Returns the single highest priority action card for the Dashboard.
- **Response 200 OK:**
```json
{
  "status": "success",
  "data": {
    "nextAction": {
      "id": "rec-due-73c6b245",
      "type": "review",
      "priority": 100,
      "conceptId": "73c6b245-a927-4467-bc1a-5d6666ba8405",
      "conceptCode": "unit.001.present_continuous",
      "conceptName": "Present Continuous for actions happening now",
      "category": "present_tenses",
      "unitNumber": 1,
      "unitTitle": "Present continuous (I am doing)",
      "exerciseId": "ex-1-1",
      "exerciseTitle": "Exercise 1.1",
      "estimatedQuestionCount": 3,
      "reasonVi": "Chủ điểm này đã đến hạn ôn tập ngắt quãng (Spaced Repetition). Ôn tập 3 câu để củng cố trí nhớ.",
      "actionUrl": "/reviews"
    }
  }
}
```

---

## 3. Error Handling and Resilience
1. **Unauthenticated Access (401):** Intercepted by `requireAuth` middleware; client redirects to AuthModal without crash.
2. **Invalid UUID (400):** Schema validation catches malformed parameters:
   `{"status": "error", "message": "Invalid concept UUID format"}`.
3. **Missing Resource (404):** Handled gracefully with standard error envelope.
4. **Fail-Safe Fallbacks:** If a learner has no historical attempts, recommendations default deterministically to Unit 1 without throwing errors.

