# Commercial Workflow

Feed campaign performance comes from recorded impressions, destination clicks, explicit downstream conversions, hides, and reports. Aggregate performance by campaign, eligible placement, and matched grow interest; never infer a conversion from an impression or claim causation from audience overlap.

Feed campaign placement must preserve the primary job of each page. The Personal home command center uses no supplemental side rail: Free may show one clearly labeled promotion near the top and one after the workspace content, while paid plans show at most one clearly labeled promotion near the top. Never place a middle campaign on Personal home or let campaign density narrow or displace the grow, alert, task, and journal workspace.

Commercial Feed/Campaigns authoring uses one page-level heading. Campaign types and filters must be named single-choice controls, placements must be named multi-select controls, and publish must be a named button. Expose checked or disabled state so keyboard and assistive-technology users receive the same review and publishing workflow. The review must distinguish an unpublished draft's planned post-publish status from its current state, and campaign filters must use user-facing labels instead of raw API values.

Commercial tab navigation must expose only the active screen to web keyboard and assistive-technology navigation. Initialize screen detachment at the application root so inactive tab routes are removed from layout and focus order instead of relying on `aria-hidden` around still-focusable descendants. When a route renders its own page heading, hide the duplicate navigator header and keep exactly one level-one heading. At compact widths, keep the active secondary workspace represented in the tab bar and provide a named More destination that links every workspace omitted from the primary tabs; never remove a Commercial destination without a visible replacement path.

Commercial campaign, live-event, production, trial, and task dates use the shared date picker with direct year, month, and day selection. Timed events also expose hour and minute selection. Persist stable ISO date or local date-time values while presenting readable dates; never require an ordinary Commercial user to type an ISO date string.

At compact widths, shared page content and campaign rails must remain in normal document flow without flex shrink or overlap. A campaign card must never cover, intercept, or displace a Commercial form control.

Commercial Product Lines must use one level-one page heading, level-two headings for authoring, saved lines, and guidance sections, and level-three headings for individual saved lines. Hide the duplicate navigator header when the page provides that hierarchy.

Commercial Product Line creation and detail editing are single confirmed writes. Prevent duplicate load, create, and save requests; disable the edited fields while a write is active; preserve the owner's draft after failure; expose progress, success, retry, and error feedback inside the page; and keep a Commercial-safe back destination. Never clear an unsaved Product Line draft, submit it twice, or depend on a native-only alert for a create or update failure.

The Soil & Nutrient Batch Planner must use one level-one page heading, level-two headings for metrics, authoring, saved batches, and guidance sections, and level-three headings for individual saved batches. Keep Product Batches as the navigation destination label, preserve the user-facing planner name on the page, and hide the duplicate navigator header.

Commercial Product Trials must use one level-one page heading, level-two headings for authoring, saved trials, evidence collection, claim guidance, and publishable-result guidance, and level-three headings for individual saved trials. Hide the duplicate navigator header when the page provides that hierarchy.

Commercial Product Trial Evidence Runs must use one level-one page heading, distinct level-two headings for overview metrics, authoring, saved runs, advanced planning, evidence-to-claim guidance, and the trial setup checklist, and level-three headings for individual saved evidence runs. Hide the duplicate navigator header and do not reuse one generic section title for different evidence jobs.

Commercial Inventory Support must use one level-one page heading, level-two headings for stock overview, scope guidance, and inventory records, and level-three headings for individual saved records. Hide the duplicate navigator header. Authorized write entry points must be named actionable controls: the create action must identify that it creates an inventory support record, preserve the Commercial inventory-write capability check, and route to the canonical `/home/commercial/inventory/new` form; do not render a visually clickable but semantically generic control.

Commercial Product Trial creation must prefer readable, owner-scoped choices from saved Products, Product Lines, Product Batches, and Product Trial Evidence Runs. Show the record name and selected state, provide the appropriate create action when a record type is empty, and keep direct record-ID entry behind an explicitly labeled advanced control. Never require an ordinary Commercial user to find or paste database IDs for the primary trial-linking workflow.

Commercial Product Trial creation is a single confirmed write. Plant count, when supplied, must be a positive whole number. Prevent duplicate loads and creates, disable conflicting fields and linked-record choices while saving, retain a failed draft, and expose loading, retry, progress, success, and error states inside the page on every supported platform.

