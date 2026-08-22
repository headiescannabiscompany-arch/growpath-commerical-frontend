# Business operations and AI requirements

Updated: 2026-08-21

This is a required pre-final-crawl tool inventory. It is intentionally broader than
the current implementation. A capability is not complete until it is authorized,
evidence-aware, reviewable, audited, tested with realistic data, and accepted live.

## Shared foundation every business tool may use

- Organization, facility/store/location, role, approval threshold, time zone, and audit
  boundaries where the selected record or action requires them; a solo owner may use a
  calculator without creating artificial Facility/location or approval records. No
  cross-account data or actions.
- Stable records linking product/SKU, lot/batch/package, room/grow/plant, device,
  task/SOP, asset, vendor, customer/recipient where lawful, and external source.
- Import review: credential ownership, preview, field mapping, provenance, source
  freshness, duplicate/conflict view, explicit confirmation, retry and withdrawal.
- AI answer: source records/timestamps, observation vs calculation vs forecast vs
  recommendation, uncertainty/missing data, draft next step, human confirmation.
- Secret, precise-location and personal-data redaction; reversible, idempotent writes;
  searchable audit history for every approval, override, sync and export.

## Canonical inventory ownership

B-02 is the only inventory engine. It owns product/SKU, lot/batch, unit, location,
quantity, status, authorized cost, receiving, movement, adjustment, transfer, hold,
consumption, source freshness, duplicate/conflict review, simple alerts and export.

B-04 nursery/store inventory references B-02 and may extend receiving with horticulture
inspection fields. B-05 Facility input inventory references B-02 and may add grow/room
consumption context. Neither may create a parallel inventory ledger. B-02 is delivered and
accepted as one coherent unit rather than a series of competing partial inventories.

The current implementation/local-verification record is
`B02_CANONICAL_INVENTORY_LOCAL_EVIDENCE_2026-08-22.md`. Production migration, exact-SHA
deployment and live multi-role acceptance remain named gates rather than reasons to rebuild
the locally accepted engine.

## B-03 Small Business Desk

The shipping Small Business Desk is intentionally lightweight. It uses four shared engines:

1. deterministic calculations;
2. schema-validated document extraction with provenance and duplicate checks;
3. authorized business-record summaries/questions; and
4. reviewed drafts/actions with explicit save, export or provider handoff.

Launch access is deliberately narrow. The eligible workspace itself is mandatory even for
a stateless calculation, but an eligible solo owner does not need an artificial Facility,
location or approval record. Commercial Owners and Platform Admin may use the Desk only in
their own explicitly selected Commercial workspace. A selected Facility's `OWNER` and
`MANAGER` may use it inside that Facility. Personal users, Commercial staff, Facility
`STAFF`, `VIEWER`, validation/QA identities and an Admin who has not selected the Admin-
owned Commercial workspace are denied. Commercial AI work charges that Commercial
account's balance; Facility AI work charges the selected Facility balance. A permission or
workspace change invalidates an in-progress save, export or provider handoff and requires a
fresh review. Deterministic calculation alone consumes no AI credit; only a deliberately
invoked provider-backed explanation, extraction or Ask request uses the applicable balance.

The canonical Desk roots are `/home/commercial/business-desk` and
`/home/facility/business-desk`. Every tool uses the same suffix and returns to the selected
workspace's Desk root:

| Tool                         | Route suffix    |
| ---------------------------- | --------------- |
| Price, margin and break-even | `/price-margin` |
| Quote / estimate             | `/quotes`       |
| Lead follow-up               | `/leads`        |
| Job notes                    | `/jobs`         |
| Expense / receipt helper     | `/expenses`     |
| Vendor compare               | `/vendors`      |
| Cash-flow snapshot           | `/cash-flow`    |
| Business Ask AI              | `/ask-ai`       |

These are exactly eight launch tools. Break-even is a Price/Margin mode, a purchase request
is an output of Vendor Compare, the KPI snapshot is a view inside Business Ask AI, and an
invoice/payment-request draft is a Quote handoff. None is a ninth route, independent AI
pipeline or separate launch product.

The full behavior and safety contract is owned by
`docs/knowledge/methods/business-desk-method.md`.

All eight tools reuse four engines rather than creating eight model pipelines. Their
common acceptance path is source input → structured draft → validation → deterministic
math where applicable → owner review → audited save/export/provider handoff. Model output
is never persisted as a verified business fact without that review. Receipt and quote
imports use a content digest and duplicate/conflict review before save.

