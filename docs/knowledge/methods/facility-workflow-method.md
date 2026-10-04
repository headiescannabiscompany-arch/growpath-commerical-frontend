# Facility Workflow

The Facility route boundary is the sole automatic selection restorer. The shared provider only synchronizes account mode; it must not seed a placeholder identity, select the first membership, or race a manual selection. Acceptance must cover the real provider and route together, including a failed authorized-list read before any operational request.

Direct-entry and reloaded Facility routes restore the selected workspace from the authenticated Facility list before mounting operational screens. Match exactly one saved row by its ID or server-provided canonicalFacilityId; never substitute a public session alias for an operational ID, guess from names, or choose the first row. Preserve readable saved metadata and existing explicit selection. Missing, ambiguous or failed restoration offers Retry and Select Facility without exposing operational actions. Account/session/role/Facility changes invalidate late restoration. Existing membership and subscription authorization remains server enforced.

Facility Team keeps failed reads distinct from zero members. Offer single-flight Refresh/Retry, label retained lists, preserve same-context invitation drafts, and disable role changes, removals and task-assignment handoffs until current records are readable. Serialize invites, member writes and refresh; confirmed writes remain distinct from failed follow-up reads. Account/session/Facility/role/capability changes discard old lists and drafts and ignore late results. Refresh invalidates a pending removal confirmation. This does not grant permissions or change invitation, owner-protection, removal or backend audit rules.

Web compliance export dispatch is not proof of file delivery. Say Download requested and ask the operator to check browser downloads; never claim the file was saved from an anchor click alone. Keep the generated object URL alive until the next export or account/session/Facility/role/capability change or unmount, then revoke it. A failed dispatch also releases it. This is a page-local lifetime only, not persistent storage or a public share link.

Facility Reports preserves a labeled last-successful summary after refresh failure and offers single-flight Retry; initial or invalid summaries remain unavailable, never fabricated zero counts. Returned summary identity must match the selected Facility and required counts must be valid. Export remains a separate capability-gated read and may recover independently of summary availability. Clear earlier packet success when another export starts; validate packet identity, timestamp and count metadata before offering a download. Account/session/Facility/role/export-capability changes discard old summaries and packet feedback and ignore late reads or downloads. Preserve existing server authorization, export contents, filename rules and evidence-readiness calculations. A packet coverage indicator is not certification of legal compliance.

The Compliance overview keeps counts unknown until its combined record read succeeds. Failed reads offer visible single-flight Retry; retained snapshots are labeled as previous, never current readiness. Same-context retry preserves unfinished deviation/rejection input. Writes wait for readable records, serialize with refresh, and distinguish confirmed actions from failed follow-up reads. Identity/session/Facility/role/capability changes discard previous records, drafts and late results. No audit permission means unavailable audit counts, not zero. Existing compliance calculations, role permissions and independent report/AI/SOP navigation remain unchanged; overview acceptance does not certify export contents or legal compliance.

SOP Library and Start Run require a valid, current template collection before empty guidance or record-backed actions. Visible single-flight Refresh/Retry preserves same-context drafts, labels retained snapshots and never invents saved IDs. Start Run accepts only a current active saved selection or the existing reviewed one-off workflow. Serialize refresh, document picking/upload, save and retirement; a confirmed write followed by a failed refresh remains confirmed. Account, session, role, Facility and relevant route changes discard old drafts and ignore late completions, including uploads. Existing template review, retirement, checklist, permission and navigation semantics stay unchanged. Automated mutation tests do not establish hosted write acceptance.

SOP comparison choices require a successful, valid saved-run collection before showing empty guidance or enabling comparison. Single-flight Retry preserves same-context choices but stale choices cannot authorize comparison. Results require two distinct valid route identities and two matching saved records with readable step arrays; resolve the pair atomically, withhold old results during refresh/failure, and offer read-only Retry. Account, session, Facility, role or route changes discard old choices/results and ignore late reads. Do not invent IDs or zero-step outcomes from malformed records. Existing checklist comparison semantics, permissions and follow-up links stay unchanged. Hosted empty/missing-record recovery is not populated hosted comparison acceptance.

