# Plant Diagnosis Production Evidence — 2026-07-21

## Release identity

- Production URL: `https://growpathai.com`
- Account: `headiescannabiscompany@gmail.com`
- Account state: Personal Pro, trialing, 100 weekly AI credits
- Tested grow: `6a551a9d2fb9f669d2319c06` (`bruce banner and mountain top mint`)
- Finding-fix source commit: `801d78525791fea83dff190ff3a6d67bda424134`
- Pull request: `#95`
- Deployed merge: `2f2cfeeeabe1d1bfcaeafc4a0743cdf28204488b`
- Render deploy: `dep-d9fp4ssm0tmc73fifr9g`
- Render live timestamp: July 21, 2026 at 11:40 AM ET

## Fresh-file provider run

- At approximately 11:15 AM ET, the in-app Browser selected a genuine 3.7 MB JPEG through the production `Add evidence photos` control. The upload persisted as diagnosis-purpose evidence `6a5f8deb9a4ebf90c8c78967` and displayed the current-workflow-only AI disclosure.
- The request ran once against `openai / gpt-4o-mini`; the UI recorded one photo inspected and usable for cautious triage.
- Without a typed crop name, the result produced a high-confidence draft crop identity of `Cannabis` / `Cannabis sativa`, cited mature flowering structures and leaf morphology, required user confirmation, and did not infer a cultivar or strain.
- The ranked candidates were `overripeness/overcrowding` at 80% and `light stress` at 70%. The response also exposed missing environment, root-zone, pH/EC, progression, and feeding context plus a nutrient-schedule/EC follow-up question.
- The user-outcome action `Unsure` persisted with a note that a single photo supported Cannabis identity but did not justify treatment while overall confidence and ranked-candidate percentages were presented inconsistently.

## Exact billing and persistence

- Before: `65 / 100`; 35 credits used across 21 billed requests; 0 refunds.
- After: `62 / 100`; 38 credits used across 22 billed requests; 0 refunds.
- Exact deduction: three credits, matching the visible Plant Diagnosis price.
- Saved ToolRun: `6a5f8e039a4ebf90c8c78977`.
- Saved grow-journal entry: `6a5f8e8a9a4ebf90c8c7899f` (`overripeness/overcrowding`).
- The grow Journal showed both new records. Opening the newest diagnosis ToolRun displayed the exact source ID, photo URL, evidence ID, input context, ranked issues, crop identity, recommendations, and stored result.

## Production finding and fix

The original request silently submitted `stage: veg` and `pattern location: upper new growth` even though the user had not selected either value. The result card then displayed `Confidence: UNKNOWN` beside `Severity: HIGH`, while the provider data separately contained an 80% top candidate, `overallHealth: concern`, and `urgency: medium`.

PR `#95` fixed both issues:

- Stage and pattern location now start as explicit `unknown` values and expose selected accessibility state.
- Readiness copy names missing stage/pattern context instead of claiming it was provided.
- Overall confidence stays distinct from ranked-candidate confidence.
- When overall confidence is absent, the result shows the directly returned top-candidate percentage under `Top candidate confidence`.
- `Health status` and `Action urgency` are shown separately; the stored numeric severity remains available for existing task-priority behavior.
- The ETGU method document and app-readable method registry now forbid silent stage/location defaults and confidence-label conflation.

## Verification

- Focused diagnosis, normalization, and knowledge-registry tests: 20 passed.
- Full frontend regression: 295 suites, 1,108 tests, one snapshot; all passed.
- Diagnosis/IPM contract: passed.
- Touched runtime ESLint: no errors.
- Prettier and `git diff --check`: passed.
- Production web export: passed and verified `https://api.growpathai.com`.
- Render static build verification: passed.
- GitHub Frontend CI: passed in 3m09s.
- Repository-wide TypeScript remains blocked by pre-existing errors in unrelated commercial, facility, feed, and e2e files; no touched diagnosis file appeared in that failure list.

## Deployed retest

- Render showed merge `2f2cfee` live at 11:40 AM ET.
- A fresh production diagnosis load with `release=2f2cfeee` displayed `Diagnosis stage unknown` and `Diagnosis pattern unknown`, plus progression/root-zone unknowns.
- The picker was empty (`0/10`), provider status remained connected (`openai / gpt-4o-mini / image input supported`), and `Run diagnosis` remained disabled until written evidence or a photo was added.
- A Profile reload on the deployed release remained `62 / 100`, 38 credits across 22 billed requests, and 0 refunds. The post-deploy retest therefore made no provider call and charged no credits.

## Evidence limits and remaining acceptance

- Evidence types completed: production in-app Browser DOM inspection, genuine fresh-file upload, real provider result, server credit ledger, exact Journal/ToolRun reopening, submitted outcome feedback, GitHub CI, Render deployment record, and deployed non-billable retest.
- One genuine in-task Browser screenshot captured the uploaded photo/current-workflow disclosure, and another captured the saved-feedback/actions area on the pre-fix release. They were not exported as standalone files.
- The final-SHA screenshot attempt ended with `target closed while handling command`; no final-SHA screenshot or video artifact is claimed.
- Still open: a deliberately induced provider failure with verified three-credit refund/no-charge behavior, independent agronomic accuracy review against owner-approved sources, broader accessibility/device coverage, and an exported final-SHA screenshot/video record.