### Deterministic money contract

Money is stored and calculated as an exact decimal or integer minor units using the selected
ISO 4217 currency's minor-unit exponent; binary floating-point is not persisted as a money
result. Every calculation contains one reviewed three-letter currency code. Cross-currency
totals and implicit foreign exchange are rejected. Amounts and costs must be finite and
non-negative, and quantity must be positive.

For each priced line, `line subtotal = unit price × quantity`, rounded once to the
currency's minor unit using half-away-from-zero. Quote components are applied in this order:
rounded customer-facing line subtotals → reviewed discount → customer shipping → explicitly
entered or authorized-provider tax → customer total. A customer-facing fee is a reviewed
priced line. Whole-quote business/payment fees and fulfillment/shipping cost are internal
known costs for estimated gross profit, not silent customer charges. Each percentage
component is rounded once when applied. A requested deposit is shown separately and is not
a paid amount; only a user-confirmed or provider-reported prior payment may reduce the
displayed amount outstanding.

`gross profit = selling revenue − complete known direct cost`.

Gross margin is gross profit divided by selling revenue; it is undefined when selling
revenue is zero. Markup is gross profit divided by direct cost; it is undefined when direct
cost is zero. Missing labor, material, fee, shipping or other required direct cost keeps
gross-profit/margin output incomplete rather than silently treating the value as zero.

Price/Margin break-even evaluates one explicit sales scenario at the requested positive
`quantityMicros`. Unit selling price and known unit direct cost are extended across that
quantity. Business fees and fulfillment/shipping cost are whole-scenario costs, customer
shipping is whole-scenario revenue, and the fixed discount is applied once to the whole
scenario; none is silently recast per unit. Scenario `contributionMinor` is pre-tax customer
revenue, including customer shipping and after the reviewed discount, minus extended direct
cost, business fees and fulfillment/shipping cost. With positive contribution, break-even
repeats this exact scenario using BigInt-safe ceiling division:
`salesScenarios = ceil(fixedCostsMinor / contributionMinor)`. Total `quantityMicros` equals
`salesScenarios` multiplied by requested `quantityMicros`; `revenueMinor` equals
`salesScenarios` multiplied by scenario pre-tax customer revenue. The result reports
`salesScenarios`, total `quantityMicros`, `contributionMinor`, and `revenueMinor`. Missing
direct cost or missing/non-positive contribution produces an explicit incomplete result
rather than a finite break-even.

Vendor comparison may call a result total landed cost only when every applicable reviewed
shipping, fee, tax and duty input is present. Otherwise it shows a clearly labeled known-
cost subtotal and missing inputs. B-03 never writes a calculated cost or currency into B-02
inventory without a separate authorized B-02 review.

Commercial and open-source products are comparison leads, not dependencies or permission
to copy. Any code adaptation requires an immutable source revision, verified license and
attribution, dependency/security review and a file-level adoption record before code is
introduced. Product behavior claims also require current primary-source verification.

| Shipping tool                | Required launch behavior                                                                                                                                      | AI boundary                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Price, margin and break-even | Visible cost/price/quantity/discount/fee/shipping/margin math plus contribution and break-even scenarios                                                      | Deterministic math; GPT explains only and never supplies missing figures                         |
| Quote / estimate             | Customer/project, products/services, labor/materials, known costs, markup/margin, discounts, authorized tax, deposit, terms, expiration, totals and revisions | Draft scope/assumptions; never invent costs, tax or contract terms or treat a quote as accepted  |
| Lead follow-up               | Minimal voluntary contact, interest, value, source, status, last/next action, notes and related records                                                       | Summarize/draft only; no fabricated communication, sensitive profiling or automatic contact      |
| Job notes                    | Customer/request, relevant location, scope, schedule/status/assignee, notes/media, quote/payment reference and completion                                     | Propose scope/tasks/materials/updates/actions; review before commitment or assignment            |
| Expense / receipt helper     | Photo/PDF/manual intake, reviewed vendor/date/amount/items/shown-tax/category/related record, search/filter/totals/export                                     | Extract and explain only; no tax-deductibility or bookkeeping claim                              |
| Vendor compare               | Quote facts, deterministic landed/effective cost, differences, lead time/minimum/terms and reviewed purchase request                                          | Explain tradeoffs; never place an order; B-02 owns receiving                                     |
| Cash-flow snapshot           | User/imported cash, expected incoming/outgoing, overdue and upcoming amounts, recorded/expected labels and 30/60/90-day scenarios                             | Deterministic planning; no invented balances or ML forecast                                      |
| Business Ask AI              | Source-linked questions and small KPI view across authorized Desk and B-02 records                                                                            | Separate facts/calculations/assumptions/forecasts/recommendations; no cross-workspace disclosure |