Facility Inventory detail requires a matching saved identity and finite stock balance before enabling changes. Failed reads offer visible Retry without claiming missing or zero stock; retained snapshots are labeled and same-context retries preserve detail, movement and lot drafts. Refresh, history reads, detail saves, movements, lot creation and removal serialize. Removal names the saved item, requires explicit confirmation, preserves drafts on Cancel and retains the backend archival/ledger rules. Archived history remains readable. Confirmed writes distinguish failed follow-up reads; account, session, Facility, role and route changes clear drafts and ignore late completions. Hosted missing-record/read-only evidence is distinct from automated populated-write tests.

SOP detail must not invent an Active run or checklist when its read fails or returns
an unavailable envelope. Offer visible Retry; retained records after refresh failure
are explicitly previously loaded and cannot authorize edits. Same-context Retry
preserves unfinished step input. Serialize refresh, step changes and completion;
distinguish a confirmed write from an unsuccessful response/read refresh and lock
further writes until recovery. Account, session, Facility, role and run changes
discard prior drafts and late read/write results. Existing capability checks and
completed-run immutability remain unchanged. Hosted missing-record recovery and
automated populated-record checks are distinct acceptance evidence.

Facility Inventory and SOP-run collection failures must not claim zero records,
empty stock, completed evidence, or no runs. Provide single-flight visible Retry;
retain and label the last successful snapshot after refresh failure. Inventory
search survives same-context retry. List-based Create Item, Start Run and snapshot
CSV actions wait for a current successful read. Independent audit, library and
reviewed-import workflows retain their own authorization/read boundaries. Account,
session, Facility, role and grow-return changes reset collection state and discard
late completions. These are list-read safeguards, not new permissions or evidence
that every inventory/SOP detail, write or Facility role has passed acceptance.

Facility dashboard plant counts accept the hosted `{ plants: [...] }` response
alongside existing collection envelopes; readable plant records must not become
zero because of their envelope. Plants and Journal lists distinguish unknown or
failed reads from confirmed empty collections. Provide explicit single-flight
Refresh/Retry and label retained counts as previously loaded after a read failure.
Same-context retries and failed saves preserve unfinished input. Account/session,
Facility, role and grow/SOP context changes discard prior records/drafts and late
results. Writes require readable current records and cannot overlap refresh;
after-save refresh is internal to the same serialized operation. Existing role
permissions, data scope, payloads and navigation remain unchanged.

Plants, Journal, Inventory and SOP Library opened from a Facility grow return Back
explicitly to that grow, including loading/empty states and after a reload. Journal
evidence opened from an SOP run returns to the exact SOP run ahead of grow context.
Unscoped entry preserves the existing history/fallback policy. Return context is
navigation only: Inventory and SOP Library remain Facility-wide; it must not change
queries, permissions, saved records, assignments or operational evidence.

Facility grow-list summaries resolve room labels only from the exact saved room
inside the selected Facility or a saved embedded room name. Never stringify room
objects or substitute raw IDs for names. Room-name lookup failure keeps readable
grows, labels the missing names and retries through Refresh. Context changes and
unmount discard late room lookups with the corresponding grow read. Calendar-only
dates preserve the chosen day; timestamps use the viewer's local date. Missing or
invalid dates stay unavailable, and creation time is labeled Created rather than
inventing a grow start. Grow detail Back returns explicitly to the Facility grow
list so a task-return history entry cannot trap the operator on the same grow.
These are read-only presentation/navigation rules, not record or crop-state changes.

