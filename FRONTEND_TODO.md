# GrowPath Frontend Backlog

> Status: CANONICAL
> Owner: Product/Engineering
> Last reviewed: 2026-06-20
> Scope: Frontend integration, product workflows, and release readiness

This is the single source of truth for unfinished frontend work. Supporting
specifications define contracts and behavior; they must not maintain separate
product backlogs.

## Working Rules

- Use `GET /api/auth/me` as the authoritative identity, mode, plan, capability,
  and facility-access contract.
- Drive navigation and feature access from capabilities. Enforce material limits
  on the backend as well as in the UI.
- Keep Personal, Commercial, and Facility shells separate.
- Use environment-driven API URLs and the shared API client.
- Do not ship placeholder screens. Every workflow needs a functional state,
  loading state, error state, and actionable empty state.
- Treat payments as webhook-authoritative and store money as integer cents.

## P0: Contract And Client Foundation

- [x] Verify and document the canonical `/api/auth/me` response in
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

- [ ] Complete the Personal dashboard using real grows, plants, recent logs, and
  statistics data.
- [ ] Complete Grow Logs create, read, update, and delete flows and connect
  diagnosis results to log history.
- [ ] Connect diagnosis, feeding schedule, and environment analysis to real AI
  endpoints with capability enforcement.
- [ ] Complete task create, assign, update, and completion workflows with
  facility scoping and role enforcement.
- [ ] Complete facility rooms, equipment, tracking-mode rehydration, and batch
  cycle workflows.
- [ ] Add the minimum compliance workflow primitives, ownership rules, and audit
  events before expanding vendor or METRC integrations.
- [ ] Complete social posts, likes, comments, memberships, discussions, and
  notifications against real endpoints.

## P1: Commerce And Courses

- [ ] Enforce course, lesson, certificate, and advanced-tool limits from the
  canonical capability system.
- [ ] Complete course creation, detail, enrollment, playback, moderation, and
  reporting workflows.
- [ ] Implement webhook-confirmed purchases, enrollments, earnings, refunds, and
  disputes with idempotent backend handling.
- [ ] Complete creator earnings, sales, payout request, and admin payout UX.
- [ ] Complete Marketplace browsing against real list and detail endpoints.
- [ ] Connect Stripe and platform in-app purchase flows without granting access
  from frontend success callbacks.

## P2: Commercial And Facility Products

- [ ] Complete the Commercial dashboard, storefront, products, courses, links,
  campaigns, orders, and basic inventory.
- [ ] Complete the Facility dashboard, rooms, batch cycles, team roles, tasks,
  reports, SOPs, audit logs, and task verification.
- [ ] Add the pheno matrix for supported capabilities.
- [ ] Complete advanced feed scheduler, harvest estimator, timeline, and export
  tools with locked states and upgrade actions for unsupported plans.

## Quality And Verification

- [ ] Implement Free and Pro authentication setup in `tests/growLogs.spec.js`.
- [ ] Add end-to-end coverage for `/auth/me`, shell selection, capability gating,
  and critical Personal workflows.
- [ ] Prove a Facility user cannot access another facility's resources.
- [ ] Prove Commercial-only routes are unreachable from the Facility shell.
- [ ] Prove a disabled capability hides the UI action and the backend rejects the
  corresponding request.
- [ ] Run Playwright workflow coverage for Personal, Commercial, and Facility
  users against the live backend.

## Known Code TODOs

- [ ] Implement native CSV share/save behavior in `src/utils/exportToCsv.ts`.
- [ ] Connect the production LLM provider described in `backend/AI_CALL_SETUP.md`.

## Documentation And Release

- [ ] Keep `FEATURE_FLAGS.md`, `FRONTEND_INTEGRATION_CONTRACT.md`,
  `FRONTEND_SCREEN_MAP.md`, `COURSE_PAYMENTS_GUIDE.md`, and backend schema
  documentation synchronized with code.
- [ ] Remove completion claims that are not backed by working end-to-end
  workflows.
- [ ] Complete `docs/app-store-deployment-todo.md` after P0 and required P1
  workflows pass production-mode validation.

## Completion Policy

Check an item only when implementation, relevant tests, and contract or workflow
documentation are complete. Add newly discovered work here instead of creating
another root-level TODO document.
