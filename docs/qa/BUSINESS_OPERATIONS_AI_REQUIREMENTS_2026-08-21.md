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

## B-03 Small Business Desk

The shipping Small Business Desk is intentionally lightweight. It uses four shared engines:

1. deterministic calculations;
2. schema-validated document extraction with provenance and duplicate checks;
3. authorized business-record summaries/questions; and
4. reviewed drafts/actions with explicit save, export or provider handoff.

The full behavior and safety contract is owned by
`docs/knowledge/methods/business-desk-method.md`.

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

## Delivery order

1. Shared foundation and audit contract.
2. Complete the one canonical B-02 inventory/lot/receiving/movement/export engine.
3. Build the four reusable B-03 engines and its eight shipping tools.
4. Facility operations intelligence and horticulture-store workflows consume B-02.
5. Creator operations and lawful storefront/commerce handoffs.
6. Provider/jurisdiction feasibility review for regulated-retail adapters.
7. Full business acceptance before the final product crawl.

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