Facility task removal requires a separate in-page confirmation naming the saved
task, with a cancel action that performs no write and preserves unfinished edits.
Explain the existing soft-removal boundary truthfully: the task and audit history
are retained, unsaved edits are not saved, and this screen has no restore action.
Keep Owner/Manager plus task-write authorization and single-flight read/write
guards. Refresh, save, completion, and account/Facility/role/route changes invalidate
the pending confirmation; failed removal remains on the record with retry feedback.
Grow-scoped task queues return Back to the exact grow explicitly instead of using
unrelated tab history. Unscoped task queues retain their existing back behavior.

Facility grow and task lists/details must distinguish failed reads from confirmed
empty or missing records, offer visible single-flight Retry, and label retained
snapshots as previously loaded. Preserve unsaved same-context task fields and crop
choices across read recovery. Account/session, selected Facility, role or route
changes discard prior records and drafts and ignore late results. Optional team
lookup failures must not erase readable tasks or imply an empty team; assignment
requires readable current choices. Record-derived writes wait for successful reads,
and refresh cannot overlap creation, saving, completion or removal. Existing roles,
payloads, crop-visibility rules and private operational-record boundaries remain
unchanged. This read-recovery review is not evidence that every Facility workflow
or role has completed hosted acceptance.

Facility Rooms reads distinguish unknown collections from successful empty results.
Failed equipment or cycle reads keep readable rooms but never claim zero related
records. Label retained records during refresh or after failure; offer visible,
single-flight read-only Retry without erasing same-context drafts. Room-derived
writes wait for successful current reads, and manual refresh cannot overlap a write
or form-assistant request. Account/session, selected Facility, role or room-route
changes clear earlier records and drafts and ignore late reads. Existing room,
equipment, cycle, import and role rules remain authoritative and unchanged.

Facility dashboard totals remain unknown until their reads succeed. An unavailable
verification, audit, SOP, team or batch read must not become zero, Clear, or No
pending checks. Keep successful independent records visible, provide a single-flight
read-only refresh, and explicitly label retained snapshots during refresh and after
failure. Account/session, selected Facility and role changes discard the previous
dashboard and late responses. Preserve existing navigation and role exclusions;
dashboard summaries never certify compliance or grant permission to a linked action.

Facility outreach analytics use the same recorded Feed campaign events as Commercial while remaining facility scoped. Measure education/outreach impressions, clicks, explicit conversions, hides, and reports without introducing direct-sales claims or exposing viewer identity in owner-facing summaries.

Facility outreach destinations must be selected from readable public course, live-event, and Forum/Q&A records whenever those lists are available. Show record titles instead of internal identifiers, preserve the selected canonical identifier in the campaign payload, and keep manual identifiers or slugs behind an explicitly labeled advanced fallback. A failure in one destination list must not erase the other lists or prevent an authorized operator from using a known valid reference.

Facility Forum participation uses the shared discussion engine with membership-verified Facility identity and Facility/room/SOP-adjacent context links. Facility-only discussion must remain scoped to the selected Facility and must not become public commercial advertising.

Facility-internal Forum reads and writes require an active membership for the selected Facility. Public education remains a separate public Forum thread; internal room and operational discussion must use `facilityOnly` visibility and exact Facility context.

Facility Forum replies, mentions, unanswered internal questions, and task creation remain Facility scoped. AI suggestions are review-only and cannot create operational tasks, change records, or invent room/SOP context without user confirmation.

Facility Forum reports may enter the shared platform moderation queue without changing Facility visibility. Repeated reports from the same account for the same post are idempotent and cannot increase an automatic hold threshold. Moderator hide, restore, soft-remove, lock, pin, and move actions require platform authorization and an auditable case history; moderation must never make Facility-only content public.

A Facility-scoped report must be stored before administrator-email delivery. Notification links may open the exact content only through its existing authorization boundary and may focus the corresponding platform moderation case; email failure never removes the report or changes Facility visibility.

Hidden and soft-removed Facility Forum posts must be removed from every eligible feed projection without changing their Facility-only scope. Restore must reapply the existing visibility boundary, locked threads must reject all reply-write paths, and soft removal must preserve the post, evidence snapshot, case history, and platform audit records for review and reversal.