Commercial Product Trial detail, claim-safe review, and claim-readiness task creation are mutually exclusive single-flight writes. Lock both editing surfaces and the task action while any write is active, retain failed detail/review drafts, keep each task linked to the exact trial evidence context, and announce loading, retry, progress, success, and failure in page. Never allow one fast repeated action to create duplicate reviews, updates, or evidence tasks.

Commercial Product Batch creation must use the same readable linking pattern for saved Products, Product Lines, and Product Trial Evidence Runs. Preserve optional unlinked states and correct empty-state creation paths, and keep direct record-ID entry behind an explicitly labeled advanced control. Never make copied database IDs the primary path for connecting a production batch to its Commercial records.

Commercial Product Batch creation and AI prefill are separate single-flight operations. Batch volume and estimated cost, when supplied, must be finite non-negative values rather than silently disappearing from a submitted record. Disable conflicting fields and choices while either operation is active, preserve owner-entered values when AI leaves a field unknown, retain the full draft after failure, include general production notes, and show progress, success, retry, and errors in the page.

Commercial Product Batch detail editing and production-task creation are mutually exclusive single-flight writes. A blank estimated cost remains unknown and a supplied cost must be finite and non-negative; never turn a blank into zero or silently omit an invalid value. Lock the detail fields and task action while either request is active, retain failed edits, and keep production tasks linked to the exact batch, product, line, and evidence-run context.

Commercial Product Trial Evidence Run creation must use readable, owner-scoped choices from saved Products, Product Lines, and Product Batches. Preserve optional unlinked states, provide the correct creation path when a record type is empty, use named public-share choices with readable guidance, and keep direct record-ID entry behind an explicitly labeled advanced control. Never require an ordinary Commercial user to find or paste database IDs or interpret a raw public-share status code while creating an evidence run.

Commercial Inventory Support creation must offer named item-type choices and readable, owner-scoped selectors for saved Products and Product Trial Evidence Runs. When a selectable record type is empty, route to its canonical creation page; keep custom types and direct product, ingredient, genetics, and evidence-run IDs behind an explicitly labeled advanced control. Never make opaque record IDs or undocumented type values the default inventory setup workflow.

Commercial catalog import is a review-first draft workflow. CSV and PDF selection, parsing, extraction, and draft creation must be single-flight, preserve the selected source name, lock conflicting fields and actions while work is active, and show readable in-page progress, success, informational fallback, and failure feedback on web and mobile. A device that cannot directly read a selected CSV must retain the paste-and-preview path instead of depending on a native-only alert. PDF extraction requires a protected uploaded source URL, and every proposed row remains unpublished until the owner reviews and separately publishes the resulting product.

Commercial Inventory Support creation is a single confirmed write. Quantity and an optional reorder point must be finite, non-negative values rather than silently becoming zero after invalid input. Disable conflicting fields, record choices, and navigation while the request is active; prevent duplicate submissions; retain the owner's draft after failure; and show loading and create errors inside the page on every supported platform instead of relying on a native-only alert.

Commercial analytics must be owner-scoped and event-backed. Attribute public storefront, product, course, and live activity through a published storefront; combine it with recorded Feed events, course engagement, live RSVPs, and paid internal orders. Preserve order currency, sanitize event labels and grow interests, and never infer a view, click, conversion, RSVP, order, or revenue value from another event. Keep one level-one Commercial Analytics page heading and expose each metrics, breakdown, and guidance section as a level-two heading.

Commercial Forum participation uses the shared discussion engine and a server-verified brand identity. Preserve links to products, courses, lessons, lives, storefronts, evidence runs, tasks, and alerts, but keep promotional outreach in Feed campaigns.

Canonical Forum post previews must provide an accessible collapsed comments control that lazy-loads replies and a compact reply composer directly below the selected post. Keep the dedicated discussion URL available inside the expanded panel for direct links, media replies, moderation, grow-log, task, and other advanced context, and reuse the same inline-discussion component on canonical signed-in Forum preview surfaces. Never require a page transition merely to read or write an ordinary text reply.

The canonical Forum Directory must support both group discovery and group creation. Group creation requires a name and description, accepts reviewed topic labels, makes public-versus-private discoverability an explicit named choice, and reports success or API failure in context; do not strand creation in a legacy compatibility screen.

Product Q&A, course discussion, and live Q&A are Forum categories attached to their source records. They support questions and threaded help; campaign creative, offers, and reach belong in Feed/Campaigns.

