# GrowPathAI Canonical Remaining Work

Date: 2026-08-08

Status: Active execution list; reconciled against retained production evidence on
2026-08-12. A checked sub-scope stays checked even when its larger end-to-end workflow
has a separately named open remainder.

This is the single authoritative list of unfinished release work. Historical TODOs,
evidence records, matrices, and numbered implementation ledgers remain useful as
sources, but they do not define a second execution order. When an older item is
broader than an item here, this list's narrower acceptance boundary replaces it.

## Rules

- Do not reopen implementation already backed by a deployed SHA and production
  evidence unless a current regression reproduces a defect.
- Do not mark local implementation complete as production acceptance.
- Do not mark automated coverage complete as manual, mobile, accessibility, or
  independent-user acceptance.
- Do not fabricate owner input, credentials, real-world outcomes, provider
  failures, payment events, screenshots, or populated production records.
- Commit and push each coherent tested section. Record deployment and live evidence
  separately.

## Verified closures retained by this audit

- [x] Auto theme no longer requests device location on startup. Production frontend
      `d84b0c80` resolves Auto from saved sunrise/sunset coordinates when the user has
      deliberately saved them, otherwise from local clock time; signed-in production
      showed `AUTO / Resolved: DAY` during the daytime verification.
- [x] Retained Plant ID photo/video analysis, server frame extraction, exact-evidence
      Saved Run reload, correction provenance, one-credit billing/refund behavior, and
      no-grow operation have production evidence. These are not reopened by the still-open
      public Nature publication check.
- [x] Plant ID's browser-independent manual-location fallback is live under frontend
      `4d946f09`. The signed-in production page exposed `Place Pin on Map`, opened the
      interactive map, accepted a temporary point as `ready to save privately`, and stated
      `Not shared`. The temporary unsaved point was immediately removed and the form
      returned to its no-location state. No ToolRun, Field Study, Nature observation, or
      public coordinate was created by this check.
- [x] The current Personal and Facility Viewer route-level sweep is complete: 24 Personal
      and 24 Facility destinations rendered their expected heading, Back control, and no
      visible load/access/not-found failure under frontend `a198141e`. Mutation and mobile
      acceptance remain separate open work.
- [x] Facility credit ownership and the retained Owner/Manager/Staff/Viewer shared-task
      chain are production-verified. The Facility showed its own 2000/2000 balance rather
      than the member's Personal balance; role-specific mutation controls and the shared
      task history persisted. Forced backend 403 capture remains separate open evidence.
- [x] Commercial Feed/Campaigns and Tasks have the shared themed Back control in production
      under frontend `79c6dba2`; the signed-in route sweep also found no visible route/load
      failure. Populated Commercial mutations remain separate open work.
- [x] The governed Diagnosis/IPM catalog assembly is complete at 252 reviewed cases and
      504 rights-reviewed images. Executing all cases against authorized staging remains a
      separate open action because it spends credits and writes records.
- [x] GrowPathAI and Triple Bag Genetics hat concept assets, hashes, brand manifests, and
      production brief are retained. They remain zero-stock, unpriced, non-checkout drafts;
      public purchase-intent testing and Triple Bag rights review remain open.

## A. AI image, video, and diagnostic quality

- [x] Complete the governed Diagnosis/IPM evaluation catalog: all 252 reviewed
      case records and 504 rights-reviewed images are present. Disease,
      pest/beneficial-lookalike, root-zone, nutrient, chemical, physical, and
      normal-aging variants pass the strict seed-ready validator. Unused future source
      pools remain visibly pending and cannot enter a case without source approval and
      image-level rights review. On 2026-08-11, the dry-run evaluator completed with
      `seed_ready` status, 252 records, 504 image references, zero network requests, and
      zero database writes. This closes catalog assembly, not staging execution.
- [~] Run every completed Diagnosis/IPM case through the GrowPath primary path and
  GPT second opinion with the identical evidence envelope; persist evidence,
  counter-evidence, disagreements, confidence, requested follow-ups, billing, and
  linked Plant/Grow/Log/ToolRun/Task/Facility records. Production now preserves
  the governed Diagnosis visual-identity ceiling and an explicit unresolved
  cannabis-sex result unless reproductive markers are visible (backend
  `1279a0bd`, `b6af9f71`; retained live ToolRun `6a781133112d9897821bceb9`).
  IPM production now accepts the current vision receipt, keeps ambiguous pale or
  reflective marks as one neutral observation, and persists a one-photo result as
  organism `not confirmed`, severity `not_assessed`, confidence `low`, with one
  structured-review credit and no promoted treatment (backend `1ac4433f`,
  `718eada4`, `382796bb`; live module records
  `6a7814edd7c346d88c36c95e`, `6a78180b84a6023fdec3fbcc`, and
  `6a781e01cb31b57928cb0a1c`). This is one retained IPM case, not completion of
  the governed catalog or cross-record write-back matrix. The delivery candidate
  now fingerprints the identical structured envelope, computes and persists
  field-level GrowPath/GPT disagreements and combined follow-ups, and refuses to
  claim a charge or refund without a ledger receipt. Full 252-case execution and
  linked-record verification remain. A dry-run-by-default, resumable evaluator now
  plans all 252 cases, refuses production, requires an exact staging/test
  confirmation, QA namespace, auth token, and deployed SHA, checkpoints each
  persisted ToolRun, validates the shared envelope digest, and reports provider,
  ledger, and linked-record gaps without converting them into acceptance. A real
  authorized staging execution and its cleanup evidence remain. It stays gated
  behind `RUN_GROWPATH_DIAGNOSIS_IPM_STAGING` because execution spends provider
  credits and writes staging ToolRuns. The Harvest v8 image-coverage change was
  regression-checked without changing Diagnosis/IPM behavior: 188 focused calculator,
  image-review, integrity, second-opinion, follow-up, billing, and shared-crop tests
  passed on 2026-08-12, including the thrips-compatible-damage and generic-white-mark
  uncertainty guards. A non-mutating Headies production recheck on frontend
  `9a88a498` also confirmed the current Diagnosis and IPM evidence checklists,
  uncertainty boundaries, and second-opinion entry point remained readable with no
  visible route/load error; it did not add an accuracy case or justify another
  behavior change. Further rule changes require a failing governed or retained real
  case; the next substantive step remains authorized 252-case staging execution.
