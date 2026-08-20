# Crop, Social Video, Notification, and Hosted-Live Acceptance — 2026-08-20

## Scope and boundary

This record covers signed-in production inspection plus focused automated checks. It
does not claim native push receipt, a Facility-owner browser mutation, a public Live
concurrency load test, or a successful confirmed-Plant-ID-to-grow mutation.

## Crop-aware grow creation

- Personal and Commercial production both rendered the shared crop-aware New Grow
  workflow with common/scientific/alternate names, lifespan, production pattern,
  dormancy, propagation/start method, plant count, establishment timing, first-harvest
  timing, interests, environment, method, date, timezone, photos, and a post-save Grow
  Calendar handoff.
- A read-only tomato guidance lookup matched reviewed `Solanum lycopersicum` guidance,
  retained tender-perennial/climate and cultivar-dependent uncertainty, and asked for
  cultivar, propagation, region, and production-setting facts instead of inventing
  timing.
- Existing Personal grow `6a86c181e4f8953edcc6ec11` survived reload with its tomato
  identity and Vegetable context. Existing crop calendars rendered real crop/cannabis
  inputs and generated task schedules from reviewed user values.
- Facility crop-aware setup is covered by the merged shared wizard and focused tests;
  this Admin identity has no Facility workspace, so a Triple Bag Genetics Facility
  owner browser acceptance remains part of the role matrix.
- The opened Grow Overview exposed a product gap: setup identity and lifecycle values
  were persisted but not reviewable there. This change adds a shared crop-identity and
  lifecycle panel plus direct Grow Calendar and Plants actions for Personal and
  Commercial grow details.
- Merge `95d946bae8c9c9fd4befd96495134de937f4a612` passed both main-branch
  production checks. Production then rendered the new panel on grow
  `6a86c181e4f8953edcc6ec11`, classified the saved tomato as a climate-dependent
  tender perennial with cultivar-dependent production and climate-dependent dormancy,
  kept its absent scientific identity explicitly `Not confirmed`, and opened both the
  exact grow-scoped Calendar and Plants destinations.
- The linked Calendar initially recognized only the grow ID and required an optional
  AI-credit action to fill facts already stored on the grow. The follow-up change
  deterministically loads saved crop identity, reviewed lifecycle, count, start date,
  establishment/harvest timing, environment, method, and reviewed-source notice for
  Personal, Commercial, and Facility grow selections. AI remains optional for deeper
  evidence synthesis and cannot replace confirmed saved values.

Focused verification: six suites / 34 assertions passed across New Grow access,
Facility Start Grow, Auto Grow Calendar, the reviewed lifecycle registry, Grow
Overview, and Grow Overview theme. TypeScript passed, focused lint passed, and the
post-format Grow Overview regression passed nine assertions.

## Videos, follows, comments, sharing, and notifications

- Production `/videos` exposed published discovery, title/description/tag/account
  search, newest/most-viewed sorting, an all/followed-people filter, and the separate
  owner/workspace library.
- The opened public video detail retained the GrowPath-hosted player, account follow,
  report, canonical share/copy plus Facebook/X/Bluesky/Reddit/LinkedIn/email/text
  handoffs, and an in-context threaded discussion composer.
- Production `/lives` exposed All, Campaign-linked, Upcoming, Live now, Premieres, and
  Replays instead of presenting campaigns as the Live list.
- Production Notification Center exposed persisted device-push and per-category
  controls for tasks, Forum replies/mentions, video activity, courses/lives, commerce,
  and Facility alerts, plus unread/category filters and exact-source links.

Focused verification: nine suites / 49 assertions passed across video discovery/API,
video detail, followed-video discovery, Live Studio, Live/Premiere directory, public
sharing, notification deep links, and Notification Center.

## Hosted Live closure

Private retained session `6a86ee9a5ebd41c93848993d` completed saved OBS ingest,
zero-drop broadcast, web playback/volume, GrowPath chat in OBS, clean stop, Cloudflare
recording discovery, and signed replay. The final production reload reported
`replay_available`, rendered the replay player controls, and retained the chat/overlay
evidence. The existing architecture must be reused rather than rebuilt.
