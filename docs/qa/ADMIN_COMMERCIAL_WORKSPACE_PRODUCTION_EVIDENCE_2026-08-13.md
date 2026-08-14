# Admin Commercial workspace production evidence — 2026-08-13

## Delivery

- Backend PR `#156` merged as `f49fae1ff11094330cafd1ae2724382266d7f0e8` after its contract pack, full regression, lint, dependency audit, and API security scan passed.
- Frontend PR `#558` merged as `a581c7d981ce5f241d26fc9d22d88087d7b326db` after its PR and main-branch Frontend CI plus Production Build Preflight passed.
- The grant is based on the platform `admin` role, not a hard-coded email address and not a paid-plan mutation.

## Signed-in production verification

The in-app Browser was signed into the real `admin@growpathai.com` platform Admin account.

- Account Workspace identified `GrowPathAI Admin` and offered exactly the eligible Personal and Commercial workspace choices.
- Commercial opened the complete Brand Dashboard and its Storefront, products, evidence/trials, courses, lives, campaigns, orders, analytics, tasks, and shared-core links.
- The Admin commercial workspace truthfully showed `Storefront not configured yet`, draft status, and zero products.
- Commercial records remain owner-scoped by the signed-in user ID. The empty Admin state therefore confirms that Living Soil Labs and Triple Bag Genetics storefront/product records were not reassigned or exposed as Admin-owned records.
- The Admin account's actual plan/subscription display remained separate from the role-based Commercial workspace grant; no subscription, payment, product, storefront, inventory, campaign, course, order, or other production record changed.

### Full read-only route sweep — 2026-08-14

Under frontend `0aab65b5921cdb352c689798b6374a6391c32efb`, the same authenticated
Admin Commercial workspace loaded 21 production destinations with their intended
level-one headings and without a visible unauthorized, unable-to-load, not-found,
server-unavailable, or access-denied state:

- Dashboard, Storefront, Products, Product Lines, Soil & Nutrient Batch Planner,
  Commercial Inventory Support, Product Trials, and Product Trial Evidence Runs;
- Courses, Lives, Feed / Campaigns, Brand Forum / Q&A, Orders, Commercial Analytics,
  Commercial Grows/Evidence Runs, AI Tools, Discover, Tasks, and Profile;
- External Channels and Public Links.

Commercial Grows intentionally rendered the Product Trial Evidence Runs workflow and
its evidence-run explanation; it did not silently redirect. External Channels and
Public Links each rendered one canonical heading and remained reachable from More
without becoming duplicate bottom tabs. No create, edit, publish, connect, purchase,
or archive action was invoked during this sweep.

### Commercial Tools night-mode production repair — 2026-08-14

The expanded 21-route Admin Commercial night-theme review found that eight AI Tools
actions had dark text on a dark card because Expo Router's web `Link asChild` path did
not preserve a function-valued React Native `Pressable` background. Frontend
`aba16d081387d324a602ede3429be931d4a71dc3` attempted to make the background static,
but live production immediately exposed a web-only `CSSStyleDeclaration` indexed
property exception and a blank Commercial Tools route. That revision was not accepted
as live evidence.

Hotfix frontend `74afb7e513a43ffd74a2183472a5130665d398bf` replaced the web-cloned link with the
direct `Pressable` navigation pattern already used by Facility AI Tools. PR `#579`, its
full Frontend CI gate, main Production Build Preflight, and the Render auto-deploy all
completed successfully. Render deployment `dep-d9vbppu7bikc73bvdc60` published the
exact hotfix SHA.

The cache-busted production route
`/home/commercial/tools?release=74afb7e&verify=commercial-tools-hotfix-live` then:

- rendered the complete Commercial Tools page rather than a blank screen;
- exposed all eight named action controls as visible `rgb(120, 170, 255)` surfaces
  with black text in the resolved Night theme;
- retained the intended credit and workspace-boundary copy; and
- navigated `Open Environment Review` to the complete
  `/home/commercial/tools/environment` workflow with its Back control and analysis
  form.

No AI request, record mutation, credit charge, or Commercial task was created during
this repair check.

### Search selected-workspace routing repair — 2026-08-14

The signed-in Admin workspace selector reported `Acting in Commercial workspace
mode`, but the shared Search route originally read the account's base identity. Its
visible `Open Tools` shortcut therefore followed Personal routing and the Admin guard
redirected the request to `/admin`.

Frontend PRs `#582` and `#583` separated full-search entitlement from the visible
navigation shortcuts and changed route selection to the effective entitlement
workspace. They merged as `e68630d22db9108562678cea233386737b63d113` and
`5518cd7d308865f237da03c68c27da8ea3f3f9da`. Both PR gates passed. The final merge's
Frontend CI and Production Build Preflight passed, and Render deployment
`dep-d9vcj2bncjis738qmh8g` succeeded for the exact final SHA.

The cache-busted production retest confirmed the Admin identity was still acting in
Commercial mode, then followed Search `Open Tools` to the exact
`/home/commercial/tools` destination. The page rendered its `AI Tools` heading, all
eight Commercial workflow actions, the Commercial workspace boundary, and the actual
Commercial balance `99 / 100`. The test created no AI request, credit charge, record,
or task.

## Report deep-link follow-up

The same Admin session opened the genuine emailed moderation-case link for case `6a66da9ea79aafa8dc0cfca5`. The page focused the exact reviewing course report and exposed its reversible moderation controls. No moderation action was invoked.

`Open reported content` navigated to the exact URL `/courses?courseId=6a663d0508a5c374af9abf28` without an authorization error. The old QA course had since been removed, so the truthful content state was `No courses found`. A future retained-content report is still required to prove a loaded reported item end to end.
