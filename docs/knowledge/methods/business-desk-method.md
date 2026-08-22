# Small Business Desk method

GrowPathAI's Small Business Desk helps an owner turn known business records into a
calculation, comparison, explanation or draft artifact. It is not a CRM, bookkeeping
ledger, ERP, payroll system, tax service, project-management suite or autonomous business
operator.

The canonical workflow is:

**enter or select authorized records → calculate or extract → explain or draft → review → save, export or hand off**

A solo owner may use a calculator without creating a Facility, store, location or approval
chain. Organization, location and approval scope become required only when the selected
records, staff permissions, consequential write, public action or external handoff requires
them.

## Four reusable engines

1. **Calculator engine:** deterministic quote totals, markup, margin, break-even, vendor
   cost and cash-position math. Show formulas, inputs, units and rounding. GPT may explain
   results but never supplies a missing numeric fact.
2. **Document extraction engine:** receipt, invoice, vendor quote and customer-request
   media become schema-validated draft fields. Preserve the source, extraction status,
   confidence, missing fields, content hash and duplicate warning. Review is required
   before persistence.
3. **Business-record assistant:** summarize and answer questions only from authorized,
   workspace-scoped records. Separate facts, calculations, assumptions, forecasts and
   recommendations and link every answer to its source records and date range.
4. **Draft/action engine:** prepare a quote, follow-up, customer update, task, purchasing
   request or payment-provider handoff. Nothing is sent, assigned, purchased, published or
   written to an external system until the user reviews and confirms it.

These are shared engines, not eight unrelated AI implementations. Each shipping tool is a
bounded schema and screen over one or more of them. The implementation pattern is:

**source input → structured draft → schema validation → deterministic calculation where
applicable → human review → audited save, export or provider handoff**

Document extraction preserves the original source, a content digest, normalized fields,
validation failures and duplicate state. Model output is never the saved business record.
Price, margin, break-even, quote totals, landed cost and cash position remain ordinary
code even when an assistant explains them.

## Shipping tools

### Price, margin and break-even

Accept known cost, selling price, quantity, discount, fees, shipping and desired margin.
Optional break-even inputs are fixed cost, variable unit cost and expected volume. Show
gross profit, markup, gross margin, contribution per unit, break-even units/revenue and
user-selected scenario comparisons. Distinguish markup from margin. Do not describe gross
profit as accounting, tax or net profit without the complete required data.

### Quote and estimate

Store customer or project, products/services, quantities, labor, materials, known unit
costs, markup or target margin, discounts, user-entered or authorized tax, deposit, notes,
terms and expiration. Produce visible deterministic totals, estimated gross profit where
cost exists, assumptions, exclusions, scope draft and revision history. Never invent tax,
cost or contract terms or call an estimate an accepted contract. A reviewed quote may be
exported or handed to an authorized invoice/payment provider; GrowPathAI does not recreate
the provider's payment ledger.

### Lead follow-up

Store only voluntarily supplied practical information: person/business, contact details,
interest, estimated value, source, status, last contact, next action/date, notes and related
GrowPath records. Statuses are New, Contacted, Quote requested, Quote sent, Considering,
Won, Lost and On hold. GPT may summarize recorded contact, draft a follow-up and flag a
missing next action. It must not fabricate communication, contact anyone automatically,
infer sensitive traits or score people using protected attributes.

### Job notes

Store customer, request/job, relevant location, scope, schedule, status, assignee, notes,
photos/attachments, related quote, external invoice/payment reference and completion notes.
Statuses are Requested, Estimating, Approved, Scheduled, In progress, Waiting, Complete and
Cancelled. GPT may turn recorded intake or meeting notes into proposed scope, tasks,
materials, owners, dates, follow-ups, decisions, open questions, customer updates and
completion summaries. Review is required before any commitment or assignment.

### Expense and receipt helper

Accept a receipt photo, invoice image/PDF or manual entry. Extract vendor, date, amount,
readable items, explicitly shown tax, suggested category and optional related grow,
Facility, job, project, asset or B-02 receiving record. The owner reviews every extracted
field. Provide search, totals, date/category filtering and export. Do not determine tax
deductibility or replace bookkeeping. Never expose a receipt or private cost outside its
workspace.

### Vendor comparison and purchase request

Capture vendor, item, quantity, unit price, shipping, minimum order, lead time, terms,
availability, expiration and notes. Deterministically show effective unit and landed cost
when inputs are sufficient, price/quantity differences and missing inputs. GPT may explain
cheapest, fastest, lowest-minimum and user-stated tradeoffs. A reviewed purchase request
may move through Needed, Reviewing, Approved, Ordered, Received or Cancelled; GrowPathAI
never places the order. Receiving is performed by the single B-02 inventory engine.

### Cash-flow snapshot

Use only user-entered or authorized imported current cash, expected incoming/outgoing,
overdue payments and upcoming bills. Show recorded versus expected amounts, assumptions,
expected net movement and user-selected 30/60/90-day scenarios. GPT may explain tight
periods and material drivers. Do not invent balances, payments, expenses, sales or use an
ML forecast until sufficient consented history and a separately approved product decision
exist.

### Business Ask AI

Answer questions across authorized quotes, leads, jobs, expenses, purchase needs and B-02
inventory, such as open follow-ups, quotes, orders, bills, low stock, margin, job summaries
and weekly changes. It may produce reviewed drafts. Every response identifies sources and
date range, marks incomplete metrics and respects field/record permissions. A small KPI
snapshot may show only source-backed quotes, conversion, open leads, jobs, provider-reported
payments, outstanding drafts, inventory warnings, purchases, expenses and estimated gross
margin.

## Inventory ownership

