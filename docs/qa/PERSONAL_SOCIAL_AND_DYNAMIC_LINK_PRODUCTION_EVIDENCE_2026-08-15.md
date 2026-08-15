# Personal social and dynamic-link production evidence

Date: 2026-08-15

## Scope

- Production frontend: `https://growpathai.com`
- Frontend candidate: `660b1d28782e4559a58172c01ec067d1e20d59fb`
- Backend candidate: `464e23908a8eb1532ae9b7d27d4919915ae8cc82`
- Account/role: authenticated `admin@growpathai.com`, Personal workspace, platform Admin
- Browser evidence: Codex in-app Browser, 1280 x 720, captured at
  `2026-08-15T07:24:00.452Z`
- This was a read-only production pass. It did not publish a video, comment, follow,
  start a live, rotate a key, or change retained content.

## Video discovery, following, and library

The production Videos route exposed:

- public discovery search and newest/most-viewed ordering;
- a working `People I follow` filter, which changed the result to the truthful
  `No accessible videos match this search` state for this account;
- a Personal library showing `0 B used of 10 GB`, workspace/my-upload scope, and
  published/draft filters;
- GrowPath upload plus YouTube, Rumble, Vimeo, and other-URL sources;
- Public, Followers only, Unlisted, Private, and Course only visibility;
- the structured seven-tier Grow Interest selector and the separate cannabis/hemp
  content marker.

Discover exposed `All videos`, `Following only`, and exact populated-video actions.
Forum/Q&A exposed direct links to the video library, video browser, and Lives browser.

## Defect found and repaired

Public discovery returned video `6a6a52f42ac7c03b4303a7d6`, and its public API
detail returned HTTP 200, but the canonical browser URL
`/videos/6a6a52f42ac7c03b4303a7d6` initially returned a plain Render HTTP 404. The request
never reached Expo Router because the static service only retained `/home/*` and the
one-segment `/*` rewrite.

Frontend merge `660b1d28782e4559a58172c01ec067d1e20d59fb` added explicit, ordered application-
shell rewrites for every root dynamic family: Videos, Store, Storefront, Brands,
Forum, Field Observations, Facilities, Alerts, Tasks, and Logs. A focused route-order
contract passed 1/1; TypeScript, lint, the full PR gate, and Production Build Preflight
passed. The same ordered table was saved in the live Render service. Live HTTP probes
then returned 200 for the exact video, Store dynamic path, and Forum post path.

The exact video detail subsequently rendered:

- title, owner, date, visibility, and player;
- Follow and Report Video;
- native share/copy plus Facebook, X, Bluesky, Reddit, LinkedIn, Email, and Text;
- Grow Interest topics;
- discussion empty state, comment editor, and disabled-until-valid Post Comment.

The retained Forum report target `/forum/post/6a5ba5236459013643be5cf3` also opened its
exact post, photo expansion, Like, Report, share/copy/social actions, comments, and
comment-photo attachment without a visible load/access/not-found failure.

## Lives and Live Studio

The Lives directory exposed All, Campaign-linked, Upcoming, Live now, Premieres, and
Replays with a truthful empty state. Live Studio exposed:

- Live stream or Video premiere;
- outside live URL or hosted GrowPath broadcast;
- Twitch, YouTube, Kick, Facebook Live, Instagram Live, or another service;
- schedule, reminder, recurrence, chat, slow mode, outside-picker feed, Discord
  announcement, and draft/live controls;
- a retained private `QA OBS ingest acceptance` draft.

The retained draft opened the exact Live Session with share/copy/social actions,
GrowPath Chat, OBS overlay creation, host-only stream-key rotation, RSVP, and removal.
No secret value was captured. This does not prove real OBS ingest, simultaneous-account
concurrency, viewer playback/volume, replay/retention, or final cleanup.

## Nature and courses boundary

Discovery linked directly to Identify a Plant and mapped findings. The public Nature
route loaded its globe, review/invasive filters, Identify a Plant, and Start a Field
Study actions, but production contained zero opted-in observations. Personal Courses
loaded Create Course and Invite with a truthful zero-course state for this account.
Neither empty state substitutes for populated media acceptance.

## Remaining acceptance

- Owner upload/edit/publish/remove and course attach/detach for a real retained video.
- A real followed account with a populated Following result.
- A populated public Commercial storefront proving product/course/video/website/pickup
  handoffs without fabricated records.
- Real hosted OBS ingest, viewer playback/volume, overlay rendering, replay/retention,
  simultaneous-account limits, cost observation, and QA-draft cleanup.
- A deliberately published, media-backed Nature observation and withdrawal loop.

