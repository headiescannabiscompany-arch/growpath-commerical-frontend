# Plant ID and Nature Batch 1 verification — 2026-08-22

Baseline: frontend `689474493cd82a866e6c8b20df781950c37fb378` plus the canonical
construction documentation commits.

Matrix rows: P-03 through P-06 and N-01 through N-04.

## Reconciliation result

The retained `codex/plant-id-reviewed-evidence-consolidated` commits were compared with
current `main`. Both patches were already superseded:

- current `main` contains 73 individually reviewed catalog records, while the retained
  implementation expected 64;
- the current QA pack includes the later dandelion, tomato, basil, strawberry and
  wild-chile reviews;
- the pre-polish completion gates restored by the retained documentation commit are
  already present.

The retained branch therefore contributes no missing code or evidence and must not be
cherry-picked over the newer catalog.

## Focused automated verification

Passed suites and contracts:

- `SpeciesCropIdToolScreen.test.tsx`
- `SavedToolRunsRoute.test.tsx`
- `sourceCaptureMetadata.test.ts`
- `evidence-api.test.ts`
- `fieldStudies-api.test.ts`
- `fieldObservationDraft.test.ts`
- `FieldObservationGlobeWeb.test.tsx`
- `FieldObservationGlobeNative.test.tsx`
- `PublicFieldObservationsRoute.test.ts`
- `PublicFieldObservationsLoading.test.tsx`
- `DiscoverVideos.test.tsx`
- `plant-id-qa-catalog.test.ts`
- `verify-plant-id-qa-catalog.cjs --allow-planning`

The grouped runs passed 194 assertions. One five-second timeout occurred in the combined
137-test run for “blocks identification until every selected evidence upload finishes.”
The exact test passed in isolation in 306 ms with no assertion or state failure, so it is
recorded as combined-run timing noise rather than a product defect.

The planning catalog remains intentionally incomplete at 73/320 reviewed media records,
with 46 governed blockers. Candidate metadata is not treated as accepted identity
evidence or training data.

## Verified contract coverage

- Plant ID runs without a Grow or Field Study and keeps its evidence/result private.
- A usable confirmed identity can open a prefilled grow draft; cancel creates nothing.
- Device GPS, manual placement and source photo/video metadata remain private preview/save
  actions and never publish by themselves.
- Missing or conflicting metadata is not guessed from dates, filenames or nearby records.
- Direct Nature sharing requires date, contributor-authored description, usable owned
  media, a saved private location and explicit approximate-pin confirmation.
- Repeated publication updates the source observation instead of duplicating it.
- Withdrawal preserves the private Plant ID, evidence and exact private location.
- Public discovery has web globe and accessible list modes, clustering, pin cards,
  zero-pin handling and a compact Discover preview.
- Private/exact/sensitive/cannabis coordinates and account identity are excluded from
  ordinary public output.

## Remaining acceptance boundary

P-03 and N-01 remain `partial` until one new ordinary production observation completes
the end-to-end future workflow on the deployed frozen frontend/backend pair: upload owned
media, save standalone Plant ID, use retained metadata or authorized GPS/manual placement,
publish an approximate Nature pin, verify its photo/date/description in globe and list,
reload, and withdraw it. Legacy Cary/Maydale recovery is optional and house/potted records
remain excluded.

This live proof requires a real user-owned observation and browser/device permission. It
does not justify reopening or rebuilding the already verified implementation.
