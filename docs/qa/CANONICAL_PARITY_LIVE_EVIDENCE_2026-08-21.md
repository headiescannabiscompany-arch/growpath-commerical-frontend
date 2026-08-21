# Canonical workspace, Nature, and media live evidence

Date: 2026-08-21 (America/New_York)

This record proves only the named production slices below. It does not close a canonical
story whose mutating, persistence, role, theme, viewport, accessibility, or recovery
acceptance remains incomplete.

## Exact production candidate

- Frontend repository: `headiescannabiscompany-arch/growpath-commerical-frontend`
- Frontend merge SHA: `f2875eeeb619285e3760d2a1a73e91008e95234e`
- Render static deploy: `dep-da4051ht0dsc73a2rdp0`
- Render status observed in the signed-in dashboard: `Deploy succeeded`
- Backend repository: `headiescannabiscompany-arch/growpath-commerical`
- Backend merge SHA: `ccaabd531efb524e9eb06403bc1e57aab2df9df5`
- Backend production fingerprint:
  `growpath-backend|git=ccaabd531efb524e9eb06403bc1e57aab2df9df5|ts=2026-08-21T07:46:41.755Z`
- Production origin: `https://growpathai.com`
- Browser: Codex in-app browser, signed-in retained session
- Identity displayed by the workspace selector: `EtGU_Jay`
- Available workspaces shown: Personal and Facility
- Facility displayed: `Triple Bag Genetics, llc`

## Integrated release-candidate continuation

The repair batches were subsequently integrated and deployed on the following exact
candidate. The earlier evidence in this document remains evidence for its named slices;
the checks below identify the production behavior that was repeated after integration.

- Frontend merge SHA: `2c5d7ccb14b9113a18dcb5d04027f9e031b215de`
- Frontend Render deploy: `dep-da46rttckfvc738cfge0`
- Render status observed in the signed-in dashboard: `Deploy succeeded`
- Served web bundle observed from `https://growpathai.com`:
  `index-6f583fc8542b51d41ea56270d7ffc5ba.js`
- Frontend CI for the final Commercial navigation repair: run `32496746432`, success
- Backend merge SHA and production fingerprint:
  `growpath-backend|git=c7b7674c783414a02af4f0ab2ff7f59e8279e652|ts=2026-08-21T12:40:07.400Z`
- `GET https://api.growpathai.com/api/health` returned `{"ok":true}` during the
  continuation.

The final Admin-navigation regression repair advanced the served frontend to
`ff7ef5d12f8d96d3a5acf96936609f481b596509` through Render deploy
`dep-da48139t0dsc73aavlbg`. Frontend CI run `32504176905` completed successfully, including
dependency audit, Expo Doctor, lint, delivery guards and the full test step. The delta from
the already-accepted `907e29ee` candidate is limited to the documented Admin navigation
contract, three role-gated UI entry points, and their focused tests; it does not reopen an
unrelated accepted route without a reproduced regression. Backend `main` remained
`c7b7674c783414a02af4f0ab2ff7f59e8279e652`, and production health returned `{"ok":true}`
at `2026-08-21T16:51:34.004Z`.

The integrated frontend history includes Commercial grow/tool parity, scoped
automation/tasks, future Nature metadata/GPS/manual-pin and withdrawal safeguards,
Admin safety investigation surfaces, device connection/history-import scope, and the
retained hosted OBS/live lifecycle. The backend candidate includes the matching Nature,
Commercial/Facility automation and task isolation, device integration, hosted-live and
account-cleanup repairs.

### Personal production continuation

- Account: retained signed-in `EtGU_Jay` Personal workspace.
- `/home/personal/grows/?acceptance=legacy-id-live-5b20368` rendered two populated grows
  without a runtime error.
- The latest-grow dashboard actions resolved the legacy `_id`
  `6a603a8fda5c5bfdc030ac1b` instead of linking back to the grows index.
- Activating `Timeline` navigated to
  `/home/personal/grows/6a603a8fda5c5bfdc030ac1b/timeline` and rendered the visual
  timeline, workspace tabs, Lifecycle/Month/Week/Day detail controls, viewer-friendly
  export, and review-before-share continuation without a runtime error.
- This proves the repaired production navigation and preserves P-10 as `partial`.
  Download persistence plus share review/cancel/publish/withdraw remain unexercised and
  are not claimed.

### Commercial production continuation