A reviewed quote may hand off to an authorized invoice/payment provider. GrowPathAI may
prepare the business logic and draft message but does not become the provider's invoice,
payment or accounting ledger.

Export and copy are always available after review. The optional launch provider is a
merchant-owned Stripe Connect account using provider-hosted onboarding; GrowPathAI's own
subscription merchant account must never receive or invoice the merchant's customer funds.
Connection state is explicit as `DISCONNECTED`, `TEST`, `LIVE` or `REVOKED`, and test/live
provider identifiers and credentials never mix.

The only external write is an explicitly confirmed, idempotent creation of a **draft**
invoice/payment request for the exact immutable quote revision, amount and currency.
GrowPathAI does not send, finalize, accept, collect, refund, apply automatic tax, create a
payment link or mutate stock. Editing after export or handoff creates a new quote revision;
the provider reference remains pinned to the revision it received. Local handoff state is
pending, draft-created, failed or revoked and is never presented as paid. Provider webhooks
are signature-verified, event-ID deduplicated, ordered/reconciled against provider state and
audited. Only an authorized provider event or explicit authorized user record may report a
later sent/finalized/paid state; duplicate, stale or failed events cannot overwrite newer
truth.

Tax remains user-entered or provider-reported. B-03 does not choose a jurisdiction, invent a
rate, enable Stripe Tax or assert a registration. A future automatic-tax flow requires a
separate product/legal decision and verified provider tax settings and active registration.

### Record, privacy and security contract

- Quote revisions are immutable once exported or handed off. Draft, reviewed, exported,
  provider-draft, expired, superseded and cancelled states remain distinct; none means an
  accepted contract or completed payment without explicit outside evidence.
- Uploads enter a private, workspace-scoped quarantine/staging record. A cancelled or
  abandoned stage expires within 24 hours.
  Saving the source temporarily for scanning, extraction and duplicate review does not make
  extracted fields a verified expense, quote or vendor record. Confirmation promotes the
  reviewed fields and source into saved-record retention; cancel/expiry removes the staged
  copy.
- Duplicate digests are compared only inside the authorized workspace. A digest match must
  never disclose that another tenant uploaded the same document.
- Receipt, invoice, quote and job attachments use protected server uploads and signed reads;
  validate file signature/MIME, size, page/frame count and decoded dimensions, scan or
  quarantine malicious content, and never fetch an arbitrary user-supplied URL. Reject
  executable, active-content, encrypted/unreadable and resource-exhaustion payloads with a
  safe recovery path.
- An AI-enabled attachment picker repeats the AI-use/no-training disclosure required by the
  AI decision policy. Document/OCR text and saved notes are untrusted evidence, never model
  or tool instructions. They cannot expand retrieval, reveal secrets, contact a person,
  invoke a provider or write a record.
- Contact details, customer/job locations, receipts, cash, costs and provider references are
  private. Field-level authorization, signed downloads, bounded retention, archive/delete,
  account export and redaction rules apply. Secrets and raw PII stay out of logs, model
  telemetry, error payloads and audit summaries.
- Spreadsheet exports neutralize formula-leading text while keeping validated numeric money
  fields numeric. Export and provider handoff show the exact included fields before
  confirmation.
- Audits cover create/update/archive, quote revision, confirmed extraction, export, handoff,
  provider event and consequential approval with actor, workspace, source and outcome. An
  unsaved stateless calculation does not require a fake business record or audit event.

B-02 remains the only inventory writer. B-03 may read authorized item/cost/low-stock evidence
and link a reviewed expense or purchase request, but it never changes quantity, unit, cost,
lot, location, status or receiving. Vendor `Received` is derived from a linked successful
B-02 receipt/movement; otherwise the external/manual state must be named as unverified.
B-04 adds horticulture inspection fields to B-02 receiving, and B-05 adds selected grow/room
context to B-02 consumption. A Quote/Stripe state never reserves or decrements inventory.

