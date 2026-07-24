# User-Type Loop-Closure and Polish Matrix

## Objective

Polish the existing product by proving that every visible promise completes its full
workflow. External-user feedback remains required validation, but it does not replace
systematic first-party verification.

## Evidence intake

For each session, retain the raw screen recording and notes. Record findings with:

- timestamp and route;
- account, workspace, plan, and Facility role;
- action attempted and expected result;
- visible result, persisted result after refresh, and downstream result;
- permission or payment boundary encountered;
- severity, root cause, fix commit, and live-retest status.

Narrated recordings may be rough. Say "bug" when behavior is wrong and explain the
expected outcome; the review pass converts that evidence into the tracked finding.

## Two required tracks

### 1. Loop closure

An action passes only when all applicable stages pass:

1. Entry point is understandable and available to the correct user.
2. Input validation and permission handling are accurate.
3. The action succeeds or fails with a useful recovery path.
4. The result persists after refresh, sign-out, and return.
5. Related detail, history, task, log, schedule, notification, and audit surfaces agree.
6. Source links reopen the exact originating record.
7. Other roles see only the state and controls they are allowed to see.
8. Email, webhook, payment, export, or external delivery occurs when promised.

### 2. Product polish and outside validation

- Confirm naming, hierarchy, copy, density, back behavior, empty states, loading, and
  mobile/desktop layout.
- Free must feel complete and inviting while accurately enforcing limits.
- Upgrade prompts should follow demonstrated value and explain the unlocked outcome.
- Outside users must independently attempt the same loops and submit feedback through
  Support or Report Bug.
- Outside-user silence is recorded as missing validation, not evidence that a loop works.

## User and role coverage

| Session             | Primary proof                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| Public / signed out | Discovery, registration, verification, login, public content, checkout entry, Support                  |
| Personal Free       | First grow/plant, logs, tasks, calculators, weekly AI allowance, limit and upgrade recovery            |
| Personal Pro        | Paid limits, analytics, uploads, diagnosis, AI usage, billing and cancellation state                   |
| Commercial          | Brand identity, products, courses, campaigns, trials, inventory, orders, analytics, storefront handoff |
| Facility Owner      | Setup, subscription, team, roles, rooms, grows, inventory, compliance, audit, full oversight           |
| Facility Manager    | Operational creation, assignment, approvals, team behavior, restricted owner actions                   |
| Facility Staff      | Assigned work, logs, task status/proof, permitted operational writes, blocked administration           |
| Facility Viewer     | Accurate read-only state, navigation, source links, hidden/disabled mutations, backend 403 proof       |

Viewer and Staff do not require the Owner's depth of configuration UI. Their smaller
surface must still be clear, internally consistent, and complete.

## Connected workflow matrix

| Workflow                       | Sessions                              | Closure evidence                                                                               |
| ------------------------------ | ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Account lifecycle              | Public, all signed-in types           | Register -> verify -> login -> profile -> reset password -> sign out/in                        |
| Subscription and trial         | Free, Pro, Commercial, Facility Owner | Select plan -> checkout/trial -> webhook state -> entitlement -> billing -> cancel/expiry      |
| AI credits                     | Free, Pro, Commercial, Facility       | Cost shown -> action -> exact deduction/refund -> refresh -> weekly allowance truth            |
| Personal cultivation           | Free, Pro                             | Grow -> plant -> log/photo -> task -> tool/diagnosis -> timeline -> source reopen              |
| Shared schedule and alerts     | All signed-in types                   | Source event -> schedule/alert -> exact source link -> update/complete -> reflected state      |
| Community                      | Public, Free, paid types              | Discover -> join/post/comment -> moderation -> notification -> exact thread reopen             |
| Commercial proof-to-storefront | Commercial, Public                    | Product/course/trial/evidence -> publish -> public view -> inquiry/purchase -> analytics/order |
| Facility operating chain       | Owner, Manager, Staff, Viewer         | Configure -> assign -> execute/prove -> approve -> observe -> history/audit                    |
| Facility permissions           | Owner, Manager, Staff, Viewer         | Correct visible controls plus forced backend authorization result for restricted actions       |
| Support and bugs               | Public, all signed-in types, Admin    | Report entry -> prefilled form -> submit -> stored inbox -> email -> status -> resolution      |
| Privacy and account closure    | All signed-in types                   | Export/request -> delivered artifact/state -> deletion/cancellation -> access removed          |