- Account: `jcindc2012@gmail.com` in Chrome, Commercial workspace.
- The Commercial dashboard, AI Tools, Saved AI Runs, device integrations, Commercial
  Lives, and shared Live Studio loaded without browser runtime errors.
- AI Tools truthfully reported `Commercial plan: FREE (inactive)` and `5 / 5` weekly
  credits. Saved AI Runs truthfully rendered an empty Commercial-scoped history.
- Device integrations required a selected or created grow before connection/import,
  kept the legacy Personal Growlink path disabled, and distinguished implemented,
  access-required, gateway-required and contract-pending providers.
- Commercial Lives exposed private-draft creation, scheduling, visibility, replay,
  Twitch readiness and links to the retained shared Live Studio. Live Studio exposed
  outside destinations, GrowPath-hosted broadcast, OBS/Streamlabs guidance, GrowPath
  chat, outside-picker export, premieres, Discord announcements and explicit
  review-before-publish behavior.
- `/home/commercial/grows` returned the honest backend error `Commercial plan required`.
  Therefore positive paid-Commercial grow, task, automation, comparison, persistence and
  role acceptance remains open; this account cannot close those slices.
- The initial integrated candidate exposed undeclared alias routes `tools/ipm-scout`,
  `tools/saved-runs`, and `tools/species-crop-id` as raw extra tabs after Profile. PR
  `#712` explicitly excluded all three aliases and extended the six-destination navigation
  regression. The exact deployed candidate above was then retested at
  `/home/commercial/profile/?acceptance=nav-live-2c5d7cc`: the bottom bar contained only
  Dashboard, Storefront, Feed / Campaigns, Forum, More, and Profile, with Profile selected
  and no browser runtime error.

#### Paid Commercial read-only continuation

- Account: `jcindc2003@yahoo.com`, Commercial workspace for the `Living Soil Labs`
  storefront, with a Facility-tier plan. This is distinct from the `Triple Bag Genetics`
  Facility workspace.
- Dashboard reported the correct signed-in identity, Facility-tier entitlement, Living
  Soil Labs storefront slug, draft publication state, and zero-product state.
- Commercial Grows loaded without an entitlement error and exposed Create Grow, AI Tools,
  Diagnosis and Tasks. The create route exposed crop-aware common/scientific/alternate
  names, lifespan, production/harvest pattern, dormancy, establishment and first-harvest
  planning fields. No production grow was created during this read-only pass.
- Commercial AI Tools reported `FACILITY (trialing)`, `2000 / 2000` weekly credits and
  exposed Ask AI, Diagnose, Plant ID, IPM, Environment, formula/mix builders, Saved Runs,
  evidence runs, Batch Planner, Commercial Tasks and the Tool Library. Saved Runs rendered
  an honest empty Commercial-scoped state.
- Commercial Tasks rendered the unified queue, schedule/reminder/recurrence controls,
  source types and zero-task state without a browser runtime error. No task was created.
- Device Integrations required selecting or creating a Commercial grow, kept the legacy
  Personal Growlink path disabled, and truthfully distinguished implemented,
  access-required, gateway-required and contract-pending providers.
- Commercial Lives and the shared Live Studio loaded without runtime errors. They exposed
  private-draft creation, explicit publication, outside destinations, GrowPath-hosted OBS
  broadcast, GrowPath chat/overlay, premieres, viewer playback controls and Discord
  announcements. No live session or external connection was created.
- Storefront and Products rendered Living Soil Labs' truthful draft/empty readiness state,
  product setup fields and regulated-cannabis checkout warning without a runtime error.
- The additional read-only crawl loaded Feed / Campaigns, Brand Forum / Q&A, Commercial
  Inventory Support, Commercial Analytics, Orders, Courses, Soil & Nutrient Batch Planner,
  Product Lines, Product Trials and Profile. Every route retained the six-destination
  Commercial bottom navigation and produced zero browser runtime errors.
- This evidence proves route availability, scope/copy/empty-state behavior and the repaired
  bottom navigation for the named production candidate. It does not prove mutation,
  persistence, role collaboration, automation execution, populated comparison, provider
  connection or recovery behavior; those acceptance slices remain open.

### Platform Admin production continuation

- Account: `admin@growpathai.com`; the control center identified the session as
  `GROWPATHAI PLATFORM OWNER` and rendered Administration without a runtime error.