Forum replies, mentions, and unanswered product/course/live questions create source-linked in-app alerts. Thread or comment task creation must preserve exact Forum and commercial-object context. Forum AI may suggest titles, categories, tags, summaries, and tasks, but must label its provider/fallback and require review before writes.

Reported commercial Forum content enters the shared moderation queue with an evidence snapshot. Repeated reports from the same account for the same post are idempotent and cannot increase an automatic hold threshold. Only authorized platform moderators may hide, restore, soft-remove, lock, pin, or move a thread; these actions must retain actor, reason, timestamps, category changes, and an immutable platform audit event.

Signed-in reports for Forum posts, Feed campaigns, storefront products, courses, videos, and live sessions must be stored before notification. The administrator email links to both the exact same-origin content route and its focused moderation case; email delivery is not the source of truth and a provider failure must not erase the report.

Hidden and soft-removed Forum posts must be removed from every shared feed projection. Restore may recreate a projection only through the post's existing visibility rules. A locked thread rejects both legacy and structured reply writes with a clear locked-discussion response. Soft removal preserves the post, evidence snapshot, action history, and audit records for review and reversal; hard deletion is not the routine moderation workflow.

Commercial is Pro grow workflow plus brand/storefront, products/lines, formulas/batches/lots, trials, inventory, courses, lives, campaigns, forum presence, orders and analytics. Commercial users still have grows: product, soil, nutrient, genetics, demo or education trials.

When one authenticated account is entitled to multiple workspaces, an explicit supported workspace preference controls routing and presentation even when the billing plan has another primary mode. Determine eligibility from the same effective active-plan capabilities used by the workspace selector; an active Facility plan that exposes Commercial capabilities must be allowed to enter Commercial. Reject unsupported or inactive-plan preferences, but do not silently force an eligible Facility account back to Facility after it deliberately selects Commercial or Personal. Treat a preference change as entitlement state that must be reapplied even when the server account response is otherwise unchanged, before any restricted workspace route decides whether to redirect.

After sign-in, an account with more than one eligible workspace must receive an explicit workspace choice before entering a workspace. The choice must distinguish the human's individual Personal account from Commercial and shared Facility workspaces, use the same effective entitlements as later switching, and allow the already-current preference to continue into its workspace. Single-workspace accounts may continue directly. Keep a persistent Switch Workspace action available after entry.

Paid-plan offers must use the authenticated account's plan-specific trial eligibility rather than generic promotional language. Each account may receive at most one 30-day trial for each paid plan: Pro, Commercial, and Facility. Consuming one plan's trial does not consume either of the other plan trials; a legacy account with only `trialUsed: true` is treated as having consumed Pro only. When the selected plan's trial is available, state its duration, payment-method requirement, and when paid billing begins. If that plan's trial has already been used or trials are disabled, state that checkout will bill the displayed price when completed and require a second explicit, price-labeled confirmation before opening Stripe. Persist the selected plan's trial use from both checkout-completion and subscription-lifecycle webhooks. A successful return must refresh the account session and visibly confirm completion; a canceled return must visibly confirm that the checkout submitted no new payment.

Gifted paid-plan checkouts must explicitly collect the recipient email and intended gift term before Stripe opens. They may include a handoff or claim link in the checkout payload, but they must not claim recipient delivery as complete until the backend mail path is actually configured and confirmed. The payer must still see the plan, term, and recipient clearly before payment, and canceled gift checkout returns must visibly confirm that no new payment was submitted.

`/account/workspace` and `/account/mode` are production direct-entry and hard-reload routes. The production export and hosting fallback must serve the application for both routes instead of returning an HTTP 404.

Public commercial-course discovery may expose a course only when both the course and its owning storefront are published. Return an explicit public-field projection with storefront identity and public course content; do not expose owner IDs, commercial account IDs, drafts, arbitrary authoring fields, or private workspace records. Reserve route words such as `public` before dynamic record-ID handlers, validate database IDs before querying, and forward route failures through the application error boundary instead of allowing a malformed public request to terminate the API.

Every public Commercial projection, including storefront directories and detail, Feed, related records, and product checkout, must exclude records in `testing` status and records explicitly marked as test-only, QA-only, synthetic, or namespaced QA seed data. Authenticated owners may still review their own testing records inside owner-scoped Commercial workflows; owner access does not publish those records for another account or an anonymous visitor.

