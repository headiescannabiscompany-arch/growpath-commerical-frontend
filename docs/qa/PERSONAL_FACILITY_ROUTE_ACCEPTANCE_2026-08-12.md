# Personal and Facility Route Acceptance

Date: 2026-08-12

## Release under test

- Frontend merge: `a198141e3a1b31629998b227d75247d291b6407c`
- Render static-site deploy: `dep-d9tv9l49v7es73cdpdsg`
- Render status observed in the signed-in dashboard: `live`
- Production origin: `https://growpathai.com`

The preceding shared-root Back release was merge `4a17422b727cf1703ecf73c38f26065605448239`
and Render deploy `dep-d9tv3cjbc2fs739n5olg`. Its missing router mock was repaired by
merge `89b984690b181780c33b652ee71576e0388533be`; the failure was in the existing
Nature-map unit harness, not the served route. The exact failing suite was rerun and
passed before the repair merged.

## Identity and workspace

- Signed-in account: `john.collins15@alumni.morgan.edu`
- Personal workspace: available and entered without reauthentication
- Shared Facility: `Triple Bag Genetics, llc`
- Facility role: Viewer
- The production workspace selector's real **Manage Facility** action was used to
  move from Personal into Facility. The Facility dashboard loaded afterward.

## Personal production matrix

Each route below rendered its expected level-one heading, a shared Back control, and
no visible unmatched-route, not-found, unauthorized, unable-to-load, failed-to-load,
screen-unavailable, or generic error state:

| Route | Expected heading |
| --- | --- |
| `/home/personal` | Your Garden |
| `/home/personal/grows` | Grows |
| `/home/personal/tools` | AI Tools |
| `/home/personal/community` | Forum / Q&A |
| `/home/personal/discover` | Discover |
| `/home/personal/more` | More Personal Workspaces |
| `/home/personal/courses` | Courses |
| `/home/personal/profile` | Profile |
| `/home/personal/diagnose` | Plant Issue Diagnosis |
| `/home/personal/field-studies` | Field Studies |
| `/home/personal/tasks` | Task Center / Schedule |
| `/courses` | Courses |
| `/videos?tab=library` | Videos |
| `/lives` | Lives |
| `/home/notifications` | Notification Center |
| `/field-observations` | Explore the living world |
| `/account/mode` | Choose Workspace |
| `/home/personal/tools/ppfd` | PPFD / DLI Planner |
| `/home/personal/tools/recipe-builder` | Mix Builders |
| `/home/personal/tools/saved-runs` | Saved Tool Runs |
| `/home/personal/tools/ipm-scout` | IPM Scout |
| `/home/personal/tools/species-crop-id` | Species / Crop ID |
| `/home/personal/tools/environment-analysis` | Environment Review |
| `/home/personal/tools/harvest-readiness` | Harvest Readiness |

The Grows Back control was also exercised in production and returned to
`/home/personal`. The other root controls use the same covered component and were
confirmed present; this record does not claim that every button on every page was
mutated.

## Facility Viewer production matrix

Each route below rendered its expected level-one heading, a shared Back control, and
no visible failure state:

| Route | Expected heading or behavior |
| --- | --- |
| `/home/facility` | Redirected to Dashboard |
| `/home/facility/dashboard` | Dashboard |
| `/home/facility/more` | More Facility Workspaces |
| `/home/facility/rooms` | Facility Rooms & Workspaces |
| `/home/facility/grows` | Facility Grows |
| `/home/facility/plants` | Facility Plants |
| `/home/facility/tasks` | Facility Tasks |
| `/home/facility/sop-runs` | SOP Library & Runs |
| `/home/facility/sop-runs/presets` | SOP Library |
| `/home/facility/compliance` | Facility Compliance |
| `/home/facility/inventory` | Facility Inventory |
| `/home/facility/team` | Facility Team |
| `/home/facility/transfers` | Licensed Sales & Transfers |
| `/home/facility/reports` | Facility Reports |
| `/home/facility/analytics` | Facility Analytics |
| `/home/facility/integrations` | Connect rooms and sensor data |
| `/home/facility/ai-tools` | Facility Grow Intelligence |
| `/home/facility/feed` | Facility Outreach |
| `/courses` | Courses |
| `/videos?tab=library` | Videos |
| `/forum` | Forum / Q&A |
| `/home/notifications?workspace=facility` | Notification Center |
| `/home/facility/profile` | Profile |
| `/account/mode` | Choose Workspace |

SOPs, Compliance, Inventory, Team, Transfers, Reports, and Integrations exposed a
Viewer or read-only boundary where applicable. The Facility profile resolved:

- `Facility AI Credits: 2000 / 2000`
- Facility plan `FACILITY (trialing)`
- balance owner `Triple Bag Genetics, llc`
- zero used and zero refunded credits for the current week

## Automated and build evidence

- Personal shared Back regressions: 30 focused tests passed before the first release.
- Nature-map request-order/photo suite: 2 tests passed after the router harness repair.
- Field Studies workflow: 12 tests passed.
- Personal Task Center workflow: 2 tests passed.
- Consolidated Back source policy: 8 tests passed.
- TypeScript and targeted lint passed for the changed screens.
- The complete local frontend CI suite passed all 94/94 regression batches after the
  remaining Personal Tools router harness was updated.
- Production Build Preflight passed for merges `4a17422`, `89b9846`, and `a198141`.

## Acceptance boundary

This closes the current signed-in Personal and Facility Viewer **route, heading,
Back-control, visible error-state, workspace-switch, and Facility credit-ownership**
slice. It does not claim:

- populated create/edit/delete mutations on every route;
- Facility Owner, Manager, or Staff mutation acceptance;
- Commercial owner acceptance;
- phone-size visual or keyboard/focus acceptance;
- notification delivery, payments, provider accuracy, or independent outside-user
  acceptance.