- The overview rendered current presence and registered-user counts, Personal/Commercial/
  Facility account totals, recent product activity and separate security, regulated-
  commerce, calibration, knowledge-governance, user, work, support, moderation and legal/
  evidence sections.
- Security visibility reported zero open investigations, zero submitted security reports
  and zero resolved security records across the connected GrowPath sources. Source coverage
  truthfully marked submitted reports, high/critical safety reports, audited enforcement and
  failed integration deliveries as connected, while marking Sentry Admin read access as not
  configured. The page explicitly warned that disconnected, truncated or unconfigured
  sources are not represented as complete.
- The Admin work queue reported `Active: 3 · Completed: 9`. Active support was empty;
  completed support history remained available behind `Show completed work`. Opening that
  view displayed retained resolved records and required a reason before any reopen action.
- Three active moderation cases were visible with target type, severity, status, reporter
  reason, retained preview and exact action controls. The first course case opened
  `/courses?courseId=6a663d0508a5c374af9abf28&moderationCaseId=6a68ef972ac7c03b43039160`,
  loaded the exact reported QA course, and returning through the Admin deep link focused the
  matching case with `Opened from a moderation investigation link`. No moderation action was
  taken.
- Legal/evidence intake stated that preservation is separate from disclosure and that
  approval/disclosure remain unavailable until the backend enforces legal approval,
  minimum-scope manifests, recipient/method recording and chain of custody. Opening the
  Admin-only intake exposed typed authority, requester, jurisdiction, target, minimum-scope
  and date fields and stated that creation alone does not preserve, approve, disclose or
  notify. The untouched form was canceled; no request was created.
- `Switch workspace` showed the Admin identity with separate Personal and Commercial modes.
  Opening Commercial rendered `admin@growpathai.com | pro plan` and the Admin-owned draft
  brand shell with one product; it did not expose Living Soil Labs or Triple Bag Genetics.
- Admin logout required an explicit confirmation. Confirming navigated to `/login`, and a
  subsequent direct `/admin` request returned `Platform owner access required`, proving that
  the authenticated identity and saved workspace selection had been cleared. No browser
  runtime errors occurred during the Admin pass.
- This initially proved positive-role Admin authorization by direct route, current read-only platform visibility,
  moderation deep linking, completed-history presentation, fail-closed disclosure UI,
  workspace isolation and confirmed logout for the exact candidate. A-01 through A-05 remain
  `partial`: this pass intentionally did not mutate user/security/moderation/legal records,
  exercise assignment/reopen/preservation persistence, or prove a backend disclosure and
  chain-of-custody workflow that the UI itself marks unavailable.

#### Admin workspace-navigation regression and live repair

- After signing back in as `admin@growpathai.com`, production Personal home exposed no
  visible return path to Platform Administration. The direct `/admin` authorization check
  remained healthy, so the reproduced defect was discoverability rather than privilege.
- Frontend PR `#714` added a role-gated `Platform Administration` destination to the
  workspace chooser and to Admin-owned Personal and Commercial dashboards without adding
  Admin as a fourth workspace mode or weakening the `/admin` authorization boundary.
  Focused workspace-switcher, Personal-home, and Commercial-dashboard tests passed `47/47`;
  full TypeScript, focused source lint, formatting, and diff checks passed.
- Render deployment `dep-da48139t0dsc73aavlbg` served frontend `ff7ef5d1` on 2026-08-21.
  At `https://growpathai.com/home/personal?verify=admin-entry-b16ac541`, the signed-in Admin
  saw exactly one visible `Platform Administration` shortcut. Activating it navigated to
  `https://growpathai.com/admin`, where Security and Moderation surfaces rendered with zero
  browser runtime errors. Ordinary-account hiding is covered by the role-gated focused
  tests; no Admin, moderation, account, security, or legal record was mutated.
- This closes the reproduced navigation regression only. A-01 through A-05 remain partial
  for their already-named mutation, assignment, preservation, disclosure, chain-of-custody,
  and broader role/session acceptance slices.

### Signed-out public-route continuation

- After the confirmed Admin logout, the exact candidate was crawled without an authenticated
  session at `/`, `/store`, `/courses`, `/videos`, `/lives`, `/field-observations`, `/forum`,
  `/privacy`, `/terms` and `/support`.
