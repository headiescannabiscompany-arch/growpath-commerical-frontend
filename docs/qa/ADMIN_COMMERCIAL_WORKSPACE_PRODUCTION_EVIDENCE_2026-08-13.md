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

## Report deep-link follow-up

The same Admin session opened the genuine emailed moderation-case link for case `6a66da9ea79aafa8dc0cfca5`. The page focused the exact reviewing course report and exposed its reversible moderation controls. No moderation action was invoked.

`Open reported content` navigated to the exact URL `/courses?courseId=6a663d0508a5c374af9abf28` without an authorization error. The old QA course had since been removed, so the truthful content state was `No courses found`. A future retained-content report is still required to prove a loaded reported item end to end.
