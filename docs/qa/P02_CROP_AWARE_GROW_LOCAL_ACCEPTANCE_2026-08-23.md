# P-02 Crop-Aware Grow Local Acceptance — 2026-08-23

## Outcome

P-02 is implemented and locally accepted. Reconciliation found no missing construction behavior and did not replace the existing Grow architecture. The current assembly supports manual known/unknown crops, reviewed Plant ID drafts, sourced lifecycle facts, photos, journal/logs, tasks, calendar, device/file integrations, timeline, export and reversible archive/restore on the same owner-scoped Grow.

The production evidence ledger already proves reviewed tomato guidance, transparent unmatched-crop handling and persisted lifecycle facts. Plant-ID-to-Grow acceptance remains owned by P-04; public Nature publication remains a separate P-05 action. Neither branch is required to create or manage an ordinary Grow.

## Focused current-candidate verification

Frontend:

- 14 suites and 65 assertions pass across the Grow list, New Grow access, setup wizard, crop lifecycle registry/API, overview, journal, tasks, device/history mapping, timeline, calendar, photo attachment, workspace data and plan-limit/archive policy.

Backend:

- 7 suites and 48 assertions pass across owner/role authorization, crop identity, photos, archive/restore, active versus archived lists, logs, export, reviewed crop knowledge, integration connection/mapping/auto-build, bounded history import and telemetry normalization.

The accepted boundary keeps unsupported crops editable and unknown, excludes archived records from active lists/plan capacity, prevents archived-photo mutation, retains archived history, denies cross-owner existence, and requires current plan capacity before restoration.

## Remaining acceptance — do not reconstruct

- Complete the in-progress real AC Infinity CSV acceptance on grow `6a86c181e4f8953edcc6ec11`: skip blank mapped inside-temperature/RH rows rather than coercing them to zero; preserve the reviewed `LIGHT` values as controller state/output because this setup had no light detector; retain two Mars Hydro FC-E4800 fixtures in one 4 x 8 as equipment context only; and separately accept measured lux, PPFD and DLI when a reviewed sensor/export actually supplies those units. Remove the contaminated private QA source before the corrected idempotent import is accepted.

- On the frozen production candidate, create one disposable Grow from a reviewed supported crop and one from an explicit unknown crop; cancel one draft and save/reload the other.
- Attach an ordinary photo, journal entry and task; connect or import one reviewed data source, map it to the Grow, verify bounded history and reload.
- Verify the same Grow's overview, calendar and timeline preserve sourced lifecycle facts without overwriting user edits.
- Export the Grow, archive it with confirmation, verify it leaves active lists and plan capacity, reject an unauthorized direct URL, restore it when capacity permits, then clean up the disposable record.
- P-04 separately owns cleanup of the two already-recorded disposable Plant-ID Grow IDs; that cleanup is not a reason to rebuild P-02.

These are final-candidate authenticated mutation/reload/recovery checks on the accepted assembly.
