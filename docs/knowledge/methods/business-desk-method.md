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
