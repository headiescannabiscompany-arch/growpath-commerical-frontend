# GrowPath Frontend Backlog

> Status: CANONICAL
> Owner: Product/Engineering
> Last reviewed: 2026-06-22
> Scope: Frontend integration, product workflows, and release readiness

This is the single source of truth for unfinished frontend work. Supporting
specifications define contracts and behavior; they must not maintain separate
product backlogs.

## Working Rules

- Use `GET /api/me` as the authoritative identity, mode, plan, capability,
  and facility-access contract.
- Drive navigation and feature access from capabilities. Enforce material limits
  on the backend as well as in the UI.
- Keep Personal, Commercial, and Facility shells separate.
- Use environment-driven API URLs and the shared API client.
- Do not ship placeholder screens. Every workflow needs a functional state,
  loading state, error state, and actionable empty state.
- Treat payments as webhook-authoritative and store money as integer cents.

## P0: Contract And Client Foundation

- [x] Verify and document the canonical `/api/me` response in
      `FRONTEND_INTEGRATION_CONTRACT.md`, including mode, plan, capabilities, and
      active facility context.
- [x] Verify every API module uses the shared client and environment-driven base
      URL; remove remaining hardcoded URLs and duplicate clients.
- [x] Verify token persistence, automatic `Authorization` headers, logout on
      `401`, and permission messaging on `403`.
- [x] Standardize API errors and surface backend messages, request IDs, offline,
      timeout, and unavailable-server states globally.
- [x] Audit navigation so Commercial routes are absent from the Facility shell
      and direct route access applies the same capability checks as visible links.
- [x] Replace remaining role-only and plan-only UI checks with canonical
      capability checks; retain facility-role checks for facility-scoped actions.

## P1: Critical Workflows

- [x] Complete the Personal dashboard using real grows, plants, recent logs, and
      statistics data.
- [x] Complete Grow Logs create, read, update, and delete flows and connect
      diagnosis results to log history.
- [x] Connect diagnosis, feeding schedule, and environment analysis to real AI
      endpoints with capability enforcement.
- [x] Complete task create, assign, update, and completion workflows with
      facility scoping and role enforcement.
- [x] Complete facility rooms, equipment, tracking-mode rehydration, and batch
      cycle workflows.
- [x] Add the minimum compliance workflow primitives, ownership rules, and audit
      events before expanding vendor or METRC integrations.
- [x] Complete social posts, likes, comments, memberships, discussions, and
      notifications against real endpoints.

## P1: Commerce And Courses

- [x] Enforce course, lesson, certificate, and advanced-tool limits from the
      canonical capability system.
- [x] Complete course creation, detail, enrollment, playback, moderation, and
      reporting workflows.
- [x] Implement webhook-confirmed purchases, enrollments, earnings, refunds, and
      disputes with idempotent backend handling.
- [x] Complete creator earnings, sales, payout request, and admin payout UX.
- [x] Complete Marketplace browsing against real list and detail endpoints.
- [x] Connect Stripe and platform in-app purchase flows without granting access
      from frontend success callbacks.

## P2: Commercial And Facility Products

- [x] Complete the Commercial dashboard, storefront, products, courses, links,
      campaigns, orders, and basic inventory.
- [x] Complete the Facility dashboard, rooms, batch cycles, team roles, tasks,
      reports, SOPs, audit logs, and task verification.
- [x] Add the pheno matrix for supported capabilities.
- [x] Complete advanced feed scheduler, harvest estimator, timeline, and export
      tools with locked states and upgrade actions for unsupported plans.

## Quality And Verification

- [x] Implement Free and Pro authentication setup in `tests/growLogs.spec.js`.
- [x] Add end-to-end coverage for `/api/me`, shell selection, capability gating,
      and critical Personal workflows.
- [x] Prove a Facility user cannot access another facility's resources.
- [x] Prove Commercial-only routes are unreachable from the Facility shell.
- [x] Prove a disabled capability hides the UI action and the backend rejects the
      corresponding request.
- [x] Run Playwright workflow coverage for Personal, Commercial, and Facility
      users against the live backend.
- [x] Add a backend Node Jest runner and make backend unit/route tests runnable
      outside the Expo Jest config.
- [x] Add `supertest` and backend runtime dependencies required by the backend
      route test suite.
- [x] Run `npm run test:backend:all` and keep it passing in CI.
- [x] Restore the full AI schema pack with
      `npm run schema:install -- <schema-pack.zip|extracted-directory>` and make
      `npm run schema:preflight` pass.
- [x] Run schema drift validation with the full schema pack present so skipped
      schema tests become active coverage.
- [x] Add partial release validation evidence for TypeScript, backend tests,
      frontend-targeted Jest suites, corruption scans, and export sanity.