- [ ] Complete the Plant ID evaluation pack with 300-500 rights-reviewed images,
      scientific/common names, morphology, habitat/geography, lookalikes, uncertainty,
      licenses, and exact follow-up-photo expectations. Never use the pack as training
      data without a separately approved policy. A governed iNaturalist candidate
      collector now dry-runs by default, filters and rechecks individual photo-license
      codes, separates research-wild candidates from cultivated/captive candidates for
      crop, ornamental, cannabis/hemp, and lookalike coverage, excludes coordinates,
      stores no copied media, and leaves identity, stage, exact license version, and
      intended use unapproved. USDA ARS and Wikimedia Commons conditional source rules
      are documented. The 320 image-level reviews and catalog promotions remain;
      candidate metadata is not counted as completion. A dry-run-by-default review-queue
      preparer now selects the governed per-case quotas, balances wild/cultivated
      candidates where applicable, preserves the remaining owned failure-case blockers,
      and refuses to treat an item as promotable without explicit morphology, identity,
      stage, Tier A cross-check, exact-license, rights, expected-result, and intended-use
      decisions. A separate dry-run-by-default promotion gate now binds the catalog,
      candidate manifest, and review manifest by exact hashes; revalidates immutable
      candidates, governed case definitions, quotas, duplicates, review decisions, and
      rights; and can only atomically import fully approved records. The real 284-item
      pending queue produces 0 promotions and leaves the catalog unchanged. On
      2026-08-12, the governed collector completed without collection errors and
      produced 540 metadata-only candidates: 338 research-wild and 202 cultivated.
      It copied no media, retained no coordinates, and granted no identity, stage,
      rights, or intended-use approval. The hash-bound review preparer filled 284 of
      the 320 governed slots. The remaining 36 slots are the ten deliberately adverse
      acquisition cases (blurry, partial-leaf, mixed-plant, dead-leaf, artificial,
      no-plant, low-light, direct-flash, glare, and mixed-light) that require owned or
      commissioned media. All 284 queued candidates still require explicit morphology,
      identity, life-stage, Tier A taxonomy, exact-license, rights, expected-result,
      and intended-use review; candidate metadata is not accepted evidence. A fresh
      2026-08-12 dry run revalidated all three boundaries against the current catalog:
      planning validation reported zero contract errors, review preparation retained
      exactly 284 queued / 36 missing / 0 promotable, and promotion retained all 284
      items as blocked with zero catalog writes. This verifies the preparation and
      non-bypass gates; it does not complete any image-level review.
- [~] Production-retest Plant ID autofill, direct optional geolocation without a
  Field Study, opt-in photo pins on Discovery Nature, privacy controls, video frame
  extraction, prompt length, saved-run reload, and correction/confirmation flows.
  The retained-media analysis path is live-verified: frontend `4829d2ff`, backend
  `1144dadc`, ToolRun `6a77f67895931a1ea2ab10d9`. The Headies Personal account
  restored 12 still images plus one private source video, analyzed all 12 stills
  including 10 server-extracted frames, persisted a usable/medium `Cannabis spp.`
  candidate with Cannabaceae/Cannabis narrowing, withheld species/cultivar certainty,
  and reloaded the exact evidence receipt from Saved Runs. Production also verified
  automatic credit refunds for failed provider reviews while fixing the nested JSON
  response and stale vision-receipt contract. Direct private geolocation, opt-in
  Discovery Nature photo-pin publication/privacy remain. The direct publication
  implementation now lets a Personal user deliberately select an approximate Nature
  photo pin without naming or configuring a Field Study; it prepares the backend's
  dedicated collection only after that choice and still requires location, uploaded
  photo evidence, a final publish action, sensitive-species obscuring, and separate
  Cannabis/hemp public-context consent. Source, 94 focused tests, all 89 regression
  batches, TypeScript, lint, and the full contract/delivery guard pass; deployment
  and signed-in data-bearing production acceptance remain before this item can close.
  On 2026-08-12, signed-in production verified that Plant ID visibly supports `No
grow`, private current location without a Field Study, and an optional approximate
  Nature photo pin with explicit exact-coordinate and Personal-account privacy text.
  The public globe loaded, linked back to Identify a Plant, exposed location fallback,
  search, review/invasive filters, and photo-observation results, but reported zero
  published pins in that session. Therefore deployment and the empty public viewer
  are verified; one deliberate location-enabled photo publication, reload, viewer
  card/photo open, privacy check, and withdrawal still remain data-bearing acceptance.
  The correction flow is
  live-verified on the same retained run: saving the common identity `cannabis`
  marks it user-corrected, preserves/rejects the original AI draft, keeps exact
  scientific species unverified, and clears the confirmation requirement.
