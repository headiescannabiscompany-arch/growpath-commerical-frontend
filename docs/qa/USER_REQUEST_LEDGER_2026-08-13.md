# GrowPathAI User Request Ledger

Date: 2026-08-13

Status: Reconciled against `main` at frontend `d6f39cdb` and the evidence linked from
`docs/qa/CANONICAL_REMAINING_WORK_2026-08-08.md`.

This ledger records the product requests added during the long production-review
thread. It is the readable history of what was requested and what has been delivered.
The canonical remaining-work document is the execution list. A checked item here is
not reopened unless a current regression reproduces a defect.

Legend:

- `[x]` implemented and supported by retained test, deployment, or production evidence;
- `[~]` useful implementation is live, but a specifically named acceptance step remains;
- `[ ]` not complete;
- `[blocked]` requires owner input, a real external event, credentials, rights approval,
  physical-device work, or qualified independent review.

## Accounts, workspaces, roles, and administration

- [x] Personal, Commercial, and Facility workspaces can be selected without creating
      separate logins for every workspace.
- [x] Triple Bag Genetics is the Facility brand; Living Soil Labs remains the separate
      Commercial brand, including when its account is also a Facility team member.
- [x] Facility Owner, Manager, Staff, and Viewer roles exist and expose role-appropriate
      controls; the shared task chain and Viewer read-only behavior are retained.
- [x] Facility tasks can be assigned by authorized Owner/Manager roles.
- [x] Facility team members can be removed by an authorized Owner.
- [x] Facility credits belong to the Facility workspace and display 2000/2000 instead
      of a member's Personal balance; Commercial under the Facility trial also resolves
      the Facility entitlement.
- [x] The `admin@growpathai.com` account has the platform-admin role and reaches the
      moderation/knowledge-governance area.
- [~] Admin report cases store exact content and moderation links for Forum, Feed,
      product, course, video, and live reports. Representative live moderation links
      work; delivered-email clicks for every content type and non-admin denial remain.
- [~] Login, reload, verification, reset, workspace switching, malformed-token recovery,
      and the retained real role chain are covered. Genuine expired-invitation, logout,
      server-down recovery, and independent outside-user acceptance remain.
- [ ] Capture a forced backend 403 for prohibited Facility mutations and export the
      cross-role recording.

## Shared navigation, visual system, dates, and accessibility

- [x] Personal, Commercial, and Facility use word-based canonical bottom navigation;
      duplicate Field Studies/Logs entries and raw route labels are removed from the
      supported navigation contract.
- [x] Commercial navigation keeps Storefront as the commerce entry, folds Products
      into Storefront, folds Feed into Forum, keeps Discover in the shared order, and
      keeps Profile last while retaining access to the removed top-level destinations.
- [x] Facility navigation keeps operational pages available through the correct grouped
      destinations instead of overflowing the bottom bar.
- [x] Shared Back controls are present across the current 24-route Personal and
      24-route Facility Viewer production sweep, including Commercial Feed and Tasks.
- [x] Day, Night, and Auto modes share the same component system; Auto uses deliberately
      saved sunrise/sunset coordinates when available and otherwise local device time,
      without requesting location at startup.
- [x] The shared Day palette and readable dark, blue-accent Night palette are implemented
      across the audited mounted routes and controls.
- [x] Shared date inputs use calendar/date dialogs with accessible year/month/day
      selection and scheduling semantics.
- [~] Route-level headings, Back controls, loading/error states, contrast, major touch
      targets, and many control names have automated and live evidence. Full keyboard,
      focus-order, font-scaling, screen-reader, responsive-role, and physical-device
      review remains.
- [ ] Capture final-SHA desktop/mobile screenshots and video with URL, role, viewport,
      timestamp, and evidence type.

## Personal Home, Grows, Discover, Forum, and profiles

- [x] Personal Home retains the useful promoted area and six-card featured-feed model:
      three Commercial placements, one Facility education item, one course, and one
      popular Forum item, with truthful fallbacks when real content is unavailable.
- [x] Personal Grows is restored as a useful grow workspace with Overview, Plants,
      Journal, Tasks, AI Tools, Automation, Timeline, and Compare instead of an empty
      AI-run page.