## Facility chain session

Test one shared facility record across four separate sessions:

1. Owner creates the operational object and assigns responsibility.
2. Manager reviews, changes allowed operational state, and assigns work.
3. Staff completes the assigned work with required notes or proof.
4. Viewer sees the current result and cannot mutate it.
5. Owner confirms history, notifications, compliance consequences, and audit evidence.

The chain fails if any role sees stale state, loses source context, receives an inaccurate
control, or can bypass its backend authorization boundary.

## Working status

### Browser evidence attempts

- 2026-07-19 12:45:56 EDT: the public/signed-out loop recording could not start because
  this chat could not see an in-app Browser tab. No production URL was opened and no
  screenshot or video was captured. The worktree baseline was
  `2449b228cae32867939ab8764dee9a5ec8fc71d2` with uncommitted checklist implementation
  changes, so the public loop remains pending. Follow
  `docs/codex-browser-evidence-runbook.md`: fully restart Codex, confirm the Browser
  plugin is enabled, start a new chat, open the in-app Browser with `Ctrl+Shift+B`, and
  make the production tab visible before retrying.

- 2026-07-19 production follow-up: the in-app Browser connected successfully and
  exercised the deployed public/signed-out, Personal Free, Personal Pro, Commercial,
  and Facility Owner entry sessions at `https://growpathai.com`. The seeded Free
  account reported Pro/trialing entitlement state, so it did not provide valid Free
  evidence. The Facility account reported `OWNER`; no Manager, Staff, or Viewer
  credentials were available for the required cross-role chain.
- The Commercial session exposed raw `tasks`, `tasks/[id]`, and `tools/library` tab
  entries. The routes were hidden, protected by focused navigation coverage, merged,
  and deployed. At `2026-07-19T19:49:35.417Z`, merge SHA
  `e025c2cd3a8e028ed9ce78e92f3768031d01704c` showed only Dashboard, Storefront,
  Products, Feed / Campaigns, Courses, Lives, Orders, Analytics, Profile, and Tools;
  no raw internal route tabs or browser console errors remained.
- Final screenshot capture timed out in the Browser after the DOM retest. Earlier
  session screenshots are chat evidence only; no final-SHA screenshot or video file
  is claimed. Full release evidence and remaining blocks are recorded in
  `docs/qa/RELEASE_EVIDENCE_2026-07-19.md`.
- 2026-07-23 12:46-12:53 PM EDT signed-out production follow-up: frontend PR `#166`
  merged as `388896541124f2148623f17e61b93f1449716068`; GitHub Frontend CI run
  `30026384259` and Production Build Preflight run `30026384303` passed, and Render
  deployment `dep-d9h49kepbkes73e4028g` was live at `https://growpathai.com`.
  Landing, Features, and Pricing each exposed exactly one level-1 heading followed by
  3, 3, and 4 level-2 section headings respectively. Signed-out Courses displayed the
  published catalog boundary and sign-in/register actions, returned no published
  courses in the current production data, and exposed no Course Builder, Create
  Course, Unpublish, or Draft control. Signed-out Forum displayed its sign-in/register
  boundary without `Not authenticated`, Retry, For You, All Discussions, or a
  protected-feed empty state. Genuine Browser screenshots are retained as
  `growpath-public-courses-3888965.jpg` and
  `growpath-public-forum-3888965.jpg` in the task visualization directory. This closes
  the public discovery/auth-boundary repair only; registration/email verification,
  password reset, checkout entry, Support delivery, mobile coverage, video, and
  independent outside-user validation remain open.

- 2026-07-20 Facility staging follow-up: the governed Facility pack was exercised in
  the in-app Browser across Owner, Manager, Staff Grower, Staff Scout, and Viewer
  accounts on Facility `6a5ea11685cee9a1c3f9696d`. Manager-created task
  `6a5eb37ec9fd257ae2484ce0` was assigned to Grower, completed by Grower, and observed
  as `DONE` by Scout and Viewer with creation/completion audit events. Four findings
  were fixed through frontend PRs `#59`-`#62`; final merge
  `c638c9626ac86982b9c5e167616390118b54db3f` was confirmed live on Render at 8:12 PM
  ET. The full checkbox remains open pending Owner final-state review, forced Viewer
  backend 403 evidence, exported recording, and a production-role retest. See
  `docs/qa/FACILITY_ROLE_LOOP_EVIDENCE_2026-07-20.md`.
