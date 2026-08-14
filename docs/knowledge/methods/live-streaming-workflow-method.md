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

Viewer playback and broadcaster production are separate control surfaces. A viewer
watching inside GrowPath must have the source player's play, pause, volume, mute, and
fullscreen controls; captions and replay seeking must remain available when the source
provides them. Do not force a viewer into OBS or another service to control playback.
The broadcaster continues to use OBS, Streamlabs, or the destination service for cameras,
microphones, scene switching, screen sharing, bitrate, and the outgoing audio mix.
Live Studio must ask where the video is being broadcast and support Twitch, YouTube, Kick,
Facebook Live, and a labeled secure watch URL for another service. Discord remains an
optional announcement destination and must never appear to be the only streaming option.

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
from broadcaster camera, microphone, scene, and outgoing-mix controls.