- [~] Complete Harvest Readiness real-photo evaluation for ordinary phone photos:
  visible-sample clear/cloudy/amber/unresolved estimates, glare handling, crop-wide
  inference warnings, pistil/bud-development context, top/middle/lower/context
  sampling, video frames, exact retake guidance, and saved-run comparisons.
  Production retained run `6a77ea01b6f7eb6b90cd3595` returns an Aug 5-19
  planning range centered Aug 12, explains the user's approximate date and
  declining smell as reasons the window may be open, and preserves unfinished
  swelling, fresh pistils, and unconfirmed trichomes as reasons to wait. The same
  saved run was reopened in production and successfully wrote both a grow-log entry
  and a follow-up task to attached grow `6a603a8fda5c5bfdc030ac1b`.

  The exact four retained Headies photos from saved run
  `6a7632764f34c5f3a9943cb6` now form a repeatable calibration case. Under backend
  `ecc409c5bab0550c74e8d3c57bf2351c15e4d45a`, review
  `6a7c1f319faf5f978d60d376` used 4 originals plus 8 generic crops at `high`
  provider detail, counted 213 resolved calyx heads, and reported 1% confirmed amber,
  15% amber-or-warm-light, and a 1-16% possible-amber range. Under backend
  `0a89b91a662402daf1f9340a0fc2bc3622e736d6`, review
  `6a7c23ff74c8d35e0937ef61` restored those same four exact photos without spending a
  credit until analysis, used `original` provider detail plus all 12 systematic
  coverage crops, counted 225 resolved calyx heads, and reported 3% confirmed amber,
  18% amber-or-warm-light, a 3-21% possible-amber range, 51% cloudy, and 7%
  cloudy-or-glare. The review charged exactly one credit and left 94. This closes the
  lost-detail/generic-zoom defect and proves the bounded five-bucket counter, while
  preserving a real calibration disagreement against the owner's approximately 30%
  visual amber estimate. Broader rights-cleared accuracy evaluation, independent
  qualified review, and ordinary-phone-photo calibration remain open; do not inflate
  the result by counting sugar-leaf edges, warm pixels, or unresolved heads.

  A narrower phone-photo macro-coverage pass shipped under backend
  `b503c89295975c21fe9c692d434efdf1ff9ef177`. Production review
  `6a7c2ad4c6e70abe72a498a5` reran the same exact four retained originals at
  `original` provider detail with 12 narrower coverage crops, counted 310 resolved
  heads, and charged exactly one credit, leaving 93. It reported 9% clear, 64%
  cloudy, 2% confirmed amber, 15% amber-or-warm-light, 11% cloudy-or-glare, and a
  2-17% possible-amber range. The extra magnification increased the countable sample
  but did not close the amber disagreement; do not keep tuning the prompt toward the
  owner's estimate. Frontend catalog `growpath-harvest-trichome-qa-v1` now seeds a
  rights-reviewed offline evaluation boundary from three CC BY 4.0 primary sources
  and eight clear/cloudy/amber reference cases. It explicitly remains qualitative:
  the only exact-count panel contains answer-leaking annotation overlays, and diverse
  ordinary-phone images with independently reviewed head labels are still required
  before calling a quantitative counter production-ready.

  Counter evaluation now scores normalized head-box detection separately from
  clear/cloudy/amber classification on the same blinded set. The deployed counter
  does not return head boxes, so its exact per-image tallies are evaluated as an
  aggregate amber interval without inventing detector evidence. A replacement must
  provide complete predictions, meet explicit absolute detector, resolved-class,
  amber, false-amber, possible-amber coverage, and interval-error floors, and avoid
  regressing the deployed aggregate amber range. The staging label path imports only
  an adjudicated Label Studio result after two
  independent reviewers and complete image-level rights/capture metadata, then
  enforces non-weakenable floors of 50 qualified images, 1,000 labeled heads, 10
  capture sessions, 3 device models, difficult-light coverage, and at least 100
  labels in each resolved class. These are initial staging-eligibility floors, not
  an accuracy claim. The counter remains open until the corpus is actually labeled,
  independently reviewed, and scored against the deployed baseline. The public
  `siccan/tricomas-semillero-cannabis` repository remains quarantined: its README
  reports approximately 25% current detection and missing real labels, while its
  tree includes web-search files without image-level provenance.

  The full-area grid policy is live under backend `93833a23` / Render
  `dep-d9u7bpgae00c73bu4cu0`. Retained review `6a7c6ad198761905d4988cc2`
  inspected the same four originals plus 24 overlapping enlargement views without
  treating them as extra samples, counted 323 heads, and preserved a 1% confirmed
  to 23% possible amber range. The owner separately recorded approximately 30%
  visible-area amber through the signed, review-bound correction path. Production
  accepted that disagreement as product-review feedback with training consent off
  and no additional AI credit; it did not rewrite the signed AI result or readiness
  calculation. Frontend `2b5956fb` / Render `dep-d9u7l21srm7s73b570fg` also
  reopened the exact saved photos and flattened v1 receipt, displayed the signed
  323-head analysis, and exposed the zero-credit correction controls. This closes
  saved-review replay and calibration capture, not counter accuracy: the unresolved
  owner/AI disagreement still requires a rights-cleared blinded corpus and qualified
  independent adjudication.

