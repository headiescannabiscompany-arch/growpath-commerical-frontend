# Admin and identity Batch 2 verification — 2026-08-22

Matrix rows: P-11 and A-01 through A-05.

## Reconciliation result

The functional commit on retained branch `codex/admin-report-actions-frontend` is
patch-equivalent to current `main` through frontend `68947449`. The only unique retained
commit changes historical acceptance prose. It is retained as evidence input but is not
cherry-picked as a substitute for current frozen-SHA acceptance.

Current routes expose Platform Administration to the Admin identity from the root,
Personal home, Commercial owner surface and account-mode switcher while hiding it from
ordinary users.

## Focused automated verification

The following suites passed 93 assertions:

- `PlatformAdminRoute.test.tsx`
- `AccountModeSwitcher.test.tsx`
- `AuthContextSessionTransitions.test.tsx`
- `WorkspaceSessionReset.test.tsx`
- `PersonalHomeRoute.test.tsx`
- `CommercialWorkflowPages.test.tsx`

Verified coverage includes:

- role-gated Admin entry and workspace switching;
- Admin logout confirmation and identity-to-identity session cleanup;
- support, moderation, security and account work queues outside generic tasks;
- security open/resolved tallies, source coverage and exact investigation links;
- reported forum posts, comments, videos, video comments, live sessions, live chat,
  courses, commercial posts, feed items and storefront products;
- exact reported-child URLs retained with their parent content;
- hide, soft-remove, restore, cannabis reclassification and legal escalation actions;
- achieved/resolved work removed from the active queue while remaining auditable;
- lawful-request intake, retained audit, typed review reasons and preservation holds;
- preservation remaining separate from approval and disclosure;
- clearing auth token, preferred mode, Facility selection and dormant `gp.session.*`
  values before another identity renders.

## Legal and safety boundary

The frontend intentionally does not expose approval or disclosure. Those actions remain
blocked until the backend enforces the transition graph, verified requester identity and
authority, jurisdiction/legal review, independent approval where required,
minimum-necessary scope, notice/delay state, immutable disclosure manifest, custody
evidence, recipient, delivery method, disclosing actor and retained audit. Legal counsel
and the release owner must approve the operating procedure before disclosure is enabled.

Emergency content creates a preservation/escalation record for reviewed human action; the
application does not autonomously contact police or transmit account data.

## Live checkpoint

`https://growpathai.com/admin?verify=canonical-admin-batch2` loaded successfully in the
Codex browser on 2026-08-22. The browser had no authenticated Admin session and correctly
rendered `Platform owner access required`. The tab is retained for signed-in frozen-SHA
acceptance during R-03. No production record was mutated.

A-01 through A-05 remain `partial` pending signed-in production checks for populated and
empty queues, direct email links, reload/session expiry/logout, cross-account isolation,
network recovery, theme, mobile layout, accessibility and retained audit. This checkpoint
does not justify rebuilding the implemented Admin control center.
