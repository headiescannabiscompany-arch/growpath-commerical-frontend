# Small Business Desk (B-03) method

GrowPathAI's Small Business Desk helps an authorized business operator turn known records
into a calculation, comparison, explanation, or reviewed draft artifact. It is not a CRM,
bookkeeping ledger, ERP, payroll system, tax service, project-management suite, or
autonomous business operator.

The canonical workflow is:

**enter or select authorized records → calculate or extract → explain or draft → review →
save, export, or hand off**

## Exact B-03 surface

B-03 ships exactly these eight tool IDs, in this order:

1. `price-margin-break-even`
2. `quote-estimate`
3. `lead-follow-up`
4. `job-notes`
5. `expense-receipt`
6. `vendor-compare`
7. `cash-flow-snapshot`
8. `business-ask-ai`

The canonical roots are `/home/commercial/business-desk` and
`/home/facility/business-desk`. In the same order as the tool IDs above, their route
subpaths are `/price-margin`, `/quotes`, `/leads`, `/jobs`, `/expenses`, `/vendors`,
`/cash-flow`, and `/ask-ai`.

Break-even is a mode inside Price & Margin, not a ninth tool. Purchase Request is an output
of Vendor Compare, the KPI snapshot is a view inside Business Ask AI, and the
invoice/payment-provider draft is a reviewed Quote & Estimate handoff. Alternate labels,
routes, or provider actions must not create additional B-03 tool registrations.

## Workspace access and credit ownership

- In a Commercial workspace, access is limited to that workspace's Commercial owner and a
  Platform Admin acting in the admin account's own selected Commercial workspace. Platform
  Admin status alone never grants ambient access to another tenant's business records.
- In a Facility workspace, the request must name the selected Facility and the account must
  have an active `OWNER` or `MANAGER` membership in that Facility.
- Personal workspaces and Facility `STAFF`, `VIEWER`, and `QA` roles are denied. A route,
  client-supplied role, record identifier, or remembered workspace must not widen access.
- A calculator may run in an otherwise eligible Commercial or selected Facility workspace
  without a store, location, or approval chain. It must not fabricate a Facility, location,
  membership, approval, customer, vendor, or saved business record to satisfy a schema.
- Manual entry and deterministic calculation alone consume no AI credit. Only an actually
  invoked provider-backed explanation, extraction, drafting, summarization, or Business Ask
  AI call consumes the Commercial account's credit wallet in its Commercial workspace, or
  the selected Facility's wallet in Facility scope. Never charge for merely viewing a saved
  calculation, silently fall back to another account or Facility, pool credits across
  tenants, or debit both scopes for one provider request.

Every read, search, save, export, attachment, and handoff is server-authorized against the
selected workspace. Record references are rechecked server-side; a related record from a
different workspace is rejected rather than copied into the current artifact.

## Four reusable engines

1. **Calculator engine:** deterministic quote totals, markup, margin, break-even, vendor
   cost, and cash-position math. Show formulas, inputs, units, rounding, currency, and
   incomplete inputs. GPT may explain results but never supplies a missing numeric fact.
2. **Document extraction engine:** receipt, invoice, vendor quote, and customer-request
   media become schema-validated staged fields. Preserve the source, extraction status,
   confidence, missing fields, content digest, and duplicate warning. Review is required
   before any business record is created or changed.
3. **Business-record assistant:** summarize and answer questions only from authorized,
   workspace-scoped records. Separate facts, calculations, assumptions, scenarios, and
   recommendations; cite the record and date range behind each material claim.
4. **Draft/action engine:** prepare a quote, follow-up, customer update, job note, purchase
   request, or payment-provider draft handoff. Nothing is sent, assigned, purchased,
   published, finalized, or written to an external system until the user reviews and
   confirms the exact revision and action.

These are shared engines, not separate AI implementations. Each tool is a bounded schema
and screen over one or more engines:

**source input → structured draft → schema validation → deterministic calculation where
applicable → human review → audited save, export, or provider handoff**