Cash-flow inputs record source type, source timestamp, expected date, recorded-versus-
expected status and currency. Valid sources are an explicit owner entry, authorized provider
invoice/payment evidence, an owner-selected quote expectation, or a reviewed expense/bill
draft. A quote is never expected cash merely because it exists. Current cash is owner-only;
stale sources remain labeled; cross-currency totals require separate views; no FX or payment
is inferred.

## Dispensary / regulated-retail tools

| Tool                           | Required behavior                                                                                            | AI boundary                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Compliance cockpit             | License/location context, package/lot status, holds, lab/COA references, transfer and sync freshness         | Summarize/flag only; never certify compliance or file reports              |
| Source-of-truth reconciliation | Compare permitted regulator/POS import with GrowPath, show exact record/time mismatch                        | Draft a resolution task; never overwrite either system                     |
| Inventory and lot ledger       | Item, SKU, package/lot, unit, location, status, expiry, quantity, cost, movement, adjustment, transfer, hold | Flag anomalies, near-expiry, stale counts and duplicates with record links |
| Recall / incident workbench    | Affected lots/locations/transfers, hold state, notice draft, evidence and resolution history                 | Never declare a recall/safety result or release a hold autonomously        |
| Menu/data quality              | Availability, verified COA/media, missing disclosure, stale price/status, inconsistent names                 | Suggest fixes from records; no invented potency/effect/medical claim       |
| Staff product finder           | Authorized menu facts plus stated customer preferences                                                       | No medical advice, condition inference, illegal sale, or effect guarantee  |
| Demand/reorder                 | Sales/usage history, season, lead time, safety stock, confidence and forecast basis                          | Creates reviewable purchase/task draft only                                |
| Approved adapters              | Provider-specific API keys, role scope, pagination/webhooks, sync state                                      | Read-only by default; writes require an approved provider/legal contract   |

