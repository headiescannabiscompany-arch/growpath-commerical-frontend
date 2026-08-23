# P-07 through P-09 AI Evidence Local Acceptance — 2026-08-23

## Outcome

The existing shared evidence, Harvest Readiness, Diagnosis and IPM implementations were accepted locally without rebuilding them. A real contract gap in Ingredient Label AI was repaired: the frontend's protected `evidenceAssetId` request now has a matching owner-scoped backend path, and the resulting source-bound analysis receipt persists with the ingredient draft.

## Accepted locally

- Shared evidence review identifies requested versus inspected media, original evidence, derived inspection views, quality, uncertainty, limitations and next checks.
- Evidence upload/review APIs, picker state, saved ToolRun reopening and exact-view review paths retain provenance.
- Harvest Readiness retains ordinary-phone sample guidance, visible-sample accounting, glare/unreadable handling, trichome metrics and explicit evidence limitations.
- Diagnosis and IPM retain ranked hypotheses, counter-evidence, crop context, photo-quality handling and safe next checks.
- Ingredient Label AI uses a user-selected uploaded photo, records the exact source evidence and derived views, returns a reviewable draft, requires user verification and persists the extraction plus receipt. Foreign, missing or unusable evidence fails closed.
- Product ingredients persist the fields already collected by the UI and support owner-scoped list, detail, update and reversible archive behavior. Active lists exclude archived records by default.

## Verification

Combined AI-evidence acceptance replay:

- 19 Jest suites passed.
- 216 assertions passed.

Ingredient-label frontend:

- `IngredientLibraryRoute.test.tsx`
- `EvidenceReviewPanel.test.tsx`
- `evidenceReview.test.ts`
- 3 suites and 15 assertions passed.
- TypeScript passed with `tsc --noEmit`.
- Targeted source lint passed with zero warnings.

Ingredient-label backend:

- `feeding.test.js`
- `ingredients.test.js`
- `aiImageDiagnosticViews.test.js`
- `personalAssistantEvidence.test.js`
- 4 suites and 110 assertions passed.

## Remaining acceptance — do not reconstruct

- P-07: configured production object storage/provider, protected original and derived-view retrieval/export, retention and credit behavior.
- P-08: configured provider with representative ordinary-phone photo/video samples, including glare, unreadable and degraded paths.
- P-09: configured provider with representative Diagnosis and IPM media, including ranked alternatives, safe degraded behavior and credit handling.
- Ingredient Label AI: production protected-photo analysis, receipt reload and archive verification.

These are exact provider/storage/live gates on the existing implementation, not permission to replace or restart the tools.
