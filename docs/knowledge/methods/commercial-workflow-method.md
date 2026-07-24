# Commercial Workflow

Feed campaign performance comes from recorded impressions, destination clicks, explicit downstream conversions, hides, and reports. Aggregate performance by campaign, eligible placement, and matched grow interest; never infer a conversion from an impression or claim causation from audience overlap.

Feed campaign placement must preserve the primary job of each page. The Personal home command center uses no supplemental side rail: Free may show one clearly labeled promotion near the top and one after the workspace content, while paid plans show at most one clearly labeled promotion near the top. Never place a middle campaign on Personal home or let campaign density narrow or displace the grow, alert, task, and journal workspace.

Commercial analytics must be owner-scoped and event-backed. Attribute public storefront, product, course, and live activity through a published storefront; combine it with recorded Feed events, course engagement, live RSVPs, and paid internal orders. Preserve order currency, sanitize event labels and grow interests, and never infer a view, click, conversion, RSVP, order, or revenue value from another event.

Commercial Forum participation uses the shared discussion engine and a server-verified brand identity. Preserve links to products, courses, lessons, lives, storefronts, evidence runs, tasks, and alerts, but keep promotional outreach in Feed campaigns.

Product Q&A, course discussion, and live Q&A are Forum categories attached to their source records. They support questions and threaded help; campaign creative, offers, and reach belong in Feed/Campaigns.

Forum replies, mentions, and unanswered product/course/live questions create source-linked in-app alerts. Thread or comment task creation must preserve exact Forum and commercial-object context. Forum AI may suggest titles, categories, tags, summaries, and tasks, but must label its provider/fallback and require review before writes.

Reported commercial Forum content enters the shared moderation queue with an evidence snapshot. Only authorized platform moderators may hide, restore, soft-remove, lock, pin, or move a thread; these actions must retain actor, reason, timestamps, category changes, and an immutable platform audit event.

Commercial is Pro grow workflow plus brand/storefront, products/lines, formulas/batches/lots, trials, inventory, courses, lives, campaigns, forum presence, orders and analytics. Commercial users still have grows: product, soil, nutrient, genetics, demo or education trials.

When one authenticated account is entitled to multiple workspaces, an explicit supported workspace preference controls routing and presentation even when the billing plan has another primary mode. Determine eligibility from the same effective active-plan capabilities used by the workspace selector; an active Facility plan that exposes Commercial capabilities must be allowed to enter Commercial. Reject unsupported or inactive-plan preferences, but do not silently force an eligible Facility account back to Facility after it deliberately selects Commercial or Personal. Treat a preference change as entitlement state that must be reapplied even when the server account response is otherwise unchanged, before any restricted workspace route decides whether to redirect.

After sign-in, an account with more than one eligible workspace must receive an explicit workspace choice before entering a workspace. The choice must distinguish the human's individual Personal account from Commercial and shared Facility workspaces, use the same effective entitlements as later switching, and allow the already-current preference to continue into its workspace. Single-workspace accounts may continue directly. Keep a persistent Switch Workspace action available after entry.

Public commercial-course discovery may expose a course only when both the course and its owning storefront are published. Return an explicit public-field projection with storefront identity and public course content; do not expose owner IDs, commercial account IDs, drafts, arbitrary authoring fields, or private workspace records. Reserve route words such as `public` before dynamic record-ID handlers, validate database IDs before querying, and forward route failures through the application error boundary instead of allowing a malformed public request to terminate the API.

Signed-out course discovery stays learner-facing and published-only. Anonymous visitors may browse the public catalogs and receive sign-in or registration actions, but they must not see authoring, owned-course, invite, analytics, publish, or unpublish controls.

The Forum feed currently requires an authenticated account so participation, moderation identity, grow-interest filtering, and workspace context remain attributable. The signed-out `/forum` route must explain that boundary and provide sign-in and registration actions without calling the protected feed or presenting `Not authenticated` as a broken public page. Do not invent a public thread list or label an authorization failure as an empty Forum.

The shared course-detail boundary must also enforce publication. A direct `/api/courses/:id` request may show an unpublished course only to its authenticated author or a platform administrator; anonymous users and other accounts receive not found. Enrollment, checkout, questions, answers, reviews, and public recommendations must resolve published courses rather than treating knowledge of a draft ID as access.

Production authentication must ignore deterministic test identity headers such as `x-test-user-id`; those headers exist only inside the automated test environment. All production owner, Commercial, payment, authoring, and private-record access requires a verified normal authentication token.

Commercial lesson video follows the shared `course-media-workflow` method. Require provider normalization, rights and availability review, an accessible text fallback, privacy-aware third-party playback, and a provider link before publishing; do not equate provider viewing with GrowPath lesson progress.

An unavailable or unconfigured third-party integration status must appear as clear setup guidance. Do not expose raw transport codes such as `NOT_FOUND` as workflow content, and do not describe Twitch, EventSub, Stripe, email, or another integration as connected without verified configuration state.

The Soil & Nutrient Batch Planner is a Commercial production tool. Surface its cost, bag-count, pull-sheet, labor, packaging, margin, inventory, formula, batch/lot, product, and trial workflow only inside the Commercial workspace; do not list it in Personal tools.

A batch calculation is not an inventory transaction. Save the reviewed calculation as an owner-scoped Commercial batch linked to its ToolRun, then create source-linked Commercial production tasks. Preserve missing costs, analyses, shrinkage, lots, and availability as unknown. Do not decrement inventory, assign lots, publish a product claim, or authorize batch release without a separate explicit reviewed action.

Integration auto-build is allowed only for an owned product trial or a Commercial grow explicitly identified as a trial, demo, or education space. Preserve read-only devices and streams and never create cultivation spaces from ordinary storefront, order, or campaign records.

Imported telemetry may support an explicitly linked product-trial evidence window. Course examples require review and de-identification before publication; sensor readings alone do not establish product performance, causation, or a publishable claim.

Connect formula → verified ingredients → batch/lot → trial grow → long-term outcome → product claims/content. Keep commercial data scoped to the commercial workspace. AI may retrieve records but cannot invent analysis, lots, cost, inventory, trials or performance claims.