- [x] Forum discussions expand below posts rather than requiring a separate discussion
      page; reply/retry/full-discussion controls are retained and accessible.
- [x] Group creation is reachable from Communities/Forum.
- [x] Forum no longer treats operational task notifications as discussion content.
- [x] Profile consolidates Upgrade, Billing, cancellation/data controls, workspace
      choice, theme, and notification settings without duplicate Commercial/Facility
      upgrade links.
- [x] Upgrade pages have fuller Pro, Commercial, and Facility plan descriptions before
      Stripe.
- [x] Discover is the broad directory; the mapped plant experience is named Discovery
      Nature and links to Identify a Plant.
- [x] Discovery Nature can start near the user when location is deliberately available
      and otherwise falls back to a broad United States view.
- [x] Public Nature observations use opted-in plant photos and approximate public pins;
      exact Personal coordinates remain private and cannabis/hemp requires the separate
      interest/consent boundary.
- [~] The Discovery Nature viewer, map/globe, photo cards, privacy copy, current-location
      and manual-pin paths are live. One deliberate photo publication, reload, public
      card/photo opening, privacy check, and withdrawal remain.

## Courses, videos, Lives, Forum media, and notifications

- [x] Courses support covers, grow interests/categories, modules, lessons, lesson tasks,
      products, Lives, Forum links, and reusable video-library attachments.
- [x] Course/video authoring supports direct upload and external providers/URLs,
      including YouTube, Rumble, and generic HTTPS sources where the provider contract
      allows them.
- [x] Course owners can add and detach reusable videos without deleting the underlying
      library asset.
- [x] Video upload/library/storage usage is available to supported Free, Pro,
      Commercial, and Facility users rather than a special creator-only account class.
- [x] Published videos are searchable in Discover, can be opened from Forum/Video areas,
      and retain follow-user/video activity behavior.
- [x] Grow interests are selectable when publishing a video.
- [x] Lives have a joinable live-session directory separate from Commercial campaigns
      and remain linked from Forum/shared navigation.
- [x] Notification Center and Profile expose Device push plus Task, Forum, Video,
      Courses/Lives, Commerce, and Facility categories with persisted preferences.
- [~] Native cold-start/background notification routing and exact-record links are
      implemented. Real iOS/Android receipt, opt-out suppression, and tap-through
      acceptance remain.
- [~] Commercial course creation, edit, publish/unpublish, archive, storefront/learner
      visibility, and one disposable-draft cleanup still need populated live acceptance.

## Plant ID and Discovery Nature

- [x] Plant ID follows a field-botanist method: morphology, family/genus traits,
      habitat, geography, ecology, lookalikes, source verification, uncertainty, and
      requests for missing evidence instead of one-image certainty.
- [x] Plant ID accepts up to the governed multi-photo limit plus video; server frame
      extraction, original evidence retention, saved-run reload, and correction
      provenance are live-verified.
- [x] A user can identify and privately geolocate one plant without creating a Field
      Study or attaching a Grow.
- [x] Device location and a browser-independent manual map-pin fallback are available;
      an unsaved test point at the owner's home was removed and was never published.
- [x] Common and scientific names are displayed separately, and user corrections retain
      the rejected AI draft rather than rewriting history.
- [x] Uncertain identity is visibly bounded and asks for the next useful whole-plant,
      leaf, stem, flower, fruit, habitat, or location evidence.
- [~] Optional direct publication to Discovery Nature is implemented with sensitive
      species obscuring, exact-coordinate privacy, photo requirements, cannabis/hemp
      consent, and withdrawal support. The data-bearing live loop remains.
- [ ] Complete the governed Plant ID evaluation pack: 320 reviewed slots, including
      owned/commissioned adverse images, exact rights, morphology, taxonomy, expected
      results, and approved use. Metadata-only candidates are not accepted evidence.

## Diagnosis, IPM, Harvest, and shared image/video analysis

- [x] Diagnosis and IPM results distinguish evidence, counter-evidence, alternatives,
      uncertainty, missing evidence, and recommended follow-up photos instead of
      promoting a treatment from an ambiguous mark.
- [x] The governed Diagnosis/IPM catalog contains 252 reviewed cases and 504
      rights-reviewed images and passes the strict seed-ready dry-run validator.
