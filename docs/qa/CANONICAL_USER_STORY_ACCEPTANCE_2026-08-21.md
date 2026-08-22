# GrowPathAI canonical user-story acceptance

Updated: 2026-08-21

This document defines acceptance scenarios for the IDs in
`CANONICAL_PRODUCT_ACCEPTANCE_MATRIX_2026-08-21.md`. The matrix alone owns status and
execution order. This file is not a second todo list.

Unless a story explicitly narrows the rule, acceptance includes its correct visible entry,
canonical route, Back path, loading/empty/error/populated states, permitted and prohibited
roles, persistence after reload, duplicate-submit protection, appropriate Day/Night/Auto and
responsive behavior, and no console/application error.

## Personal and grow workflows

### P-01 — Personal home

- A Personal user sees active-grow context, frequent actions and the intended six-card mix:
  three eligible Commercial promotions, one Facility educational item, one course and one
  popular Forum item when inventory exists.
- Selection rotates fairly without showing ineligible/private/cannabis-specific material to
  an account whose interests do not allow it; sparse inventory produces an honest layout.
- Every card opens the named record and returns to Home without losing state.

### P-02 — Crop-aware grows

- A user may start with a reviewed crop, a Plant ID, an imported device/file or an explicit
  unknown crop; no invented crop or lifecycle is required.
- Supported crops use sourced lifecycle, annual/biennial/perennial behavior, fruiting or
  harvest periods and appropriate stages; unsupported crops remain editable and transparent.
- Photos, journal, tasks, environment history, rooms/devices, timeline, archive and export
  remain attached to the same grow after reload.
- Archive is an explicit, reversible owner action rather than deletion. Active lists and
  active-grow plan limits exclude archived records; an Archived Grows surface explains that
  history is retained and restores only when the user's current plan has capacity. Archived
  grows cannot be silently edited as if active, and another user receives no existence leak.

### P-03 through P-06 — Plant ID branches and privacy

- P-03: uploaded photo/video evidence produces a standalone saved candidate with common,
  scientific and alternate names when supportable, uncertainty, counter-evidence, missing
  evidence and requested follow-up views. It requires no Grow, Field Study or public pin.
- P-04: a resolved candidate may open a prefilled Create Grow draft. The draft identifies its
  Plant ID source; review and explicit save are required; cancel creates nothing.
- P-05: Nature publication separately requires an observation date, description, usable
  photos, private source location and explicit opt-in. The public point uses the selected
  privacy precision, reloads with its media/card and can be withdrawn.
- P-06: saving or creating a Grow never publishes. Same-date or nearby records never supply
  location. House/potted records stay private unless individually selected for publication.

### P-07 through P-09 — AI evidence and diagnosis

- P-07: every media-capable AI tool identifies which originals and derived views it inspected,
  preserves useful detail, permits full-size review/export, separates observations from
  inference and asks for the smallest useful next evidence set.
- P-08: Harvest Readiness accepts ordinary phone media without requiring microscopy, reports
  visible-sample clear/cloudy/amber ranges plus unreadable/glare share, distinguishes trichome
  heads from plant pigmentation, weighs swelling/pistils/date/aroma and explains both harvest
  and wait evidence. A Grow is optional.
- P-09: Diagnosis and IPM rank multiple hypotheses, distinguish pests, residue and disease,
  show supporting/counter evidence and request decisive follow-ups before high confidence.
  Treatment guidance respects crop, label, jurisdiction and escalation boundaries.

### P-10 — Grow timeline

- Personal and Commercial users can open a chronological, photo-forward timeline from a Grow,
  zoom the time scale and expand points for notes/readings/actions/evidence.
- Private view, revocable viewer link and viewer-friendly export are distinct actions. Shared
  output excludes private fields and remains understandable without the editor interface.

### P-11 — Personal profile

- The user can see the real plan, credits, storage and workspace, manage billing or cancel where
  supported, configure notification categories and theme, export/delete data, log out and
  switch authorized workspaces.
- Current-plan UI never offers a misleading same-plan upgrade; destructive actions require
  confirmation and show their effect.

## Community, media, courses and discovery

### S-01 — Forum and Q&A

- Users can discover, create, view, comment, follow and report eligible posts with photo/video
  media; notifications open the exact post/comment and are not rendered as task cards.
- Moderation, visibility, cannabis-interest and workspace rules apply consistently to lists,
  direct URLs, notifications and shares.

### S-02 and S-03 — Videos

- Public, Following and My Library tabs are reachable from Forum and relevant discovery
  surfaces, with creator/storefront/course context, comments, follow, report and share.
- Owners see storage used/allotted before upload and can upload, edit interests/visibility,
  attach/detach a course, publish/unpublish/archive and reopen the exact saved record.