- Every route rendered its intended public heading, completed its loading state, avoided an
  access-denied state and produced zero browser runtime errors. This proves signed-out route
  availability only; it does not close populated filtering, enrollment/purchase, playback,
  comment, RSVP/chat, Nature-pin or support-submission mutations.

## Accepted read-only slices

### Workspace boundary

- `/account/workspace` showed the signed-in identity and explicit Personal/Facility choices.
- Selecting Facility opened `/home/facility/dashboard`; selecting Personal returned to
  `/home/personal`.
- Direct `/home/commercial` access returned the expected Commercial-mode denial.
- Direct `/admin` access returned the expected Platform Owner denial.
- Commercial and Admin positive-role acceptance was not performed with this identity.

### Personal AI and Plant ID discovery

- `/home/personal` completed its loading state and rendered a populated active-grow command
  center with real destinations for the grow, log/photo entry, AI tools, diagnosis, tasks,
  overdue work, retained ToolRun sources, journal, and grow analytics. Its honest missing-
  telemetry and missing-photo states linked to integrations and photo collection.
- The same home exposed Forum, video library, Lives, Live Studio, notifications, storefront/
  feed/course discovery, the zero-pin Nature globe, and Plant ID without collapsing those
  capabilities into single-letter menu items.
- `/home/personal/tools` exposed Species / Crop Identification with no grow required,
  Harvest Readiness as a full readiness workflow, IPM Scout, Saved Runs, and truthful AI
  credit boundaries.
- `/home/personal/tools/species-crop-id` exposed:
  - optional grow attachment;
  - up to 12 photos and one private source video;
  - durable server frame extraction language;
  - private device GPS and reviewed manual map placement;
  - optional Field Study/Nature continuation;
  - common, scientific, cultivar, alternate-name, date, habitat, region, and morphology
    review fields;
  - disabled analysis until required upload/extraction/location activity has completed.

### Retained evidence and Nature continuation

- `/home/personal/tools/saved-runs` loaded retained runs without a workspace error.
- Saved Plant ID run `6a87493629a2753aa3dcc0fc` displayed:
  - three inspected source photos;
  - six exact 1600 x 1600 AI inspection views;
  - View, Save, and Export inspection-evidence controls;
  - reopen-with-saved-evidence and correction paths;
  - current-location, photo/video-location recovery, and manual map placement controls;
  - a separate Nature draft requiring observation date, contributor-authored public
    description, explicit approximate-pin consent, and a privacy warning;
  - a disabled Publish action while the required location/date/description/consent state
    was incomplete.
- No location was requested and no private or public observation was written during this
  acceptance run.

### Public Nature and Discover

- `/field-observations` rendered an interactive globe, search and review filters, a
  location-disabled explanation, an honest `0 pins in view`, and an honest empty list.
- `/home/personal/discover` rendered the compact Discovery Nature globe even with zero pins,
  direct Identify a Plant and mapped-findings actions, plus the public/following video
  discovery controls.
- Zero pins is the correct current state. Legacy house, Cary, and Maydale media was not
  guessed, merged, or republished.

### Facility scope

- `/home/facility/dashboard` loaded populated Facility counts and working command links.
- `/home/facility/ai-tools` exposed Facility-scoped Ask AI, diagnosis, Plant ID, IPM,
  environment, soil/nutrient builders, Harvest Readiness, Saved Runs, reports, and tasks.
- Opening Plant ID stayed at `/home/facility/tools/species-crop-id` with an explicit
  Facility workspace and Facility ID. It remained grow-optional and kept Personal
  Field Study/Nature actions out of the shared result.
- `/home/facility/grows` opened the retained Facility grow and its grow workspace.
- The grow showed devices/history as read-only for the current role and did not expose a
  write action to an unauthorized member.
- `/home/facility/tasks` loaded its populated retained task and correct Facility-local
  detail destination.

### Grow timeline and media discovery

- `/home/personal/grows/new` exposed a grow-optional AI draft path, explicit crop common/
  scientific/alternate names, reviewed lifecycle and production paths, dormancy, start type,
  calendar handoff, interests, system/anchor/timezone settings, and photo evidence. Create
  remained disabled without the required anchors.
- Entering `Tomato` and selecting Match crop guidance changed only the local unsaved draft.
  It matched reviewed `Solanum lycopersicum` guidance, separated tender-perennial biology
  from common annual cultivation, distinguished determinate/indeterminate production, and
  requested cultivar, climate, start-method, and region details instead of inventing dates.
  No grow was created.
