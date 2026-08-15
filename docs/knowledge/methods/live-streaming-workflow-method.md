# Live Streaming and Premiere Workflow

GrowPath Lives are available to eligible signed-in Personal, Commercial, and Facility
accounts. A creator label is not required. A live directory must distinguish scheduled
sessions, sessions live now, premieres, and replays, and must support search, Following,
RSVP, and reminders without confusing campaigns with actual broadcasts.

## Live sessions and premieres

A live session records its host, title, description, schedule and timezone, visibility,
grow interests, status, thumbnail, chat state, external stream destination, linked course,
forum, product or feed record, and replay. A premiere schedules a published video owned
by the host; it does not copy the video or bypass its visibility and playback controls.
The directory and detail page label premieres clearly.

Hosts can draft, preview, publish, start, end, and attach a replay. Viewers can open only
published sessions allowed by public, following, customer, or private access. Ending a
session must not erase its chat, RSVP, moderation, or replay records.

GrowPath-hosted broadcasts use private account-owned encoder channels. A host may save
the RTMPS server and stream key in OBS and reuse that channel for later sessions. When
saved channels exist, Live Studio selects the first available account channel by default;
creating another channel remains an explicit choice. A session binds to the chosen
channel without exposing its key again. Different accounts and concurrent channel slots
never share credentials, and rotating or removing a channel invalidates its old key.

Viewer playback and broadcaster production are separate control surfaces. A viewer
watching inside GrowPath must have the source player's play, pause, volume, mute, and
fullscreen controls; captions and replay seeking must remain available when the source
provides them. Do not force a viewer into OBS or another service to control playback.
The broadcaster continues to use OBS, Streamlabs, or the destination service for cameras,
microphones, scene switching, screen sharing, bitrate, and the outgoing audio mix.
Live Studio must ask where the video is being broadcast and support Twitch, YouTube, Kick,
Facebook Live, and a labeled secure watch URL for another service. Discord remains an
optional announcement destination and must never appear to be the only streaming option.
Scheduled sessions, active streams, premieres, and replays share the canonical GrowPath
session URL rather than only the outside destination. Provide the system share sheet,
copy-link behavior, and reliable direct web-share destinations. The shared page preserves
host identity, schedule, RSVP, chat, video access, and replay continuity. Do not present
Instagram, YouTube Community, or a federated Mastodon server as a universal direct-compose
integration when the platform does not offer one; those remain available through the
system share sheet or copied link.

Every live share invitation must bring the recipient to the canonical GrowPath session
page, where they can watch when embedding is supported, open the authorized outside
player when required, RSVP, join GrowPath chat, sign in or register, and return for the
replay. The outside watch URL is playback context, not the primary invitation link.

## Two broadcast modes

Live Studio offers two explicit paths. `Use an outside live URL` accepts Facebook,
Instagram, YouTube, Twitch, Kick, and another reviewed HTTP(S) watch URL. GrowPath keeps
the canonical session page, chat, sharing, reminders, and replay continuity. It embeds a
provider player only when that provider and specific URL allow it; otherwise the session
shows an honest named handoff such as `Open on Instagram` instead of a broken player.

`Broadcast live in GrowPath` is a separate first-party mode. An authorized host receives
a revocable per-session ingest URL and stream key for OBS or another compatible encoder.
The secret is shown only to the host, stored encrypted, never placed in public session
data, and rotated after disclosure or suspected compromise. Starting an encoder does not
publish a draft session; the host explicitly takes the reviewed session live.

The first-party path requires authenticated RTMP or SRT ingest, bounded transcoding into
adaptive viewer playback, health/state reporting, in-app play/pause/volume/mute/fullscreen,
GrowPath chat beside the player, explicit end-of-stream handling, and a reviewed replay
retention choice. The session page remains the canonical watch/share URL. It exposes
whether video is `connecting`, `healthy`, `degraded`, `interrupted`, `ended`, or available
as a replay without claiming health from a stale heartbeat. Hosts still control cameras,
microphones, scenes, screen sharing, bitrate, and outgoing audio in OBS; GrowPath controls
ingest authorization, playback delivery, chat, moderation, retention, and session access.

First-party streaming is not complete merely because the OBS chat overlay works. Do not
show a GrowPath stream key or label a session `hosted by GrowPath` until ingest,
transcoding, playback, authorization, moderation, recording/retention, quotas, abuse
response, and production observability are implemented and verified end to end. Outside
provider broadcasting remains available and never silently receives or reuses a
first-party stream key.

