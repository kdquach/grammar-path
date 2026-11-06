# GrammarPath Phase 7.1: User Authentication, Learning Progress & Exercise Attempts API Specification

This document provides the technical specification for the Phase 7 Checkpoint 7.1 REST API extensions (`grammarpath-app/backend/`), covering user authentication, learning progress tracking, exercise attempt persistence, statistical dashboards, and mistake review.

---

## 1. Overview & Architecture

### 1.1. Base URL
```
http://localhost:4000/api/v1
```

### 1.2. Key Architectural Tenets
- **Additive Database Extension**: 4 user-domain tables (`users`, `learning_progress`, `exercise_attempts`, `question_attempt_items`) and 1 enum (`learning_status_enum`) added alongside the 22 core curriculum tables, which remain 100% intact.
- **JWT-Based Authentication**: Stateless token generation using `bcryptjs` (salt rounds: 10) and `jsonwebtoken` with 7-day token expiration.
- **Dual-Mode Grading (Optional Authentication)**:
  - **Guest mode**: Requests without an `Authorization` header receive stateless grading without database writes.
  - **Authenticated mode**: Requests with `Authorization: Bearer <token>` atomically persist attempts and update unit learning progress.
- **Mistake Resolution Tracking**: Submitting a correct answer dynamically resolves mistakes from `/api/v1/progress/mistakes`.

---

## 2. Authentication Endpoints (`/api/v1/auth`)

### 2.1. Register Account
- **Endpoint**: `POST /api/v1/auth/register`
- **Auth**: None
- **Request Body**:
```json
{
  "email": "learner@grammarpath.local",
  "password": "securePassword123!",
  "displayName": "Grammar Learner"
}
```
- **Response** (`201 Created`):
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "c0a8012b-7b0b-48d6-950f-e25f778a6311",
      "email": "learner@grammarpath.local",
      "displayName": "Grammar Learner",
      "createdAt": "2026-11-06T16:50:00.000Z"
    }
  }
}
```
- **Error Responses**:
  - `400 Bad Request`: `VALIDATION_ERROR` (password < 6 chars, invalid email)
  - `409 Conflict`: `CONFLICT` (email already registered)

### 2.2. Login
- **Endpoint**: `POST /api/v1/auth/login`
- **Auth**: None
- **Request Body**:
```json
{
  "email": "learner@grammarpath.local",
  "password": "securePassword123!"
}
```
- **Response** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "c0a8012b-7b0b-48d6-950f-e25f778a6311",
      "email": "learner@grammarpath.local",
      "displayName": "Grammar Learner",
      "createdAt": "2026-11-06T16:50:00.000Z"
    }
  }
}
```
- **Error Responses**:
  - `401 Unauthorized`: `INVALID_CREDENTIALS` (email not found or incorrect password)

