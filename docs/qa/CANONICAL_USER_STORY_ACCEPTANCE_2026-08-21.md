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
- B-02 writes are workspace-scoped, transactional, idempotent and append-only. Commercial
  owners and Facility Owners/Managers mutate; Facility Staff remain read-only and full-audit
  access follows the separate audit-read permission. Retained Facility compatibility routes
  enforce the same ledger instead of becoming a bypass.
- Missing private cost/currency remain unknown. Movement quantity agrees with its signed
  balance effect; relocation and status actions cover the selected full balance; used units
  cannot be rewritten; user-reported history dates remain distinct from server occurrence.
- Reviewed CSV imports retain mapping, conflict, version, attempt and row-checkpoint evidence.
  Item history has an explicit older-page path, and full audit export is bounded, formula-safe,
  origin-labeled and terminally complete. Local evidence is retained in
  `B02_CANONICAL_INVENTORY_LOCAL_EVIDENCE_2026-08-22.md`; production migration/deployment/live
  acceptance remain separate.

### B-03 — Small Business Desk

These eight acceptance slices remain one matrix row and carry no independent status. The
canonical roots are `/home/commercial/business-desk` and
`/home/facility/business-desk`; each tool returns to the active root. Launch access is
Commercial Owner and Platform Admin only in
their own selected Commercial workspace, plus a selected Facility's `OWNER` or `MANAGER`.
Personal, Commercial staff, Facility `STAFF`/`VIEWER`, QA/validation identities and an Admin
outside the Admin-owned Commercial workspace are denied before private data loads.
Commercial AI charges the Commercial account; Facility AI charges the selected Facility.
Changing workspace, role or permission during a draft invalidates the action and requires a
fresh review. Deterministic calculation alone consumes no AI credit; only a deliberately
invoked provider-backed explanation, extraction or Ask request does.

Local construction or focused tests for an individual slice do not satisfy this section.
B-03 remains open until the combined role, persistence, failure/retry, provider/AI where
applicable, deployment, and live evidence is recorded against the matrix row.

Across every slice, money uses exact minor-unit/decimal math in one reviewed three-letter
currency, visible formulas and half-away-from-zero component boundaries. No FX is inferred.
Private contacts, locations, receipts, cash and costs remain field/record scoped; attachment
sources are protected, validated, quarantined and disclosed for AI use; stored document text
cannot instruct the model or tools. Saves, exports and provider handoffs are confirmed,
idempotent and audited; a stateless unsaved calculation needs no artificial business record.

#### B-03.1 — Price, margin and break-even (`/price-margin`)

- Visible inputs and formulas evaluate one explicit sales scenario at the requested positive
  `quantityMicros` and produce line totals, gross profit, markup and gross margin. Business
  fees and fulfillment/shipping cost are whole-scenario costs; customer shipping is
  whole-scenario revenue; and the fixed discount applies once to the scenario. None is
  silently recast per unit.
- Scenario `contributionMinor` is pre-tax customer revenue after discount and including
  customer shipping, minus extended direct cost, business fees and fulfillment/shipping
  cost. Break-even repeats that exact scenario with a BigInt-safe positive ceiling and
  reports `salesScenarios`, total `quantityMicros`, `contributionMinor`, and `revenueMinor`.
  Missing direct cost or missing/non-positive contribution stays explicitly incomplete;
  zero revenue/cost keeps the applicable ratio undefined.
- Break-even is a mode of this tool, not a ninth tool. GPT may explain the deterministic
  result and assumptions but never supplies a missing amount, currency, quantity or rate.
- Acceptance covers initial/valid/invalid/incomplete states, currency minor-unit rounding,
  rejected cross-currency inputs, scenario reset and no persistence/audit side effect until
  the eligible user explicitly saves a named scenario.

#### B-03.2 — Quote / estimate (`/quotes`)

- A user creates and reloads a reviewed customer/project quote with products/services,
  labor/materials, known direct costs, discount, fees/shipping, explicit tax, requested
  deposit, terms, expiry, assumptions and exclusions. The UI distinguishes markup/margin,
  quote total, requested deposit and provider/user-confirmed prior payment.