- Direct grow timeline
  `/home/personal/grows/6a603a8fda5c5bfdc030ac1b/timeline` loaded 60 retained events,
  lifecycle/month/week/day zoom controls, viewer-friendly export/share actions, and source
  links for logs, tasks, ToolRuns, diagnoses, and automation events.
- `/videos` exposed published-video search, All accessible and People I follow filters,
  sort controls, and a populated public video.
- Opening that retained video loaded its GrowPath player, creator name, visibility/date,
  description, summary, topics, source status, internal Share/Copy actions, Facebook/X/
  Bluesky/Reddit/LinkedIn/email/text destinations, and an empty comment composer with its
  submit action disabled. The detail did not expose a creator-profile or follow action, so
  the creator-discovery slice remains open.
- `/live-studio` preserved the existing OBS/Cloudflare/chat architecture and its retained
  private draft. `/lives` rendered an honest zero-public-session state.

### Forum and Q&A discovery

- `/home/personal/community` exposed one canonical Forum/Q&A entry with working links to
  create and browse discussions, find groups, ask for diagnosis help with a useful prompt,
  share a grow update, browse/upload videos, and browse/manage Lives.
- The retained populated discussion rendered its three photos, grow-context tags, like
  count, and expandable replies. Expanding it completed its loading state, displayed the
  retained replies, kept an empty reply action disabled, and provided a real full-discussion
  link.
- The six-label bottom navigation rendered Home, Grows, Forum, Discover, More, and Profile
  with Forum selected. No forum content or follow/report state was changed.

### Personal profile and notification continuity

- `/home/personal/profile` exposed the verified account email/status, workspace switch,
  Day/Night/Auto selection and auto-theme explanation, plan and billing actions, an exact
  AI-credit balance and refresh explanation, notification preferences, interests, cannabis
  visibility/parental controls, report/export, account-data export, deletion confirmation,
  and logout.
- Opening logout displayed separate Confirm and Cancel actions. Cancel kept the signed-in
  account and profile state intact; logout itself was not performed during this run.
- The profile's notification action opened `/home/notifications`, which rendered delivery
  state, category preferences, unread/all/category filters, retained notifications, and
  Facility-local source links. Its Back action returned to the Personal profile.
- No preference, notification, billing, export, deletion, or session state was changed.

## Reproduced defects and local repairs

The direct timeline was healthy, but the Grows-page ActionButton shortcuts were
`Pressable` elements with `role="link"` and no real `href`. Mouse, DOM, and keyboard
activation did not navigate in production. The repair replaces those pseudo-links with
Expo Router `Link` children and adds an activation regression.

- Local repair commit: `9588bf06` (`fix(grows): restore actionable workspace links`)
- Focused test: `PersonalGrowsRoute.test.tsx`, 3/3 passed
- Full TypeScript: passed
- Focused source and test lint: passed
- Prettier and diff checks: passed
- This repair was not yet deployed at the time of this evidence record.

The Personal community preview rendered the retained populated discussion, but the full
`/forum` route reused the signed-in user's crop-interest-filtered response for both `For
You` and `All Discussions`. That made the full All view report `No posts yet` even when the
retained thread existed. The repair gives each tab its own canonical request: For You keeps
the crop-interest filter, while All requests the unfiltered server page and preserves server
pagination.

- Focused test: `ForumFeedSeparationRoutes.test.tsx`, 17/17 passed
- The regression proves the For You request is crop-filtered, switching to All performs a
  separate unfiltered request, and a retained post outside the crop interests becomes visible.
- This repair was not yet deployed at the time of this evidence record.

## Runtime observations

No application runtime errors were captured while exercising the paths above. The only
browser console entry was the known Expo web warning that push-token-change listeners are
not fully supported on web.

## Still required before closing the related stories

- Positive-role Commercial and Platform Admin browser acceptance.
- A new non-sensitive Plant ID upload using retained-media metadata, authorized GPS, or a
  reviewed manual pin, followed by explicit Nature publication, reload, public card/map
  review, withdrawal, reload, and cleanup.
- Mobile/tablet/desktop, Day/Night/Auto, keyboard, focus, text-scale, and screen-reader
  acceptance on the frozen final candidate.
- Device integration tenant/role/import corrections and real provider/import acceptance.
- Live draft/publish/broadcast lifecycle repairs without replacing the retained OBS stack.
