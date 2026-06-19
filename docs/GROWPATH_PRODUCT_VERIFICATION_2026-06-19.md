# GrowPathAI Product Verification

Verified against the frontend and backend repositories and the running local API on
2026-06-19. This document distinguishes product intent from implemented behavior.

## Executive result

The pasted product vision is directionally correct, but it is not an accurate statement
of the current implementation. Navigation and account-mode separation have improved.
Several central personal-grow workflows are still shells or disconnected contracts.

The application is not yet at the stated Personal V1 acceptance level.

## Canonical plan completeness

The expanded feature plan supplied on 2026-06-19 is now the canonical product-intent
reference for this audit.

Using equal weight across its 21 Personal V1 acceptance bullets:

- Pass: 9
- Partial: 2
- Fail: 10
- Requires browser verification: 0
- Weighted acceptance completeness: approximately 48% (pass = 1, partial = 0.5)

This score measures acceptance behavior, not repository size or route count. A route, model,
screen, or button is not counted as complete unless the user workflow persists and reloads.

## Personal V1 acceptance matrix

| # | Acceptance requirement | Status | Evidence |
|---|---|---|---|
| 1 | Register, login, logout | Pass | Register/login routes exist; all four test account types authenticate; profile clears auth and routes to login. |
| 2 | Create a grow | Partial | Live create works, but the backend discards most fields from the full frontend form. |
| 3 | Open a grow | Pass | Grow list links to a grow workspace and loads the selected grow. |
| 4 | Create plants inside a grow | Fail | No complete Plants section exists in the active personal grow workspace. |
| 5 | Create logs inside a grow | Fail | Active frontend posts to `/api/personal/logs`; live backend returns 404. |
| 6 | Add log notes, photos, tags | Fail | Active personal log detail is a placeholder and personal journal CRUD is missing. |
| 7 | Auto-tag with AI | Fail | Mounted endpoint returns fixed tags without loading or updating the log. |
| 8 | View AI insights | Fail | GrowLog has no `aiInsights`; active log detail has no insight rendering. |
| 9 | Run VPD tool | Pass | Calculator validates temperature/RH and calculates VPD locally. |
| 10 | Run serious multi-input NPK tool | Fail | Current UI explicitly identifies itself as a label-ratio preview. |
| 11 | Save tool result to grow/log | Fail | ToolRun does not persist `growId`; journal POST is missing. |
| 12 | Diagnose from Tools/AI | Partial | UI and heuristic endpoint exist; vision output is a fixed placeholder. |
| 13 | Save diagnosis to grow/log | Fail | No active personal save/link workflow. |
| 14 | Create grow tasks | Fail | Active frontend posts to `/api/personal/tasks`; live backend returns 404. |
| 15 | Home shows active grow status | Fail | Home consists of navigation cards without live grow/task/log state. |
| 16 | Community loads without crashing | Pass | Live empty following feed returns 200 and an empty list. |
| 17 | Profile works | Pass (basic) | Email, mode, plan, account links, and logout render; broader saved/public features are absent. |
| 18 | No broken personal-mode tabs visible | Pass | Personal tab bar exposes only Home, Grows, Tools, Community, Profile. |
| 19 | No facility-only personal dead ends | Pass | Layout mode gates redirect mismatched users. |
| 20 | No major console runtime errors | Pass (sampled) | Headless Chrome traversed eight personal routes at desktop/mobile widths with no page errors, console errors, or HTTP 5xx responses. |
| 21 | Responsive web layout | Pass (sampled) | The same routes showed no document-level horizontal overflow at 1440x900 or 390x844. This does not replace visual regression screenshots for every nested state. |

## Canonical feature-area status