Model output is never the saved business record. A provider response is never evidence that
the local save succeeded, and a local save is never evidence that a provider accepted an
action.

## Money, currency, and deterministic calculation contract

- Each saved artifact has exactly one explicit ISO 4217 three-letter currency. Unknown
  currency remains unknown; do not assume USD. Cross-currency totals and comparisons are
  blocked until the user supplies a reviewed conversion outside this B-03 contract.
- Persist money as signed integer minor units using the configured exponent for that
  currency. Reject monetary input with unsupported precision instead of silently truncating
  it. Keep quantities and rates as validated decimal values, not binary floating-point
  money.
- Extend each line with decimal arithmetic, round the line once to the nearest minor unit
  using half-away-from-zero, and sum the rounded lines. Round only a final derived display
  ratio to two decimal percentage points. Stored rate inputs use basis points; reject a
  target margin at or above 100% and any invalid denominator.
- `gross profit = recognized quote revenue - known direct cost`.
- `gross margin % = gross profit / recognized quote revenue × 100`.
- `markup % = gross profit / known direct cost × 100`. Markup and margin are never
  interchangeable, and an incomplete direct cost produces an incomplete profit metric
  rather than zero.
- Price/Margin evaluates one explicit sales scenario at the requested positive
  `quantityMicros`. It extends unit price and known unit direct cost across that quantity.
  Business fees and fulfillment/shipping cost are costs for the whole scenario; customer
  shipping is whole-scenario revenue; and the fixed discount is applied once to the whole
  scenario. None of those four values is silently converted to a per-unit amount.
- The scenario's `contributionMinor` is its pre-tax customer revenue, including customer
  shipping and after the reviewed discount, minus extended direct cost, business fees and
  fulfillment/shipping cost. Break-even repeats that exact scenario. It calculates
  `salesScenarios = ceil(fixedCostsMinor / contributionMinor)` with BigInt-safe ceiling
  division and a positive contribution. Total `quantityMicros` equals `salesScenarios`
  multiplied by requested `quantityMicros`; `revenueMinor` equals `salesScenarios`
  multiplied by scenario pre-tax customer revenue.
  Report `salesScenarios`, total `quantityMicros`, `contributionMinor`, and `revenueMinor`.
  Missing direct cost or missing/non-positive contribution makes break-even incomplete with
  an explicit reason instead of inventing a result. Desired-margin price is known direct
  unit cost divided by `(1 - target margin)`.
- Quote subtotal is the sum of rounded customer-facing line extensions, including any
  customer-facing fee represented as a priced line. The displayed customer total is
  `subtotal - reviewed discount + customer shipping + user-entered or authorized imported
tax`. Whole-quote business/payment fees and fulfillment/shipping cost are internal known
  costs used for estimated gross profit; they are not silently added as customer charges.
  The UI shows every component and its source. GrowPathAI does not select a tax rate or
  determine taxability.
- Vendor landed cost is `rounded item extensions + reviewed shipping + reviewed fees +
explicit tax + explicit duty - reviewed discount`; effective unit cost divides that value
  by a positive quantity. It may be called landed cost only when every applicable component
  is present; otherwise show a known-cost subtotal and the missing components.
- A cash-flow scenario is `opening recorded cash + authorized expected incoming -
authorized expected outgoing` for the selected 30-, 60-, or 90-day window. Expected,
  overdue, and recorded values remain visibly distinct. It is a scenario, not a bank balance
  or ML forecast.

Every result retains the inputs, currency, formula version, rounding rule, calculation time,
and missing-input list so a later revision can be reproduced.

## Shipping tools

### 1. Price, margin and break-even (`price-margin-break-even`)

