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

The Most viewed order may count a successful non-owner open of an accessible published
video. That counter is not verified watch time, completion, unique reach, learning
progress, or scientific reliability. Do not expose engagement-based ranking until a real
engagement event contract exists.

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
