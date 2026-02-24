# Endpoint Connectivity and Snapshot Runbook
Date: 2026-02-24  
Purpose: verify every route/function has endpoint connectivity and visual evidence

## 1) Pre-Run Preconditions
- Backend running with seeded data for:
  - personal user
  - commercial user
  - facility user (owner + manager + staff + viewer)
- Frontend configured with API base URL
- Test accounts and tokens prepared
- Facilities seeded with rooms, plants, grows, logs, tasks, inventory, team

## 2) Endpoint Connectivity Audit Commands (Static)
Run in project root:

```powershell
rg -n "apiRequest|endpoints\\.|use[A-Z][A-Za-z]+\\(" src/app src/screens src/hooks -S
rg -n "POST|PATCH|DELETE|GET" src/api -S
rg -n "PlannedScreen|Planned|TODO" src/app src/screens -S
```

Goal:
- enumerate all endpoint consumers
- identify missing wiring and placeholder routes

## 3) Runtime Endpoint Validation (Per User Type)
For each mode (personal/commercial/facility):
1. Login
2. Visit every primary menu page
3. Trigger each major action (create/edit/delete/export/diagnose/post/invite)
4. Record:
   - request path
   - method
   - payload schema
   - response schema
   - error handling behavior

Store results in:
- `docs/runtime-logs/{date}/{mode}/endpoint-trace.json`

## 4) Snapshot Coverage Matrix
For each page, capture:
- default state
- loading state
- empty state
- populated state
- validation error state
- API error state
- permission-locked state (if applicable)

Store artifacts:
- `docs/snapshots/{date}/{mode}/{route}/{state}.png`

## 5) Required Journeys
Personal:
- `/login` -> `/home/personal`
- Home -> grows/logs/tools/courses/forum/diagnose/profile/ai
- Forum nested flow:
  - forum index
  - new post
  - code
  - post detail

Commercial:
- `/login` -> commercial landing
- feed/campaigns/offers/storefront/orders/inventory/courses/communities/profile
- create course, create campaign, social tools actions

Facility:
- `/login` -> facility select -> facility tabs
- dashboard/grows/plants/tasks/logs/inventory/team/profile
- details for plant/log/task/inventory item
- AI tool screens (trichome, harvest window, VPD, EC)

## 6) AI-Specific Validation
For each AI tool call:
- verify request includes required context (`facilityId`, `growId` where required)
- verify output contains confidence and structured result
- verify persistence or linked follow-up (tasks/calendar/log entry where applicable)
- verify external verifier path (when implemented):
  - run internal
  - run external
  - compare
  - capture human feedback

## 7) Pass/Fail Criteria
Pass:
- all menu pages accessible for authorized roles
- all page actions execute with wired endpoints
- all response/error states handled in UI
- all required screenshots present

Fail:
- any active menu path lands on placeholder/planned screen
- any action has no endpoint wiring
- uncaught API errors crash route
- missing snapshots for required states

## 8) CI Integration Recommendation
- Add a CI stage:
  - static route/endpoint scan
  - Playwright journey run
  - artifact upload (snapshots + endpoint traces)
  - fail on placeholder detection or missing artifacts
