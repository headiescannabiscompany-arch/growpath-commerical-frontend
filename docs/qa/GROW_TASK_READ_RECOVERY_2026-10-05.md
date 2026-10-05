# A03-04 — grow-specific task read recovery

Scope: shared Personal/Commercial grow Tasks screen only. A failed initial read
previously rendered `No tasks yet` and could call a focused task removed. The
Personal API helper also swallowed transport errors. The screen now opts into
propagated errors; other API callers retain their existing behavior.

Read-only single-flight Retry preserves unfinished task inputs, labels retained
tasks after a failed post-write refresh, and keeps successful-write feedback
separate. Grow/workspace remounts and focus cleanup invalidate older requests;
post-write reads supersede earlier reads. Source-link and reminder entitlements,
mutation payloads, scheduling, billing, publication and sharing are unchanged.
Both task pages had the same source-link entitlement gate; it was not changed.

Local verification: 60 focused tests across GrowTasksScreen, growWorkspaceData,
personalRecordFreshness and UpdatesPage. Includes initial failure, empty success,
single-flight retry, draft retention, post-write failure, grow navigation, Free
access and Commercial error propagation. TypeScript, focused ESLint, formatting,
contamination and delta-interface guards pass. Test mock given a display name;
no production behavior changed by that test cleanup.

## Release acceptance — CLOSED / LIVE

Runtime revision `148a540a75cab601d08476fe73473a05a56352d0`.
Staging `dep-db1ke0m0tbcc73b90de0`, live 2026-10-05T06:45:08.10896Z.
Production `dep-db1kfrtg1s2s73aka8q0`, live 2026-10-05T06:49:15.624329Z.
Production-format export and 18 public marketing tests also pass (78 total
focused/public checks). Final exact-revision TypeScript and contamination pass.

Actual staging browser: existing synthetic Owner selected Personal temporarily.
For grow `6a5ea11785cee9a1c3f96a03`, tab-local Network blocking of only the Personal
task endpoint produced the error/Retry card, not a false empty list. Entered an
unsaved synthetic title, removed blocking, then clicked Retry: real empty response
displayed correctly and the draft remained. Cleared unsaved input without Add.
Network overrides removed/disabled and Owner restored to Facility. No task write,
new account, credential change, payment, publication or sharing action.

Canonical production grow `6aa6314df4d52cced238fba9` Tasks page loads its existing
live-reminder task after release. Production Updates → Grows & journals → detailed
history displays the October 5 read-recovery note inside the existing milestone.
No second announcement/card or reopening of completed timeline/photo work.

Proof in workspace outputs: `Grow_Task_Retry_Staging_2026-10-05.png` and
`Grow_Task_Recovery_Production_2026-10-05.png`. Staging failure was simulated only
in the test tab; recovery used the actual endpoint. Free restrictions, retained
post-write state, supersession and Commercial propagation are automated evidence,
not claims of new production mutations or every Commercial/phone journey.

A03-04 is closed; A03-01–03 and A05-01–07 stay closed. Broader A03/R08/A09 work,
Apple enrollment and independent Admin human steps remain separate.