- An outside-user loop proves discovery, playback, follow/comment/report permissions and the
  truthful empty Following state.

### S-04 and S-05 — Lives and premieres

- The directory separates upcoming, live and replay/premiere states and offers player volume,
  creator follow, chat, share, interruption and honest empty states.
- Outside URLs use provider-specific embed or handoff behavior. GrowPath-hosted sessions use a
  reusable owner-isolated OBS/encoder channel with revocable private ingest credentials,
  explicit draft/go-live/stop, signed playback, GrowPath chat/overlay, quotas and retention.
- Two-account concurrency proves inputs, keys, chat and playback never cross accounts; replay
  and cleanup behavior is exercised after stopping.

### S-06 — Sharing

- Videos, Lives, AI results, journals, timelines, Forum posts and Nature observations expose
  only appropriate internal-feed and external-share actions.
- Shared links open a stable viewer route with preview metadata. Copy/native share and reviewed
  direct targets do not claim unsupported cross-posting or transmit private data.

### S-07 — Courses

- Authors can create, edit, add/reorder lessons and media, preview, publish/unpublish/archive
  and reopen a course. Optional list/banner art and opened-course hero art have a deliberate,
  nonduplicated hierarchy.
- Free and paid learners see clear labels, enrollment/checkout return behavior, lesson access
  and progress; unauthorized users cannot edit or bypass payment/access.

### S-08 — Discover

- Discover has labeled storefront, course, video, Forum, Live and Discovery Nature sections
  with filters and correct deep links, not duplicate primary navigation.
- The compact Nature preview remains meaningful at zero pins and shows photo-backed public
  observations when populated.

## Commercial and Facility

### C-01 through C-05 — Commercial

- C-01: Commercial retains applicable Personal Grows, AI, Forum, Discover, Courses and Profile
  capabilities while adding brand/storefront tools.
- C-02: an owner manages identity, media, slug, sections, contacts, social/external links,
  public location precision and publication; viewer/staff permissions are narrower.
- C-03: products preserve images, inventory and pricing. Each legal capability—information,
  inquiry, external handoff, reservation, checkout, pickup, delivery, shipping/import/export—
  is independently granted by current seller/product/origin/destination/buyer evidence.
- C-04: courses, content, campaigns and analytics live under coherent entries and do not create
  duplicate Products/Feed navigation.
- C-05: Platform Admin can enter a separately identified Admin-brand Commercial workspace
  without losing Admin authority or editing another brand accidentally.

### F-01 through F-07 — Facility

- F-01: Owner creates/imports rooms, grows and plants, invites members and assigns roles; all
  records retain facility/workspace ownership and audit history.
- F-02: assignments link directly to the required task/SOP/record, permitted staff can attach
  evidence and complete it, and owner history persists; Viewer cannot mutate.
- F-03: SOP and compliance cover approval, assignment, execution, compare, evidence,
  exceptions, corrective action and immutable audit history with working action links.
- F-04: Facility exposes every applicable AI tool, including Harvest Readiness, with Facility
  context, Facility credits and role-appropriate writes.
- F-05: inventory, transfers, reports, logs/journals and exports have one intended location,
  populated and empty states, Back paths and scoped data.
- F-06: controller/sensor setup accepts reviewed API credentials or imports, previews mapping,
  lets users map devices to rooms, imports history idempotently and never exposes keys.
- F-07: Owner/Admin can reach social, course and storefront capabilities through an explicit
  owner surface; operational staff navigation stays focused.

## Business operations

### B-01 and B-02 — Foundation and one inventory engine

- B-01: business records use only the organization, location, role, approval and audit
  scope required for the selected action. A solo owner may use a calculator without fake
  Facility/location setup. Similar names never cross account boundaries.
- B-02: one coherent engine owns product/SKU, lot/batch, unit, location, quantity, status,
  authorized cost, receiving, movement, adjustment, transfer, hold, consumption, source
  freshness, duplicate/conflict review, simple alerts and export. Nursery/store B-04 and
  Facility B-05 consume this engine instead of building parallel inventories.

### B-03 — Small Business Desk

- Price & Margin shows deterministic markup, margin, gross-profit and break-even math with
  visible inputs/formulas; GPT explains but never supplies a missing number.
- Quote / Estimate calculates reviewed totals and drafts scope, assumptions and exclusions;
  it never invents cost, tax or terms. The owner may export or hand off a reviewed quote to
  an authorized invoice/payment provider.
- Lead Follow-up stores a minimal voluntary opportunity record and drafts the next action
  without fabricating communication, profiling people or contacting anyone automatically.
- Job Notes turns recorded intake, meeting notes and attachments into proposed scope,
  tasks, materials, updates and completion notes; review precedes assignment or commitment.
- Expense / Receipt Helper extracts schema-validated draft facts from photo/PDF/manual
  evidence with source and duplicate status; the owner reviews before save or export and
  receives no tax-deductibility claim.
