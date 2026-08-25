# P-02 Crop-Aware Grow Local Acceptance — 2026-08-23

## Outcome

P-02 is implemented and live accepted. Reconciliation found no missing construction behavior and did not replace the existing Grow architecture. The current assembly supports manual known/unknown crops, reviewed Plant ID drafts, sourced lifecycle facts, photos, journal/logs, tasks, calendar, device/file integrations, timeline, export and reversible archive/restore on the same owner-scoped Grow.

The production evidence ledger already proves reviewed tomato guidance, transparent unmatched-crop handling and persisted lifecycle facts. Plant-ID-to-Grow acceptance remains owned by P-04; public Nature publication remains a separate P-05 action. Neither branch is required to create or manage an ordinary Grow.

## Focused current-candidate verification

Frontend:

- 14 suites and 65 assertions pass across the Grow list, New Grow access, setup wizard, crop lifecycle registry/API, overview, journal, tasks, device/history mapping, timeline, calendar, photo attachment, workspace data and plan-limit/archive policy.

Backend:

- 7 suites and 48 assertions pass across owner/role authorization, crop identity, photos, archive/restore, active versus archived lists, logs, export, reviewed crop knowledge, integration connection/mapping/auto-build, bounded history import and telemetry normalization.

The accepted boundary keeps unsupported crops editable and unknown, excludes archived records from active lists/plan capacity, prevents archived-photo mutation, retains archived history, denies cross-owner existence, and requires current plan capacity before restoration.

## Production telemetry acceptance — do not reconstruct

- On 2026-08-25 the contaminated private source `6a8dcdc9c266b3acbaa97f84` and its 122 imported points were removed through the signed-in UI without deleting the Grow or original file.
- Reviewed source `6a8e0236c4a2df0a9707e305` attached `AC INFINITY Data.csv` to Personal grow `6a86c181e4f8953edcc6ec11`, room `QA tomato grow space`, timezone `America/New_York`, with its `LIGHT` field classified as controller state/output because this setup had no light detector.
- The corrected first import returned `Ingested=119 Updated=0 Skipped=0`; immediate replay returned `Ingested=0 Updated=119 Skipped=0`; and a March 14–July 15 fetch reloaded and analyzed all 119 points. The three blank mapped inside-temperature/RH rows were excluded rather than converted to zero.
- Backend merge `8fe192d51c376b43cd10228c7fa4098971e3a4c3` and frontend merges `1ceb36d21e681b7ead2b4eec15d5eab8cee5ebd8` and `2fc69467bb4236509e0c4d3098b357776b7195d7` passed full CI and reached Render deploys `dep-da6vcff10e5c73evenlg`, `dep-da6ve7ip6svc73b5j0sg` and `dep-da70272p6svc73b6dh40`.
- Lux, PPFD and DLI are separately mapped and stored only when a reviewed sensor/export supplies those measured channels. Two Mars Hydro FC-E4800 fixtures in one 4 x 8 remain equipment context only and do not establish PPFD, DLI, uniformity or light leaks.

## Frozen regression boundary

- Supported/unknown crop creation, draft cancellation/save/reload, ordinary retained photo, journal/task persistence, reviewed source mapping/history, overview/calendar/timeline, export and archive/restore are accepted production behaviors and require final-candidate regression only.
- P-04 separately owns cleanup of the two already-recorded disposable Plant-ID Grow IDs; that cleanup is not a reason to rebuild P-02.

P-02 is closed. Reopen it only for a directly related regression or an explicit new requirement; provider-specific Commercial and Facility acceptance remains under F-06/B-05.
