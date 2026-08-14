# Commercial Full Course Builder production evidence — 2026-08-14

## Accepted production slice

- Production frontend merge: `f2ab5d5c2495a8a3f11d7bd574e0f8302fb391e1`
- Render static-site deploy: `dep-d9vgmlfavr4c73aj3u90`
- Production URL tested: `https://growpathai.com/home/commercial/courses/6a7f07583556c3da3f277801`
- Authenticated workspace: platform Admin in Commercial mode
- Temporary course: `QA Commercial course lifecycle 2026-08-14`

The shared Full Course Builder created the private draft through the Commercial course collection. The draft appeared in Commercial Courses, survived a production reload, and reopened through the Commercial detail route with its first lesson.

The first live detail load exposed a legacy compatibility defect: the builder's structured grow-interest object was passed to a reader that assumed an array. The page showed `[object Object]` and failed with `join is not a function`. Pull request 591 changed new Commercial persistence to a flat canonical tag list, retained structured tier selections separately, and normalized existing structured values at the Commercial read boundary.

After exact Render deployment of `f2ab5d5c`, the same previously failing course reopened without an error or object text. A live owner edit then persisted:

- category `Plant care`;
- grow interests `Living Soil / No-Till, Organic (Amended Soil)`;
- a revised course description; and
- a second Article lesson, `Apply the evidence checklist`.

A fresh production reload retained both lessons, the category, grow interests, and description. The publish action remained disabled with the truthful remaining readiness blockers `add thumbnail | add banner`; no incomplete course was published. The temporary Commercial draft was then confirmed through the owner-scoped Archive action. The active Commercial course list returned to zero courses, showing the temporary course no longer in active results.

## Verification gates

- Focused course tests: 43 passed.
- Course media contract validator: passed.
- TypeScript: passed.
- Diff integrity: passed.
- Pull-request repository gate: passed in 9m21s.
- Main Production Build Preflight for `f2ab5d5c`: passed.
- Render deployment `dep-d9vgmlfavr4c73aj3u90`: succeeded in 1m56s.

## Scope retained as open

This accepts Commercial Full Course Builder create, owner edit, lesson add, reload persistence, publish-readiness blocking, and archive cleanup. It does not claim cover/banner upload, external or GrowPath video attachment, paid checkout, public storefront/course discovery, learner access, publish/unpublish, task/live/Forum/product linkage, or mobile visual acceptance. Those require their own truthful data-bearing production evidence.

The pre-fix generic private draft `6a7f01a13556c3da3f26e3c8` remains a cleanup candidate. The Commercial route correctly cannot read it; the generic catalog stayed in a loading state during the cleanup attempt, so no destructive or inferred cleanup was performed.
