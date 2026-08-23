# P-11 Personal Profile Local Acceptance — 2026-08-23

## Outcome

P-11 is implemented and locally accepted. The existing Profile already exposed the signed-in identity, verified status, authorized workspace switch, current plan, safe plan/billing actions, live AI-credit ledger, independent notification categories, theme controls, account export/deletion and confirmed logout. Reconciliation found one concrete missing requirement: Profile described storage benefits but did not display real storage usage.

The repair adds a lightweight authenticated video-quota endpoint and displays its real Personal-workspace used, limit and remaining values in Profile. The storage card links to My Videos, distinguishes GrowPath-hosted uploads from external links, exposes loading/error/retry states and does not load the full video library merely to calculate quota.

## Local verification

Existing P-11/R-01/R-02/Admin identity evidence remains authoritative for the already implemented plan, billing/cancel, credit, notification, theme, data-rights, session and workspace flows. The focused current-candidate replay covers:

- Profile privacy and destructive confirmation;
- truthful Free/Pro plan actions and billing/cancel safety;
- AI-credit presentation;
- independent notification preferences and exact deep links;
- theme and semantic hierarchy;
- account-mode/workspace switching;
- confirmed logout and identity-to-identity session cleanup; and
- exact Personal video-storage quota, error/retry and library handoff.

Frontend verification:

- 14 suites and 60 assertions pass in the focused P-11 replay.
- TypeScript passes with `tsc --noEmit`.
- Targeted source lint and diff checks pass.

Backend storage verification:

- `tests/routes/videos.test.js` passes 26 assertions.
- The new quota response is workspace-scoped and contains no library records.
- Targeted source lint and diff checks pass.

## Remaining acceptance — do not reconstruct

- Deploy the exact frontend/backend SHAs and verify Profile loads real plan, credits and storage for representative Free/paid and authorized workspace identities.
- Exercise a supported subscription cancellation through persisted paid-through status; unsupported management must remain truthful and fail closed.
- Prove notification provider/device delivery under R-02; an in-app record alone is not delivery proof.
- With a disposable production identity, export data, inspect the package, request deletion, confirm session revocation and verify absence after reload.
- Complete final-candidate multi-account reload, logout and workspace-isolation checks under A-05.

Those are provider or authenticated-live gates on the accepted implementation, not permission to rebuild Profile.