Facility means rooms/zones, facility grows, staff/roles, assignments, SOPs, tasks, inventory, sensors, audit and compliance-style records. It is not the commercial storefront workspace and must not pretend to work without a selected facility.

A Facility room with no grow remains a valid operational record. Its grow view must offer the supported grow-start workflow instead of referring vaguely to backend records. When the operator enters grow setup from one room, preselect only that exact room; never silently attach a new grow to every Facility room. Keep room-card actions precise: a grow-list action must say it opens grows, while equipment and batch-cycle setup remains in the room workspace.

The selected Room Workspace and the New Room draft are separate state. Selecting or editing an existing room must not overwrite the draft room type, tracking mode, stage, placement, or location that the operator is preparing for a new room.

Confirmed Facility writes must be read-after-write coherent in the active workspace. After a task is created, reconcile the returned record into the selected Facility queue immediately and refetch the canonical list without browser or intermediary caching. A stale follow-up read must not erase the confirmed record from the visible queue; later canonical reads may replace it once the stored record is present.

Facility invitation acceptance is also a read-after-write boundary. After creating an active membership, expose that membership in the canonical session without changing the human's primary Personal or Commercial account, force a fresh session read, select the invited Facility, and wait for Facility mode before routing. Facility role capabilities use the selected Facility's active or trialing subscription, not the invited human's separate personal plan.

Facility subscription cancellation is selected-Facility scoped and schedules provider cancellation at the current period end. Preserve active or trialing Facility entitlement through `currentPeriodEnd`, show the paid-through date instead of claiming another renewal, and remove repeat cancellation controls after confirmation. Checkout, Stripe billing management, and cancellation require the owner membership for that exact Facility workspace. Staff, viewers, Facility administrators, and platform administrators may read status when otherwise authorized, but their titles alone do not grant billing mutation or subscriber acceptance.

Facility AI credits belong to the selected Facility subscription. Balance display, provider-work reservation, failed-call refund, and the weekly usage ledger must all resolve the same authorized Facility identifier. A Facility AI request must fail when Facility context is missing or unauthorized and must never fall back to displaying, debiting, or refunding the individual member's Personal or Commercial credit balance. Personal and Commercial credit balances remain individual-account scoped outside Facility mode.

For a legacy active Facility with no Facility subscription record, the backend may materialize the missing Facility balance only when the owner still has an effective active or trialing Facility-plan entitlement. Existing Facility subscription state remains authoritative, including canceled or delinquent state. Migration creates a new Facility-owned allowance and must never copy, display, debit, or refund the owner's individual balance.

Facility membership does not replace the human's individual account. After ordinary sign-in, a human with both individual and Facility access must choose which workspace to enter, even when one choice matches the saved current preference. The same eligible choices remain available later through Switch Workspace; changing workspaces must not require another account or another login.

`/account/workspace` and `/account/mode` are production direct-entry and hard-reload routes. The production export and hosting fallback must serve the application for both routes instead of returning an HTTP 404.

Facility member removal is a consequential owner action and must use a functional confirmation on every supported platform. Web must not rely on native-only `Alert` button callbacks. Identify the exact target by readable name, email, and role when available, execute the removal only after explicit confirmation, refresh the canonical team list, and retain historical task and audit records. Never allow an owner to remove the last owner membership.

Facility task queues and detail screens must show named team members, named rooms, readable task metadata, and semantic linked-record actions. Queue rows link directly to the selected task through a stable, accessible route. Raw database fields, Facility IDs, user IDs, room IDs, source-object IDs, and JSON records are not the primary operational interface. Assignment and room changes use the Facility's actual selectable records; manual linked-record references are advanced fallback controls only.

Facility task, SOP, room, grow, compliance, and scheduling dates use the shared date picker with direct year, month, and day selection. Timed records also expose hour and minute selection. Persist stable ISO date or local date-time values while presenting readable dates; never require an ordinary Facility operator to type an ISO date string.

