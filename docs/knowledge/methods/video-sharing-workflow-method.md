# Video Sharing Workflow

GrowPath video is a shared Personal, Commercial, and Facility capability. It is not
limited to accounts labeled as creators. Creator or payout status may control
monetization, verification, and earnings, but it must not determine whether an eligible
account can upload, manage, follow, search, or watch videos.

## Ownership and workspace boundaries

Personal videos belong to the individual account. Commercial videos belong to the active
Commercial workspace and retain the uploader. Facility videos belong to the selected
Facility and retain the uploader and role context.

Facility viewers and auditors may watch accessible videos and follow users, but they
cannot mutate the shared Facility library. Staff may upload, edit, and remove only their
own unpublished drafts. They cannot remove another member's draft or any published
record. Owners and managers may review, publish, edit, detach, archive, and remove
Facility video records. Unpublished Facility drafts are visible only to their uploader
and Facility owners or managers. Every Facility request must match the selected Facility;
no video may cross Facility scope.

## Shared library and course reuse

Store one reusable video record and attach it by stable video ID to courses, posts, lives,
profiles, or other supported records. Attaching a video must not upload a duplicate.
Detaching a video from a course removes only the lesson reference. It must not remove the
library record or underlying media.

Before removing a library record, verify that no course or other supported record still
references it. A GrowPath-hosted file is not storage-released until the storage service
confirms physical deletion. Do not reduce displayed usage merely because a database record
was hidden or soft-removed.

External YouTube, Vimeo, Rumble, or other URL records do not consume GrowPath upload
storage. GrowPath-hosted uploads consume the active Personal, Commercial, or pooled
Facility allowance. The API-provided usage and limit are authoritative; clients may show
plan defaults while loading but must not display hard-coded zero usage as real quota.

Production GrowPath-hosted video objects remain private. Reserve workspace quota before
issuing a short-lived direct-upload URL, count unexpired pending reservations so
concurrent uploads cannot oversubscribe the workspace, and activate the record only after
the storage service confirms the expected size and video media type. Large web uploads
use resumable multipart transfer; failed, expired, or canceled uploads release the
reservation. Store only the stable internal asset path in video and course records.
Authorized viewers receive a short-lived playback URL after video, course-enrollment,
Facility, cannabis-visibility, and owner/uploader checks. Never persist object-store
credentials or expiring signed URLs in content records.

A native upload may use multipart only when the server returns one whole-file part; the
device uploads its original URI to that signed part and completion must include the
returned ETag. Multi-part slicing remains a web capability. Missing ETags must stop
completion and leave the stable reservation retryable rather than activating uncertain
media.

## Publishing and discovery

Video visibility is explicit: public, followers-only, unlisted, private, course-only, or
Facility-internal. Publishing requires a title, creator ownership or permission
confirmation, a timestamped availability check, captions or transcript status, a
viewer-visible text summary, and an external-link fallback. Use the provider normalization,
privacy-aware playback, and unsafe-markup rejection rules from `course-media-workflow`.

Discover indexes published public videos and published followers-only videos when the
viewer follows the owning user. Search title, description, tags, grow interests, owner
display name, captions, transcript, and text summary. Private, unlisted, course-only, and
Facility-internal records never appear in public Discover. Unlisted videos may be opened
only by a direct link. Facility-internal videos require the selected matching Facility.

Search results show a thumbnail when available, title, duration, owning user/workspace,
visibility, and publication date. Results open the exact video and expose a real Follow
control for the owning user. Following must use the canonical follow relationship; a
client-provided flag or merely opening a profile is not proof of following.

A published Commercial storefront may show a compact preview of videos owned by that
Commercial account only when each video is published, explicitly public, non-cannabis,
and not deleted. The storefront projection exposes display metadata and the canonical
GrowPath video ID, not a protected playback source, storage path, transcript, captions,
private owner ID, follower-only record, unlisted record, or Facility record. Cannabis-
specific video remains available only through an eligible cannabis-aware discovery or
direct-view context; a public horticulture storefront page does not establish eligibility.

The Most viewed order may count a successful non-owner open of an accessible published
video. That counter is not verified watch time, completion, unique reach, learning
progress, or scientific reliability. Do not expose engagement-based ranking until a real
engagement event contract exists.

## Discussion and creator continuity

An accessible published video may have a threaded GrowPath discussion. Each comment keeps
its author, parent comment, edit state, moderation state, and timestamps. The comment
author may edit or remove their own visible comment. The video owner and authorized
workspace moderators may remove a comment without erasing its moderation history. A
removed comment is absent from public playback and creator engagement totals; replies may
retain a neutral removed-parent placeholder when necessary for context.

Video detail must show the owning account's avatar and display name and provide a direct
profile and Follow action. Discover supports All videos and People I follow without
requiring a special creator account. A profile video library contains only records the
viewer is authorized to see. Comments, follows, views, and popularity remain social
signals rather than scientific evidence or AI-training permission.

## Canonical sharing

Published videos use the canonical GrowPath video page as their share target. Offer the
device share sheet, Copy Link, and reliable direct destinations such as Facebook, X,
Bluesky, Reddit, LinkedIn, email, and text. The canonical page preserves the video,
creator identity, follow control, discussion, reports, and access rules; never replace it
with an expiring object-store URL.

This is part of the shared content contract. Published Forum discussions, courses,
storefront records, live sessions, premieres, replays, and opted-in Nature findings use
their own canonical GrowPath pages. Private AI results, journal entries, grows, Facility
records, and other owner-scoped material must not become public merely because Share was
pressed. For those records, open a reviewed Forum/Q&A draft or another explicit public
copy workflow first, include only the selected summary and links, and keep unselected
photos, exact locations, account data, and private operational fields private. The user
must confirm publication before an outside audience receives a public link.

## Cannabis visibility

Mark cannabis/hemp-specific videos explicitly. Public and followers-only cannabis videos
appear in Discover only when structured interests, grow context, or account purpose makes
the viewer cannabis/hemp eligible. Signed-out and unrelated horticulture viewers do not
receive those results. Directly viewing an eligible cannabis video does not unlock
unrelated cannabis-only tools or weaken record access controls.

## Safety and evidence

Uploading or sharing a video does not approve it for AI analysis or model training. AI may
use media only after the separate workflow-specific selection and disclosure required by
`ai-decision-policy`.

Never infer that a social video is scientifically correct because it is popular, followed,
or highly engaged. Social video is Tier C anecdotal context unless the underlying claim is
supported by the appropriate reviewed evidence. Preserve reports, moderation state, and
rights review separately from ranking and engagement.

A signed-in viewer may report a video they do not own. Persist the report and moderation
case before attempting email delivery, then notify the platform administrator with a
same-origin link to the exact video and a focused moderation-case link. Email is only a
notification; failed delivery must not erase the stored report or become moderation truth.
