# Facility Workflow

Facility outreach analytics use the same recorded Feed campaign events as Commercial while remaining facility scoped. Measure education/outreach impressions, clicks, explicit conversions, hides, and reports without introducing direct-sales claims or exposing viewer identity in owner-facing summaries.

Facility Forum participation uses the shared discussion engine with membership-verified Facility identity and Facility/room/SOP-adjacent context links. Facility-only discussion must remain scoped to the selected Facility and must not become public commercial advertising.

Facility-internal Forum reads and writes require an active membership for the selected Facility. Public education remains a separate public Forum thread; internal room and operational discussion must use `facilityOnly` visibility and exact Facility context.

Facility Forum replies, mentions, unanswered internal questions, and task creation remain Facility scoped. AI suggestions are review-only and cannot create operational tasks, change records, or invent room/SOP context without user confirmation.

Facility Forum reports may enter the shared platform moderation queue without changing Facility visibility. Moderator hide, restore, soft-remove, lock, pin, and move actions require platform authorization and an auditable case history; moderation must never make Facility-only content public.

Facility means rooms/zones, facility grows, staff/roles, assignments, SOPs, tasks, inventory, sensors, audit and compliance-style records. It is not the commercial storefront workspace and must not pretend to work without a selected facility.

Facility analytics are selected-facility scoped and record-backed. Task and training completion come from stored task outcomes; SOP compliance comes from applicable recorded steps; alerts come from explicit sensor/environment alert events; batches come from BatchCycle history. Room stability may be reported only when a room-linked environment event explicitly records an in-range or out-of-range state. Keep rooms with missing or ambiguous evidence in an unknown bucket rather than assuming stability.

Sensor and controller integrations begin read-only. Store provider credentials only in encrypted backend fields and expose only configured/encrypted state, never secret values. Each connection must declare provider capabilities, connection status, structured errors, and last-sync state; an adapter is incomplete until it implements connection testing, device discovery, and data pulling. Control/setpoint writes require a separately reviewed future permission scope.

Import setup is a reviewed sequence: select provider, save encrypted credentials, test the connection, fetch provider structure, preview devices and metrics, edit room/zone mappings, then confirm. Only Facility owners and managers may confirm Facility mappings. Confirmation records the proposed structure; it does not itself create rooms, zones, alerts, dashboards, or controller actions.

After confirmation, an owner or manager may explicitly auto-build Facility rooms and durable integration spaces. Builds must be idempotent and retain read-only devices/streams; generated alert and dashboard definitions remain drafts until separately reviewed and activated.

Support separate Clone, Tissue Culture, Seedling, Vegetative, Flower, Mother, Dry, Cure and Cold Storage purposes. A seedling area may be a dedicated room or a tracked rack/zone in veg. Layout recommendations are optional and evidence/environment driven. Keep every AI retrieval facility scoped.

Synthetic Facility QA uses a two-phase evidence lifecycle. Seed readiness may include private test/staging-only accounts, broad synthetic boundary profiles, executable QA checklists, and deterministic telemetry while records still have a planned seed state. Scenario-run results, browser evidence, persistence checks, and cross-role acceptance are post-seed evidence and must never be fabricated as a prerequisite to creating the records they test. Synthetic QA approval does not authorize production identifiers, publication, product claims, operational setpoints, external media, or source-rights decisions.