- [~] Run one rightful production Harvest set through provider output, provenance,
  exact one-credit billing, saved-run reopen, and downstream task/batch write-back.
  Provider execution, original-detail provenance, exact retained-evidence retry,
  and one-credit billing are verified by review
  `6a7c23ff74c8d35e0937ef61`. The planning-run reopen plus grow-log/task write-back
  path is also verified. The grow-scoped owned-batch selector is live at frontend
  `9a88a498` / Render `dep-d9u3som7bikc739jv3l0`; the retained Headies run showed
  the truthful no-batches empty state and no free-text database-ID control. Actual
  Harvest batch mutation remains unverified until an approved owned batch exists,
  so the end-to-end item stays open.
- [ ] Obtain independent qualified review of Plant ID, Diagnosis, IPM, and Harvest
      accuracy; record disagreements rather than silently changing expected labels.
- [ ] Capture a naturally occurring provider failure for Diagnosis/IPM/Harvest and
      verify the production refund ledger without manufacturing an outage.

## B. Personal, Commercial, Facility, and public user loops

- [~] Complete and record the independent outside-user session. Preserve the completed
  Public, Personal Free/Pro, Commercial, Facility Owner/Manager/Staff/Viewer, and
  cross-role shared-record evidence unless regression testing fails. On 2026-08-09
  the signed-in Headies Personal Pro session loaded
  Home, Grows, Forum/Q&A, Discover, Profile, AI Tools, Courses, Videos, Lives, and
  Notifications at their intended production routes with their expected primary
  headings and no visible failed, unauthorized, not-found, or unable-to-load state.
  The compact six-word tab bar also exposed AI Tools, Courses, Videos, Logs, Tasks,
  Discovery Nature, and workspace switching through More. This is a route and
  session slice, not completion of the full Personal Pro behavioral loop. The same
  login switched into Triple Bag Genetics as the actual Staff member, loaded the
  Facility route set, showed the Facility-owned 2000/2000 credit balance instead of
  the Personal balance, kept inventory read-only, and withheld assignment controls
  with the explicit owner/manager rule. The live Team roster identified the current
  production roles as Owner, Manager, Staff, and Viewer without inferring them from
  account plan labels. The signed-in Triple Bag Genetics Owner session then verified
  the production Facility roster and Owner-only invite, role-change, remove, task
  assignment, and inventory-create controls without mutating records. The same login
  switched to Commercial and loaded Dashboard, Storefront, Products, Product Lines,
  Batch Planner, Inventory, Trials, Evidence Runs, Courses, Lives, Feed/Campaigns,
  Forum/Q&A, Orders, Analytics, Grows, AI Tools, Discover, Tasks, and Profile without
  a visible failed, unauthorized, not-found, or unable-to-load state. Commercial AI
  credits resolved to 2000/2000 under the Facility trial. This remains a route and
  permissions slice, not populated commercial workflow acceptance. The real John
  Collins login then entered the same shared Facility as the Viewer roster member,
  retained its Personal workspace choice, and loaded the Facility-owned 2000/2000
  credit balance with Triple Bag Genetics, llc identified as balance owner. The
  account entered Personal and returned to Facility through the workspace chooser
  without reauthentication or a visible load/access error. Team,
  Tasks, Plants, Compliance, Inventory, integrations, and Facility Outreach withheld
  or disabled mutation controls and exposed the Viewer/owner-manager boundary without
  changing production records. Viewer also reopened completed shared task
  `6a6140ec67a6aeadb8f4a0c9` with persisted status/timestamps and no update controls.
  Together with the retained Owner-create, Manager-reassign, Staff-complete, and
  Owner-audit evidence, the cross-role shared-record chain remains complete. The
  independent outside-user loop remains open.
- [~] Verify login/session/workspace selection and recovery across Free, Pro,
  Commercial, Facility Owner/Manager/Staff/Viewer, invalid-token, expired-token,
  server-down, reload, logout, and multi-workspace states. The same Personal Pro
  session remained signed in across a hard page reload, correctly identified the
  Personal workspace as current, exposed the shared Facility workspace as
  available, and entered `/home/personal` without reauthentication. Logout,
  failure/recovery states, and the remaining plans/roles are still open. Frontend
  merge `bfdff9be` and Render deployment `dep-d9s39sbl550s73dvs9vg` now reject a
  malformed Facility invitation before rendering name, birth-date, or password
  fields; the cache-busted production retest showed the request-new-invitation
  message and Go to sign in recovery action. A genuine expired-token case remains
  open and must use a real expired invitation rather than a fabricated substitute.
  Production also rejected a malformed password-reset token through the real backend
  path with the explicit invalid-or-expired message and Request another reset link
  action. Retained delivered-email evidence already covers initial verification,
  resend, both verified logins, password-reset delivery, replacement-password
  acceptance, and subsequent login; do not reopen those completed cases. On
  2026-08-12, the current API authentication and workspace bottom-tab regression
  slice also passed 20/20 tests. This reinforces token attachment and canonical
  workspace navigation but does not substitute for the remaining genuine expired
  invitation, logout, server-down, or outside-user production cases.
