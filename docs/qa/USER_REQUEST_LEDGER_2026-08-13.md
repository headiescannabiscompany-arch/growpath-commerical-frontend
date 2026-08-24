# GrowPathAI User Request Ledger

Date: 2026-08-13

Status: Reconciled against `main` at frontend `d6f39cdb` and the evidence linked from
`docs/qa/CANONICAL_REMAINING_WORK_2026-08-08.md`; P-08 additions were reconciled on
2026-08-24 against frontend PR `#784` and backend PR `#232` without marking their open live
acceptance complete.

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
      A 2026-08-13 Headies saved-run review deliberately did not publish the available
      candidate: the AI identity was only medium-confidence, no external botanical
      verification had been performed, confirmation was still required, and its exact
      saved location remained private and explicitly not shared. A reviewed, confirmed
      non-sensitive candidate is still required for the publication/withdrawal loop.

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
- [~] Live Studio now separates outside watch URLs from first-party GrowPath-hosted
      OBS broadcasting. The hosted path has reusable owner-isolated channels, per-plan
      and global concurrency limits, in-app player/chat, premieres, replay/retention
      hooks, private OBS chat overlay, one-time credentials, and confirmed stream-key
      rotation. Automated isolation proves two accounts never share a key and normal
      sequential broadcasts reuse the account's saved OBS connection. Cloudflare Stream
      activation/configuration and a real concurrent two-account OBS/playback/chat/
      replay/rotation/cost-limit production run remain.
- [x] Notification Center and Profile expose Device push plus Task, Forum, Video,
      Courses/Lives, Commerce, and Facility categories with persisted preferences.
- [~] Native cold-start/background notification routing and exact-record links are
      implemented. Frontend `5b1f69bb` normalized retained nested Facility Task
      notifications to `Task reminders`, `push eligible`, and exact task links in
      production; backend `6805fdd9` now preserves the in-app record and also sends
      assignment push when the assignee has a registered token and has not disabled
      push or task reminders. Both branch gates and both post-merge gates passed.
      Real iOS/Android receipt, opt-out suppression, and tap-through acceptance remain.
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
- [~] A confirmed Plant ID can open a reviewed crop-aware New Grow draft carrying
      common/scientific names, aliases, cultivar, source ToolRun, and separate lifespan,
      production-cycle, and dormancy planning. The exact frontend revision is live and
      correctly refused an unverified medium-confidence manual tomato candidate. A
      retained confirmed Headies result still must complete draft review, grow creation,
      reload/provenance verification, and temporary-grow cleanup.
- [ ] Complete the governed Plant ID evaluation pack: 320 reviewed slots, including
      owned/commissioned adverse images, exact rights, morphology, taxonomy, expected
      results, and approved use. Metadata-only candidates are not accepted evidence.
      A clean-main planning validation on 2026-08-13 passed with 320 allocated slots,
      46 governed case definitions, zero contract errors, zero reviewed media records,
      and 48 retained blockers. The strict review/promotion inputs were absent from the
      clean worktree, so no catalog write or false promotion was attempted.

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
- [x] Canonical P-08 now defines the requested private-video path correctly: roughly one
      temporary technical candidate per second, no more than 600 candidates for a video shorter
      than ten minutes, and at most 80 retained quality/diversity/timeline/byte-bounded JPEGs.
      Eighty is a ceiling rather than a target; rejected candidates are deleted and generic
      Plant ID/vision limits are unchanged.
- [x] The implemented Harvest contract explicitly records gland-head development and structural
      evidence separately from color: developing, intact/turgid, swollen, wrinkled, collapsed,
      ruptured, resin-exuding, fused, detached/missing and bare stalks, with repeated resolved
      advanced senescence. It never labels image evidence as biological death, oxidation,
      chemistry or potency.
- [x] Standard and Deep costs are defined before provider use: four-through-twelve unique images
      is one credit; thirteen-through-eighty is an accepted `ceil(unique / 12)` quote with
      durable batches, restore/replay and one signed all-or-nothing aggregate. Personal/free use
      needs sufficient credits but no second paid-plan gate.
- [x] Owner-selected retained frames can be privately saved/exported/shared in repeatable
      packages of at most 12 frames and 24 MiB, and a separate signed result can be shared as a
      sanitized readable summary. Neither action creates a public post/link or includes source
      video, rejected/unselected frames, GPS/EXIF, private IDs/URLs, provider IDs or secrets.
- [x] Saved-result deletion and unsaved Deep-result discard are separate confirmed lifecycles;
      source-video keep/delete choice, retained references, calibration/publication/legal holds,
      tombstones and truthful language that deletion/discard does not refund completed provider
      work are preserved. This does not change the pre-dispatch-failure refund rule.
