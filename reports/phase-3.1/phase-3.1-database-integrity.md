# GrammarPath Phase 3.1 — Database Integrity & Schema Audit Report
**Staging Environment Validation, Migration Verification, and Canonical Data Protection**

- **Date:** 2026-11-13
- **Author:** Senior Database Architect & Staging Environment Custodian
- **Database:** PostgreSQL on Neon Serverless (`ap-southeast-1.aws.neon.tech`)
- **Resolved Database:** `ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech:5432/grammarpath-staging`
- **Prisma Version:** 6.19.3

---

## 1. Environment Isolation & Safety Verification

Before any database write operations were initiated, the Staging Isolation Guard ([verify-staging-env.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/scripts/verify-staging-env.ts)) validated the active environment configuration:

- Target Host: `ep-small-dream-a1lqsn1r.ap-southeast-1.aws.neon.tech`
- Database Name: `grammarpath-staging`
- Production Connection Block: **VERIFIED** (No production hosts or credentials present).
- Destructive Operations (`prisma migrate reset`, `prisma db push` on staging): **FORBIDDEN & UNUSED**.

---

## 2. Migration Audit: `20261113120000_phase_3_1_data_foundation`

The migration was generated and reviewed offline prior to live application.

### 2.1 Applied Schema Changes
1. **5 New Enums:**
   - `AttemptStatus` (`correct`, `incorrect`, `unanswered`)
   - `AttemptSource` (`single_check`, `exercise_submission`, `adaptive_quiz`, `mistake_retry`, `toeic_practice`, `legacy_unknown`)
   - `ConceptTheoryRole` (`primary`, `supporting`, `contrastive`, `review`)
   - `MappingConfidence` (`high`, `medium`, `low`, `needs_review`)
   - `ToeicUnitPriority` (`core`, `supporting`, `advanced_optional`)
2. **5 New Tables:**
   - `grammar_concepts` (161 rows seeded)
   - `concept_theory_links` (542 rows seeded)
   - `toeic_roadmap_stages` (5 rows seeded)
   - `toeic_roadmap_modules` (16 rows seeded)
   - `unit_toeic_metadata` (145 rows seeded)
3. **Table Modifications:**
   - `question_attempt_items`: added `attempt_status`, `attempt_source`, made `is_correct` and `student_answer` nullable. Added constraint `chk_qai_attempt_status_consistency`.
   - `explanations`: added `theory_section_id` foreign key referencing `theory_sections.id` (`ON DELETE SET NULL`), with index `idx_explanations_theory_section_id`.

### 2.2 Migration Status Check
Command: `npm run prisma:status:staging`

```
Status: 4 migrations applied, schema up-to-date.
Prisma migrate diff: No schema drift detected between schema.prisma and staging database.
```

---

## 3. Database Object Inventory

Verified via [verify-migrations.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/scripts/verify-migrations.ts):

| Object Type | Phase 2.2 Baseline | Phase 3.1 Total | Delta | Notes |
|---|---:|---:|---:|---|
| Enums | 5 | 10 | +5 | `AttemptStatus`, `AttemptSource`, `ConceptTheoryRole`, `MappingConfidence`, `ToeicUnitPriority` |
| Tables | 29 | 34 | +5 | `GrammarConcept`, `ConceptTheoryLink`, `ToeicRoadmapStage`, `ToeicRoadmapModule`, `UnitToeicMetadata` |
| Foreign Keys | 31 | 39 | +8 | Linkages for concepts, theory sections, and TOEIC roadmap |
| CHECK Constraints | 21 | 22 | +1 | `chk_qai_attempt_status_consistency` |
| Indexes | 48 | 67 | +19 | Fast lookups on concept links, attempt statuses, and TOEIC parts |

---

## 4. Staging Data Baseline Integrity Audit

Direct query executed against Neon staging:

```json
{
  "units": 145,
  "sections": 542,
  "exercises": 549,
  "questions": 4414,
  "explanations": 4414,
  "linkedExpl": 4414,
  "crossUnitExpl": 0,
  "concepts": 161,
  "links": 542,
  "stages": 5,
  "modules": 16,
  "toeicMeta": 145
}
```

### Verification Highlights:
- **Canonical Curriculum Intact:** All 145 units, 542 sections, 549 exercises, and 4,414 questions remain completely untouched.
- **100% Explanation Linkage:** 4,414 of 4,414 explanations have a valid `theorySectionId`. Exactly 0 unlinked explanations and 0 cross-unit violations exist.
- **Seeding Idempotency:** The concept and roadmap seed script ([seed-phase3-1-concepts.ts](file:///Users/kd.quach03/Documents/grammarpath-app/backend/scripts/seed-phase3-1-concepts.ts)) was executed twice in succession. The second execution produced zero duplicate records and modified zero existing records.

---

## 5. Canonical Data Protection Audit

The canonical curriculum in `/Users/kd.quach03/Documents/grammarpath-data` was strictly protected throughout Phase 3.1:

```bash
$ git -C /Users/kd.quach03/Documents/grammarpath-data status -s
# (Clean: 0 modified files, 0 untracked files)
```

- **0** canonical JSON files modified.
- **0** question IDs altered.
- **0** answer keys or explanations changed.
- **0** re-extraction or re-import scripts executed.