B-02 is the only inventory, lot/batch, receiving, movement, adjustment, hold, consumption
and export engine. Nursery/store workflows in B-04 and Facility input workflows in B-05
reference B-02 records rather than implementing parallel inventories. Horticulture
receiving may add inspection fields, and Facility consumption may add grow/room context,
but both remain extensions of the same canonical ledger.

B-02 ships as one coherent unit: product/SKU, lot/batch, unit, location, quantity, status,
cost authorization, vendor/receiving, movement, adjustment reason, transfer, hold,
consumption, source freshness, duplicate/conflict review, low-stock/expiry/discrepancy
flags, search and export. Partial competing ledgers are not acceptable.

Authorized cost, currency and vendor fields are private workspace records. An absent cost
remains unknown; it is never inferred or coerced to zero, and it is never exposed through
public inventory, Storefront, sharing or discovery. Currency also remains unknown until an
authorized cost is recorded; cost requires an explicit three-letter currency code, including
for migrated legacy records. The current near-expiry alert means a stocked lot expires within
30 days; expired, held, low-stock, unallocated and lot-total discrepancy flags are
deterministic record checks, not AI conclusions.

Every quantity change is an append-only, actor-attributed movement inside the same
transaction as its item/lot balance. Active lot balances may not exceed the parent item
balance. An item-level decrement cannot undercut its active lots, and an item-level move
cannot bypass populated lots. Archived or consumed lots cannot receive or adjust stock;
new stock requires a new lot. A linked Storefront payment reconciles stock exactly once by
provider event and order, while a reconciliation failure leaves displayed inventory
unchanged and visible for retry rather than pretending the balance is zero.

The immutable movement quantity must describe the exact balance effect. Adjustment history
stores the absolute value of its signed delta, and Hold/Release apply to the selected item or
lot's full on-hand balance. A stocked or historically used item cannot change units; create a
new reviewed SKU instead. User-entered historical dates are retained as reported metadata,
while the verified occurrence timestamp is server-recorded. Item detail pages keyset-paginate
movement history and disclose/offer the next page rather than silently presenting a capped
suffix as the complete ledger.

The current B-02 record model stores one location per item or lot. A move or transfer must
therefore relocate the selected item or lot's entire on-hand balance, preserve that balance,
derive the audited source location from the stored record, and record the reviewed
destination, reason and idempotency key. Reject a partial relocation with an explicit
conflict. Supporting partial quantities across simultaneous locations requires a separately
reviewed allocation-model extension to this same ledger, not an inferred or parallel ledger.

An import is a reviewed workflow, never a direct write: digest source → preview → choose
detected columns and quantity meaning → inspect invalid, duplicate, unit, location and
closed-lot conflicts → explicitly confirm → apply. Clearing an optional column disables
that field. Applied rows commit independently with their movement, before/after audit
snapshot and durable checkpoint in one transaction. If an apply pauses, completed rows are
not repeated; the user must review current inventory again, while mappings, conflict policy
and quantity meaning are frozen once any row has committed. Inventory versions captured at
review prevent a stale preview from overwriting intervening work. Withdrawal remains
available until apply begins.

One reviewed file is limited to 1,000 rows, 100 simple scalar columns per row, 100-character
column names and 2,000-character cells. Preview samples and audit summaries are separately
bounded. Every apply attempt has a server-generated correlation identifier carried by row
checkpoints, provenance and movements so a partial retry can be investigated without
guessing which attempt wrote a record.

The full audit export includes items (including archived history), lots, append-only
movements, import lifecycle/provenance and scoped import-row before/after events. It uses a
fixed membership high-water mark and bounded pages so record count does not become server
memory use; spreadsheet formulas from text are neutralized while numeric quantities remain
numeric. This is a live mutable-state export plus immutable history, not a database
point-in-time snapshot. The manifest records start/cutoff/read times and flags a mutable row
whose saved timestamp is later than export start. A terminal summary row records completion
time and emitted counts; private/no-store response headers prevent a browser or intermediary
from caching the workspace audit file.

Audit events carry explicit workspace identity and immutable origin so a similarly named or
shared actor cannot cross workspace boundaries or make a manual note appear to be a verified
system event. Client-created notes always use the server-owned `audit.manual.note` action.
Historical inventory events without provable origin are labeled `legacy_unverified`; a
migration must never promote them to `system` provenance.

Commercial owners and Facility Owners/Managers mutate this ledger. Facility Staff remain
read-only; full-audit access follows the Facility audit-read permission rather than inventory
write permission. The retained legacy Facility endpoints must delegate to the same ledger,
transaction, unit/history, archive, provenance and audit rules and may not become a second
write path.

## Safety and exclusions

All records are workspace-scoped and audited. Consequential writes are idempotent and
reversible where possible. External communication, invoice/payment handoff, inventory
adjustment, purchasing, assignment and publication require explicit confirmation.

Do not expand this method into full CRM, accounting/bookkeeping, bank reconciliation,
payroll, tax advice/preparation, HR, customer profiling, automated outreach/collections,
credit/loan decisions, legal-contract automation, procurement automation, dispatch
optimization, full POS or autonomous purchasing. Export, import, link or hand off to the
specialized system instead.

Named commercial products and open-source projects are architecture research leads only.
Do not copy their code, screenshots, claims or workflows until the exact source, current
behavior, license compatibility, security posture and required attribution are reviewed
and recorded in the source registry.

Reference implementations may inform only the reusable pattern above. Before adapting
open-source code, record the repository URL, immutable revision, license text, dependency
and vulnerability review, copied or modified files, attribution obligations and a
GrowPath-specific security review. Until that record exists, implement the contract from
GrowPath requirements rather than copying source.