### 2.3. Get Profile (Me)
- **Endpoint**: `GET /api/v1/auth/me`
- **Auth**: Required (`Authorization: Bearer <token>`)
- **Response** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "id": "c0a8012b-7b0b-48d6-950f-e25f778a6311",
    "email": "learner@grammarpath.local",
    "displayName": "Grammar Learner",
    "createdAt": "2026-11-06T16:50:00.000Z"
  }
}
```
- **Error Responses**:
  - `401 Unauthorized`: `UNAUTHORIZED` (missing or invalid token)

---

## 3. Upgraded Grading Endpoints with Optional Authentication

### 3.1. Exercise Grading (`POST /api/v1/exercises/:exerciseId/check`)
- **Guest Mode**: Returns grading results without persisting.
- **Authenticated Mode** (`Authorization: Bearer <token>`):
  - Atomically creates `ExerciseAttempt` and child `QuestionAttemptItem` rows.
  - Updates or creates `LearningProgress` for the parent unit (`in_progress` or auto-promoted to `completed` if all unit exercises scored >= 80%).
  - Returns `attemptId` and `unitProgressStatus` in the response data.

### 3.2. Single Question Grading (`POST /api/v1/questions/:questionId/check`)
- **Guest Mode**: Returns grading result statelessly.
- **Authenticated Mode** (`Authorization: Bearer <token>`):
  - Creates a `QuestionAttemptItem` record (`attemptId: null`).
  - Upserts parent unit `LearningProgress` (`in_progress` if not already `completed`).
  - If question was previously answered incorrectly, submitting a correct answer resolves the mistake.

---

## 4. Learning Progress & Mistake Review Endpoints (`/api/v1/progress`)

### 4.1. Learning Overview Dashboard
- **Endpoint**: `GET /api/v1/progress/overview`
- **Auth**: Required
- **Response** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "units": {
      "completedCount": 1,
      "inProgressCount": 2,
      "notStartedCount": 142,
      "totalUnits": 145,
      "completionPercentage": 0.7
    },
    "exercises": {
      "totalAttempts": 4,
      "uniqueExercisesAttempted": 3,
      "totalExercises": 549,
      "averageScorePercentage": 87.5
    },
    "questions": {
      "totalAnswered": 15,
      "uniqueQuestionsAnswered": 12,
      "correctUniqueQuestions": 11,
      "accuracyPercentage": 86.7
    },
    "recentAttempts": [
      {
        "id": "e4f8d220-4351-4043-8531-1e9a26364022",
        "exerciseId": "1.1",
        "exerciseNumber": "1.1",
        "unitNumber": 1,
        "unitTitle": "Present continuous (I am doing)",
        "scorePercentage": 87.5,
        "correctCount": 7,
        "totalQuestions": 8,
        "submittedAt": "2026-11-06T16:55:00.000Z"
      }
    ],
    "unitProgressMap": [
      {
        "unitNumber": 1,
        "status": "completed",
        "lastAccessedAt": "2026-11-06T16:55:00.000Z",
        "completedAt": "2026-11-06T16:55:00.000Z"
      }
    ]
  }
}
```

### 4.2. Unit Progress Detail
- **Endpoint**: `GET /api/v1/progress/units/:unitNumber`
- **Auth**: Required
- **Response** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "unitNumber": 1,
    "title": "Present continuous (I am doing)",
    "status": "completed",
    "lastAccessedAt": "2026-11-06T16:55:00.000Z",
    "completedAt": "2026-11-06T16:55:00.000Z",
    "attempts": [
      {
        "id": "e4f8d220-4351-4043-8531-1e9a26364022",
        "exerciseId": "1.1",
        "exerciseNumber": "1.1",
        "totalQuestions": 8,
        "correctCount": 7,
        "scorePercentage": 87.5,
        "submittedAt": "2026-11-06T16:55:00.000Z"
      }
    ]
  }
}
```

### 4.3. Update Unit Progress
- **Endpoint**: `PUT /api/v1/progress/units/:unitNumber`
- **Auth**: Required
- **Request Body**:
```json
{
  "status": "completed"
}
```
- **Response** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "unitNumber": 1,
    "title": "Present continuous (I am doing)",
    "status": "completed",
    "completedAt": "2026-11-06T16:56:00.000Z",
    "lastAccessedAt": "2026-11-06T16:56:00.000Z"
  }
}
```

### 4.4. Mistake Review
- **Endpoint**: `GET /api/v1/progress/mistakes`
- **Auth**: Required
- **Description**: Returns questions where the user's most recent `QuestionAttemptItem` has `isCorrect: false`.
- **Response** (`200 OK`):
```json
{
  "success": true,
  "data": [
    {
      "questionId": "1.1-q2",
      "questionContent": "She's eating an apple.",
      "questionType": "matching",
      "exerciseId": "1.1",
      "exerciseNumber": "1.1",
      "unitNumber": 1,
      "unitTitle": "Present continuous (I am doing)",
      "lastStudentAnswer": "wrong_ans",
      "lastAttemptedAt": "2026-11-06T16:55:00.000Z"
    }
  ],
  "meta": {
    "totalMistakes": 1
  }
}
```
- When the learner subsequently answers `1.1-q2` correctly, the question is automatically removed from this response.