Accept known unit direct cost, unit selling price, a requested positive `quantityMicros`,
the reviewed percentage-then-fixed discount, whole-scenario business fees,
fulfillment/shipping cost, customer shipping, fixed costs, and desired margin. Break-even
mode repeats this exact scenario and shows gross profit, markup, gross margin,
`contributionMinor`, `salesScenarios`, total `quantityMicros`, `revenueMinor`,
desired-margin price, and user-selected scenario comparisons. Do not describe gross profit
as accounting, tax, or net profit.

### 2. Quote and estimate (`quote-estimate`)

Store customer or project, products/services, quantities, labor, materials, known unit
costs, markup or target margin, discounts, user-entered or authorized tax, deposit, notes,
terms, exclusions, and expiration. Produce visible deterministic totals, estimated gross
profit where cost is complete, assumptions, scope draft, and immutable revision history.
Never invent tax, cost, contract language, acceptance, or payment state. A reviewed revision
can always be copied or exported and may optionally create a provider-owned draft under the
provider handoff contract below.

### 3. Lead follow-up (`lead-follow-up`)

Store only voluntarily supplied practical information: person/business, contact details,
interest, estimated value, source, status, last contact, next action/date, notes, and related
GrowPath records. Statuses are `New`, `Contacted`, `Quote requested`, `Quote sent`,
`Considering`, `Won`, `Lost`, and `On hold`. GPT may summarize recorded contact, draft a
follow-up, and flag a missing next action. It must not fabricate communication, contact
anyone automatically, infer sensitive traits, or score people using protected attributes.

### 4. Job notes (`job-notes`)

Store customer, request/job, relevant location, scope, schedule, status, assignee, notes,
photos/attachments, related quote, external invoice/payment reference, and completion notes.
Statuses are `Requested`, `Estimating`, `Approved`, `Scheduled`, `In progress`, `Waiting`,
`Complete`, and `Cancelled`. GPT may turn recorded intake or meeting notes into proposed
scope, tasks, materials, owners, dates, follow-ups, decisions, open questions, customer
updates, and completion summaries. Review is required before any commitment or assignment.

### 5. Expense and receipt helper (`expense-receipt`)

Accept a receipt photo, invoice image/PDF, or manual entry. Stage vendor, date, amount,
readable items, explicitly shown tax, suggested category, and optional related grow,
Facility, job, project, asset, or B-02 receiving reference. The authorized user reviews every
field before save. Provide search, totals, date/category filtering, and export. Do not
determine tax deductibility or replace bookkeeping.

A blank tax field means the source tax is unknown, not zero. Preserve that unknown state
through manual drafts, extraction review and apply, saved revisions, reload, calculations,
Business Ask projections, and exports. Store zero only when the operator or reviewed source
explicitly supplies zero; never infer tax from the total, item lines, category, or locale.

### 6. Vendor comparison (`vendor-compare`)

Capture vendor, item, quantity, unit price, shipping, fees, discount, explicitly supplied
tax/duty, minimum order, lead time, terms, availability, expiration, and notes.
Deterministically show effective unit and complete landed cost or a known-cost subtotal,
price/quantity differences, and missing inputs. GPT may explain cheapest, fastest,
lowest-minimum, and user-stated tradeoffs. Its optional Purchase Request output moves through
`Needed`, `Reviewing`, `Approved`, `Ordered`, `Received`, or `Cancelled`; GrowPathAI never
places the order. Verified `Received` is derived only from a linked successful B-02 receipt/
movement; an outside/manual report remains explicitly unverified.

### 7. Cash-flow snapshot (`cash-flow-snapshot`)

Use only user-entered or authorized imported current cash, expected incoming/outgoing,
overdue payments, and upcoming bills. Show recorded versus expected amounts, assumptions,
expected net movement, and selected 30/60/90-day scenarios. GPT may explain tight periods
and material drivers. Do not invent balances, payments, expenses, or sales, and do not use
an ML forecast without a separately approved contract and sufficient consented history.

### 8. Business Ask AI (`business-ask-ai`)

