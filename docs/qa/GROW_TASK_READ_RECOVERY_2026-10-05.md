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

Release status: PENDING production-format export and hosted acceptance. Do not
mark A03-04 live or close A03/R08 until the release receipt is appended. Existing
A03-01–03 and A05-01–07 remain closed; this is a separate evidenced defect.