Commercial storefront preview links require the saved real public slug. When no slug exists, show setup guidance and a disabled preview action; never send an owner to a placeholder such as `/store/your-brand`.

An eligible Commercial account may publish a storefront as a dispensary. A published dispensary must provide a city, two-letter state code, valid public coordinates for proximity search, and at least one truthful customer handoff: an `https` dispensary website or explicit in-store pickup availability. Public discovery may filter dispensaries by state or by a user-authorized current location and bounded distance, and may show only inventory linked to published product listings. Keep dispensaries out of general horticulture storefront results until the visitor explicitly chooses dispensary discovery. GrowPath does not verify licensing and must never create checkout, payment, reservation, delivery, shipping, or completed-pickup state for a dispensary item. A cannabis listing may link to the dispensary's public website or display reviewed pickup instructions, but availability remains informational and must come from the linked inventory record rather than an inferred value.

Signed-out course discovery stays learner-facing and published-only. Anonymous visitors may browse the public catalogs and receive sign-in or registration actions, but they must not see authoring, owned-course, invite, analytics, publish, or unpublish controls.

The Forum feed currently requires an authenticated account so participation, moderation identity, grow-interest filtering, and workspace context remain attributable. The signed-out `/forum` route must explain that boundary and provide sign-in and registration actions without calling the protected feed or presenting `Not authenticated` as a broken public page. Do not invent a public thread list or label an authorization failure as an empty Forum.

The shared course-detail boundary must also enforce publication. A direct `/api/courses/:id` request may show an unpublished course only to its authenticated author or a platform administrator; anonymous users and other accounts receive not found. Enrollment, checkout, questions, answers, reviews, and public recommendations must resolve published courses rather than treating knowledge of a draft ID as access.

Production authentication must ignore deterministic test identity headers such as `x-test-user-id`; those headers exist only inside the automated test environment. All production owner, Commercial, payment, authoring, and private-record access requires a verified normal authentication token.

Commercial lesson video follows the shared `course-media-workflow` method. Require provider normalization, rights and availability review, an accessible text fallback, privacy-aware third-party playback, and a provider link before publishing; do not equate provider viewing with GrowPath lesson progress.

An unavailable or unconfigured third-party integration status must appear as clear setup guidance. Do not expose raw transport codes such as `NOT_FOUND` as workflow content, and do not describe Twitch, EventSub, Stripe, email, or another integration as connected without verified configuration state. Commercial Live authoring treats EventSub status as connection-derived, read-only state; an author cannot type a connected status. Live visibility uses a named single-choice group with readable labels and an exposed checked state.

The Soil & Nutrient Batch Planner is a Commercial production tool. Surface its cost, bag-count, pull-sheet, labor, packaging, margin, inventory, formula, batch/lot, product, and trial workflow only inside the Commercial workspace; do not list it in Personal tools.

A batch calculation is not an inventory transaction. Save the reviewed calculation as an owner-scoped Commercial batch linked to its ToolRun, then create source-linked Commercial production tasks. Preserve missing costs, analyses, shrinkage, lots, and availability as unknown. Do not decrement inventory, assign lots, publish a product claim, or authorize batch release without a separate explicit reviewed action.

Integration auto-build is allowed only for an owned product trial or a Commercial grow explicitly identified as a trial, demo, or education space. Preserve read-only devices and streams and never create cultivation spaces from ordinary storefront, order, or campaign records.

Imported telemetry may support an explicitly linked product-trial evidence window. Course examples require review and de-identification before publication; sensor readings alone do not establish product performance, causation, or a publishable claim.

Commercial AI may recommend review-only operating procedure or checklist drafts from the
shared approved starter library. A recommendation must identify its starter version,
explain why it fits the selected records, preserve missing inputs as unknown, and require
human review before it can become a grow task. It is not a formally approved SOP and must
not imply Facility assignment, document control, version history, execution evidence,
audit status, or legal compliance. Shared starter wording must remain workspace-neutral:
do not refer to a Facility plan, Facility rating scale, Facility-approved limits,
deviations, Facility labels, or Facility roles unless the selected records explicitly
provide that context.

Connect formula â†’ verified ingredients â†’ batch/lot â†’ trial grow â†’ long-term outcome â†’ product claims/content. Keep commercial data scoped to the commercial workspace. AI may retrieve records but cannot invent analysis, lots, cost, inventory, trials or performance claims.