- Vendor Compare deterministically compares landed/effective cost and recorded tradeoffs;
  it may create a reviewed purchase request but never places an order. B-02 owns receiving.
- Cash-Flow Snapshot separates recorded and expected amounts in user-selected 30/60/90-day
  scenarios and never invents a balance, payment, expense or sale.
- Business Ask AI answers only from authorized Desk and B-02 records, links sources/date
  range, labels incomplete metrics and separates facts, calculations, assumptions,
  forecasts and recommendations.

All eight tools reuse calculator, document-extraction, business-record assistant and
reviewed draft/action engines. They do not expand into full CRM, accounting, ERP, payroll,
tax, HR, legal, POS, procurement, dispatch or autonomous operations.

### B-04 through B-09 — Domain extensions and acceptance

- B-04 horticulture intake/care/fulfillment and B-05 Facility operations extend shared
  records and B-02 inventory rather than duplicating them.
- B-06 creator essentials, B-07 truthful external commerce handoff and B-08 evidence/
  approval/redaction/audit rules keep every business action human-controlled.
- B-09 acceptance covers cross-organization roles, stale/conflicting/duplicate imports,
  evidence gaps, retries, permission changes and public-sharing privacy.

## Nature, Admin, payments and release

### N-01 through N-04 — Discovery Nature

- N-01: globe/list modes support zoom, clusters, search and filters; pins open photo/date/
  description/identity cards and zero pins is explicit.
- N-02: Discover contains a smaller preview that opens the full Discovery Nature experience.
- N-03: exact private coordinates remain private, public precision is explicit, protected
  species and cannabis visibility rules hold, and user identity is not leaked.
- N-04: legacy Cary/Maydale records remain private unless the owner individually reviews and
  republishes a defensible, nonduplicate result with a known place. Their recovery is optional
  and does not block future Nature pins. House records, duplicates and unresolved identities
  are excluded without inferring location from date, proximity or filenames.

### A-01 through A-05 — Admin and session isolation

- A-01: one Admin control center summarizes accounts, reports, moderation, security, billing,
  content and system queues with tallies and exact deep links; contextual admin controls also
  appear on the governed record.
- A-02: authorized Admin can investigate, assign, note, resolve/reopen and see retained audit,
  account and content context without silently deleting evidence.
- A-03: security findings expose severity, status, owner, safe evidence and remediation without
  secrets; resolved findings leave an audit trail.
- A-04: emergency and lawful requests use documented preservation, identity/authority review,
  minimization, approval, disclosure and audit procedures—never an improvised direct release.
- A-04: preservation is orthogonal to request status and never implies approval or disclosure.
  Approve/Disclose controls stay unavailable until the backend enforces the state graph,
  minimum-scope manifest, chain of custody, recipient/method record, dual review where
  required, and retained audit defined in
  `ADMIN_SAFETY_AND_LAWFUL_REQUEST_CONTRACT_2026-08-21.md`.
- A-05: Free, Pro, Commercial, Facility roles and Admin remain isolated across login, expiry,
  reload, logout and workspace switching, including direct URLs and cached navigation.
- A-05: hard logout and identity-to-identity login clear preferred mode, account-mode state,
  Facility selection/list and dormant workspace-session keys before another identity renders.

### R-01 and R-02 — Money and notifications

- R-01: subscriptions, paid courses and authorized products cover success, cancel, failure,
  duplicate attempt, webhook reconciliation, entitlement, receipt, refund/return and account
  management. Gift subscription stays disabled until its policy and lifecycle are complete.
- R-02: email/device/in-app categories persist independently, suppress disabled delivery and
  open the exact record. Native receipt/tap behavior is accepted on real iOS and Android.

### R-03 and R-04 — Final acceptance and review

- R-03: one frozen frontend/backend candidate passes the complete route/action, role,
  populated/empty, persistence, responsive, theme, accessibility, security and visual crawl
  with genuine screenshots/video tied to evidence.
- R-04: Roberto receives a separate reviewer identity, not owner credentials. Findings include
  route, role, evidence, expectation and proposed change; each is accepted/rejected explicitly,
  accepted work is previewed, and owner approval precedes production.

### R-05 and R-06 — Hats, then stores

- R-05: after product acceptance and reviewer work, exact BLVNK blank/fabric/color/sample/cost
  and decoration are approved; GrowPathAI and TBG multi-view art has correct emblem placement,
  scale and rights. Approved concepts may appear as zero-stock `Not for sale` research trials;
  third-party marks remain private until cleared.
- R-06: App Store and Play Store work starts only after R-05. Credentials, Sentry, builds,
  physical-device smoke, privacy/data rights, listing metadata, submission and monitoring all
  pass without weakening release gates.
