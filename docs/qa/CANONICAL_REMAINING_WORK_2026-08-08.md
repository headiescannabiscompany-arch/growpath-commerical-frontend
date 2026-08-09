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

- [~] Complete the governed Diagnosis/IPM evaluation catalog: 25 of 252 reviewed
  case records and 50 of at least 504 rights-reviewed images are present. Continue
  disease, pest/beneficial-lookalike, root-zone, nutrient, chemical, physical, and
  normal-aging variants; keep strict validation blocked until all records pass.
- [ ] Run every completed Diagnosis/IPM case through the GrowPath primary path and
      GPT second opinion with the identical evidence envelope; persist evidence,
      counter-evidence, disagreements, confidence, requested follow-ups, billing, and
      linked Plant/Grow/Log/ToolRun/Task/Facility records.
- [ ] Complete the Plant ID evaluation pack with 300-500 rights-reviewed images,
      scientific/common names, morphology, habitat/geography, lookalikes, uncertainty,
      licenses, and exact follow-up-photo expectations. Never use the pack as training
      data without a separately approved policy.
- [ ] Production-retest Plant ID autofill, direct optional geolocation without a
      Field Study, opt-in photo pins on Discovery Nature, privacy controls, video frame
      extraction, prompt length, saved-run reload, and correction/confirmation flows.
- [ ] Complete Harvest Readiness real-photo evaluation for ordinary phone photos:
      visible-sample clear/cloudy/amber/unresolved estimates, glare handling, crop-wide
      inference warnings, pistil/bud-development context, top/middle/lower/context
      sampling, video frames, exact retake guidance, and saved-run comparisons.
- [ ] Run one rightful production Harvest set through provider output, provenance,
      exact one-credit billing, saved-run reopen, and downstream task/batch write-back.
- [ ] Obtain independent qualified review of Plant ID, Diagnosis, IPM, and Harvest
      accuracy; record disagreements rather than silently changing expected labels.
- [ ] Capture a naturally occurring provider failure for Diagnosis/IPM/Harvest and
      verify the production refund ledger without manufacturing an outage.

## B. Personal, Commercial, Facility, and public user loops

- [ ] Complete and record Personal Pro, Commercial, Facility Owner, Facility Viewer,
      cross-role shared-record, and independent outside-user sessions. Preserve already
      completed Public, Personal Free, Manager, and Staff evidence unless regression
      testing fails.
- [ ] Verify login/session/workspace selection and recovery across Free, Pro,
      Commercial, Facility Owner/Manager/Staff/Viewer, invalid-token, expired-token,
      server-down, reload, logout, and multi-workspace states.
- [ ] Finish the all-route/button checklist: correct destination, back behavior,
      role gate, readable empty/loading/error state, persistence, and no dead or duplicate
      controls.
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

- [ ] Review every major Personal, Commercial, Facility, and public route in Day,
      Night, and Auto themes on desktop and mobile; fix contrast, hardcoded surfaces,
      navigation spacing, overflow, hierarchy, consistent headers, and responsive layout.
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
