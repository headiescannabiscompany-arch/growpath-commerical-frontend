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

The pre-fix generic private draft `6a7f01a13556c3da3f26e3c8` remains a cleanup candidate. The Commercial route correctly cannot read it. The generic catalog's apparent loading failure was traced through live network evidence to a shared screen-remount loop: hiding the outer Back control shifted the child tree, discarded the selected course state, and repeatedly reopened the deep link. Frontend merge `c26b63989f36aea6c3f92cc2aeb8ad900eb41606` keeps page content in a stable keyed wrapper when Back visibility changes. Render deploy `dep-d9vifp0u01pc73af56r0` succeeded, and the exact production deep link then opened the draft once with its lesson, resources, scheduling, reviews, reporting, pricing, and publication controls visible.

The same recovery also closed a production asset-delivery defect. Expo can reuse a JavaScript filename even when its content changes, while Render previously served that path with a five-minute shared-cache lifetime. Merge `e5be59f9d35c4cd2cf949ad4ff4580f80fc96233` changed JavaScript responses to `max-age=0, s-maxage=0, must-revalidate`; merge `c797ad2e894c8ee7e57c6a7d8b9ae655a1a20756` additionally appends a content-derived revision to every exported root and fallback-route script URL. Production HTML served `?v=55e9c910908f` after the first revision deployment and a new asset/revision after the screen-state deployment, proving releases no longer depend on an already-open browser discarding a stale body.

No generic-course archive/delete control exists on the recovered owner detail. The draft was not published or otherwise mutated. Cleanup therefore remains an explicit product/backend lifecycle gap rather than an inaccessible-loading blocker; no destructive API behavior was guessed.
