# GrowPathAI Canonical Remaining Work

Date: 2026-08-08

Status: Active execution list

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

## A. AI image, video, and diagnostic quality

- [~] Complete the governed Diagnosis/IPM evaluation catalog: 142 of 252 reviewed
  case records and 284 of at least 504 rights-reviewed images are present. Continue
  disease, pest/beneficial-lookalike, root-zone, nutrient, chemical, physical, and
  normal-aging variants; keep strict validation blocked until all records pass.
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
      the governed catalog or cross-record write-back matrix.
- [ ] Complete the Plant ID evaluation pack with 300-500 rights-reviewed images,
      scientific/common names, morphology, habitat/geography, lookalikes, uncertainty,
      licenses, and exact follow-up-photo expectations. Never use the pack as training
      data without a separately approved policy.
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
      Discovery Nature photo-pin publication/privacy remain. The correction flow is
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
      swelling, fresh pistils, and unconfirmed trichomes as reasons to wait. Ordinary
      phone-photo percentage accuracy remains. The same saved run was reopened in
      production and successfully wrote both a grow-log entry and a follow-up task to
      attached grow `6a603a8fda5c5bfdc030ac1b`.
- [ ] Run one rightful production Harvest set through provider output, provenance,
      exact one-credit billing, saved-run reopen, and downstream task/batch write-back.
      The reopen plus grow-log/task write-back path is verified for the planning run
      above, but that run truthfully reports no verified photo-analysis receipt or
      photo-review charge. Fresh rightful media is still required to accept the
      provider/provenance/billing portion; a batch write-back is also still unverified.
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
      acceptance, and subsequent login; do not reopen those completed cases.
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
      shared-record behavior are not accepted by this sweep.
- [ ] Retest content-report admin email deep links as an authorized platform owner
      for Forum, Feed, product, course, video, and live-session reports.
- [ ] Create only approved temporary production/staging records needed to verify
      populated Facility Grow/Plant/Journal/Inventory/Compliance/SOP comparison and
      Owner-only AI Validation Lab states; verify create/edit/reload/audit/permissions,
      then clean up and record the cleanup.
- [ ] Capture forced backend 403 evidence for prohibited Facility mutations and an
      exported cross-role recording; clean up temporary aliases only with owner approval.

## C. Payments, email, delivery, and entitlements

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

- [ ] Complete populated commercial brand/storefront acceptance: profile, slug,
      products, zero-stock/TBD launch state, shipping, images, labels, external links,
      course placement, and storefront discovery.
- [ ] Complete commercial course create/edit/publish acceptance for cover,
      category/grow interests, modules, lessons, uploads/external video sources, tasks,
      products, lives, Forum links, storefront display, and learner access.
- [ ] Complete populated Storefront, Forum/Feed, Videos, Lives, Orders, Analytics,
      Product Lines, Batches/Lots, Trials, Inventory, dispensary search/external handoff,
      navigation hierarchy, and persistence checks.
- [ ] Seed Penny Saver Soil, Living Soil, and No-Till drafts only from owner-approved
      facts. Keep inventory zero and claims unpublished until labels, guaranteed analyses,
      sizes, prices, directions, shipping, and images are supplied and verified.
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
      remaining theme, role, route, or mobile matrix.
- [ ] Verify keyboard and focus order, visible focus, actionable labels, screen-reader
      names, heading hierarchy, font scaling, touch targets, loading/error/empty states,
      and back navigation.
- [ ] Verify notification preferences and delivery to supported devices for selected
      categories, including opt-in/out persistence and links to the correct record.
- [ ] Capture genuine final-SHA screenshots and video tied to URL, timestamp,
      account/role, viewport/device, checks, and evidence type.

## F. App Store and final release

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