- [x] Add live workflow validation evidence after Personal, Commercial, and
      Facility runs complete against a live backend.

## Known Code TODOs

- [x] Implement native CSV share/save behavior in `src/utils/exportToCsv.ts`.
- [x] Connect the production LLM provider described in `backend/AI_CALL_SETUP.md`.
- [x] Apply brand assets consistently: use `assets/banner.png` on the active
      login screen, use `assets/icon-white.png` where a white mark fits best, and
      use the transparent `assets/icon.png` for browser/app icons and UI placements
      where the clear-background icon reads better on desktop and phone.
- [x] Park UbiBot integration work after confirming Developer Membership,
      platform API, and MQTT access paths are not enough to proceed without
      credentials and real-device validation.
- [x] Remove or replace active placeholder/dead-end screens found by release
      scans, starting with `src/app/feed/index.tsx` and
      `src/screens/commercial/MarketplaceIntegrationScreen.js`.
- [x] Replace legacy static Analytics, Payments, and QA screens with runtime
      status surfaces backed by feature status, entitlements, and subscription
      APIs.
- [x] Re-run placeholder/dead-end scans after each cleanup batch and add any
      confirmed production-route findings here.
- [x] Replace the `useWebhooks` compile stub with shared-client API calls and
      runtime loading/error/empty/save states.
- [x] Replace static demo vendor analytics, vendor metrics, and facility vendor
      dashboard cards with API-backed or derived runtime data.
- [x] Finish Content Marketplace sales and analytics tabs by removing static
      earnings/download/rating/sales/chart examples and normalizing
      `getSalesData()` into runtime summary, monthly series, recent sales, and
      per-upload analytics.
- [x] Finish the Content Marketplace upload modal with real controlled form
      state, URL/file metadata validation, `uploadContent` submission, error
      handling, and upload refresh after success.
- [x] Provide backend webhook endpoints for `/api/webhooks` and
      `/api/webhooks/:id`, including auth, facility scoping, event validation,
      secret/signature handling, delivery retries, and audit logs.
- [x] Provide or confirm vendor analytics/metrics backend contracts for
      `/api/vendors/me/analytics`, `/api/vendors/me/orders`,
      `/api/vendors/me/metrics`, `/api/vendors/me/soil-mixes`, and
      `/api/vendors/me/equipment`.
- [x] Remove production wiring to source-controlled backend demo/stub routes:
      `backend/stubbedRoutes.js`, `backend/routes/personal.js`,
      `backend/routes/commercial.js`, and `backend/fanoutNotifications.js`.
- [x] Remove or archive `backend/routes/ai.call.backup.js` after confirming it is
      excluded from runtime and tests.
- [x] Replace or delete old Detox `e2e/growLogs.e2e.js` login TODO coverage if
      Playwright remains the canonical E2E suite.
- [x] Record the 2026-06-23 stub/placeholder audit in
      `docs/stub-placeholder-audit-2026-06-23.md`.
- [x] Replace lesson video/PDF/audio local-file selectors with durable upload
      wiring. Lesson media now uses the authenticated course-media upload
      endpoint, saves returned video/PDF/audio URLs, and keeps pasted video/PDF
      URL support.

## Parked Or Blocked

- [ ] UbiBot adapter is deferred. Resume only with a paid/approved Developer
      Membership, test credentials, at least one real channel/device, and permission
      to validate feed summaries and MQTT behavior.
- [x] Full AI schema pack restoration is complete for the local V1 release
      gate. Local schemas are now present, including the master AI response
      schema and feature-specific AI output schemas.

## Documentation And Release

- [x] Keep `FEATURE_FLAGS.md`, `FRONTEND_INTEGRATION_CONTRACT.md`,
      `FRONTEND_SCREEN_MAP.md`, `COURSE_PAYMENTS_GUIDE.md`, and backend schema
      documentation synchronized with code.
- [x] Remove completion claims that are not backed by working end-to-end
      workflows.
- [x] Remove source-controlled fake EAS submit credentials and document the
      external-secret release handoff.
- [x] Remove wildcard Android App Link configuration until the production public
      domain and hosted verification files are confirmed.
- [ ] Complete `docs/app-store-deployment-todo.md` after P0 and required P1
      workflows pass production-mode validation. Current release-config evidence
      is recorded in `docs/release-config-evidence-2026-06-21.md`; remaining items
      need store/build credentials, production artifacts, screenshots, and
      release-owner sign-off.
- [ ] Finalize App Store / Google Play metadata, privacy URL, support URL,
      screenshots, release notes, production builds, and real-device smoke evidence.

## Completion Policy

Check an item only when implementation, relevant tests, and contract or workflow
documentation are complete. Add newly discovered work here instead of creating
another root-level TODO document.