- 2026-07-22 production Facility inventory follow-up: the Owner created a temporary
  item, proved create/reload and quantity-adjustment persistence, then exposed and
  fixed a raw-detail/cleanup defect through frontend PR `#148` and the record-ID/SKU
  backend mismatch through backend PR `#55`. Frontend merge
  `65409b6ce535d0bff4d07d7bc04652c8ed0c46ea` and backend merge
  `3036d43901000b0697c7723bba7b9877c08cdf4e` were live when confirmed removal
  succeeded at `2026-07-22T23:05:56.281Z`. A hard reload at
  `2026-07-22T23:06:06.403Z` showed `0 items | 0 units on hand`; no test inventory
  remained. See `docs/qa/FACILITY_ROLE_LOOP_EVIDENCE_2026-07-20.md`.
- 2026-07-22 production Facility SOP/compliance follow-up: the Owner created a
  three-step SOP template, completed and locked its run, proved hard-reload
  persistence, and confirmed the resulting audit events. The first deviation write
  exposed a globally colliding reference and unhandled API restart at
  `2026-07-22T23:22:09Z`. Backend PR `#56`, merge `0f330650`, added collision-resistant
  references and the async error boundary; frontend PR `#150`, merge `c0e4f4c3`,
  recorded the durable policy. After the backend was live, deviation create, resolve,
  audit persistence, hard reload, and HTTP 200 health all passed by
  `2026-07-22T23:43:36Z`. No open QA deviation remained.
- 2026-07-22 production Facility report/audit follow-up: a 71-record compliance export
  initially treated one resolved deviation as unresolved cleanup. Backend PR `#57`,
  merge `3742d661`, added deviation-state totals; frontend PR `#153`, merge `0e5073ce`,
  based readiness on open deviations and made audit details readable before the raw
  payload. Both CI pipelines passed, Render deployed `dep-d9glqp58nd3s73du6tog` and
  `dep-d9glpa6rnols73dst8t0`, and the signed-in Owner hard-reload retest showed
  `Ready`, 1 total / 0 open / 1 resolved / 0 cancelled deviation, 49 readable audit
  events, readable immutable detail, genuine screenshots, and HTTP 200 API health.
  A later immediate first export exposed a separate Facility-name hydration race.
  Backend PR `#58`, merge `55104d54`, made the readable name authoritative in the
  packet; frontend PR `#155`, merge `90499dfa`, consumed it before local hydration.
  Render deployments `dep-d9gm9gmq1p3s73burq80` and `dep-d9gm6onavr4c73d9p0h0`
  were live when the fresh-route first click produced the correct Facility-specific
  filename at 8:49:19 PM ET; screenshot evidence and HTTP 200 health followed.
- 2026-07-24 Commercial Feed production follow-up: the zero-campaign editor called
  its blocked, unpublished draft `active` and exposed raw campaign type values as
  filters. Frontend PR `#188` merged as
  `91125db7a10efadebe94723586c533241c111ab5` after GitHub CI run `30070372681`
  passed. At `2026-07-24T01:54:46-04:00`, the signed-in Commercial Browser retest
  showed truthful `Will publish as` wording, five readable and accessible campaign
  filters, intact blockers, a disabled publish button, and zero campaigns. A genuine
  final-SHA screenshot is retained in `docs/qa/evidence`; no campaign was created.
  See `docs/qa/COMMERCIAL_FEED_DRAFT_SEMANTICS_EVIDENCE_2026-07-24.md`.
- 2026-07-24 Commercial Courses production follow-up: the full builder exposed eight
  page-level headings, two Back actions, and pricing radios without checked state;
  the Commercial quick form also exposed unselected raw access/category/status
  values. Frontend PR `#190` merged as
  `4244afc592bf6655c2bbfd3c6902540b18132cc5` after GitHub CI run `30071405520`
  passed. At `2026-07-24T02:17:08-04:00`, the signed-in Browser retest showed one
  level-one heading, seven level-two steps, one Back action, checked pricing/access
  choices, and readable existing-course metadata. Three genuine final-SHA
  screenshots are retained in `docs/qa/evidence`; no course was mutated. See
  `docs/qa/COMMERCIAL_COURSE_AUTHORING_ACCESSIBILITY_EVIDENCE_2026-07-24.md`.