- [x] AI photo review retains original-detail provider input and systematic enlargement
      views instead of silently relying on lower-resolution thumbnails.
- [x] Shared photo/video upload reports oversize, unreachable, retry, and remove states;
      Plant ID video frames and retained evidence have production acceptance.
- [x] Harvest Readiness is not undersold as only a trichome estimator: it combines
      sampled trichomes, pistils, bud swelling/development, timing, aroma, user
      observations, reasons to harvest, reasons to wait, and a planning range.
- [x] Personal Harvest Readiness works without a Grow and can optionally attach one.
- [x] Facility AI Tools exposes Harvest Readiness when an existing Facility grow has
      cannabis crop context. Production verified the card and full description under
      frontend `d6f39cdb` and backend `5e6cd014`.
- [x] The retained four-photo Harvest calibration case is re-openable, analyzed at
      original detail with overlapping enlargement views, produces bounded
      clear/cloudy/amber/glare/warm-light estimates, and stores owner disagreement
      without rewriting the signed AI result.
- [x] Harvest results use visible-sample ranges and do not claim a whole-plant trichome
      percentage from selected areas.
- [~] IPM/Diagnosis governed-case execution against the primary path plus GPT second
      opinion is implemented as a resumable, staging-only, dry-run-by-default harness.
      Authorized 252-case staging execution, billing, linked-record checks, and cleanup
      remain.
- [~] The Harvest counter now counts hundreds of candidate heads across the full sampled
      areas and preserves confirmed/possible amber and cloudy/glare uncertainty. Its
      remaining disagreement with the owner's visual estimate is recorded rather than
      tuned away.
- [ ] Build and independently adjudicate a rights-cleared ordinary-phone trichome corpus
      with blinded head boxes/classes, capture diversity, difficult lighting, and the
      non-weakenable evaluation floors already in the repository.
- [ ] Obtain independent qualified review of Plant ID, Diagnosis, IPM, and Harvest.
- [ ] Capture a naturally occurring provider failure and verify the refund ledger without
      manufacturing an outage.
- [ ] Verify one approved owned Harvest batch write-back; the empty-state selector and
      grow-log/task write-backs are already complete.

## SOPs and Facility operations

- [x] Facility SOP Library includes eight standard starters, supporting-document uploads,
      revisions, retirement, execution checklists, history, audit events, and role gates.
- [x] AI can recommend SOPs for non-Facility users without pretending those suggestions
      are Facility-controlled procedures.
- [x] Facility SOP comparison results link directly to both named runs and Facility
      Tasks. Production frontend `b8742f1a` opened the retained reference and comparison
      checklist-evidence pages plus the live follow-up task queue from one real result.
- [x] Facility operational routes include Dashboard, Grows, Rooms, Plants, Tasks,
      Journal/Logs, Inventory, Compliance, SOPs, Reports, Analytics, Integrations,
      AI Tools, Team, and Notifications with grouped navigation.
- [~] Automated Facility mutation contracts cover rooms, plants, tasks, inventory,
      compliance, SOPs, reporting, roles, and access. Approved temporary production
      create/edit/reload/audit/permission/cleanup evidence remains.

## Commercial, storefronts, dispensaries, products, and trials

- [x] Commercial retains everything shared with Personal plus storefront, product,
      inventory, batch/lot, trial, order, analytics, marketing, and evidence workflows.
- [x] Dispensary discovery supports state/distance search, inventory visibility, and
      external website/in-store-pickup handoff without GrowPath checkout.
- [x] Living Soil Labs is represented as pre-launch: no website requirement, customer-paid
      shipping, TBD/blank pricing, and zero inventory for soil, nutrients, shirts, and
      hats until owner facts are supplied.
- [x] Storefront/product publication blocks incomplete prices, invalid links, or
      unsupported inventory claims and retains drafts on failure.
- [~] Populated Living Soil Labs storefront/product/course/discovery acceptance remains;
      no claims, stock, price, or guaranteed analysis may be invented.
- [~] Commercial Orders, Analytics, Product Lines, Batches/Lots, Trials, Inventory,
      Forum/Feed, Videos, Lives, and dispensary handoff have automated coverage; populated
      owner mutation, reload, public visibility, and visual evidence remain.

