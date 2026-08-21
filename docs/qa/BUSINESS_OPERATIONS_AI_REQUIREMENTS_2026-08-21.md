# Business operations and AI requirements

Updated: 2026-08-21

This is a required pre-final-crawl tool inventory. It is intentionally broader than
the current implementation. A capability is not complete until it is authorized,
evidence-aware, reviewable, audited, tested with realistic data, and accepted live.

## Shared foundation every business tool needs

- Organization, facility/store/location, role, approval threshold, time zone, and
  audit boundary; no cross-account data or actions.
- Stable records linking product/SKU, lot/batch/package, room/grow/plant, device,
  task/SOP, asset, vendor, customer/recipient where lawful, and external source.
- Import review: credential ownership, preview, field mapping, provenance, source
  freshness, duplicate/conflict view, explicit confirmation, retry and withdrawal.
- AI answer: source records/timestamps, observation vs calculation vs forecast vs
  recommendation, uncertainty/missing data, draft next step, human confirmation.
- Secret, precise-location and personal-data redaction; reversible, idempotent writes;
  searchable audit history for every approval, override, sync and export.

## Dispensary / regulated-retail tools

| Tool | Required behavior | AI boundary |
| --- | --- | --- |
| Compliance cockpit | License/location context, package/lot status, holds, lab/COA references, transfer and sync freshness | Summarize/flag only; never certify compliance or file reports |
| Source-of-truth reconciliation | Compare permitted regulator/POS import with GrowPath, show exact record/time mismatch | Draft a resolution task; never overwrite either system |
| Inventory and lot ledger | Item, SKU, package/lot, unit, location, status, expiry, quantity, cost, movement, adjustment, transfer, hold | Flag anomalies, near-expiry, stale counts and duplicates with record links |
| Recall / incident workbench | Affected lots/locations/transfers, hold state, notice draft, evidence and resolution history | Never declare a recall/safety result or release a hold autonomously |
| Menu/data quality | Availability, verified COA/media, missing disclosure, stale price/status, inconsistent names | Suggest fixes from records; no invented potency/effect/medical claim |
| Staff product finder | Authorized menu facts plus stated customer preferences | No medical advice, condition inference, illegal sale, or effect guarantee |
| Demand/reorder | Sales/usage history, season, lead time, safety stock, confidence and forecast basis | Creates reviewable purchase/task draft only |
| Approved adapters | Provider-specific API keys, role scope, pagination/webhooks, sync state | Read-only by default; writes require an approved provider/legal contract |

Regulated adapters must be jurisdiction and provider specific. Metrc documents
facility-scoped inventory, package, harvest, transfer, testing, permission and webhook
interfaces, but an available API never establishes an operator’s legal authority.
See [Metrc Open API](https://www.metrc.com/track-and-trace-technology/open-api/) and
[Metrc documentation](https://api-ms.metrc.com/Documentation).

## Horticulture store / nursery / garden-center tools

| Tool | Required behavior | AI boundary |
| --- | --- | --- |
| Seasonal inventory planning | Plants, seed, soil, nutrients, tools and lawful merchandise; demand, lead time, season and stock exposure | Forecast shows assumptions/confidence; no automatic purchase order |
| Plant/customer help intake | Crop, environment, photos, observed symptoms, purchase and label context | Evidence-aware ID/diagnosis; no invented diagnosis, pesticide rate or emergency advice |
| Product-label matcher | Guaranteed analysis/ingredient, crop context and label-backed use constraints | Ask for label when absent; never invent a chemical recommendation |
| Nursery operations | Propagation batch, quarantine/hold, loss/waste, bench/zone, transplant/care tasks and photo history | Flag anomalies/due work; human owns care and disposal decisions |
| Fulfillment and merchandising | Pick/pack, locations, substitutes, media completeness, care cards, seasonal displays | Never silently change price, stock, public copy or substitutions |
| Vendor / receiving | Vendor record, PO/delivery intake, lot/quality check, returns and credit notes | Draft discrepancy report only |

## Facility operations tools

| Tool | Required behavior | AI boundary |
| --- | --- | --- |
| Environment/device health | Approved controller/sensor ingest, freshness/gaps/calibration, room/zone context | Flag anomaly/investigation; never control equipment automatically |
| Crop/room/labor planning | Crop-aware calendar, stage, rooms, staffing/tasks, inputs and dependency conflicts | Draft task/SOP/checklist with required reviewer |
| Inventory/input consumption | Lots, nutrients/media/consumables, consumption against grows/rooms, variance and reorder evidence | Estimate clearly; no invented usage or reorder action |
| Quality/harvest/production | Evidence/sampling provenance, comparison, yield/loss/deviation history | Explain readiness/variance; no release or harvest decision by itself |
| SOP/compliance operations | Version, assignment, due dates, evidence, exception, approval and audit export | Summarize/draft only; authorized people approve/execute |
| Maintenance/calibration | Asset, service interval, calibration, alert and spare-part history | Draft corrective task; no safety/compliance certification |
| Integration center | Customer-owned keys, provider/model support, room mapping, import/retry/history | Safe read-only default; explicit reviewed writes only |

TrolMaster’s portal supports customer API keys, documentation, SDKs and live testing;
the GrowPath contract must show supported models and source freshness. See the
[TrolMaster Developer Portal](https://developer.trolmaster.com/).

## Creator / educator / influencer tools

| Tool | Required behavior | AI boundary |
| --- | --- | --- |
| Content studio | Calendar, approved assets, rights/credits, drafts, scheduled/published/archive, source links | Repurpose only creator-approved media; never publish by itself |
| Live studio | OBS connection, chat/overlay, moderator queue, replay, volume, creator identity/follow, share links | No false external giveaway eligibility claim |
| Community intelligence | Creator-visible feedback themes, follow-ups, moderation and reports linked to originals | No private-group scraping, profiling, or engagement-as-truth |
| Course/media workflow | Cover/banner hierarchy, lessons, clips, attachments, enrollment and revisions | Draft titles/outlines/captions; creator approves publishing |
| Brand/partner reporting | Sponsorship/affiliate disclosure, campaign attribution, product/campaign performance, exports | No unverified revenue claim or automatic payout/tax action |

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

1. Shared foundation, inventory/lot movement and audit contract.
2. Facility operations intelligence and horticulture-store workflows.
3. Creator operations and lawful storefront/commerce handoffs.
4. Provider/jurisdiction feasibility review for regulated-retail adapters.
5. Full business acceptance before the final product crawl.