| Product area | Status | Current boundary |
|---|---|---|
| Grow-centered information architecture | Partial | Correct navigation/workspace skeleton; core child records do not persist. |
| Home dashboard | Missing | No active-grow, today-task, recent-log, insight, alert, or environment data. |
| Grows list and overview | Partial | List/create/open/count shells exist; cards and overview lack most planned state. |
| New Grow | Partial | Rich form exists; backend stores only a small subset. |
| Personal plants/pheno hunting | Missing | Model/facility routes exist, but not the planned personal grow workflow. |
| Journal/logs | Missing | Empty GET stub plus nonexistent POST/PATCH personal routes. |
| AI auto-tagging | Missing | Fixed acceptance stub, no insight persistence. |
| Diagnose AI | Partial | Context form and heuristics exist; real vision, confidence, linkage, and actions do not. |
| AI assistant | Missing | Local VPD command plus fixed acknowledgement; no real contextual assistant. |
| VPD/PPFD/watering/risk tools | Partial | Calculations exist; save/link contracts are incomplete. |
| Advanced NPK/feed calculator | Missing | Ratio preview only. |
| Personal tasks/calendar | Missing | Empty GET stub; create/update routes absent. |
| Photos/timeline/comparison | Missing | No canonical Photo model or complete personal UI workflow. |
| Harvest/final summary | Missing | Facility harvest experiments exist; planned personal completion flow does not. |
| Community/forum | Partial | Core post/follow/engagement routes exist; some legacy feed/save flows are inconsistent. |
| Courses/Learn | Partial | Models and many routes exist; catalog is empty and some actions are mocks or dead buttons. |
| Profile | Partial | Basic account view/logout works; public/saved/followed/creator features are incomplete. |
| Facility/commercial | Partial | Stronger route/screen surface and mode gates; full role-by-role acceptance is unproven. |
| Creator/educator | Partial | Models/routes/screens exist; complete publish, sales, engagement, and recommendation flow is unproven. |
| Analytics | Partial | Overview endpoints exist; complete dashboards and event integrity are not proven. |
| Recommendations/search | Early | Some course/forum score/search routes exist; no unified contextual engine. |
| Notifications | Partial | NotificationIntent and task/forum mechanisms exist; personal task source is missing. |
| External integrations | Partial | Twelve-provider registry and secure connection framework exist; Pulse is the implemented adapter. |

## Canonical model coverage

Present as dedicated models: User, Grow, Plant, GrowLog, Task, NotificationIntent, ToolRun,
Diagnosis, ForumPost, Comment, FeedItem, EventLog, Course, Lesson, Facility,
IntegrationConnection, and TelemetryPoint.

Not present as dedicated models from the canonical plan: GrowLogEntry, Photo, Follow,
ContentEvent, FacilityAccess, AnalyticsEvent, SavedItem, and Tag. Some concepts are embedded
in User or other documents. Embedded representation is acceptable only where ownership,
querying, and lifecycle contracts are implemented consistently; current personal workflows
do not yet meet that standard.

## Verified working

- Expo Router is the active routing system. The obsolete `MainTabs` failure does not apply.
- Personal navigation is Home, Grows, Tools, Community, and Profile.
- Logs, courses, diagnosis, tasks, AI, and forum routes are hidden from the personal tab bar.
- Personal, commercial, and facility layouts redirect users whose mode does not match.
- Free, Pro, commercial, and facility test accounts authenticate and resolve to the expected mode.
- Facility accounts resolve a facility ID.
- Personal grows can be listed and created.
- Grow workspace pages exist for overview, journal, tools, comparison, and tasks.
- VPD, PPFD/DLI, watering, bud-rot risk, crop-steering, and dew-point/Pulse tools have UI implementations.
- The forum latest, trending, and following endpoints exist.
- An empty following list returns an empty successful response rather than a server error.
- Follow/unfollow, likes, comments, saves, and forum post creation have backend routes.
- Pulse telemetry and the generic integration-provider framework exist separately from this audit.
- Frontend route inventory, V1 surface validation, tool-key guards, and TypeScript checks pass.

## Partially working

### Grow creation

The frontend collects name, system preset, anchor type/date, timezone, flip date, pot size,
pot count, cultivar, target VPD, and notes. The backend currently persists only name/title,
body, and stage. Most form data is discarded.

### Grow workspace

The intended grow-centered navigation exists. Its journal, task, and tool counts are not
reliable because the personal log/task APIs are stubs and tool runs do not retain grow ID.

### Tools

Several calculators compute local results. Save-to-journal navigation exists in the UI,
but the backend ToolRun schema stores only user, tool name, params, result, and timestamp.
It does not store `growId`, so tool runs are not actually attached to a grow.

The watering tool attempts to create a grow task, but that request currently receives 404.

### Diagnosis

The diagnosis UI collects substantial context. Text diagnosis is heuristic and recognizes
only a small set of terms. Production photo diagnosis is a placeholder that always reports
overall health as good. Diagnosis is not reliably linked to a selected grow or plant and
cannot be converted to a grow log/task through the personal workflow.

### Community

Forum primitives exist, including empty following-feed behavior. Some legacy feed routes
are incomplete. Saving a forum post to GrowLog uses fields that do not satisfy the current
GrowLog schema, so that action is expected to fail.

### Courses

Course models and many backend routes exist, but the local catalog is empty. Some frontend
course buttons have no action handler, and several backend course endpoints are explicitly
mock or stub behavior. This is not a complete course product.

### Facility/commercial