- [~] Finish the all-route/button checklist: correct destination, back behavior,
  role gate, readable empty/loading/error state, persistence, and no dead or duplicate
  controls. Personal Pro top-level and More destinations plus Facility Staff
  Dashboard, Grows, Tasks, Compliance, More, Profile, Rooms, Inventory, Team, and
  AI routes passed the 2026-08-09 production heading/error-state sweep. Facility
  Inventory resolved from its loading state to a readable zero-item, read-only
  result. The Commercial sweep found missing Back controls on Feed/Campaigns and
  Tasks. Frontend merge `79c6dba2`, Render deployment
  `dep-d9s2mvhsrm7s73aumnig`, and the cache-busted production retest added one
  shared themed Back control to each exact route with no visible load or access
  error. The real Facility Viewer then passed the production heading/error/back
  sweep for Dashboard, Grows, Tasks, Compliance, More, Profile, Rooms, Plants, SOPs,
  Inventory, Team, Transfers, Reports, Analytics, Integrations, AI Tools, Facility
  Outreach, Courses, Videos, Forum/Q&A, and Notifications. Compliance explicitly
  denied deviation creation, while Pulse and controller imports were disabled with
  the owner/manager rule. Button mutations, mobile/visual evidence, and the remaining
  shared-record behavior are not accepted by this sweep. On 2026-08-12, exact
  frontend merge `a198141e` and Render deploy `dep-d9tv9l49v7es73cdpdsg` passed a
  consolidated production sweep of 24 Personal destinations and 24 Facility Viewer
  destinations: every route rendered its expected level-one heading, a shared Back
  control, and no visible load/access/not-found failure. The real Personal-to-Facility
  workspace action also succeeded, and Facility Profile resolved the Facility-owned
  2000/2000 credit balance for Triple Bag Genetics, llc. This completes the current
  route-level Personal and Facility Viewer slice, not page mutations, mobile visuals,
  remaining roles, or independent-user acceptance. See
  `docs/qa/PERSONAL_FACILITY_ROUTE_ACCEPTANCE_2026-08-12.md`.
  A second populated, read-only production pass that evening confirmed 15 rooms,
  four team members, one SOP, 69 audit events, the Viewer permission boundary, and
  the correct `/home/facility/audit-logs` destination. Twelve core Facility routes
  again showed their expected headings, Back control, and no visible failure; the
  related navigation/role/access batch passed 16 suites and 58 tests. This does not
  close the mutation or remaining-role work below.
  The next Facility mutation-contract batch passed 14 suites and 103 assertions on
  2026-08-12, covering room, plant, task, inventory, compliance, SOP, reporting,
  endpoint, email-verification, and role/access behavior. This is automated contract
  evidence only: it reduces the unverified surface but does not replace the approved
  temporary-record, production reload/audit, forced-403, or cleanup evidence still
  required by the two open items below.
- [~] Retest content-report admin email deep links as an authorized platform owner
  for Forum, Feed, product, course, video, and live-session reports. - Automated contract coverage now verifies all six report types produce both the
  exact reported-content link and a moderation-case-focused admin link. - The admin route now accepts a submitted GrowPath URL only when its route matches
  the stored target type; otherwise it uses the canonical safe fallback. - Focused checks passed: frontend `PlatformAdminRoute.test.tsx` (18/18) and backend
  `adminReportNotification.test.js` + `reports.test.js` (23/23). - Still required before `[x]`: click representative delivered emails while signed
  in as the authorized platform owner and confirm both links open the intended live
  content/case without exposing the admin route to a non-admin account.
- [ ] Create only approved temporary production/staging records needed to verify
      populated Facility Grow/Plant/Journal/Inventory/Compliance/SOP comparison and
      Owner-only AI Validation Lab states; verify create/edit/reload/audit/permissions,
      then clean up and record the cleanup.
- [ ] Capture forced backend 403 evidence for prohibited Facility mutations and an
      exported cross-role recording; clean up temporary aliases only with owner approval.

## C. Payments, email, delivery, and entitlements

Automated contract status on 2026-08-12: the billing, entitlement, trial, pricing,
gift-attempt/review/return/recovery, sent-gift, subscription-gift API, and webhook API
batch passed **14 suites and 253 assertions**. This verifies the retained application
contracts but does not substitute for the production Stripe, webhook-delivery, email,
refund/dispute, or mutation-capable acceptance items below.

- [ ] Verify paid-course Checkout, cancel/success return, webhook enrollment,
      unlock, refund, and dispute state.
- [ ] Verify Pro and Facility subscription settlement, same-plan repeat protection,
      eligible trial-to-paid transition, cancellation, expiry/downgrade, and persisted
      entitlements. Record the scheduled Commercial expiry/downgrade when it occurs.