Answer questions across an explicit selection of the seven saved B-03 record kinds—Price &
Margin scenarios, Quotes, Leads, Jobs, Expenses, Vendor Comparisons/Purchase Requests, and
Cash-Flow Snapshots—and an independent explicit opt-in to read-only B-02 inventory items and
lots. The date range selects records by their last-updated time; the interface must say that
instead of implying that it filters an invoice, job, harvest, or transaction date.

The server builds one bounded, redacted source manifest inside the active workspace, freezes
the exact provider input and full selected manifest before dispatch, and retains SHA-256
attestations for the provider input, manifest, provider output, and normalized result. The
answer may cite a subset of the selected manifest, but every material answer, fact,
calculation, assumption, scenario, and recommendation must cite one or more exact selected
source IDs. The client withholds all material result text until the server attestation matches
the result digest, selected-source count, and citation metadata.

A citation first opens the operation-bound, redacted provider projection that the server
actually supplied to Business Ask. The citation endpoint verifies the result, provider-input,
and source-manifest snapshots and digests, requires that the cited ID belongs to the normalized
answer, and returns only that one projection. A separate authorized comparison may open the
exact immutable B-03 revision used by the answer, or the same B-02 item/lot identity in its
current mutable state. The comparison must say that fields outside the provider projection
were not used by AI; B-02 inventory may have changed since the cited source date, and a lot
remains bound to its attested parent item. No nearby, current, or similarly named record may
be substituted for the cited evidence.

Business Ask creates only a workspace-scoped assistant draft. It never performs the proposed
action. Saved drafts remain reachable through a paged history, retain their exact provider
operation and citation linkage, and support explicit review, rejection, and archive with
version-conflict and retry handling. Reviewing or rejecting a provider draft changes only its
lifecycle evidence; it never silently rewrites the AI content or cited projection. A Facility
answer and its draft are shared Facility workspace records visible to authorized `OWNER` and
`MANAGER` roles, so the interface must disclose that boundary. Facility Business Ask never
sends or returns owner-only `currentCashMinor` or `projectedCashMinor`, even when the requester
is the Facility owner; those values remain in the deterministic authorized Cash-Flow view.
Commercial owner-only Business Ask may use its own authorized values.

Every response marks incomplete metrics, limitations, missing information, and truncated
source selection. Its KPI view may show only source-backed quotes, conversion, open leads,
jobs, provider-reported payments, outstanding drafts, B-02 warnings, purchases, expenses, and
estimated gross margin. A failed, unattested, insufficient, or partial query is never rendered
as a real zero or usable answer.

## Artifact lifecycle, revisions, and idempotency

- New artifacts start as `DRAFT`. A successful explicit review records `REVIEWED` for the
  exact immutable revision. Editing reviewed content creates a new `DRAFT` revision and does
  not rewrite or silently reuse the old approval.
- Copy and export record the exact revision, actor, time, format, and result. They do not
  imply delivery, customer acceptance, payment, purchase, assignment, or inventory change.
- Consequential saves and provider handoffs require a server-issued or validated idempotency
  key scoped to workspace, tool, artifact, revision, and operation. Replaying the same key
  and payload returns the original result; reusing it with a different payload is rejected.
- Mutations require the expected record version. A stale editor receives an explicit
  conflict and retains its draft for comparison. Cancellation or archive preserves history;
  routine cleanup never hard-deletes financial or action evidence.
- Background extraction and handoff jobs expose `QUEUED`, `PROCESSING`, `SUCCEEDED`,
  `FAILED`, and `CANCELLED` where cancellation is still safe. Retry creates or reuses the
  same operation according to its idempotency contract rather than duplicating an artifact.
- Provider-backed receipt extraction and Business Ask use a durable server operation. Before
  dispatch, reauthorize the same actor, workspace, and role; bind one exact credit reservation,
  provider model, prompt/schema versions, redacted provider input, and full source manifest.
  Recheck the authorization scope immediately before the credit claim and again before
  provider dispatch. A role downgrade, revoked membership, changed provider configuration,
  corrupt snapshot, or ambiguous prior dispatch fails closed and refunds a reserved credit
  where safe; it never silently redispatches.
