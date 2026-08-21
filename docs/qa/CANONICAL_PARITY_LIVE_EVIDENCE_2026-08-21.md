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