- [ ] Verify commercial product Stripe and external-only purchase paths, including
      order/lead/analytics results and truthful unavailable setup.
- [ ] Keep gift checkout disabled until cancellation/refund policy, signed-out and
      cross-device purchaser flow, pending-record migration review, production index,
      webhook/live-key evidence, safe single-worker processing, and sandbox plus
      mutation-capable acceptance all pass.
- [ ] Confirm production email delivery and logs for any remaining report, purchase,
      invitation, verification, reset, gift, and notification cases not already evidenced.

## D. Commercial, commerce data, and owner-supplied sources

Automated Commercial status on 2026-08-12: two consolidated batches passed **25
suites and 171 assertions** across storefront/public discovery, products and import,
inventory, orders, analytics, trials/batches, Feed, courses, videos, Lives, and the
responsive Commercial workflow pages. This confirms the retained application
contracts; it does not replace the populated Commercial-owner mutations, persistence,
public visibility, or screenshot/video acceptance still called out below.

- [~] Complete populated commercial brand/storefront acceptance: profile, slug,
  products, zero-stock/TBD launch state, shipping, images, labels, external links,
  course placement, and storefront discovery. Frontend merge `6381cd50` now
  makes Storefront loading and writes single-flight, retains drafts after
  failures, validates coordinates/email/HTTPS handoffs/product prices, blocks
  incomplete product publication, and exposes explicit progress, retry, errors,
  and semantic headings. All 94 regression batches, the full delivery guard,
  GitHub CI, Production Build Preflight, and exact served-bundle verification
  passed. Populated signed-in Commercial create/edit/reload, public discovery,
  and screenshot/video acceptance remain open. See
  `docs/qa/COMMERCIAL_STOREFRONT_STATE_ACCESSIBILITY_PRODUCTION_EVIDENCE_2026-08-11.md`.
- [~] Complete commercial course create/edit/publish acceptance for cover,
  category/grow interests, modules, lessons, uploads/external video sources, tasks,
  products, lives, Forum links, storefront display, and learner access.
  Draft-only creation, server-enforced readiness, save-before-publish, explicit
  unpublish, paid-price validation, and published-content mutation locks are live in
  frontend merge `daf0d2ad` and backend merge `373d04ec`. Frontend clean-cache Render
  deployment `dep-d9tukrbm8hqs73e3orr0` reached Live, and the cache-busted production
  Course Builder visibly rendered the governed seven-step workflow, named Free/Paid
  choices, and draft-only create action. Backend deployment
  `dep-d9tul4rncjis73fv2dng` reached Live for exact fingerprinted merge `9f385c6f`.
  Backend merge `c5bab83e` and frontend merge `a19c0fa0` now add owner-scoped,
  draft-only soft archive: published courses must be unpublished first, archived
  records remain available for audit, active list/detail endpoints stop returning
  them, and reusable Video Library assets are not deleted. Exact frontend Render
  deploy `dep-d9tutf8ae00c73bftcm0` reached Live; focused backend workflow tests,
  TypeScript, targeted lint, and 38 frontend workflow/knowledge tests passed.
  Populated Commercial-owner create/edit/publish/read-only/unpublish/reload,
  learner/storefront visibility, and one real disposable-draft archive cleanup remain
  open.
- [~] Complete populated Storefront, Forum/Feed, Videos, Lives, Orders, Analytics,
  Product Lines, Batches/Lots, Trials, Inventory, dispensary search/external handoff,
  navigation hierarchy, and persistence checks. Orders and Analytics state,
  single-flight, retained-error, confirmation, and accessibility hardening shipped
  in production merge `74737bba`; all 94 regression batches, local delivery guard,
  PR CI, main CI, Production Build Preflight, served-bundle checks, and the signed-in
  non-Commercial access boundary passed. Populated Commercial owner mutations,
  refresh, persistence, and visual acceptance remain open. See
  `docs/qa/COMMERCIAL_ORDERS_ANALYTICS_STATE_ACCESSIBILITY_PRODUCTION_EVIDENCE_2026-08-12.md`.
- [~] Seed Penny Saver Soil, Living Soil, and No-Till drafts only from owner-approved
  facts. Keep inventory zero and claims unpublished until labels, guaranteed analyses,
  sizes, prices, directions, shipping, and images are supplied and verified. The
  owner's GrowPathAI and Triple Bag Genetics Facebook hat designs were captured as
  exact owner-authorized assets with SHA-256 records and separate brand manifests.
  Both remain zero-stock, unpriced, non-checkout, and unpublished. Triple Bag
  concepts containing third-party marks remain private drafts pending rights review;
  Captuer's 2026-08-10 email identifies BLVNK HEADWEAR as its exclusive unbranded
  blank distributor, so BLVNK is recorded as the candidate blank-body source while
  local decoration, samples, exact models, costs, and production approval remain
  open. Live Commercial product-draft creation and owner review also remain open. See
  `assets/brands/growpathai/hat-concepts/ASSET_RECORD.md` and
  `assets/brands/triple-bag-genetics/hat-concepts/ASSET_RECORD.md`, plus
  `assets/brands/HAT_PRODUCTION_BRIEF_2026-08-12.md`.
  Two exact GrowPathAI purchase-intent presentations are now owner-approved: the
  black Circuit Leaf concept and the revised tonal-sage concept with the longer
  structured visor and small rear `GROWPATHAI` wordmark. The authenticated
  `Yes` / `Maybe` / `No` concept-research flow is implemented with an owner-entered
  hypothetical price, explicit not-for-sale wording, one revisable response per
  account, aggregate-only owner results, zero inventory, and no reservation, order,
  checkout, payment, production, or shipping path. On 2026-08-12, 4 focused suites
  covering the approved catalog, owner trial creation/detail, and respondent card
  passed 20/20 tests. Live Commercial trial creation with an owner-entered price,
  public response/revision, aggregate review, and close-state acceptance remain.
  Triple Bag public trials remain blocked by rights review.