- Client recovery stores only account-and-workspace-scoped opaque operation metadata and
  SHA-256 signatures. It never stores a raw Business Ask question, receipt content, extracted
  fields, source record, contact, or financial value. Server history remains the recovery
  source when local metadata is absent.

## Attachments, privacy, and hostile-document handling

- Collect the minimum customer, vendor, employee, and financial data needed for the selected
  artifact. Private contact details, receipts, costs, documents, notes, and provider IDs
  remain workspace-scoped and are excluded from Storefront, discovery, public copies, and
  unrelated AI context.
- Attachments move through `UPLOADING`, `QUARANTINED`, `READY`, `REJECTED`, and `DELETED`.
  Enforce configured type/size/count limits, verify media type from bytes, malware-scan before
  use, retain a content digest and owner/workspace binding, and serve only short-lived
  authorized URLs. Digest matching and duplicate lookup are workspace-scoped and never
  disclose that another tenant uploaded the same bytes. A rejected or deleted attachment is
  never sent to an AI provider.
- Receipt, PDF, image, OCR text, spreadsheet cell, URL, email, customer request, and vendor
  document content are untrusted data, not system or developer instructions. Ignore embedded
  requests to change policy, reveal secrets, browse, contact someone, execute code, follow a
  link, or widen record access. Extraction is bounded to the selected schema and authorized
  source; tool calls are selected by application policy, never document text.
- Preserve the untouched authorized source, digest, extraction provider/version, field-level
  confidence, missing fields, validation errors, duplicate status, and reviewer changes.
  Model output remains staged until reviewed. Do not place secrets or unnecessary personal
  data in prompts, logs, analytics, filenames, or audit summaries.
- Provider requests disable provider-side response storage, use a non-PII hashed safety
  identifier, disable provider retries for the durable dispatch, accept no model-selected
  tools, and require the approved strict structured-output schema. Images and PDFs are loaded
  only from the byte-verified `READY` attachment bound to this workspace and purpose. The
  provider receives the source bytes only after the explicit extraction action, never merely
  because the user uploaded or saved the attachment.
- Applying an extraction rechecks the exact normalized result digest, source content digest,
  `READY` lifecycle, saved Expense draft version, and retained attachment binding. It records
  the current human reviewer, reviewed values, confidence, validation issues, missing fields,
  duplicate status, and reviewer-change digests in one new immutable Expense revision.
- Workspace export and account-deletion requests cover B-03 records, provider operations,
  revisions, exports, and attachments. Absent an active preservation/legal hold, confirmed
  Commercial-account deletion releases protected storage and erases account-owned B-03
  content; only deidentified minimum security, billing, and deletion tombstones remain.
  Facility content remains owned by the Facility when an individual account is deleted, but
  that person's creator, updater, archiver, reviewer, requester, applier, and revision-actor
  references are deidentified. Active provider work is cancelled only before dispatch or is
  allowed to settle before deletion continues. These guarded privacy operations are the
  explicit exception to routine append-only history: they are lease-protected, transactional,
  idempotently retryable, and fail closed on storage uncertainty or preservation hold.
  Deletion of a local draft does not delete an external provider object; disclose the
  separation and retain only the minimum tombstone required by policy.
- Private quarantine for an upload cancelled or abandoned before confirmation expires and is
  deleted within 24 hours. Once the user confirms the source into a saved record, that source
  follows the saved record's retention, authorized deletion, legal-hold, and account-export
  rules rather than the abandoned-upload timer.

## Quote export and optional provider draft handoff

Copy and standard export are always available for an authorized reviewed quote revision,
whether or not a payment provider is connected. Provider integration is optional.

