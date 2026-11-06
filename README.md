# GrammarPath App (`grammarpath-app`)

Application repository for GrammarPath, containing the backend REST API service (Phase 5) and frontend user interface (Phase 6).

## Repository Architecture & Workspace Structure

```
grammarpath-app/
├── backend/                  # Phase 5: Express + TypeScript REST API
│   ├── prisma/               # Locked Prisma v6 schema (read-only against Neon PostgreSQL)
│   ├── src/
│   │   ├── controllers/      # Route handlers
│   │   ├── lib/              # Prisma client singleton & shared libs
│   │   ├── middleware/       # Error handling, validation, CORS
│   │   ├── routes/           # Express API v1 route definitions
│   │   ├── utils/            # Standard response envelopes, formatters, and grading engine
│   │   ├── app.ts            # Express application factory
│   │   └── server.ts         # Server entry point
│   ├── tests/                # Automated integration tests (Vitest + Supertest)
│   └── package.json
├── docs/                     # Technical specifications & documentation
│   └── phase-5-api-specification.md # Complete REST API specification
├── frontend/                 # Phase 6: Reserved for React web application
├── .gitignore
└── README.md
```

## API Documentation

See [docs/phase-5-api-specification.md](docs/phase-5-api-specification.md) for the complete endpoint catalog, request/response payloads, query parameter standards, and grading engine specification.

## Sibling Data Repository

- **Data Repository (Read-Only Reference):** `../grammarpath-data` (`/Users/kd.quach03/Documents/grammarpath-data`)
  Contains the ETL pipelines, source PDF extraction artifacts, reconciliation reports, and baseline database migration scripts.

## Database Access

- Database: Managed PostgreSQL on Neon (`neondb`)
- Schema: Locked 22-table relational schema matching `../grammarpath-data/prisma/schema.prisma`
- Phase 5 Access Mode: Strictly **READ-ONLY** (no DDL migrations or write operations permitted).