- [ ] Collect owner-approved knowledge sources: domains, authors/channels,
      reliability tiers, allowed uses, exclusions, cross-check requirements, and review
      dates; update both documentation and runtime registries.

## E. Visual, accessibility, device, and notification acceptance

- [~] Review every major Personal, Commercial, Facility, and public route in Day,
  Night, and Auto themes on desktop and mobile; fix contrast, hardcoded surfaces,
  navigation spacing, overflow, hierarchy, consistent headers, and responsive layout.
  A signed-in Facility Staff night-theme desktop screenshot found the global Report
  Bug action covering lower-right Priority Status controls. Frontend merge
  `9c14dafa`, Render deployment `dep-d9s2b8ou01pc73drr88g`, moved the shared action
  into a separate dock at every real viewport width. The cache-busted production
  retest at `/home/facility/dashboard?release=9c14dafa&verify=report-bug-dock`
  showed the settled 15-room/68-audit-event dashboard with both Priority Status and
  the support action unobstructed. This is one desktop/night/Staff viewport, not the
  remaining theme, role, route, or mobile matrix. On 2026-08-12, the shared visual
  contract and 16 focused suites (71 tests) passed for narrow tab spacing, canonical
  bottom-tab order, Day/Night/Auto controls and tokens, headings/profile hierarchy,
  shared Back behavior, Notification Center routing, privacy controls, and Commercial
  Inventory accessibility. These are automated contract checks, not final device
  screenshots or completion of the theme/route/role matrix.
  On 2026-08-12, signed-in production accessibility-tree checks covered 12 Facility
  and 12 Personal destinations. Every route exposed a named level-one heading and no
  unnamed application control. A deeper focus-order inspection found MapLibre's
  third-party globe toggle lacked an accessible name; merge `79047c20` now keeps its
  changing `Enable globe` / `Disable globe` title synchronized to `aria-label`.
  Production Build Preflight and Frontend CI passed on that exact SHA, and the live
  Personal Home globe exposed the named `Enable globe` control. This closes that
  control defect, not the remaining device/accessibility matrix.
  The same 12 Personal and 12 Facility destinations passed a computed live contrast
  scan of visible direct text against its actual rendered opaque surface at WCAG
  normal/large-text thresholds. No failing sample appeared in the rendered states;
  hidden/error/native states and physical-device human review remain open.
- [~] Verify keyboard and focus order, visible focus, actionable labels, screen-reader
  names, heading hierarchy, font scaling, touch targets, loading/error/empty states,
  and back navigation. - Shared Back, primary-action, and Report Bug controls now preserve at least a
  44-by-44 CSS-pixel target. Back and primary actions expose a visible keyboard
  focus outline; primary actions derive a stable accessible name from their title
  and announce disabled state. Four focused suites pass 15/15 assertions. - Context-bar actions, the global connection-message dismiss action, and inline
  Forum discussion toggle/reply/retry/full-page actions now also preserve at least
  a 44-by-44 target and stable roles/names. Tappable shared cards and both shared
  error-retry surfaces now expose stable control roles/names, with retry targets
  at least 44-by-44. Focused shared-control and theme suites pass. - Shared Follow, Facility Room, Inventory edit, and Schedule task controls now
  expose record-specific names and 44px targets. Follow suppresses duplicate
  requests while busy; Room/Inventory/Task rows use active Day/Night palette
  surfaces instead of hardcoded light colors. Three focused suites pass 42/42. - The active Grow Interest picker now gives its expandable header and selectable
        interest chips 44px targets while retaining checkbox names/state and readable
        expand/collapse guidance. Four focused form/theme suites pass 13/13.
      - Active Forum-filter and Grow/Plant-link selectors now expose checkbox/radio
        state, record-specific names, and 44px targets. Their focused Forum/shared
        contract suites pass 19/19.
      - Workspace mode selectors now expose selected radio state, selected workspace
        cards announce their state and action, and both control layers preserve 44px
        touch targets. Lesson/video provider-load and external-provider actions also
        preserve 44px targets. Four focused mode/media/theme suites pass 25/25;
        frontend merge `00b13d24` passed the full 9m32s CI gate.
      - Personal featured-feed discovery and content cards now expose link semantics,
        stable content-specific names, and navigation hints. Shared education cards
        use their CTA/title as a stable link name and preserve a 44px target. Two
        focused suites pass 7/7.
      - Shared calendar/date dialogs now expose a named heading and preserve 44px
        targets for month navigation and clear/cancel/confirm actions. Two focused
        date/theme suites pass 9/9.
      - Shared scheduling controls now announce all-day as a checked switch and
        reminder/recurrence presets as checked radio choices. Clear and preset chips
        preserve 44px targets; focused calendar/schedule suites pass 5/5.
      - Shared Video Library scope filters now announce checked radio state; reusable
        video choices and detach/filter controls preserve 44px targets. Video owner
        edit/publish/remove actions announce disabled state and all card actions
        preserve 44px targets. Focused video picker/theme suites pass 4/4.
      - The shared Day/Night/Auto radio choices and Auto-location actions preserve
        44px targets while retaining checked, disabled, and live-status semantics.
        Its focused behavior suite passes 2/2; frontend merge `db192906` passed the
        full 9m11s CI gate.
      - The shared content-report dialog now exposes modal and heading semantics,
        announces disabled submit/cancel state and errors, handles safe device-back
        dismissal, and preserves 44px actions. Its focused critical-theme/submission
        suite passes 4/4.
      - Personal Grow workspace section navigation now exposes a named tab list,
        announces the selected section, and preserves 44px targets across Overview,
        Plants, Journal, Tasks, AI Tools, Automation, Timeline, and Compare. Focused
        navigation/theme suites pass 8/8.
      - Shared AI evidence-review panels now expose the review and evidence groups as
        navigable headings, announce an unperformed pixel review as an alert, and
        preserve a 44px follow-up-guidance action. The Day/Night behavior suite passes
        4/4.
      - Saved grow-photo evidence reuse now exposes a navigable heading, announces its
        loading state, and preserves 44px explicit-selection targets without changing
        IPM/harvest evidence linking. Its focused suite passes 3/3.
      - The main photo/video evidence uploader now exposes image guidance as a
        navigable heading, announces upload errors and disabled Add/Retry/Remove state,
        and preserves 44px mutation targets. Its complete focused upload/retry/
        protected-media/workspace suite passes 33/33.
      - Contextual workflow handoffs now expose a navigable panel heading plus named,
        described, 44px links while retaining the grow/source context in destination
        URLs. Its focused link/navigation suite passes.
      - Still required before `[x]`: complete keyboard/focus-order, font-scaling,
        screen-reader, and physical-device review across the major route matrix.