Regulated adapters must be jurisdiction and provider specific. Metrc documents
facility-scoped inventory, package, harvest, transfer, testing, permission and webhook
interfaces, but an available API never establishes an operator’s legal authority.
See [Metrc Open API](https://www.metrc.com/track-and-trace-technology/open-api/) and
[Metrc documentation](https://api-ms.metrc.com/Documentation).

## Horticulture store / nursery / garden-center tools

| Tool                          | Required behavior                                                                                         | AI boundary                                                                            |
| ----------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Seasonal inventory planning   | Plants, seed, soil, nutrients, tools and lawful merchandise; demand, lead time, season and stock exposure | Forecast shows assumptions/confidence; no automatic purchase order                     |
| Plant/customer help intake    | Crop, environment, photos, observed symptoms, purchase and label context                                  | Evidence-aware ID/diagnosis; no invented diagnosis, pesticide rate or emergency advice |
| Product-label matcher         | Guaranteed analysis/ingredient, crop context and label-backed use constraints                             | Ask for label when absent; never invent a chemical recommendation                      |
| Nursery operations            | Propagation batch, quarantine/hold, loss/waste, bench/zone, transplant/care tasks and photo history       | Flag anomalies/due work; human owns care and disposal decisions                        |
| Fulfillment and merchandising | Pick/pack, locations, substitutes, media completeness, care cards, seasonal displays                      | Never silently change price, stock, public copy or substitutions                       |
| Vendor / receiving            | Vendor record, PO/delivery intake, lot/quality check, returns and credit notes                            | Draft discrepancy report only                                                          |

## Facility operations tools

| Tool                        | Required behavior                                                                                 | AI boundary                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Environment/device health   | Approved controller/sensor ingest, freshness/gaps/calibration, room/zone context                  | Flag anomaly/investigation; never control equipment automatically    |
| Crop/room/labor planning    | Crop-aware calendar, stage, rooms, staffing/tasks, inputs and dependency conflicts                | Draft task/SOP/checklist with required reviewer                      |
| Inventory/input consumption | Lots, nutrients/media/consumables, consumption against grows/rooms, variance and reorder evidence | Estimate clearly; no invented usage or reorder action                |
| Quality/harvest/production  | Evidence/sampling provenance, comparison, yield/loss/deviation history                            | Explain readiness/variance; no release or harvest decision by itself |
| SOP/compliance operations   | Version, assignment, due dates, evidence, exception, approval and audit export                    | Summarize/draft only; authorized people approve/execute              |
| Maintenance/calibration     | Asset, service interval, calibration, alert and spare-part history                                | Draft corrective task; no safety/compliance certification            |
| Integration center          | Customer-owned keys, provider/model support, room mapping, import/retry/history                   | Safe read-only default; explicit reviewed writes only                |

TrolMaster’s portal supports customer API keys, documentation, SDKs and live testing;
the GrowPath contract must show supported models and source freshness. See the
[TrolMaster Developer Portal](https://developer.trolmaster.com/).

## Creator / educator / influencer tools

| Tool                    | Required behavior                                                                                   | AI boundary                                                    |
| ----------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Content studio          | Calendar, approved assets, rights/credits, drafts, scheduled/published/archive, source links        | Repurpose only creator-approved media; never publish by itself |
| Live studio             | OBS connection, chat/overlay, moderator queue, replay, volume, creator identity/follow, share links | No false external giveaway eligibility claim                   |
| Community intelligence  | Creator-visible feedback themes, follow-ups, moderation and reports linked to originals             | No private-group scraping, profiling, or engagement-as-truth   |
| Course/media workflow   | Cover/banner hierarchy, lessons, clips, attachments, enrollment and revisions                       | Draft titles/outlines/captions; creator approves publishing    |
| Brand/partner reporting | Sponsorship/affiliate disclosure, campaign attribution, product/campaign performance, exports       | No unverified revenue claim or automatic payout/tax action     |

## Commerce, traceability and safety requirements

- Storefront must distinguish external lawful handoff from native purchase, and show
  media, source link, price/effective date, availability freshness and relevant warning.
- Pricing/promotions may be modeled from named inputs; AI cannot change price, create a
  discount, advertise a controlled product or decide legality.
- Product identity must support class, lot/batch and, where justified, serialized item
  levels—not names alone. This follows [GS1 traceability guidance](https://www.gs1.org/standards/gs1-global-traceability-standard/current-standard).
- Every AI output needs evidence links, uncertainty, counter-evidence, role gate,
  explicit confirmation, duplicate protection and audit/export state.
- Security/audit logs must be protected from unauthorized access, alteration and secret
  disclosure; see [OWASP logging guidance](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html).

## Mandatory business acceptance scenarios

1. Owner/manager/staff/viewer/Admin-brand boundaries across two organizations with
   intentionally similar names, SKUs, lots, grow IDs and rooms.
2. Zero, delayed, stale, conflicting, duplicate and unauthorized provider responses.
3. Read-only connection; rejected import; reviewed confirmed import; withdrawal and
   audit export without duplicate inventory or external action.
4. Evidence-sufficient and evidence-missing AI requests, with no fabricated quantity,
   price, sensor value, legal permission, medical statement or compliance assertion.
5. Draft → reviewer approval → persisted/reloaded result → export/audit, plus cancel,
   error, retry and permission-change paths.
6. Public sharing that never exposes customer, employee, credentials, private home,
   inventory detail, internal cost, exact private location or regulated-sale data.
7. B-03 eligible and denied role matrix across Commercial, Admin-owned Commercial and two
   selected Facilities, including mid-draft permission/workspace change and the correct
   Commercial-versus-Facility AI balance and failed-provider refund.
8. Money tables and property cases covering currency minor units, rounding, discount/fee/
   shipping/tax order, zero denominators, incomplete costs, rejected cross-currency/FX
   calculations, and a positive-`quantityMicros` scenario proving scenario-level fees,
   fulfillment/shipping cost, customer shipping and fixed discount are repeated intact.
   Break-even cases assert the BigInt-safe ceiling and exact `salesScenarios`, total
   `quantityMicros`, `contributionMinor`, and `revenueMinor` fields, plus explicit incomplete
   output for missing/non-positive contribution.
9. Attachment/extraction cases covering valid, malformed, mislabeled, oversize, encrypted,
   malicious and resource-exhaustion files; prompt injection; low confidence; missing fields;
   workspace-local duplicates; review/cancel/expiry and formula-safe export.
10. Quote revision and optional Stripe cases covering copy/export, disconnected/revoked and
    test/live isolation, exact revision/amount/currency, confirmation/cancel/retry,
    idempotency, signature-verified duplicate/out-of-order webhooks and truthful failure.
11. B-02 boundary cases proving receipt/vendor/Ask links cannot mutate inventory, vendor
    `Received` requires linked ledger evidence and a quote/provider state cannot reserve or
    decrement stock.
12. Business Ask AI cases proving permission-filtered retrieval, source/date links,
    incomplete metrics, untrusted stored-instruction resistance, separated fact/calculation/
    assumption/forecast/recommendation and no write/contact/handoff without confirmation.

## Delivery order

1. Shared foundation and audit contract.
2. Complete the one canonical B-02 inventory/lot/receiving/movement/export engine.
3. Build the four reusable B-03 engines and its eight shipping tools.
4. Facility operations intelligence and horticulture-store workflows consume B-02.
5. Creator operations and lawful storefront/commerce handoffs.
6. Provider/jurisdiction feasibility review for regulated-retail adapters.
7. Full business acceptance before the final product crawl.
8. Freeze and crawl one exact candidate, then complete the isolated reviewer pass.
9. Stop at the owner-controlled GrowPathAI-only hat gate; do not begin hat execution until
   the owner resumes it.
10. Begin App Store and Play Store credentials, builds, device evidence, listing,
    submission and monitoring last.

## Scope decision: launch core versus later investment

GrowPath should **not** attempt to become a full ERP, point-of-sale system, regulator
portal, marketing suite, or autonomous grow controller before launch. Those projects
would delay the product while adding support, legal, security, integration and data-
quality risk that early customers may not need.

### Keep in the pre-hat product scope

- B-01 identity, role, approval, import-provenance and audit foundation.
- B-02 core inventory: SKU/product, lot/batch, location, unit, movement, adjustment,
  receiving, export, source freshness and simple evidence-linked low-stock/expiry/
  discrepancy flags. A reorder result is a reviewable task/draft only.
- B-03 Small Business Desk: the eight shipping tools and four reusable engines defined
  above, including reviewed quote-to-invoice/payment-provider handoff without rebuilding
  invoicing or accounting infrastructure.
- B-04 horticulture help: evidence-aware plant/product intake, label-required advice
  boundary, basic nursery batch/hold/care history and fulfillment readiness.
- B-05 facility operations: reviewed device freshness/anomaly detection, crop/room
  context, task/SOP/evidence links, maintenance/calibration history and harvest/
  quality explanation. Never autonomous equipment control.
- B-06 creator essentials already aligned with GrowPath’s social value: approved asset
  drafts, live/chat/replay, transparent sharing, reporting/moderation and source links.
- B-08/B-09 safety and realistic acceptance across those core workflows.

### Removed from the active roadmap

These are not release items and are not part of the post-release backlog by default.
They should not be reopened merely because a generic AI assistant can demonstrate a
quick answer over a store export. A future customer request must pass the decision
rule below before it becomes a new, separately funded product decision.

- **Full regulator/POS integration:** each provider/state combination has separate
  credentialing, permissions, testing, support and legal obligations. Do not build a
  live adapter; a customer may use an export/import or their existing system instead.
- **Serialized-item / recall-recipient platform:** preserve lot/batch lineage now; defer
  item-level serialization, recipient tracing and automated notices until a customer’s
  regulated workflow requires them.
- **Forecasting beyond simple alerts:** no ML demand forecast, yield forecast, labor
  optimizer, predictive maintenance or automated reorder until enough clean,
  consented, workspace-scoped history exists and a customer validates the decision.
- **Full CRM/ERP/accounting/POS:** track the operational references GrowPath needs;
  integrate/export to the customer’s system of record later instead of duplicating it.
- **Dynamic pricing, promotion automation, native marketplace/payout/tax tooling:**
  preserve truthful storefront and external-handoff states; defer price changes,
  marketing automation and payment administration.
- **Cross-platform creator analytics, affiliate attribution and automated sponsorship
  reporting:** export/copy/share and creator-approved content drafts first; add only
  after official APIs and a real creator workflow justify their ongoing support.

### Rule before reconsidering a removed tool

Reconsider a removed tool only when all are true: a named paying customer has a concrete
workflow, the system of record/API and data owner are known, authorization and legal
scope are written down, a human approval/rollback route exists, and a measurable
success metric is agreed. Otherwise, GrowPath should offer a clear export, import, link
or review task instead of pretending to replace the specialized system.