Facility inventory detail screens must present readable stock, reorder, SKU, and record-time information without exposing raw database envelopes or internal identifiers. Authorized owners and managers must be able to remove duplicate, test, or mistakenly created inventory through an explicit confirmation step; ordinary stock changes belong in the quantity-adjustment workflow.

Facility workspace headings, operational summaries, and downloaded evidence filenames must identify the selected Facility by its readable name. If the name is not available, use a neutral label such as `Selected facility`; never substitute the internal Facility identifier as user-facing context or as a downloaded filename.

Facility AI template links must open a visibly specialized workflow instead of a generic grow assistant. A template may prefill a review request but must not submit it or spend AI credits until the operator chooses Send. Inspection-readiness context must use record-backed audit, deviation, verification, SOP, task, inventory, and integration evidence; missing evidence stays missing, and AI must never certify legal compliance or invent jurisdiction rules.

The Facility AI hub must visibly link the supported AI template directory instead of leaving it as a route-only surface. The Facility AI Validation Lab must also have a discoverable hub entry, but render that entry only for a Facility owner who holds the settings-edit capability. Managers, staff, and viewers must not be invited into an owner-only quality-control surface even though the direct route also enforces its own boundary.

The Facility AI hub must keep crop-neutral Plant/Crop Identification, Plant Diagnosis, IPM Scout, environment review, mix builders, and Facility-scoped Saved Runs reachable from the selected Facility. Shared tool routes must retain the selected Facility scope, charge the Facility balance, save into the Facility run history, and return Back to Facility AI. Cannabis-specific discovery such as Harvest Readiness appears only when structured selected-Facility grow context or prior eligible Facility workflow evidence identifies cannabis/hemp context; a facility name, free-text note, or unconfirmed image candidate is not enough. Harvest Readiness itself may run without attaching a grow, but the run and media remain Facility scoped, an authorized write role is required, Facility credits are charged, and grow-linked actions remain unavailable until a grow is selected. Facility grow creation and grow detail must provide an explicit crop-type control so an authorized owner or manager can establish or correct that structured context. A crop-identification result that recognizes cannabis remains the evidence-handling exception and must not unlock the cannabis tool section by itself.

Facility AI prompts and parental-control PIN fields must opt out of account-credential autofill. The AI composer is ordinary user-authored text, and the parental PIN is a separate one-time-style control value; neither field may invite a browser or device password manager to insert a saved GrowPath email or password.

The Facility AI Validation Lab is a platform-operations surface for a capable Facility owner, not a general member tool. It must retain the selected Facility boundary, explain which operations can create validation or feedback records, prevent duplicate concurrent submissions, keep every payload field locked while a request is active, and provide readable progress, error, success, and response feedback. Managers, staff, and viewers must not receive payload fields, endpoint actions, or training-feedback exports even if stale capability state says otherwise.

Facility training lesson video follows the shared `course-media-workflow` method while course visibility remains Facility scoped. External provider rights, availability, privacy, and accessibility review do not make a lesson public or authorize cross-Facility disclosure.

The shared Schedule and Notification Center reuse the published Facility course catalog and current requester's learner-state boundary for course-live events. Each canonical course/session pair remains a separate Facility calendar item with a Facility course link. Joining marks attendance as confirmed and supplies an in-app upcoming-session reminder card; canceling removes that reminder but leaves the published calendar event available for another RSVP. Draft, hidden, archived, quarantined, invalid, and canceled sessions are excluded. Recheck course access before projecting attendance, discard stale results after an account or Facility switch, and show a retryable verification error rather than treating failed access checks as confirmed attendance. Do not project private learner notes, creator identity, external stream credentials, or another learner's attendance. These existing on-page reminder cards and their page-local read state are not proof of background, timed, email, or device-push delivery.