Mode gates and many facility screens/routes exist. This audit did not prove every facility
or commercial button. The feature-evidence validator reports missing backend test evidence
for many facility, course, AI, and user routes.

## Not implemented as described

### Personal journal persistence

`GET /api/personal/logs` is an empty stub. The frontend calls
`POST /api/personal/logs`, but no POST route exists and the live API returns 404.

The personal log detail page displays placeholder text instead of loading a log.

### Personal task persistence

`GET /api/personal/tasks` is an empty stub. The frontend calls POST and PATCH routes that
do not exist; live POST requests return 404.

### Grow Log V2 AI auto-tagging

The GrowLog model has `tags` but no `aiInsights` field. The mounted auto-tag endpoint
returns three hard-coded tags without reading, analyzing, or updating the requested log.
The more complete rule helper in `GrowLogService` is not used by that route and still does
not create AI insight text.

There is no Auto-tag button in the active Expo Router journal workflow and no AI insight
display on the active log-detail page.

### Grow-aware AI assistant

The personal AI screen supports a local `vpd` text command. Other messages receive a fixed
acknowledgement stating that backend context is still next work. It counts grows/logs/tasks
but does not reason over their contents, summarize a grow, suggest tasks, or route a real
AI conversation.

### Full NPK/feed calculator

The current screen explicitly identifies itself as an NPK label-ratio preview. It does not
support multi-product recipes, 18-20 input rows, elemental ppm, EC contribution,
micronutrients, batch recipes, or safety warnings.

### Home command center

The personal home page is navigation cards. It does not load active-grow state, today's
tasks, recent logs, alerts, recent AI insights, or recent tool results.

### Plants/photos/harvest personal workspace

The active personal grow workspace does not expose complete Plants, Photos, AI Insights,
or Harvest/Summary sections described in the product intent.

### Recommendation and analytics product

Some models and route names exist for scores, recommendations, and analytics. This does not
constitute the personalized recommendation engine or complete user-type dashboards in the
pasted design.

## Obsolete pasted issues

- `MainTabs` is not registered: obsolete; the app now uses Expo Router.
- API base URL is `127.0.0.1:5001`: obsolete for the current local setup, which uses 5002.
- Raw text-node failure in the old diagnosis screen: mitigation code is present and the
  current route renders through Expo Router. This specific historical stack trace is not a
  current proof of failure.
- All account modes debug the same: not current; live mode resolution and layout gates differ.

## Required implementation order

### P0: make the personal core truthful and persistent

1. Replace personal log stubs with authenticated grow-scoped CRUD.
2. Replace personal task stubs with authenticated grow-scoped CRUD and completion/snooze.
3. Add `growId` to ToolRun and enforce user/grow ownership on list/create.
4. Persist every supported New Grow field or remove fields that the backend will discard.
5. Replace the active log-detail placeholder with real fetch/edit/photo/tag behavior.
6. Wire auto-tag to the real log service, persist tags and AI insights, and add active UI actions.

### P1: complete the promised tools and AI

1. Replace fixed diagnosis results with a real provider-backed pipeline and uncertainty output.
2. Link diagnosis to grow, plant, photos, logs, and follow-up tasks.
3. Implement the multi-product NPK/feed calculator and preserve formulas/versioned outputs.
4. Make the AI assistant consume selected grow context and provide auditable tool calls.
5. Fix forum-to-growlog against the canonical personal journal model.

### P2: complete the product surface

1. Build the Today dashboard from real active-grow/task/log/tool/alert data.
2. Add personal Plants, Photos, AI Insights, and Harvest/Summary workspace sections.
3. Finish or intentionally hide incomplete course creation and enrollment actions.
4. Complete feed ranking, search, recommendations, and analytics with behavioral tests.
5. Run role-by-role browser acceptance tests for every visible commercial/facility command.

## Verification performed

- Live backend health and authentication checks.
- Live Free, Pro, commercial, and facility mode resolution.
- Live GET checks for personal grows/logs/tasks, tools, courses, and following feed.
- Live POST checks proving personal logs and tasks return 404.
- Frontend route inventory: 114 routes.
- V1 matrix inventory: 226 feature rows and 315 backend route records.
- V1 UI surface validation passed.
- Tool/journal and tool-key guards passed.
- TypeScript `--noEmit` passed.
- Feature-evidence validation reported numerous missing backend test files; those feature rows
  must not be interpreted as verified behavior.
- Headless Chrome traversal covered Home, Grows, Tools, Community, Profile, Diagnose,
  Courses, and Forum at 1440x900 and 390x844.
- That traversal produced no page exceptions, console errors, HTTP 5xx responses, or
  document-level horizontal overflow.