- 2026-07-24 Commercial Lives production follow-up: EventSub status was editable and
  visibility used raw lower-case buttons without selected state. Frontend PR `#192`
  merged as `4b374c25e8fef0032548d08d68d003aae93dcae2` after GitHub CI run
  `30072260129` passed. At `2026-07-24T02:33:01-04:00`, the signed-in Browser
  retest showed connection-derived read-only `Not connected` status, a checked Public
  visibility radio, five other readable visibility choices, and zero lives. Two
  genuine final-SHA screenshots are retained in `docs/qa/evidence`; no Twitch or live
  record was mutated. See
  `docs/qa/COMMERCIAL_LIVES_INTEGRATION_SEMANTICS_EVIDENCE_2026-07-24.md`.

### Personal Free backbone audit

- Environment Review now uses the mounted ToolRun API, clearly identifies its
  rule-based provider, costs 0 AI credits, uses generic stage references instead of
  presenting the current reading as a target, and can reuse its saved run when creating
  a log or task.
- Feeding Schedule Planner now uses the mounted ToolRun API, costs 0 AI credits, does
  not convert blank optional EC/pH readings to zero, and can reuse its saved run when
  creating a log or task.
- The launch Free allowance remains 10 credits per week: 10 completed Ask AI answers,
  or 3 completed photo diagnoses plus 1 Ask AI answer. This is a conversion hypothesis,
  not yet a validated optimum.
- During live testing, record weekly credit exhaustion, action mix, failed/refunded
  calls, upgrade-view rate after demonstrated value, and upgrade conversion. Do not
  tune the allowance from anecdote alone.
- Static and automated closure checks are complete for these two repaired tools. The
  Personal Free session remains open until the deployed build is recorded end to end.

### Personal Pro production AI-credit follow-up

- 2026-07-20, approximately 8:23-8:34 PM ET: the production Personal Pro/trialing
  account completed one provider-backed Ask AI request. The server balance persisted
  from `94 / 100` and 6 billed requests to `93 / 100` and 7 billed requests with zero
  refunds after returning to Profile.
- The same session exposed an invalid `Upgrade to Pro` action for the current Pro plan.
  PR `#64` fixed the plan-action set; merge
  `cc822f8dbc242c08279aeb9089628b85010c3c0a` was live at 8:33 PM ET and the production
  retest showed no Pro upgrade while preserving Commercial, Facility, and billing
  actions.
- Exact evidence and remaining Personal Pro blocks are recorded in
  `docs/qa/PERSONAL_PRO_AI_CREDIT_EVIDENCE_2026-07-20.md`.
- The production Grows -> New Journal Entry path was then retested with exact grow
  context. Duplicate root/journal headers and missing root heading semantics were fixed
  through PRs `#66`-`#68`; final merge
  `e8c24316a415882163f4ea04768bff074342c6b9` was live at 9:12 PM ET. Post-fix in-app
  Browser screenshots showed one visible Grows title and one visible journal title;
  semantic inspection found one level-1 heading on each route and the journal Back
  control remained available.
- PR `#70`, merge `ecdc97f1185f7986b7783d2c38ee713bdaed6784`, then made Journal
  Back prefer the exact selected-grow fallback. Render deployment
  `dep-d9fcnm68bjmc73dl0fog` was live at 9:33 PM ET; New Journal Entry and the existing
  `AI grow summary` detail both returned to the selected grow's Journal.
- PR `#71`, merge `4ba02db44e05ba44c307d0ac6dada635cd2c6122`, made every Journal
  log, ToolRun, and task card actionable and preserved exact ToolRun/task IDs. Render
  deployment `dep-d9fcvicm0tmc73f8l0d0` was live at 9:49 PM ET. Production exposed 13
  exact saved-run links and opened ToolRun `6a5dc87b62c955c489aaece0` without an error.
- That retest showed the selected result below the full history list. PR `#72`, merge
  `115856c84ed5009f95e8a6abe9c791d9eb142178`, moved and scrolled the selected result
  into view and removed the duplicate Saved Tool Runs title. Render deployment
  `dep-d9fd51km0tmc73f8o68g` was live at 10:01 PM ET; the same Journal click displayed
  one heading and the green `Opened from source link` result immediately.
