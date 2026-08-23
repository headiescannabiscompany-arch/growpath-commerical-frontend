# Commercial and Facility — Batch 5 verification

Date: 2026-08-22  
Frontend baseline: `689474493cd82a866e6c8b20df781950c37fb378`

The retained release-acceptance branch was compared with current main. Its Commercial
bottom-tab repair is already present, while replaying the old final tree would remove newer
Admin, sharing, integration and knowledge work. The code patch was therefore rejected as
superseded; its production prose remains historical evidence only.

## Facility calculator reconciliation addendum

- The current Facility AI hub, not the unmounted legacy AI feature matrix, is the
  user-facing source of truth.
- Environment Review now receives `workspaceType="facility"` and retains the selected
  Facility scope through analysis, saved ToolRuns, logs, and follow-up tasks.
- The canonical pH / EC Range Check is reachable from the Facility Tool Library and reuses
  the shared workspace-aware calculator. It interprets calibrated readings and trends; it
  does not revive the legacy blind EC-correction/dosing screen.
- Focused acceptance on 2026-08-23: 5 suites / 37 tests passed, followed by
  `tsc --noEmit` and touched-source ESLint.

Twenty-five focused suites passed 175 assertions across:

- Commercial dashboard/workflows, profile, contextual and shared AI tools, product lines,
  inventory state, Feed and analytics;
- Facility entry/dashboard, rooms, grows, plants, team, assignments/tasks, SOP-run Back
  paths, AI tools, inventory, transfers, reports, logs and integrations;
- workspace switching, session reset and Admin/Commercial mode boundaries.

Several React Native VirtualizedList tests emit existing asynchronous `act(...)` warnings.
They do not fail assertions, but they remain test-harness cleanup for the final quality gate;
they are not evidence of a production mutation failure.

This 25-suite / 175-assertion reconciliation is the focused UI lane inside the broader Batch 5
gate. The consolidated current-baseline evidence retained in
`CANONICAL_REMAINING_WORK_2026-08-08.md` adds 465 frontend assertions (shared B-01/B-02,
Commercial, Facility and retained entry paths) and 207 backend assertions (Facility
scope/team/billing, integration mapping/import, equipment/compatibility audit, ledger
transfers, Commercial workflows and Facility analytics). Together they close local
construction of C-01 through C-05 and F-01 through F-07.

Those rows now carry `implemented; local acceptance passed`, not `live accepted`. Their
remaining gates are the frozen-candidate populated/mutation, multi-role, persistence,
recovery and professional-presentation loops, plus the exact B-02 migration and real provider
credential/history-import actions where applicable. These are production evidence gates, not
permission to rebuild the working Commercial, Facility, inventory or integration architecture.