The only initial automated provider path is a merchant-owned Stripe Connect account that
has completed the reviewed connection flow. It must never use GrowPathAI's subscription
billing account/customer, platform operating account, or another merchant's connection.
Connection state is server-attested as `DISCONNECTED`, `TEST`, `LIVE`, or `REVOKED`; test
and live accounts, identifiers, objects, credentials, idempotency keys, and webhooks never
mix. A revoked connection disables new handoffs without erasing prior references.

GrowPathAI may create only a reviewed `DRAFT` invoice/payment-request artifact supported by
the merchant's connection. It never creates a Payment Link, auto-sends, finalizes, accepts a
quote, calculates tax, charges or marks a payment paid, creates a customer without reviewed
consent, or changes inventory.

The local handoff state machine is:

`LOCAL_ONLY → HANDOFF_READY → HANDOFF_PENDING → PROVIDER_DRAFT_CREATED`

`HANDOFF_PENDING` may instead become `HANDOFF_FAILED`; editing the reviewed quote makes its
prior handoff `SUPERSEDED`. A retry of the same reviewed revision uses the same provider
idempotency key and returns the existing external draft. A new quote revision requires a new
review and key. Persist the workspace, merchant connection, local quote/revision, operation,
provider object, request digest, and provider response correlation without storing provider
secrets in the artifact.

Provider webhooks are the truth for provider-side lifecycle and payment status, not local
buttons, redirects, or GPT. Verify the signature and merchant connection, deduplicate by
provider event ID, tolerate out-of-order delivery using provider object/version/time, and
fetch or reconcile the provider object when event order is ambiguous. Display external
states as provider-reported with observed time and freshness. A webhook may update the
external-status projection and audit record only; it must not finalize local terms, consume
stock, invent tax, or create a B-02 movement.

One verified provider payment object may claim exactly one local payment-evidence chain in a
workspace. Its first provider observation atomically claims that object whether it creates a
provider root or explicitly correlates a previously user-confirmed root; later corrections
and voids must stay on that same chain and object. A second event ID must never attach the
same provider object to another manual chain or cause the amount to be counted twice.

## B-02 linkage boundary

`business-inventory` is the only inventory, lot/batch, receiving, movement, adjustment,
hold, consumption, and audit-export method. B-03 stores references to B-02 records and reads
authorized B-02 projections; it does not copy balances, create a parallel stock field, or
perform an inventory mutation.

- Vendor Compare can create a reviewed Purchase Request. Verified `Received` is projected
  only from a linked successful B-02 receipt/movement. An outside/manual receipt report stays
  unverified and never receives stock; B-02 receiving remains a separate confirmation.
- Expense/Receipt may link to a B-02 receiving record after both exist, but extraction never
  creates, adjusts, or validates stock.
- Quote/provider handoff never reserves, decrements, or promises stock. Provider payment
  truth alone is not inventory authority.
- Business Ask AI and its KPI view may explain authorized B-02 warnings and freshness, but
  B-02 remains the source of truth and missing inventory data remains unknown.

Nursery/store workflows and Facility input workflows also reference B-02 instead of defining
parallel ledgers. Detailed B-02 rules live only in `business-inventory-method.md` and the
`business-inventory` runtime method.

## Safety and exclusions

All records are workspace-scoped and audited. External communication, provider handoff,
purchasing, assignment, and publication require explicit confirmation. AI output cannot
approve its own draft or elevate a role.

Never turn an internal business/payment fee or fulfillment/shipping cost into a customer
charge unless the operator explicitly adds that charge as a reviewed priced line.

Do not expand B-03 into full CRM, accounting/bookkeeping, bank reconciliation, payroll, tax
advice/preparation, HR, customer profiling, automated outreach/collections, credit/loan
decisions, legal-contract automation, procurement automation, dispatch optimization, full
POS, or autonomous purchasing. Export, import, link, or hand off to the specialized system.

Named commercial products and open-source projects are architecture research leads only.
Do not copy their code, screenshots, claims, or workflows until the exact source, immutable
revision, license compatibility, security posture, dependencies, and attribution obligations
are reviewed and recorded in the source registry.