- The same ToolRun then created production task `6a5ed5694789c2c0dd0f2da6`. Journal opened
  its exact task URL, displayed the focused `Follow up on species_crop_id` task with
  `Opened from Journal`, and `View Source` returned to ToolRun
  `6a5dc87b62c955c489aaece0`. The temporary QA task was archived; the final Journal
  showed zero task links and retained all 13 ToolRun links.
- That chain exposed Saved Tool Runs Back returning to Personal Home. PR `#74`, merge
  `27fe657d2dc3ae911a40c553afa659fb8fa0e553`, preserved bounded Journal/task/timeline
  context. Render deployment `dep-d9fdfcl7vvec73cecirg` was live at 10:23 PM ET; a
  fresh production Journal -> ToolRun -> Back retest returned to the exact grow
  Journal with its heading, 13 ToolRun links, and zero archived-task links.
- Frontend PRs `#76` and `#77` exposed real saved grow photos as opt-in diagnosis
  evidence, repaired their production previews, and gave every photo action a unique
  accessible name. Final frontend merge
  `e67e5fb4091350a3953f4bbbab97256f022af990` was live as Render deployment
  `dep-d9fdvft7vvec73e7vuag` at 10:58 PM ET.
- Backend PR `#34`, merge `a78d219589a8c434e2e9ce8e58c663af52708570`, added the
  ownership-scoped evidence contract and multi-image diagnosis path. Production Render
  deployment `dep-d9ferid7vvec73cf8630` was live at 11:57 PM ET. One real saved photo
  then completed an OpenAI-backed diagnosis and deducted exactly three credits:
  `93 / 100`, 7 credits across 7 requests became `90 / 100`, 10 credits across 8
  requests, with zero refunds.
- Backend PR `#35` and frontend PR `#79` closed the missing visual-context finding.
  Backend merge `29db80b439f7f6e2d52e227515f245c5a85b144a` and frontend merge
  `6ed88c43dcda7fd0cc215fef5cf80ace973baff9` were both live at 12:25 AM ET as Render
  deployments `dep-d9ff8rl7vvec73cfh0jg` and `dep-d9ff85e8bjmc73dmf9v0`. A fresh
  production request using the same real saved photo identified `Cannabis` /
  `Cannabis sativa` at high confidence without inferring a strain, displayed the visible
  identity evidence, reported the photo usable with exact improvement guidance, and
  asked a discriminating feeding-schedule follow-up. The grow's Plants page showed `No
plants yet`, confirming that no real plant row was being hidden from the selector.
- That live request deducted and persisted exactly three credits: `90 / 100`, 10 credits
  across 8 requests became `87 / 100`, 13 credits across 9 requests, with zero refunds.
- Frontend PR `#81` and backend PR `#36` preserved selected photos through provider
  follow-up and kept blank pH/EC fields missing. Frontend PR `#82` and backend PRs
  `#37`/`#38` then made crop provenance deterministic: a photo-supported identity with
  empty crop context remains `visual_suggestion`, never `user_confirmed`. Final live
  merges were frontend `be65d3aa53094900d5c0bb62ed90be4628699042` and backend
  `09a9f7536b57dbbc29d908e7137856a2c42c152d`, deployed as
  `dep-d9ffve7aqgkc739fuf50` and `dep-d9fg87t7vvec73e9ai1g`.
- A final fresh saved-photo result and photo-backed follow-up preserved
  `Cannabis` / `Cannabis sativa` as a high-confidence visual suggestion, retained one
  usable photo, did not infer a cultivar, incorporated the recorded absence of
  mold/pests, and left pH, EC, environment, root-zone, and feeding data explicitly
  missing. ToolRuns `6a5f048a4622b8f588e8c0c9` and
  `6a5f04b04622b8f588e8c0e4` remained linked to source diagnosis
  `6a5f04b04622b8f588e8c0e2`.
- `Unsure` outcome feedback persisted, log `6a5f04d84622b8f588e8c10a` reopened at its
  exact URL, and high-priority task `6a5f04e14622b8f588e8c110` persisted with the same
  diagnosis source and accepted tags. Journal showed the connected task, log, and
  ToolRuns; the full grow Timeline showed diagnosis feedback and automation events.
  Final Profile state was `72 / 100`, 28 credits across 14 billed requests, and zero
  refunds. Fresh file upload, failure/refund, exact saved-diagnosis reopening, and
  independent accuracy review remain open.
