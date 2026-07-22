# Facility Workflow

Facility outreach analytics use the same recorded Feed campaign events as Commercial while remaining facility scoped. Measure education/outreach impressions, clicks, explicit conversions, hides, and reports without introducing direct-sales claims or exposing viewer identity in owner-facing summaries.

Facility outreach destinations must be selected from readable public course, live-event, and Forum/Q&A records whenever those lists are available. Show record titles instead of internal identifiers, preserve the selected canonical identifier in the campaign payload, and keep manual identifiers or slugs behind an explicitly labeled advanced fallback. A failure in one destination list must not erase the other lists or prevent an authorized operator from using a known valid reference.

Facility Forum participation uses the shared discussion engine with membership-verified Facility identity and Facility/room/SOP-adjacent context links. Facility-only discussion must remain scoped to the selected Facility and must not become public commercial advertising.

Facility-internal Forum reads and writes require an active membership for the selected Facility. Public education remains a separate public Forum thread; internal room and operational discussion must use `facilityOnly` visibility and exact Facility context.

Facility Forum replies, mentions, unanswered internal questions, and task creation remain Facility scoped. AI suggestions are review-only and cannot create operational tasks, change records, or invent room/SOP context without user confirmation.

Facility Forum reports may enter the shared platform moderation queue without changing Facility visibility. Moderator hide, restore, soft-remove, lock, pin, and move actions require platform authorization and an auditable case history; moderation must never make Facility-only content public.

Facility means rooms/zones, facility grows, staff/roles, assignments, SOPs, tasks, inventory, sensors, audit and compliance-style records. It is not the commercial storefront workspace and must not pretend to work without a selected facility.

Confirmed Facility writes must be read-after-write coherent in the active workspace. After a task is created, reconcile the returned record into the selected Facility queue immediately and refetch the canonical list without browser or intermediary caching. A stale follow-up read must not erase the confirmed record from the visible queue; later canonical reads may replace it once the stored record is present.

Facility task queues and detail screens must show named team members, named rooms, readable task metadata, and semantic linked-record actions. Queue rows link directly to the selected task through a stable, accessible route. Raw database fields, Facility IDs, user IDs, room IDs, source-object IDs, and JSON records are not the primary operational interface. Assignment and room changes use the Facility's actual selectable records; manual linked-record references are advanced fallback controls only.

Facility workspace headings, operational summaries, and downloaded evidence filenames must identify the selected Facility by its readable name. If the name is not available, use a neutral label such as `Selected facility`; never substitute the internal Facility identifier as user-facing context or as a downloaded filename.

Facility AI template links must open a visibly specialized workflow instead of a generic grow assistant. A template may prefill a review request but must not submit it or spend AI credits until the operator chooses Send. Inspection-readiness context must use record-backed audit, deviation, verification, SOP, task, inventory, and integration evidence; missing evidence stays missing, and AI must never certify legal compliance or invent jurisdiction rules.

Facility AI prompts and parental-control PIN fields must opt out of account-credential autofill. The AI composer is ordinary user-authored text, and the parental PIN is a separate one-time-style control value; neither field may invite a browser or device password manager to insert a saved GrowPath email or password.

Facility training lesson video follows the shared `course-media-workflow` method while course visibility remains Facility scoped. External provider rights, availability, privacy, and accessibility review do not make a lesson public or authorize cross-Facility disclosure.

Local preview identities require an explicit preview query. A bare Facility route must preserve a real authenticated session and must never substitute a demo user or the `local-dev-facility` placeholder. API requests require the selected, authorized Facility identifier; compatibility routes must validate that identifier and fail without terminating the service.

Facility analytics are selected-facility scoped and record-backed. Task and training completion come from stored task outcomes; SOP compliance comes from applicable recorded steps; alerts come from explicit sensor/environment alert events; batches come from BatchCycle history. Room stability may be reported only when a room-linked environment event explicitly records an in-range or out-of-range state. Keep rooms with missing or ambiguous evidence in an unknown bucket rather than assuming stability.

Facility reports must count stored active tasks, accepted memberships, compliance logs, and automation records for the selected Facility. If the data model does not record whether a scheduled compliance check was missed, show that metric as not tracked rather than zero. Compliance summaries should translate audit actions and structured details into readable labels while leaving the full immutable record available in the audit-log view; do not expose raw internal identifier arrays in the summary card.

The primary Audit Logs list and entity-history list must use the same readable action and detail summaries. Raw JSON, entity IDs, and identifier arrays belong only in the deliberately opened immutable-detail view, never in the scannable operational list.

Facility SOP runs require a visible title and checklist evidence source: either an approved selected template or at least one owner-entered one-off step. Empty runs cannot become inspection evidence. Every step must be reviewed as done or skipped before completion, and completed runs are locked against checklist mutation. Run details and comparisons must present readable evidence summaries and step differences; raw database identifiers and JSON envelopes belong in controlled audit exports, not the primary Facility workflow. Run comparison must use two distinct user-selected saved runs and human-readable titles; owners and staff must never need to copy or type internal run identifiers.

Sensor and controller integrations begin read-only. Store provider credentials only in encrypted backend fields and expose only configured/encrypted state, never secret values. Each connection must declare provider capabilities, connection status, structured errors, and last-sync state; an adapter is incomplete until it implements connection testing, device discovery, and data pulling. Control/setpoint writes require a separately reviewed future permission scope.

Import setup is a reviewed sequence: select provider, save encrypted credentials, test the connection, fetch provider structure, preview devices and metrics, edit room/zone mappings, then confirm. Only Facility owners and managers may confirm Facility mappings. Confirmation records the proposed structure; it does not itself create rooms, zones, alerts, dashboards, or controller actions.

After confirmation, an owner or manager may explicitly auto-build Facility rooms and durable integration spaces. Builds must be idempotent and retain read-only devices/streams; generated alert and dashboard definitions remain drafts until separately reviewed and activated.

Support separate Clone, Tissue Culture, Seedling, Vegetative, Flower, Mother, Dry, Cure and Cold Storage purposes. A seedling area may be a dedicated room or a tracked rack/zone in veg. Layout recommendations are optional and evidence/environment driven. Keep every AI retrieval facility scoped.

Synthetic Facility QA uses a two-phase evidence lifecycle. Seed readiness may include private test/staging-only accounts, broad synthetic boundary profiles, executable QA checklists, and deterministic telemetry while records still have a planned seed state. Scenario-run results, browser evidence, persistence checks, and cross-role acceptance are post-seed evidence and must never be fabricated as a prerequisite to creating the records they test. Synthetic QA approval does not authorize production identifiers, publication, product claims, operational setpoints, external media, or source-rights decisions.
