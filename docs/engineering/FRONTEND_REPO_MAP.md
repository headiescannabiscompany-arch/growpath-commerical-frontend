# Frontend Repo Map

Date: 2026-03-12
Scope: `C:\growpath-commercial\frontend`

## Purpose

This repository is the frontend app workspace plus QA/release artifacts.

Primary responsibilities:
- Render screens and navigation
- Restore auth/session state
- Call backend APIs
- Enforce UI-level role/entitlement behavior
- Support manual QA execution and release-prep evidence

## Folder Responsibilities

### `src/app/`
- App entry/routing layer
- Startup and auth hydration checks
- Initial navigation handoff

### `src/screens/`
- User-facing screen components
- Feature pages (dashboard, tasks, grow logs, commercial flows)

### `src/api/`
- API client layer
- Auth token/header attachment
- Shared request/response handling

### `docs/`
- Delivery and process documentation
- Launch checklists, security/compliance notes, SOP/workflow docs

### `tmp/spec/`
- QA execution artifacts
- Device matrices, execution logs, evidence folders, sign-off support docs
- Operational artifacts only (not runtime product logic)

## Frontend/Backend Boundary

This repo owns client behavior and QA scaffolding.  
Server implementation work belongs in the backend repository/monorepo root.

Backend-owned examples:
- Facility-scoped router/controller/model logic
- Role enforcement at API boundary
- Soft-delete/query invariants in persistence
- Contract tests for server routes

## Product Flow Model

1. App starts (`src/app`) and restores auth/session context.
2. API client (`src/api`) calls backend endpoints (for example `/api/me`).
3. UI gating is applied based on role/entitlements/facility context.
4. Screens (`src/screens`) render feature workflows and submit user actions.
5. Backend enforces facility isolation and authoritative role permissions.

## Core QA Journeys

Manual flow set used for launch readiness:
- `F01` Auth
- `F02` Facility switch and scoped refresh
- `F03` Dashboard
- `F04` Tasks
- `F05` Grow log CRUD
- `F06` Media/photo upload
- `F07` Upgrade/checkout CTA
- `F08` Deep-link/navigation
- `F09` Offline/intermittent network behavior
- `F10` Form validation

## Handoff Rules

- If task is UI/flow/API-client/QA-artifact: execute in this repo.
- If task is router/controller/model/server-contract logic: switch to backend repo.
- Do not mark QA sign-off items done without real evidence artifacts.