- The customer total is rounded customer-facing line subtotal minus reviewed discount plus
  customer shipping and explicit user-entered or authorized-provider tax. Customer-facing
  fees are priced lines; internal business/payment fees and fulfillment/shipping cost affect
  estimated gross profit but are not silently billed to the customer.
- Export/copy is always available after review. Editing after export or handoff creates an
  immutable next revision. Draft, reviewed, exported, provider-draft, expired, superseded
  and cancelled are distinct and never imply an accepted contract or payment.
- Optional merchant-owned Stripe Connect uses provider-hosted onboarding and never the
  GrowPath subscription merchant account. A separate confirmation may create only an
  idempotent **draft** invoice/payment request pinned to the exact revision, amount and
  currency. GrowPath does not send, finalize, apply automatic tax, collect, refund, create a
  payment link or change stock.
- A verified provider payment object atomically claims one payment-evidence chain per
  workspace. A different provider event cannot bind that object to another manual payment
  chain, and corrections/voids cannot cross provider objects or double-count value.
- Acceptance covers copy/export, `DISCONNECTED`/`TEST`/`LIVE`/`REVOKED` connections,
  cancel/retry,
  permission changes, provider failure, signature-verified duplicate/out-of-order webhooks
  and reload. Only provider/user evidence may report later provider status.

#### B-03.3 — Lead follow-up (`/leads`)

- The eligible user creates, edits, archives and reloads a minimal voluntary opportunity
  containing person/business, contact details, interest, estimated value, source, status,
  last contact, next action/date, notes and related authorized records.
- GPT may summarize recorded contact, identify a missing follow-up and draft the next message
  for review. It never fabricates communication, infers protected/sensitive traits, scores a
  person from those traits or contacts anyone.
- Acceptance covers all named statuses, missing/overdue next action, sensitive-field denial,
  archive/retention/export, duplicate submission and a malicious note treated only as data.

#### B-03.4 — Job notes (`/jobs`)

- The eligible user creates, edits, archives and reloads customer/request, relevant private
  location, scope, schedule, status, assignee, notes, protected attachments, related quote,
  external provider reference and completion notes.
- GPT converts only recorded intake/meeting evidence into proposed scope, tasks, materials,
  owners, dates, customer update or completion summary. Review precedes every assignment,
  commitment or communication.
- Acceptance covers named job states, date/time-zone behavior, attachment rejection and
  retry, permission change, exact quote/provider link, draft retention after error and PII-
  redacted export/audit presentation.

#### B-03.5 — Expense / receipt helper (`/expenses`)

- Photo/PDF/manual input enters private quarantine that expires within 24 hours after cancel
  or abandonment, file safety review, workspace-
  local digest duplicate review and schema-validated extraction. Vendor, date, amount,
  readable items, explicitly shown tax, proposed category and optional related record remain
  drafts until the user reviews and confirms them.
- Search, date/category filter, totals and formula-safe export use only saved records. GPT may
  explain spending patterns but never determines deductibility or presents bookkeeping/tax
  advice.
- Acceptance covers malformed/mislabeled/oversize/encrypted/malicious files, low confidence,
  missing fields, prompt injection, cancel/expiry, duplicate isolation across two similarly
  named workspaces, no save before confirmation and retention/delete/export.

#### B-03.6 — Vendor compare (`/vendors`)

- The user records comparable vendor, item, quantity, unit price, shipping, fees, explicit
  tax/duty, minimum order, lead time, terms, availability, expiry and notes. Deterministic
  output distinguishes complete landed cost from a known-cost subtotal with missing inputs.
- GPT may explain cheapest, fastest, lowest-minimum and the user's stated tradeoffs. A
  reviewed purchase request is an output of this tool, not a ninth tool, and can never place
  an order.
- B-02 is the only inventory writer. The request cannot change quantity/cost/location/lot or
  receiving; `Received` requires a linked successful B-02 receipt/movement, otherwise an
  external/manual state is explicitly unverified. Acceptance proves those non-mutation and
  link boundaries through cancel/retry/reload.

