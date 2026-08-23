# Business Inventory (B-02) method

B-02 is GrowPathAI's one canonical inventory ledger for Commercial and Facility workspaces.
It owns product/SKU, lot/batch, receiving, quantity, status, cost authorization, movement,
adjustment, transfer, hold, consumption, alerts, import, search, and audit export. B-03
Business Desk, B-04 nursery/store, and B-05 Facility workflows reference B-02 records rather
than creating parallel stock ledgers.

The canonical workflow is:

**select an authorized workspace → load current ledger evidence → stage and review an
operation → confirm one idempotent transaction → verify balances, movement, and audit**

## Scope and access

B-02 ships as one coherent unit: product/SKU, lot/batch, unit, location, quantity, status,
authorized cost and currency, vendor/receiving, movement, adjustment reason, transfer, hold,
consumption, source freshness, duplicate/conflict review, low-stock/expiry/discrepancy
flags, search, history, import, and full audit export. Partial competing ledgers are not
acceptable.

Commercial owners and Facility `OWNER`/`MANAGER` roles mutate the ledger in their selected
workspace. Facility `STAFF` remains read-only, and `VIEWER`/`QA` have no inventory mutation
authority. Full-audit access follows the Facility audit-read permission rather than
inventory-write permission. Every route reauthorizes workspace and record identity on the
server. A Platform Admin uses an explicit audited support path; admin status must never turn
an unscoped record ID into cross-tenant inventory access.

The retained legacy Facility endpoints must delegate to this ledger's transaction, unit,
history, archive, provenance, and audit rules. They may not become a second write path.

## Canonical records and privacy

- An item defines stable workspace, SKU, name, unit, current on-hand balance, current
  location when no populated lots exist, reorder threshold, status, and version.
- A lot/batch belongs to one item and adds its own on-hand balance, location, vendor,
  receiving provenance, optional expiration, and lifecycle status. Active lot totals may not
  exceed the parent item balance.
- Authorized cost, currency, vendor, supplier terms, internal balances, movements, and audit
  history are private workspace records. They are excluded from Storefront, sharing,
  discovery, and public inventory projections.
- An absent cost remains unknown; it is never inferred or coerced to zero. Currency remains
  unknown until an authorized cost is recorded and must then be an explicit ISO 4217
  three-letter code. Migrated legacy rows without provable currency remain blank/unknown.
- A stocked or historically used item cannot change units. Create a new reviewed SKU instead.
  Archive preserves history; routine cleanup never hard-deletes ledger evidence.

## Balance and movement invariants

Every quantity change is an append-only, actor-attributed movement committed inside the same
database transaction as the affected item/lot balance and audit event. The transaction uses
the expected record version and an operation-scoped idempotency key. Replaying the same key
and payload returns the original result; a different payload with that key is rejected.

- Active lot balances may not exceed the parent item balance. An item-level decrement cannot
  undercut its active lots, and an item-level movement cannot bypass populated lots.
- Archived or consumed lots cannot receive or adjust stock. New stock requires a new active
  lot. Negative resulting item or lot balances are rejected.
- The immutable movement quantity describes the exact balance effect. Adjustment history
  stores the absolute value of its signed delta; the reason and direction preserve meaning.
  Hold and Release apply to the selected item's or lot's full on-hand balance.
- User-entered historical dates are retained as reported metadata. The verified occurrence
  timestamp and actor are server-recorded and cannot be supplied by the client.
- Item details keyset-paginate movement history by workspace, item, occurrence time, and
  stable ID. The interface discloses and offers the next page instead of presenting a capped
  suffix as complete history.

The current record model stores one location per item or lot. Move/Transfer therefore
relocates the selected item's or lot's entire on-hand balance, preserves that balance,
derives the audited source from the stored record, and records the reviewed destination,
reason, and idempotency key. Reject a partial relocation with an explicit conflict.
Supporting partial quantities across simultaneous locations requires a separately reviewed
allocation-model extension to this ledger, never an inferred or parallel ledger.

## Receiving, consumption, and linked commerce

Receiving stages the item/SKU, lot, vendor/source, quantity, unit, location, reported date,
authorized cost/currency, evidence, and duplicate/conflict review. Confirmation creates the
receiving movement, balances, provenance, and audit atomically. A B-03 Purchase Request in
`Received` state is context only; it never creates stock until this B-02 confirmation occurs.

Consumption and adjustment require a selected item/lot, positive quantity or signed delta as
appropriate, reason, actor, version, and idempotency key. Facility extensions may add a
grow/room reference and horticulture receiving may add inspection fields, but those are
context on the same canonical transaction.

