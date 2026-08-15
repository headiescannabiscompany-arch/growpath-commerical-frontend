# Commercial course media production evidence — 2026-08-14

## Acceptance boundary

This evidence closes the optional course thumbnail/banner workflow. It does not close
hosted lesson video, paid enrollment, Live/Forum linkage, or visibility through a
published storefront.

## Production candidate

- Frontend merges:
  - `2f658c6b0f948047a90a13d63ae96e577823eb8d`
  - `8ada902be8f85c9d077ad047f7f7f107d8fb30d7`
  - `ffefc95da66d5950b10822f23f37ea93712bc5ad`
  - `ce890580e7cbc2ab00b0f6da440044f46023ae11`
- Exact frontend Render deploy: `dep-d9vt0l2d0e5s73a74dvg` (Live)
- Backend merge: `3db27be1ccd9c535411e10edc11999324d021006`
- Exact backend Render deploy: `dep-d9vt54e7bikc73bipbug` (Live)
- Production routes exercised:
  - Commercial course authoring and list routes on `https://growpathai.com`
  - Learner preview for the temporary acceptance course
- Temporary course: `6a7fcc32b17555f966449dc0`

## Live behavior proved

1. The author added distinct thumbnail and banner media and saved the course.
2. Both media values survived reload.
3. The author replaced both images and the replacements survived reload.
4. The author removed both images; the deliberate clears survived save and reload.
5. Optional thumbnail/banner absence did not block publication after the backend
   readiness policy was corrected.
6. With course art present, compact/catalog presentation used the thumbnail while the
   opened learner view rendered one banner hero rather than duplicate course art.
7. With art absent, the learner view remained deliberately text-only without a broken
   image or unexplained placeholder gap.
8. The course was unpublished and archived through the governed application flow.
9. The Commercial active-course list returned to zero; no temporary active course was
   left behind.

## Policy retained

- Thumbnail and banner art are optional course presentation media.
- Their absence alone cannot block publication.
- Existing title, category, description, grow-interest, lesson, access/payment, and
  lesson-media gates remain enforced.
- A deliberate clear must survive save and reload.
- The compact card uses the thumbnail when available; the opened learner view uses one
  banner hero, with thumbnail fallback, and otherwise renders a deliberate text-only
  layout.

## Automated checks

- Commercial workflow and course-focused frontend suites passed.
- Evidence Review panel checks passed 5/5 during the same candidate sequence.
- Backend course route suite passed 16/16.
- TypeScript, targeted lint, delivery guard, and diff checks passed for the related
  frontend changes.