- A production IPM Scout no-pest baseline remained an insufficient-evidence working
  hypothesis with no organism confirmation or pesticide-rate advice. PR `#84` made the
  automatic GPT review's one-credit charge explicit. Post-fix ToolRun
  `6a5f0ce94622b8f588e8c2fb`, uncertain decision, log
  `6a5f0d204622b8f588e8c310`, and three source-linked IPM tasks persisted; Profile
  hard reload proved `71 / 100 -> 70 / 100`, 16 billed requests, and zero refunds.
  PRs `#85`/`#86` fixed stale grow-history reads. A separate production deep-link 404
  was fixed by the Render `/home/*` rewrite and release-gated in PR `#87`; final merge
  `f72b5fbb7b60371d8994ae306737b58ca30cd4b3` was live as
  `dep-d9fha3t7vvec73ea0kig` at 2:45 AM ET. True Journal, Tasks, and full Timeline hard
  reloads retained the exact records. See
  `docs/qa/IPM_SCOUT_PRODUCTION_EVIDENCE_2026-07-21.md`.
- The selected saved-grow-photo IPM prefill now sends real account-owned photo bytes to
  the production vision model. Backend merge
  `9ec163618eb22ce6b9e7f16a3f6228fe0237657b` was live as
  `dep-d9fikp99rddc73clkip0`; frontend merge
  `ab71b8404a6dc6e11f5932038d46599a653e6cfa` was live as
  `dep-d9fiuam7r5hc73frpg2g`. The final retest retained five defensible visual/follow-up
  fields while leaving counts, inspection history, trap context, environment, and
  recent actions blank. Profile proved one disclosed credit (`67 / 100 -> 66 / 100`),
  20 billed requests, and zero refunds. At that point, fresh device upload,
  failed-provider refund, and independent accuracy review remained open.
- Frontend PR `#93`, merge `91ca611e0af6c01571a33410cd3aeb95c9c32970`, fixed
  newly uploaded AI-workflow evidence that had been stranded without current-workflow
  approval. Render deployment `dep-d9fmh0h9rddc73cotla0` was live at 8:41 AM ET. A
  genuine 3.7 MB file selected through the production Browser persisted as evidence
  `6a5f6a3e9a4ebf90c8c78619`, filled four defensible visual/follow-up fields, left all
  unsupported scout counts, inspection history, trap, and environment fields blank,
  and charged exactly one credit (`66 / 100 -> 65 / 100`, 21 billed requests, zero
  refunds). Fresh IPM file upload is closed; failed-provider refund proof and independent
  accuracy review remain open. Final-SHA screenshot capture timed out, so no screenshot
  or video artifact is claimed for this retest.
- A genuine fresh-file Plant Diagnosis then ran once from `65 / 100` and persisted the
  exact three-credit result at `62 / 100`, 38 credits across 22 billed requests, and
  zero refunds. The unlabeled photo produced a draft `Cannabis` / `Cannabis sativa`
  identity without cultivar inference; `Unsure` feedback, ToolRun
  `6a5f8e039a4ebf90c8c78977`, and journal entry
  `6a5f8e8a9a4ebf90c8c7899f` persisted and reopened. That run exposed silent
  `veg` / `upper new growth` defaults and conflated result labels. PR `#95`, merge
  `2f2cfeeeabe1d1bfcaeafc4a0743cdf28204488b`, fixed both; Render deploy
  `dep-d9fp4ssm0tmc73fifr9g` was live at 11:40 AM ET. The deployed non-billable retest
  showed explicit Stage/Pattern `unknown` choices and left the balance at `62 / 100`.
  See `docs/qa/PLANT_DIAGNOSIS_PRODUCTION_EVIDENCE_2026-07-21.md`.
- Production Crop ID then passed two genuine no-grow photo cases. One cannabis-flower
  run returned `Cannabis` / `Cannabis sativa` without inferring a cultivar and charged
  exactly one credit. One owner-supplied two-photo roadside non-cannabis run inspected
  both photos, returned medium-confidence mint-family evidence, and charged exactly one
  credit, but initially hid `Mint` behind `Not confirmed`. Backend PRs `#40`/`#41` and
  frontend PRs `#97`-`#99` preserved provenance and the defensible broader candidate.
  On final frontend `8d250dd656a18ef8c1f80715667b7491369906e5` and backend
  `54eefe8c5929948e024467bb5b8d16457890bad7`, exact ToolRun
  `6a5fa308b9f052dfe64627ff` reopened as `Likely crop: Mint`, retained both evidence
  IDs, limited quality, medium confidence, and confirmation guidance, and did not
  charge again: Profile remained `59 / 100`, 41 credits across 25 billed requests,
  zero refunds. See `docs/qa/CROP_IDENTIFICATION_PRODUCTION_EVIDENCE_2026-07-21.md`.