A linked Storefront payment reconciles stock exactly once by verified provider event and
order. A reconciliation failure leaves displayed inventory unchanged and visible for retry
rather than pretending the balance is zero. B-03 quote or payment-provider drafts do not
reserve, decrement, promise, or reconcile inventory.

## Deterministic warnings

The current near-expiry flag means a stocked lot expires within 30 days. Expired, held,
low-stock, unallocated, and item-versus-lot discrepancy flags are deterministic record
checks, not AI conclusions. Each warning exposes the record, rule/version, evaluated time,
source freshness, missing inputs, and next authorized review action. Failed or stale reads
are not displayed as zero inventory or no warnings.

## Reviewed import

Import is never a direct write:

**digest source → preview → choose detected columns and quantity meaning → inspect invalid,
duplicate, unit, location, and closed-lot conflicts → explicitly confirm → apply**

Clearing an optional column disables that field. Inventory versions captured at review
prevent a stale preview from overwriting intervening work. Mappings, conflict policy, and
quantity meaning freeze once any row commits; withdrawal remains available only until apply
begins.

Applied rows commit independently with their movement, before/after audit snapshot, and
durable checkpoint in one transaction. If an apply pauses, completed rows are not repeated;
the user reviews current inventory again before retry. Every attempt has a server-generated
correlation ID carried by row checkpoints, provenance, and movements so a partial retry can
be investigated without guessing which attempt wrote a record.

One reviewed file is limited to 1,000 rows, 100 simple scalar columns per row,
100-character column names, and 2,000-character cells. Preview samples and audit summaries
are separately bounded. Formula-looking spreadsheet text is neutralized before export or
display; numeric quantities remain numeric.

## Full audit export

The workspace-scoped full audit export includes items, archived history, lots, append-only
movements, import lifecycle/provenance, and scoped import-row before/after events. It streams
bounded pages against a fixed membership high-water mark so record count does not become
server memory use.

This is a live mutable-state export plus immutable history, not a database point-in-time
snapshot. The manifest records workspace, request actor, start/cutoff/read times, page
boundaries, schema version, and a changed-after-start flag for a mutable row saved after
export start. A terminal summary records completion time and emitted counts. Private,
`no-store` response headers prevent browser or intermediary caching. Spreadsheet formulas
from text are neutralized while numeric quantities remain numeric.

Audit events carry explicit workspace identity, actor, correlation, and immutable origin so
a similarly named or shared actor cannot cross workspace boundaries or make a manual note
look like a verified system event. Client-created notes always use the server-owned
`audit.manual.note` action. Historical events without provable origin are
`legacy_unverified`; migration must never promote them to `system` provenance.

## AI boundary and B-03 linkage

B-02 calculations and invariants are deterministic. AI may explain an authorized warning,
map staged import-column candidates, or summarize selected inventory history, but it cannot
invent a SKU, unit, cost, currency, balance, lot, source, movement, date, approval, or
completed action. Model output never mutates the ledger and requires the same review as any
other draft.

Facility Inventory Risk loads a bounded, server-authorized projection of the current B-02
items and their deterministic alerts before a provider request is allowed. The projection
includes record identity, SKU/name, stock-counting unit, on-hand count, reorder point,
status, location, freshness timestamps, and alert evidence. It excludes vendor and
authorized cost/currency because those fields are not needed for stock-risk triage. The
deterministic answer and provider context must count out-of-stock, recorded reorder, and
evidence-alert records without combining unlike units. Missing use rate, par level,
supplier timing, counts, or records remain explicitly unknown and never fall back to a grow
summary.

B-03 may retain stable B-02 record references and read authorized projections for Vendor
Compare, Expense/Receipt, Business Ask AI, and its KPI view. B-03 does not copy balances or
write stock. B-04 and B-05 extensions also call B-02 rather than defining parallel
inventories.

## Prohibitions

- Never expose authorized cost, currency, vendor, internal balance, movement, or audit
  history through Storefront, public sharing, discovery, or an unrelated workspace.
- Never represent a partial move as a location change while the record stores one location;
  reject it until the canonical ledger has a reviewed allocation model.
- Never change the unit of stocked or historically used inventory, silently cap history,
  trust a user-reported date as verified occurrence, or let a legacy route bypass B-02.
- Never apply an import without explicit review, repeat a committed row after retry, change
  frozen reviewed meaning after partial commit, or write into an archived/consumed lot.
- Never call the audit export a point-in-time database snapshot, let a client choose a system
  audit action, promote `legacy_unverified` evidence to system origin, or cache the export.
- Never permit an AI draft, B-03 status, provider webhook, payment redirect, or public product
  view to adjust, reserve, receive, consume, or promise inventory.