- [ ] The max-80/Deep/structural/share/delete implementation passed local and CI gates in
      frontend PR `#784` and backend PR `#232`. Production receipt configuration, backend-first
      deploy/readiness/FFmpeg proof and one owner-authorized older-private-video live acceptance
      run remain. Exact scope and the no-rewrite rule are frozen in
      `P08_HARVEST_READINESS_CANONICAL_EVIDENCE_2026-08-24.md`.
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
      compliance, SOPs, reporting, roles, and access. Production now also verifies
      populated Grow, Plant, Journal, SOP comparison, and Owner-only AI Validation Lab
      states plus immutable lifecycle audit history. Temporary Inventory is deleted and
      the Compliance deviation resolved. Retained grow/plant/journal cleanup waits for
      a durable Cannabis grow context so Facility Harvest Readiness is not regressed;
      forced-403 and exported cross-role evidence also remain. See
      `docs/qa/FACILITY_POPULATED_WORKFLOW_PRODUCTION_EVIDENCE_2026-08-13.md`.

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
      owner mutation, reload, public visibility, and visual evidence remain. The
      signed-in Commercial route audit and frontend `161afbe9` repaired and live-verified
      the blank Batch Planner and duplicate Storefront/Grows/Discover headings; all
      audited route shells now load without visible errors. See
      `docs/qa/COMMERCIAL_ROUTE_REPAIR_PRODUCTION_EVIDENCE_2026-08-13.md`.

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

Owner decision, 2026-08-22: finish all pre-hat product work and the final crawl, then
stop before beginning hat execution. Hat work resumes only with the owner present. All
previous Triple Bag Genetics-style design directions are to be translated into a
GrowPathAI-branded collection. Triple Bag Genetics has no hat product, listing, research
trial, public advertisement, inventory or checkout scope unless the owner later confirms
that a separate company and its rights/ownership requirements exist.

- [x] Historical GrowPathAI and Triple Bag Genetics concept images, exact hashes, brand
      manifests, approved emblems, and a production brief are retained as design input;
      retained TBG material is not approval to make or publish a TBG product.
- [x] The owner approved the black Circuit Leaf GrowPathAI concept and the revised
      tonal-sage concept with a longer structured brim and small rear `GROWPATHAI` mark.
- [x] BLVNK HEADWEAR is recorded as the candidate blank-body source based on the retained
      supplier email; no exact model, fabric, cost, or production claim is invented.
- [x] A zero-stock, unpriced, non-checkout `Would you buy this at this price?` trial flow
      exists with Yes/Maybe/No, one revisable response per account, aggregate results,
      and explicit `not for sale` language.
- [ ] Complete the exact BLVNK blank specification first: model, construction, fabric,
      available color match, brim profile, sample, unit/sample cost, minimums, lead time,
      and local embroidery/decoration approval. This is the prerequisite for final hat
      mockups, meaningful price research, product records, inventory, checkout,
      production, or shipping.
- [ ] Translate every owner-selected Triple Bag-style concept into the complete
      GrowPathAI hat design set against the approved BLVNK blank. Produce accurate front,
      left, right, and rear views; use GrowPathAI-owned marks only; correct
      emblem placement, scale, colors, brim proportions, embroidery feasibility, and
      small rear wordmarks; retain approved source files and final review images.
- [x] Give the `admin@growpathai.com` Admin identity the governed Commercial toolset and
      use the Admin/GrowPathAI brand—not Living Soil Labs—to own and present GrowPathAI
      hat research. Backend PR `#156` (`f49fae1f`) and frontend PR `#558`
      (`a581c7d9`) grant the role-based platform Admin a distinct Commercial workspace
      without hardcoded-email or billing mutations. Live production acceptance on
      2026-08-13 showed `GrowPathAI Admin`, Personal and Commercial choices, and an
      empty separate Admin storefront (`Storefront not configured yet`, Draft,
      0 products), proving it is not Living Soil Labs or Triple Bag Genetics. Brand
      records, storefront content, trials, and analytics remain separated.
- [ ] Add all owner-approved, rights-cleared GrowPathAI hat concepts to the Admin-brand
      GrowPathAI website presentation as zero-stock, non-sale
      research listings. Show `Not for sale` prominently and provide no checkout,
      inventory claim, production promise, or shipping promise.
- [x] Remove Triple Bag Genetics hats from active product scope. Historical concepts stay
      private as design references; no TBG mark or third-party mark is carried into the
      GrowPathAI collection without separate verified rights.
- [ ] After the exact blank, final designs, brand ownership, and rights-cleared non-sale
      listings are complete, run owner-priced purchase-intent trials for every approved
      hat concept. Verify response, revision, aggregation, and close behavior while
      inventory remains zero and no item can be purchased.

## App Store and final release

- [~] Release scripts, store graphics contracts, privacy/data-rights contracts, live URL
      checks, and dry-run build/go-no-go gates are implemented. Strict preflight correctly
      stops when protected native Sentry configuration is absent.
- [ ] Stop at the hat gate after the final crawl. Complete the owner-directed GrowPathAI
      hat collection before beginning App Store/Play Store release work; technical build
      preparation may remain preserved but release execution does not begin.
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
- [~] The read-only production Admin inventory now identifies 38 exact synthetic
      QA/Codex/smoke/demo candidates and a protected-account boundary in
      `docs/qa/PRODUCTION_TEST_ACCOUNT_CLEANUP_PLAN_2026-08-13.md`. The live Admin API
      still needs an allowlisted, audited anonymization operation; production mutation,
      protected-record regression proof, remaining temporary data, and untracked-file
      reconciliation remain open. Suspend or Ban is not counted as cleanup.
- [ ] Final evidence records frontend/backend SHAs, production URLs, inspected deployment
      IDs, timestamps, accounts/roles, checks, failures/fixes, screenshots/video,
      external delivery, cleanup, and the final release decision.