## Billing, gifts, email, and data rights

- [x] Current subscription checkout, webhook entitlement, cancellation/refund state,
      plan display, and Billing/Sent Gifts foundations are implemented with fail-closed
      safety controls.
- [x] Gift month/year plan selection, recipient-email handoff, claim/recovery routes,
      purchaser history, exact pricing binding, delivery leases, and refund-worker
      foundations are implemented behind a disabled launch flag.
- [~] Gift checkout intentionally remains disabled until policy, signed-out/cross-device
      recovery, pending-record migration/index review, Stripe webhook/live-key evidence,
      safe worker activation, sandbox, and mutation-capable acceptance pass.
- [ ] Complete paid-course checkout/enrollment/refund/dispute acceptance.
- [ ] Complete Pro/Facility trial-to-paid/cancel/expiry/downgrade acceptance.
- [ ] Complete Commercial product Stripe and external-only order/lead/analytics
      acceptance.
- [ ] Complete remaining delivered-email evidence for report, purchase, invitation,
      gift, and notification cases not already retained.
- [ ] Run a disposable-account data export/delete loop and retain redacted evidence.

## Hats and pre-launch product research

- [x] GrowPathAI and Triple Bag Genetics concept images, exact hashes, brand manifests,
      approved emblems, and a production brief are retained.
- [x] The owner approved the black Circuit Leaf GrowPathAI concept and the revised
      tonal-sage concept with a longer structured brim and small rear `GROWPATHAI` mark.
- [x] BLVNK HEADWEAR is recorded as the candidate blank-body source based on the retained
      supplier email; no exact model, fabric, cost, or production claim is invented.
- [x] A zero-stock, unpriced, non-checkout `Would you buy this at this price?` trial flow
      exists with Yes/Maybe/No, one revisable response per account, aggregate results,
      and explicit `not for sale` language.
- [ ] Run the two approved GrowPathAI concepts as live owner-priced purchase-intent
      trials, verify response/revision/aggregate/close behavior, and keep inventory zero.
- [blocked] Triple Bag Genetics concepts containing third-party marks remain private
            until rights review; then correct the remaining emblems/scale before trials.
- [ ] Decide whether GrowPathAI concepts are presented by the Admin brand or Living Soil
      Labs, then add the approved non-sale research presentation to the website.
- [ ] Complete exact BLVNK model/fabric/color/sample/cost and local-decoration approval
      before any product, inventory, checkout, or shipping launch.

## App Store and final release

- [~] Release scripts, store graphics contracts, privacy/data-rights contracts, live URL
      checks, and dry-run build/go-no-go gates are implemented. Strict preflight correctly
      stops when protected native Sentry configuration is absent.
- [ ] Finish the approved GrowPathAI hat research presentation above before the final
      App Store/app-wide tightening pass, as requested; this does not block technical
      build preparation.
- [blocked] Obtain owner/legal decisions for final name, cannabis language, age rating,
            privacy/support/deep-link records, and listing copy.
- [blocked] Configure protected Apple, Google, and production Sentry credentials outside
            source control.
- [ ] Produce iOS and Android production builds and required device screenshots.
- [ ] Run physical-device smoke for auth, all workspaces, entitlement status,
      permissions, photo/video upload, notifications, offline/error states, and logout.
- [ ] Run the trusted release-machine batch and final go/no-go with real inputs.
- [ ] Complete App Store Connect and Play Console privacy/data-safety, age rating,
      pricing, compliance, review notes, release notes, and submission forms.
- [ ] Assign release, support, QA, and crash-monitoring owners; attach rollback/hotfix
      evidence and monitor review/production.

## Final acceptance

- [ ] All applicable automated gates, governed catalogs, security/configuration checks,
      production builds, role loops, external integrations, devices, accessibility, and
      independent validation pass without weakening a gate.
- [ ] Temporary test data and untracked production files are reconciled and approved
      cleanup is recorded.
- [ ] Final evidence records frontend/backend SHAs, production URLs, inspected deployment
      IDs, timestamps, accounts/roles, checks, failures/fixes, screenshots/video,
      external delivery, cleanup, and the final release decision.