Facility course scope may reconcile the selected database ID with the session's public
Facility ID only through the exact selected row's server-provided `canonicalFacilityId`.
Keep existing selector IDs and session semantics unchanged, require a recognized Facility
role, and use the resolved public ID for course requests and response binding. Membership
may be stored under the database ID: the backend must resolve the exact Facility document
and verify the same user's accepted, non-deleted membership before using its saved role.
Missing, stale, or
cross-Facility alias metadata must fail closed; never infer identity from a name or ID
suffix. Every backend request still verifies the selected Facility membership and role.

Local preview identities require an explicit preview query. A bare Facility route must preserve a real authenticated session and must never substitute a demo user or the `local-dev-facility` placeholder. API requests require the selected, authorized Facility identifier; compatibility routes must validate that identifier and fail without terminating the service.

Facility analytics are selected-facility scoped and record-backed. Task and training completion come from stored task outcomes; SOP compliance comes from applicable recorded steps; alerts come from explicit sensor/environment alert events; batches come from BatchCycle history. Room stability may be reported only when a room-linked environment event explicitly records an in-range or out-of-range state. Keep rooms with missing or ambiguous evidence in an unknown bucket rather than assuming stability.

When the legacy global alert service is unavailable, Facility Alert Center may present record-backed in-app notifications as the live alert stream. Notification-backed items may be marked read, opened at their preserved source, or converted into a source-linked task. Because notification records can outlive a deleted task, task-backed notifications open the current Facility task collection instead of promising an exact detail record that may no longer exist. Do not show assign, snooze, or AI actions for those items unless a server-backed operation and the exact notification context are available. Alert cards may show a readable assignee name or email, never a raw account identifier.

Facility reports must count stored active tasks, accepted memberships, compliance logs, and automation records for the selected Facility. If the data model does not record whether a scheduled compliance check was missed, show that metric as not tracked rather than zero. Compliance summaries should translate audit actions and structured details into readable labels while leaving the full immutable record available in the audit-log view; do not expose raw internal identifier arrays in the summary card. Export readiness must distinguish open deviations from resolved or cancelled history. Retain resolved deviations as evidence, but do not label a packet as needing cleanup merely because resolved history exists.

Facility deviations require a stable, user-facing reference that cannot collide when separate Facilities create their first or concurrent records. Deviation reads and writes remain Facility scoped, while persistence failures must pass through the API error boundary and return a controlled error; a duplicate or invalid record must never terminate the shared service.

The primary Audit Logs list and entity-history list must use the same readable action and detail summaries. Audit detail must lead with that readable action, evidence summary, recorded time, and available named actor/role before exposing the immutable payload. Raw JSON, entity IDs, and identifier arrays belong only in the deliberately opened immutable-detail view, never in the scannable operational list.

Facility SOP runs require a visible title and checklist evidence source: either an approved selected template or at least one owner-entered one-off step. Empty runs cannot become inspection evidence. Every step must explain the named action and provide an operator path to record what happened in the Facility Journal before the operator marks it done or skipped; a bare status prompt is not an executable workflow. Every step must be reviewed as done or skipped before completion, and completed runs are locked against checklist mutation. Run details and comparisons must present readable evidence summaries and step differences; raw database identifiers and JSON envelopes belong in controlled audit exports, not the primary Facility workflow. Run comparison must use two distinct user-selected saved runs and human-readable titles; owners and staff must never need to copy or type internal run identifiers. A comparison result must link directly to both named runs and to the Facility task workflow so an operator can inspect evidence and assign follow-up work instead of being stranded on a summary.

The Facility SOP Library may provide setpoint-free standard starter templates for common operational checks. A starter is an editable baseline, not an automatically installed policy, legal-compliance claim, treatment direction, or facility approval. An owner or manager must review and customize its title, category, checklist, safety/escalation notes, responsibilities, and attachments before saving it as the active Facility version. Never insert crop measurements, chemical rates, jurisdiction rules, release criteria, or unseen conditions into a starter.