- The final Crop ID hard reload exposed and closed a separate production availability
  incident. At 1:20:06 PM EDT, `/api/commercial/courses/public` treated `public` as a
  CommercialRecord ID, raised an unhandled Mongo error, and caused Render to restart
  the API. Backend PR `#42` added published-storefront/public-course projection, strict
  ID validation, and async error forwarding. Merge
  `76453037a988aef03ea75642cbaad6f3438f0762` was Live as
  `dep-d9fqtpu7r5hc7383e7k0`; the exact endpoint returned HTTP 200, subsequent health
  passed, and the authenticated Mint ToolRun/Profile retest completed at the unchanged
  `59 / 100`, 41 credits across 25 billed requests, zero refunds.
- Production Harvest Readiness now requires three sharp top/middle/lower macro photos plus
  one wider context image before AI analysis can run. Backend PR `#43`, merge
  `bb0968f3b25d9dd62541cdfb2aff6479f1392be0`, was Live as
  `dep-d9frm7cvikkc73bho5t0`; frontend PR `#102`, merge
  `8ebf26a9fbe3986ec9c518c76c7471c7d8b379e6`, was Live as
  `dep-d9frnbu8bjmc73e1dkig`. One genuine owner photo persisted as evidence
  `6a5fbc97f7dfa4a764f878ba`, produced exact `Add 3 more photos` guidance, left the
  Analyze control `aria-disabled`, and did not charge: Profile remained `59 / 100`,
  41 credits across 25 billed requests, zero refunds. The owner-supplied EtGU videos
  were reviewed as useful low-quality/acquisition QA examples, not scientific ground
  truth. A rightful complete four-photo set, provider result, exact one-credit charge,
  saved provenance, and connected writeback remain open. See
  `docs/qa/HARVEST_READINESS_PRODUCTION_EVIDENCE_2026-07-21.md`.

- [ ] Public / signed-out loop session recorded and reviewed.
- [ ] Personal Free loop session recorded and reviewed.
- [ ] Personal Pro loop session recorded and reviewed. Production paid text-AI
      deduction/persistence, plan-action retest, Grows entry, and grow-scoped journal
      entry passed; existing-log, saved-ToolRun, and production task source reopening
      also passed. Successful saved-photo diagnosis transport and exact three-credit
      deduction passed seven times; visual cannabis identity, photo-quality context,
      photo-backed follow-up, feedback, diagnosis log/task writeback, and exact log
      reopening also passed. Structured IPM insufficient-evidence handling, the
      explicit one-credit GPT review, uncertain decision, log/task-plan writeback, and
      fresh Journal/Tasks/Timeline hard reloads also passed. Saved-photo pixel analysis,
      normalized photo prefill, fresh IPM file upload, and both exact one-credit charges
      also passed. Fresh diagnosis file upload, exact three-credit billing, submitted
      outcome feedback, journal persistence, and exact saved-diagnosis reopening now
      pass too. No-grow Crop ID photo transport, exact one-credit billing, cannabis
      crop-level draft without cultivar inference, and a genuine roadside non-cannabis
      `Mint` working candidate with saved provenance now pass too. Harvest Readiness
      four-photo guidance, blank observation inputs, and the incomplete-set no-charge
      boundary also pass on the final deployed SHAs. Remaining Harvest provider output,
      saved provenance/writeback, complete-photo billing, other
      failed-provider refund, lifecycle, broader accessibility,
      exported final-SHA video/screenshot, and independent-review checks stay open.
- [ ] Commercial loop session recorded and reviewed. The signed-in storefront
      zero-setup state was reviewed on 2026-07-24. Frontend PR `#184`, merge
      `140e8ec4fa2d19b0bcf14995fae32e2bb9fbaf09`, and Render deployment
      `dep-d9hf82j7uimc73dljipg` removed active `/store/your-brand` placeholders.
      The deployed page now disables View as User and View Public Store until a
      real slug exists and explains the missing requirement. Products and Profile
      follow-up PR `#186`, merge `950f70f048112da2140c46c143620e044b362ec5`,
      and Render deployment `dep-d9hfgeks728c73c03rbg` then removed the remaining
      `your-brand-slug` and `/products/product-id` placeholder paths while
      preserving the truthful zero-product state. Full authoring, publishing,
      checkout, orders, leads, analytics, public-user acceptance, and final
      screenshot/video evidence remain open. See
      `docs/qa/COMMERCIAL_STOREFRONT_EMPTY_STATE_EVIDENCE_2026-07-24.md`.
