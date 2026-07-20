# Integration Workflow

Provider integrations begin read-only. Credentials stay encrypted on the backend; clients receive only authentication type and configured/encrypted state. Each provider declares capabilities, status, structured errors, and last-sync state, and must implement connection testing, device discovery, and data pulling before it is registered as implemented.

Setup is review gated: select provider, connect, test, fetch structure, preview devices and metrics, edit space/room/zone mappings, then confirm. Auto-build is a separate explicit action after confirmation and must be idempotent.

Personal auto-build targets an owned grow and creates read-only spaces, devices, streams, and dashboard definitions. Facility auto-build requires owner or manager access and creates canonical rooms plus read-only devices/streams and draft alert/dashboard definitions. Commercial auto-build targets only owned product trials or grows explicitly intended for trials, demos, or education; it must not turn ordinary storefront or campaign records into cultivation spaces.

Personal Data Integrations are grow-owned discovery. Surface connection and mapping entry points from Grows and the selected grow workspace, not from the general AI Tools hub. Preserve old deep links, but require an owned grow before saving imported structure or telemetry.

Provider metric keys remain source evidence. Normalization must preserve the provider key alongside the canonical metric and must not invent units, readings, thresholds, room identity, or control capability. Controller writes, setpoints, schedules, and automation activation require a separately reviewed permission scope.

Canonical metrics are `air_temperature` in C, `relative_humidity` in percent, `vpd` in kPa, `dew_point` in C, `co2` in ppm, `ppfd` in umol/m2/s, `dli` in mol/m2/day, `substrate_moisture` in percent, `substrate_ec` in mS/cm, `substrate_ph` in pH, plus `irrigation_event`, `alarm`, `device_offline`, and `device_fault` state/event signals. Convert Fahrenheit/Kelvin, fractional moisture/RH, or uS/cm only when the provider supplies that source unit. Unknown keys remain `unmapped` with their raw evidence intact.

All tool handoffs use the same grow-scoped telemetry window. It may deterministically prefill VPD, dew point, Bud Rot screening, Crop Steering, Watering Planner/dryback, AI context, run comparisons, alert/task drafts, and explicitly linked trial evidence. Bud Rot output is a screening signal, not a diagnosis. Alerts and tasks remain drafts until reviewed. Course examples require explicit review and de-identification; telemetry must never be published merely because it was imported.

Do not add a collected integration field without declaring at least one concrete consumer in the integration data-use registry. Allowed consumer categories are display, analytics, AI, search, recommendations, tasks, alerts, and exports. Schema audits must fail when a governed field is missing, stale, or assigned an unsupported category. Credential values remain secret; their collected field supports derived configured/encrypted display state and must never be returned as registry data or ordinary exports.