## GrowPath chat and OBS overlay

GrowPath chat is its own conversation. It is not an automatic aggregation of Twitch,
YouTube, or Facebook chat. A signed-in authorized viewer may send a bounded message while
chat is enabled. Slow mode, deletion, reporting, blocking, and host or administrator
moderation apply. Deleted or hidden messages disappear from both the viewer chat and the
stream overlay while the audit record remains.

Each session has a private, random, rotatable overlay token. The host receives an OBS
Browser Source URL containing that token. The transparent overlay renders the GrowPath
leaf, user avatar, display name, and message with configurable placement, theme, accent,
font size, duration, and message count. It contains no application navigation, account
details, exact location, credentials, or moderation controls. Overlay responses are
no-store and expose only messages for that session. Rotating the token invalidates the old
URL immediately.

The overlay is destination-neutral: it is part of the broadcaster's OBS, Streamlabs,
XSplit, or comparable scene, so it can appear on Twitch, YouTube, Kick, Facebook Live,
or another current or future service that accepts that broadcast composition. Do not
hard-code overlay availability to a short platform list. Direct chat relay and outside
picker participation remain separate, provider-specific capabilities and must be labeled
unavailable until the provider and picker have a confirmed supported path.

Discord is an optional community destination, not a hidden chat-ingestion source. With
the server administrator's explicit authorization, GrowPath may post scheduled, live-now,
premiere, and replay announcements to a selected channel through an incoming webhook.
Store the webhook secret encrypted, show the selected server/channel and last-delivery
state, support test/disconnect, and never expose the webhook URL to clients. Reading or
mirroring server messages requires a separately installed Discord app, the minimum
approved Gateway intents, visible server consent, moderation rules, and an explicit
product workflow; do not request privileged message content merely to inflate engagement.

## Outside giveaway pickers

GrowPath does not choose giveaway winners. A host may define an entry hashtag or keyword
and enable an authenticated external-picker feed. Qualifying visible GrowPath messages
become entries; one-entry-per-user may be enforced. Deleted, hidden, blocked, host,
moderator, or bot entries must be excluded according to host policy. The feed provides
stable entry and user IDs, display name, keyword, and timestamp as JSON or CSV and states
that the outside picker remains selection authority.

A Twitch- or YouTube-only picker cannot see a GrowPath identity merely because a bot posts
text containing that person's name. Platform-chat relay counts a GrowPath viewer only
when that viewer has deliberately linked the matching platform identity and granted the
provider's required send-chat authorization. Relay only the qualifying entry, not all
GrowPath chat. Preserve provider response, message ID, failure reason, and retry state;
never claim an entry reached an outside picker until the provider confirms it. Hosts must
see which entries are feed-ready, relayed, failed, or require identity connection.

## Safety, privacy, and moderation

- Never expose the private overlay token in public session, search, profile, or report data.
- Never store provider access tokens in plaintext or return them to the client.
- Never silently post as the host or a shared bot and present that as the viewer's outside-platform entry.
- Never relay a deleted, hidden, blocked, duplicate, or ineligible message.
- Never let chat popularity or giveaway participation become scientific evidence, a diagnosis signal, or AI-training permission.
- Cannabis/hemp sessions follow the cannabis visibility policy for directory, profile, notification, and direct-link delivery.
- Store a report and moderation case before attempting administrator email delivery; email failure must not erase the report.

## Verification

Test role and visibility boundaries, slow mode, premiere ownership, token rotation,
cross-session token isolation, no-store responses, overlay filtering, deletion propagation,
one-entry behavior, JSON/CSV feed parity, linked-identity relay authorization, provider
failure recording, mobile chat usability, keyboard access, and OBS Browser Source rendering.
Also verify viewer play/pause, volume/mute, fullscreen, and replay seeking independently
from broadcaster camera, microphone, scene, and outgoing-mix controls. For hosted video,
verify that a saved account channel is the default on a later session, a deliberate new
channel remains available, and neither route exposes another account's encoder secret.
For first-party mode, additionally verify stream-key secrecy and rotation, session-scoped
ingest authorization, draft/live separation, adaptive playback, interruption recovery,
access revocation, chat continuity, explicit retention, quota enforcement, abuse handling,
and that ending one session cannot affect another session or expose its replay.