- [ ] Facility Owner loop session recorded and reviewed. Staging entry and shared
      record counts reviewed. Production Owner created and assigned the shared QA task
      on `93bb0217` and captured screenshot/DOM evidence at
      `2026-07-22T22:17:21.853Z`. The production inventory create, reload, adjustment,
      confirmed cleanup, and post-delete reload loop also passed on frontend
      `65409b6c` and backend `3036d439` at `2026-07-22T23:06:06.403Z`; final
      post-completion Owner task return remains open. The production template-backed
      SOP completion, lock/reload, compliance deviation create/resolve, audit, and
      post-fix API-health loop passed on backend `0f330650` and frontend policy merge
      `c0e4f4c3` by `2026-07-22T23:43:36Z`. The 71-record report export, corrected
      deviation readiness, readable audit detail, hard reload, screenshot, and health
      checks also passed on frontend `0e5073ce` and backend `3742d661` by 8:21 PM ET.
      The first-click filename hydration race then passed on final frontend `90499dfa`
      and backend `55104d54` at 8:49 PM ET. On 2026-07-23, the live Owner Team page
      showed exactly the three real Owner, Manager, and Staff members. The repaired
      Remove control opened its confirmation; cancelling preserved all three members
      with no browser errors on deployed frontend `b2469b22`. On 2026-07-24, direct
      entry and hard reload of `/account/workspace` and `/account/mode` returned HTTP
      200 on deployed frontend `bf46e0c0`; the real multi-workspace identity received
      separate Personal, Commercial, and Facility choices, and selecting Commercial
      reached the real Commercial dashboard with no captured browser-console errors.
      See `docs/qa/WORKSPACE_SELECTION_PRODUCTION_EVIDENCE_2026-07-24.md`.
- [x] Facility Manager loop session recorded and reviewed. Staging create/assign and
      permission controls passed. On production frontend `b2469b22`, the real Manager
      completed fresh login, workspace choice, Facility entry, restricted Team review,
      assigned-queue review, and the same-record Staff handoff. Reload preserved the
      assignment, and immutable audit `6a621f41ee3a85e9e35aaff3` recorded it.
- [x] Facility Staff loop session recorded and reviewed. Grower completion and Scout
      observation passed in staging. On production frontend `b2469b22`, the real Staff
      account completed fresh login, workspace choice, restricted Facility navigation,
      assigned-queue review, exact task completion, and reload persistence. Immutable
      audit `6a622039ee3a85e9e35ab0bc` recorded `OPEN` to `DONE`.
- [ ] Facility Viewer loop session recorded and reviewed. Read-only tasks/team passed
      in staging. The invitation-session repair is deployed on frontend `ac58eb4c`
      and backend `41d50b69`; the Owner Team page retained five active members after
      a hard reload with no console errors. Forced backend 403, exported recording,
      and the real Viewer production-role retest remain open.
- [ ] Cross-role Facility chain completed on one shared record. Manager -> Grower ->
      Scout/Viewer persistence passed in staging. Production task
      `6a6140ec67a6aeadb8f4a0c9` now passed Owner creation, Manager reassignment, Staff
      completion/reload, and Owner final-state/audit review. One real Viewer account
      and its read-only observation/forced-authorization evidence remain to finish the
      production chain.
- [ ] Outside user completes at least one core loop and submits independent feedback.
- [ ] Findings are fixed, committed, pushed, deployed, and live-retested against timestamps.

## Deferred owner-input pass

- [deferred-owner-input] Owner, Manager, and Staff already have real production
  accounts. One real Facility Viewer account must complete the outstanding invitation
  from its recipient mailbox and provide any required account details.
  After acceptance, rerun the automatic Facility handoff/read-only-role checks and
  ask the owner before removing the temporary Staff/Viewer aliases. Keep this parked
  until the final owner-input pass; it does not block other actionable verification.
