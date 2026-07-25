# Facility and Commercial Non-Destructive Audit Evidence - 2026-07-25

## Scope and status

This record covers an authenticated, read-only production review of the primary
Facility and Commercial workspaces. The pass checked route reachability, heading
hierarchy, actionable-control names, responsive bounds, and browser-console state.
It did not create, edit, delete, publish, purchase, invite, or otherwise mutate a
production record.

- Production site: `https://growpathai.com`
- Frontend merge: `c4df86f12b16ed6fc3ddbd0dcfb806ebcffe3019`
- Pull request: `#215`
- Live retest timestamp: `2026-07-25T01:27:16-04:00`
- Session: authenticated multi-workspace account, switched explicitly between
  Commercial owner and Facility owner workspaces
- Production writes: none
- Render deployment ID: not claimed; the Render dashboard was not accessed

Both post-merge GitHub workflows passed against the exact merge SHA:

- Frontend CI: run `30145582504`
- Production Build Preflight: run `30145582523`

## Routes reviewed

The desktop Facility pass covered Dashboard, Rooms, Tasks, Inventory, Team,
Compliance, Analytics, Reports, Integrations, and Audit Logs.

The desktop Commercial pass covered Dashboard, Storefront, Products, Feed /
Campaigns, Courses, Lives, Orders, Analytics, Product Lines, Product Batches,
Product Trials, Inventory Support, Tools, Tasks, Profile, More, Marketing, and
Community.

The narrow `391 x 844` pass repeated Commercial Dashboard, Storefront, Products,
Feed / Campaigns, Tools, and More plus Facility Dashboard, Rooms, Tasks, Inventory,
Team, Compliance, and Audit Logs.

## Findings and corrections

### Commercial More mobile overflow

Before the fix, destination cards on Commercial More used a minimum width without
an explicit shrink/basis boundary. The document width still matched the viewport,
but multiple destination links extended beyond the right edge and their
descriptions were visibly clipped.

The destination cards now define a shrinkable 220-pixel flex basis with a
`100%` maximum width, and their descriptions may shrink within the card. Regression
coverage asserts the responsive style contract.

The deployed retest URL was:

`https://growpathai.com/home/commercial/more?release=c4df86f1&verify=deploy-check`

At `391 x 844`:

- the document and viewport widths were `391 / 391`;
- exactly one `More Commercial Workspaces` level-one heading was present;
- zero links, buttons, or role-based action controls crossed the viewport boundary;
- the responsive descriptions remained inside their cards; and
- the browser console contained zero errors or warnings.

Genuine screenshot:

`C:\Users\jcind\.codex\visualizations\2026\07\19\019f7b4c-9dcd-7a01-90de-619050d1445d\commercial-more-mobile-c4df86f1.png`

### Facility Audit Logs heading

Before the fix, Facility Audit Logs displayed a visually prominent title but
exposed no level-one page heading. Loading, missing-facility, and error states also
omitted the page identity.

The route now reuses one semantic `Audit Logs` level-one heading in loaded, loading,
missing-facility, empty, and error states. Focused regression coverage verifies the
loaded and loading states.

The deployed retest URL was:

`https://growpathai.com/home/facility/audit-logs?release=c4df86f1&verify=deploy-check`

At `391 x 844`:

- the document and viewport widths were `391 / 391`;
- exactly one `Audit Logs` level-one heading was present;
- zero links, buttons, or role-based action controls crossed the viewport boundary;
- existing immutable audit rows and detail links remained readable; and
- the browser console contained zero errors or warnings.

Genuine screenshot:

`C:\Users\jcind\.codex\visualizations\2026\07\19\019f7b4c-9dcd-7a01-90de-619050d1445d\facility-audit-logs-mobile-c4df86f1.png`

## Local and CI verification

- Focused Jest: 2 suites and 38 tests passed.
- Prettier: all four touched files passed.
- Direct ESLint: both touched application files passed.
- Visual polish contract: passed.
- Production Expo web export: completed.
- Committed-bundle build guard: passed.
- Git diff corruption/whitespace checks: passed.
- Pull-request Frontend CI: passed.
- Post-merge Frontend CI and Production Build Preflight: passed.

The local repository-wide Jest run reported only passing suites before the local
runner stopped producing output and was terminated after a bounded wait. GitHub's
clean runner subsequently completed the full test step successfully. Local
repository-wide lint and TypeScript checks still expose pre-existing line-ending
and unrelated type errors in untouched files; neither touched screen appears in
those error lists.

## Remaining acceptance

This pass is a responsive and semantic route audit, not completion evidence for
record-mutating workflows. The following remain open:

- Facility onboarding, room/task/inventory/team/compliance create-edit-reload
  coverage across every real role;
- the outstanding real Viewer read-only and forced-authorization pass;
- Commercial authoring, publishing, external/public handoffs, orders, checkout,
  and event-backed analytics with intentional owner data;
- keyboard-only focus order, screen-reader software, font scaling, and measured
  contrast across the full route set;
- true physical-device and exported-video evidence; and
- independent outside-user acceptance.