#### B-03.7 — Cash-flow snapshot (`/cash-flow`)

- The eligible user selects explicit owner entries, authorized provider evidence, an owner-
  selected quote expectation and reviewed expense/bill drafts with source time, expected
  date, recorded/expected state and currency. A quote is never expected cash merely because
  it exists; current cash is owner-only.
- Deterministic 30/60/90-day views show recorded amounts, expected net movement, assumptions,
  stale/missing sources and separate currencies. No FX, ML forecast, bank balance, payment,
  expense or sale is invented.
- Acceptance covers empty/incomplete/stale/conflicting inputs, overdue/upcoming boundaries in
  the workspace time zone, source removal, permission denial and reload/export without
  exposing cash to an unauthorized role.

#### B-03.8 — Business Ask AI (`/ask-ai`)

- Ask retrieves only permission-filtered Desk records and authorized read-only B-02 evidence,
  links sources and a clearly labeled UTC last-updated date range, labels incomplete KPI
  output and separates facts, calculations, assumptions, forecasts and recommendations. The
  KPI snapshot is a view here, not a ninth product.
- Each citation first opens the operation-bound redacted projection actually supplied to AI.
  Any exact B-03 revision or current same-identity B-02 comparison is separately labeled and
  states that additional fields were not AI input. A saved assistant-draft history keeps older
  drafts reachable with exact operation/citation linkage and explicit review, rejection and
  archive actions; lifecycle review never rewrites AI content.
- Notes and extracted documents are untrusted evidence rather than instructions. AI may
  prepare a reviewed quote, follow-up, job update, purchase request or task draft but cannot
  contact, assign, export, hand off, order or mutate B-02 without the separate authorized
  confirmation for that destination.
- Acceptance uses two similar Commercial workspaces and two Facilities to prove retrieval,
  field-level cost/cash/PII filtering, Facility credit charging/refund, provider failure,
  source freshness, prompt-injection resistance, citation/draft recovery and no write from an
  answer alone. It also proves confirmed Commercial deletion erases account-owned B-03 content
  after protected-storage cleanup while Facility-owned evidence remains with deleted actor and
  reviewer references deidentified, unless a preservation hold blocks the action.

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
  management. Gift subscription is required for release, but stays disabled until purchaser
  checkout, recipient email, signed-out/cross-device claim, entitlement, recovery/expiry,
  refund/dispute, duplicate protection, migration/index, worker and live webhook acceptance
  all pass. Admin access does not substitute for a real recipient claim.
- R-02: email/device/in-app categories persist independently, suppress disabled delivery and
  open the exact record. Native receipt/tap behavior is accepted on real iOS and Android.

### R-03 and R-04 — Final acceptance and review

- R-03: an initial frozen frontend/backend candidate passes a complete route/action, role,
  populated/empty, persistence, responsive, theme, accessibility, security and visual crawl.
  Cleanup candidates are removed only after proving they are unreachable, superseded or
  duplicate across routes, imports, deep links, providers, workers, webhooks, migrations,
  fixtures and production-data compatibility. The resulting new frozen SHAs rerun affected
  gates and the complete crawl; only that post-cleanup pass is final release evidence.
- R-04: Roberto receives a separate reviewer identity, not owner credentials. Findings include
  route, role, evidence, expectation and proposed change; each is accepted/rejected explicitly,
  accepted work is previewed, and owner approval precedes production.

### R-05 and R-06 — Hats, then stores

- R-05: after product acceptance and reviewer work, exact BLVNK blank/fabric/color/sample/cost
  and decoration are approved. Execution stops at this gate until the owner resumes it.
  Every owner-selected Triple Bag-style direction is translated into GrowPathAI-only
  multi-view art with correct emblem placement, scale and rights. No TBG product or mark
  is listed or trialed. Approved GrowPathAI concepts may appear as zero-stock `Not for
sale` research trials; third-party marks remain excluded until separately cleared.
- R-06: App Store and Play Store work starts only after R-05. Credentials, Sentry, builds,
  physical-device smoke, privacy/data rights, listing metadata, submission and monitoring all
  pass without weakening release gates.
