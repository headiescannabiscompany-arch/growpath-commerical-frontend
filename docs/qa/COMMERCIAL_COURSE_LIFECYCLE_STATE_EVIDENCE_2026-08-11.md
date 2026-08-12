# Commercial Course Lifecycle State Evidence

Date: 2026-08-11

## Source release candidates

- Backend source commit: `338c749150db51480c5ab86e3e17f73611e3506e`
- Frontend source commit: `4fb7e860ee965cdccd1f288449b90f1a82c8ce51`
- Backend branch: `codex/commercial-course-lifecycle`
- Frontend branch: `codex/commercial-course-lifecycle`

## Accepted behavior

- Commercial course creation is draft-only even when a client supplies lifecycle
  fields.
- The owner edits access, category, and lesson type through named constrained choices
  instead of typing internal status values.
- Paid-course price must be a positive finite value; invalid input is not silently
  converted to zero.
- Publish saves the current on-screen draft before requesting publication.
- The server requires title, thumbnail, banner, category, description, grow interest,
  at least one titled supported lesson, lesson-media readiness, and paid Stripe setup
  when applicable.
- Published course details and lessons reject in-place mutation.
- Explicit unpublish returns a course to a private editable draft while preserving its
  lessons and payment history.
- Course and lesson actions are mutually exclusive while a write is active, and the
  page reports progress, failure, and success in context.

## Verification completed before review

- Frontend TypeScript passed.
- Frontend targeted ESLint passed for every changed source file.
- Frontend focused Commercial workflow, course theme, and knowledge-registry suites
  passed: 3 suites, 41 tests.
- All 94 frontend Jest regression batches passed.
- The complete frontend delivery guard passed, including the course-media contract,
  contamination/security boundaries, corruption scan, and export sanity checks.
- Backend targeted ESLint passed for the changed route.
- Backend focused Commercial workflow route coverage passed: 1 suite, 14 tests.
- Backend core coverage passed: 54 suites, 295 tests.
- Backend system coverage passed: 5 suites, 32 tests.
- `git diff --check` passed in both repositories.

## Evidence boundary

The backend repository-wide lint command still reports 1,169 pre-existing formatting
errors outside this change; the changed backend route passes targeted lint. No
production deployment or populated Commercial-owner browser acceptance is claimed in
this pre-merge record. Exact pull-request checks, merge commits, deployments, served
release provenance, and signed-in lifecycle acceptance must be recorded separately
after they occur.

## Merge and production release evidence

- Backend pull request `#128` merged as
  `373d04ecdd0f87415f052bf869de8f5f261ec17f`; its exact-main GitHub checks passed.
- Frontend pull request `#474` merged as
  `daf0d2adff164c558cf20acd00eab655e6b11ff2`; Frontend CI run `31559369349` and
  Production Build Preflight run `31559369346` passed.
- Render clean-cache frontend deployment `dep-d9tukrbm8hqs73e3orr0` checked out the
  exact frontend merge commit and reached `Live` on 2026-08-11.
- The production Course Builder was opened at the cache-busted `/courses/create`
  route after that deployment. It rendered the seven governed workflow sections,
  named Free/Paid radio controls, explicit quota/status context, and the draft-only
  `Create course draft` action. The copy correctly directs the owner to save the
  draft and publish from course detail.
- Backend pull request `#129` repaired deployment provenance by preferring Render's
  native `RENDER_GIT_COMMIT`. Render deployment `dep-d9tul4rncjis73fv2dng` reached
  `Live` for the exact backend merge
  `9f385c6fe775333eb14e829d9785ed491a1a7019` on 2026-08-11.

## Remaining acceptance boundary

The production create screen and exact frontend/backend releases are verified. A
populated Commercial-owner session must still create a disposable draft, exercise
edit and readiness blockers, publish it, confirm the published read-only state and
learner/storefront visibility, unpublish it, verify editability is restored without
losing lessons or payment history, and remove the disposable record. That mutation
test is deliberately not inferred from source, CI, or an empty-account screen.
