# GrammarPath App (`grammarpath-app`)

Full-stack application repository for GrammarPath, containing the Express + TypeScript REST API service (Phase 5) and the React + Vite + TypeScript interactive learning frontend (Phase 6).

## Repository Architecture & Workspace Structure

```
grammarpath-app/
├── backend/                  # Phase 5: Express + TypeScript REST API
│   ├── prisma/               # Locked Prisma v6 schema (read-only against Neon PostgreSQL)
│   ├── src/
│   │   ├── config/           # Prisma client singleton & env configuration
│   │   ├── controllers/      # Route handlers (curriculum, theory, exercises, questions)
│   │   ├── middleware/       # Error handling, validation, CORS
│   │   ├── routes/           # Express API v1 route definitions
│   │   ├── utils/            # Response envelopes, formatters, and grading engine (grader.ts)
│   │   ├── app.ts            # Express application factory
│   │   └── server.ts         # Server entry point (port 4000)
│   ├── tests/                # Automated integration tests (Vitest + Supertest, 25 tests)
│   └── package.json
├── frontend/                 # Phase 6: React + Vite + TypeScript web application
│   ├── src/
│   │   ├── api/              # Typed API client layer (`client.ts`)
│   │   ├── components/
│   │   │   ├── layout/       # AppLayout header, navigation, and footer
│   │   │   ├── theory/       # TheoryViewer, RuleReferenceModal drawer
│   │   │   └── exercises/    # Polymorphic renderers, WordBankBar, QuestionCard, ExerciseViewer
│   │   │       └── renderers/# Option, MultiPart, FillBlank, Sentence renderers
│   │   ├── pages/            # CatalogPage (145 units), UnitPage (Theory & Practice tabs)
│   │   ├── types/            # TypeScript domain & API contract types
│   │   ├── App.tsx           # Route definitions (React Router v6)
│   │   └── main.tsx
│   ├── tests/                # Automated component tests (Vitest + React Testing Library, 13 tests)
│   └── package.json
├── docs/                     # Technical specifications & documentation
│   └── phase-5-api-specification.md # Complete REST API specification
├── .gitignore
└── README.md
```

## Running the Application Locally

### 1. Backend Service (Port 4000)

```bash
cd backend
npm install
npm run dev
```

- Server runs on `http://localhost:4000`.
- Health check: `http://localhost:4000/api/v1/health`.
- Test suite:
  ```bash
  npm test
  ```

### 2. Frontend Application (Port 5173)

```bash
cd frontend
npm install
npm run dev
```

- Vite dev server runs on `http://localhost:5173`.
- API proxy is configured to automatically forward `/api` requests to `http://localhost:4000`.
- Typecheck, tests, and production build:
  ```bash
  npm run typecheck
  npm test
  npm run build
  ```

## Key Capabilities

1. **Curriculum Catalog & Navigation**:
   - Browse all 145 units from Murphy's *English Grammar in Use* (4th Edition).
   - Search by unit topic and filter by unit number ranges (1–20, 21–40, etc.).
   - Canonical source-page reconciliation badges (Theory PDF page, Exercise PDF page, Cambridge Answer Key page).

2. **Theory & Textbook Examples Viewer**:
   - Organized sections (e.g. 1A, 1B, 1C) with clean typographic hierarchy.
   - Dual-language textbook examples with verified Vietnamese translations.
   - Quick Rule Reference Modal: instantly look up any grammatical rule across the book.

3. **Polymorphic Exercise Renderers & Interactive Learning**:
   - **Worked Examples**: Pre-filled demonstration answers with model explanation lookup.
   - **Option Questions**: Clean card selection for matching and multiple-choice questions.
   - **Multi-Part Questions**: Compound dialog and sentence prompts with sub-part inputs.
   - **Fill-in-the-Blank**: Dynamic multi-blank and single-blank sentence inputs.
   - **Sentence Construction**: Full-sentence inputs with visual context notes and context clues.
   - **Interactive Word Bank**: Word chip bar with click-to-copy and visual crossed-out tracking.

4. **Pedagogical Feedback & Vietnamese Explanations**:
   - Instant stateless answer evaluation (`POST /api/v1/questions/:questionId/check` and `POST /api/v1/exercises/:exerciseId/check`).
   - Official Cambridge Answer Key provenance with PDF page references.
   - AI-enhanced Vietnamese pedagogical explanations.
   - Clickable Rule Reference badge linking directly to the corresponding theory section modal.

## Sibling Data Repository

- **Data Repository (Read-Only Reference):** `../grammarpath-data` (`/Users/kd.quach03/Documents/grammarpath-data`)
  Contains ETL pipelines, raw PDF extractions, schema audits, and data reconciliation scripts.