Facility SOP documents are supporting references, not substitutes for executable evidence. Accept only bounded PDF, Word, text, or scanned JPG/PNG uploads from an authorized Facility owner or manager; store the asset against the selected Facility, verify attachment ownership again when saving the template, and prevent cross-Facility reuse. Every active template still requires at least one explicit checklist step. Revising a template creates a new active version while preserving the prior version for historical runs and audit evidence; retiring a template hides it from new runs without deleting its history.

Retirement must be available from the active SOP Library to an authorized owner or manager and must use an explicit cross-platform confirmation. Name the exact SOP, explain that it will be removed from new runs, and preserve prior versions, completed runs, attachments, and audit evidence. Do not label this operation as deletion. Creating, revising, and retiring a Facility SOP must each append a Facility-scoped audit event with a readable SOP title and version so the lifecycle is visible without exposing raw identifiers in the primary audit list.

Personal and Commercial AI may reuse the same starter structure only as a clearly labeled
review-only recommendation. Those workspaces do not gain Facility approval, assignment,
upload, versioning, run-evidence, retirement, or audit controls. A recommended draft may
become a grow review task only after explicit user confirmation; it cannot create or alter
a Facility SOP. The shared starter baseline must use workspace-neutral language so a
non-Facility recommendation does not silently acquire a Facility plan, rating scale,
approved limit, deviation process, label, or responsible Facility role. Facility-specific
terms belong only in the owner/manager customization or selected Facility records.

Sensor and controller integrations begin read-only. Store provider credentials only in encrypted backend fields and expose only configured/encrypted state, never secret values. Each connection must declare provider capabilities, connection status, structured errors, and last-sync state; an adapter is incomplete until it implements connection testing, device discovery, and data pulling. Control/setpoint writes require a separately reviewed future permission scope.

Import setup is a reviewed sequence: select provider, save encrypted credentials, test the connection, fetch provider structure, preview devices and metrics, edit room/zone mappings, then confirm. Only Facility owners and managers may confirm Facility mappings. Confirmation records the proposed structure; it does not itself create rooms, zones, alerts, dashboards, or controller actions.

After confirmation, an owner or manager may explicitly auto-build Facility rooms and durable integration spaces. Builds must be idempotent and retain read-only devices/streams; generated alert and dashboard definitions remain drafts until separately reviewed and activated.

Facility equipment is one facility-scoped asset and service-history record, regardless of whether an older client uses the singular `/api/facility` or plural `/api/facilities` URL. Members may read active equipment; only an owner or manager may create, change, archive, or append maintenance and calibration evidence. Never accept a client-supplied replacement for an existing service-history array. Each service entry preserves the server-authenticated actor, recorded time, details, result, optional next due date, and used spare parts; every mutation appends a Facility audit event. A stale expected version must conflict instead of overwriting newer work. Routine removal archives the asset and retains its service history rather than deleting it. Dates use the shared calendar picker. Maintenance, calibration, and due-state evidence may support a reviewed corrective-task draft, but neither deterministic warnings nor AI may claim work occurred, certify equipment, change a controller, or close a safety/compliance requirement.

Support separate Clone, Tissue Culture, Seedling, Vegetative, Flower, Mother, Dry, Cure and Cold Storage purposes. A seedling area may be a dedicated room or a tracked rack/zone in veg. Layout recommendations are optional and evidence/environment driven. Keep every AI retrieval facility scoped.

Synthetic Facility QA uses a two-phase evidence lifecycle. Seed readiness may include private test/staging-only accounts, broad synthetic boundary profiles, executable QA checklists, and deterministic telemetry while records still have a planned seed state. Scenario-run results, browser evidence, persistence checks, and cross-role acceptance are post-seed evidence and must never be fabricated as a prerequisite to creating the records they test. Synthetic QA approval does not authorize production identifiers, publication, product claims, operational setpoints, external media, or source-rights decisions.