- [~] Verify notification preferences and delivery to supported devices for selected
  categories, including opt-in/out persistence and links to the correct record.
  Profile and Notification Center controls, push-token registration, category
  mapping, and persisted preference APIs are implemented. Frontend merge
  `417cf432` mounts native cold-start/background tap handling and routes safe
  payloads through the same canonical source resolver as the in-app center,
  including tasks, alerts, courses, lives, videos, products, storefronts,
  ToolRuns, facility records, and Forum/Q&A. Focused notification/registration/
  source-link tests passed 17/17 and the main Production Build Preflight passed.
  Real iOS and Android receipt, opt-in/out suppression, and exact-record tap
  acceptance remain; web intentionally does not register native push handling.
- [ ] Capture genuine final-SHA screenshots and video tied to URL, timestamp,
      account/role, viewport/device, checks, and evidence type.

## F. App Store and final release

The autonomous release boundary was rechecked on 2026-08-12. The production-build
command remained dry-run-only and listed the intended non-interactive iOS and Android
EAS builds without starting or charging for either build. Public live-URL verification
passed 12/12 required website and API routes and wrote valid local go/no-go evidence.
Twelve release-contract suites passed 53/53 tests across store graphics, privacy and
data-rights handling, production-build safeguards, Sentry validation, evidence
recording, live URLs, and the go/no-go gate. Strict preflight passed its release scan,
Codex workflow contract, 1,011-file surface audit, and strict application scan, then
correctly stopped because `EXPO_PUBLIC_SENTRY_DSN` is not supplied to the native
production-build environment. The DSN must be configured as a protected EAS
production secret and must never be committed to the repository.

- [ ] Obtain owner/legal decisions for final app name, cannabis language, age rating,
      privacy/support URLs, deep-link domain, store records, and listing copy.
- [ ] Configure protected Apple and Google submit credentials and the production
      Sentry DSN outside source control.
- [ ] Produce iOS and Android production builds and capture required device-class
      screenshots.
- [ ] Run physical-device smoke tests for auth, every workspace, payments status,
      permissions, image/video upload, notifications, offline/error states, and logout.
- [ ] Run live disposable-account data export/delete verification and retain redacted
      evidence.
- [ ] Run the trusted release-machine batch and final go/no-go command with all real
      inputs; resolve failures without weakening gates.
- [ ] Complete App Store Connect and Play Console privacy/data-safety, age rating,
      pricing, compliance, review notes, release notes, and submission forms.
- [ ] Assign release/support/QA/crash-monitoring owners and attach rollback/hotfix
      evidence, then monitor review and production after submission.

## Final acceptance record

- [ ] All applicable tests, catalog strict validators, security/configuration guards,
      production builds, role loops, external integrations, device/accessibility checks,
      and independent validation pass.
- [ ] No untracked production file or temporary test data is omitted accidentally.
- [ ] Final evidence records the frontend/backend commit SHAs, production URLs,
      deployment IDs when inspected, timestamps, account/role, checks, failures/fixes,
      screenshots/video, external delivery evidence, cleanup, and final decision.
