# GrammarPath Phase 2.2 — Audit F: Frontend UX, Renderers & Accessibility Report

**Date:** 2026-11-12  
**Target:** React + TypeScript + Vite SPA (`frontend/`)  
**Verification Method:** Static inspection across all pages/renderers/modals + Vitest / React Testing Library / JSDOM component suite (`64/64` tests across `10` test files) + `tsc --noEmit` + Vite production bundle build (`tsc -b && vite build`). *(Live browser viewport/DOM testing via Playwright/Chromium was unavailable because no browser automation binary is installed on the host.)*

---

## 1. UX Defects Discovered & Fixed

| ID | Area | Defect Found | Fix Applied | Regression Coverage |
| :--- | :--- | :--- | :--- | :--- |
| **UX-1** | [`QuestionFeedbackPanel.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/QuestionFeedbackPanel.tsx#L105-L125) & [`QuestionCard.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/QuestionCard.tsx#L83-L86) | Ordered multi-blank and multi-part feedback arrays (e.g., `["-", "the"]` on `73.1-q7` or multi-part `1.2-q1`) rendered Blank/Part #1 as `"Expected Answer"` and Blank/Part #2+ misleadingly as `"Also accepted:"` | Added `isOrderedMultiExpected` and `partLabelPrefix` (`"Blank #"` vs `"Part #"`), rendering `Expected Answers:` with labeled `Blank #1:`, `Blank #2:` / `Part #1:`, `Part #2:` chips | [`phase2-2-ux.test.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/tests/phase2-2-ux.test.tsx#L37-L57) |
| **UX-2** | [`QuestionCard.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/exercises/QuestionCard.tsx#L102-L134) & [`MistakeReviewPage.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/pages/MistakeReviewPage.tsx#L552-L629) | Revealing a full `QuestionSolution` on multi-part or multi-blank questions when top-level `acceptedAnswers` was empty produced missing or unlabeled chips | Hydrated ordered answers from `result.parts` / `result.blanks` in `QuestionCard` and derived `Part #n:` / `Blank #n:` `solutionChips` + ordered feedback flags in `MistakeReviewPage` | [`phase2-2-ux.test.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/tests/phase2-2-ux.test.tsx#L59-L127) |
| **UX-3** | [`ToeicPracticeModal.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/adaptive/ToeicPracticeModal.tsx#L408-L436) | Clicking a 2-blank correlative TOEIC option (`"are / debating"` in Unit 1 Q4) injected `"are / debating"` into both Blank 1 and Blank 2 | Split `selectedText` on `/\s*\/\s*/` when `totalBlanks > 1 && selectedText.includes(" / ")` so Blank 1 fills `"are"` and Blank 2 fills `"debating"` | [`phase2-2-ux.test.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/tests/phase2-2-ux.test.tsx#L129-L175) |
| **UX-4** | [`RuleReferenceModal.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/theory/RuleReferenceModal.tsx#L52-L61) & [`AuthModal.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/components/auth/AuthModal.tsx#L33-L42) | `RuleReferenceModal` and `AuthModal` did not dismiss on `Escape`, and `AuthModal` lacked explicit `role="dialog"` / `aria-modal="true"` attributes | Added `window` `keydown` `Escape` handlers in both modals and `role="dialog" aria-modal="true"` on `AuthModal` | [`phase2-2-ux.test.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/tests/phase2-2-ux.test.tsx#L177-L210) |
| **UX-5** | [`CatalogPage.tsx`](file:///Users/kd.quach03/Documents/grammarpath-app/frontend/src/pages/CatalogPage.tsx#L420-L433) | Clickable Unit cards used `<div>` with `onClick` only (unreachable via keyboard `Tab`/`Enter`/`Space`) | Added `role="button"`, `tabIndex={0}`, `onKeyDown` (`Enter`/`Space`), and `focus:ring-2 focus:ring-brand-500` styling | Static inspection + TypeScript/Vitest pass |

---

## 2. Structural & Interaction Quality Checklist

- **Question Renderers (`exercise-renderer.test.tsx` + `phase2-2-ux.test.tsx`):** Single-blank, multi-blank, multi-part, full-sentence, single-choice options, multi-select (`"Two alternatives are possible"` / `17.2` / `24.1`), split-slash multi-blank (`86.4-q9`), worked examples, and `QuestionVisualContext` notices all align with [`evaluateQuestion`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/utils/grader.ts#L242).
- **Non-Blocking Error & Loading Handling (`phase1-runtime-reliability.test.tsx`):** Verified toast alerts replace `window.alert()`, non-JSON error responses do not crash UI, expired `401 UNAUTHORIZED` clears tokens cleanly while login `401 INVALID_CREDENTIALS` stays inside `AuthModal`, and `503 AI_PROVIDER_UNAVAILABLE` shows graceful feedback.
- **Responsive Tailwind Grid Layouts (Static Inspection):** `CatalogPage` (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`), `ToeicPracticeModal` (`grid-cols-1 sm:grid-cols-2`, `max-h-[90vh]`), and `RuleReferenceModal` (`max-w-2xl max-h-[85vh]`) handle mobile through desktop breakpoints consistently.

