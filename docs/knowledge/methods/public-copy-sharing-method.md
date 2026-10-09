# Reviewed Public Copies

GrowPath shares an already-public record by its canonical URL. Private grows, timelines,
journals, AI results and operational records do not become public when Share is pressed.
They require a reviewed public copy whose data, media and lifecycle are separate from the
private source.

## Explicit creator profile publication

Personal Profile's creator profile and links reuse the account's profile foundation,
not Commercial link permissions or a new creator signup/plan. The owner may create
a profile before publishing a video. Start with an empty private draft: never copy
the account name, email, biography, Commercial links or storefront links into it.
Save only the authenticated owner's bounded plain-text public name, optional bio
and up to eight named HTTPS links. Reject URL credentials, ambiguous backslashes
and control characters; never fetch links or create external previews automatically.

The owner saves the draft, reviews the saved fields and explicitly publishes that
revision. Save and Publish use optimistic revisions; a stale tab must reload and
review, not overwrite newer state. Keep a separate frozen published snapshot so
later draft edits or ordinary account-profile edits cannot silently change the
public page. An uncertain write must offer state recovery, not automatic retries
or a false success. Unpublish withdraws the current snapshot, retains the private
draft and invalidates outstanding publish revisions; it does not unpublish videos.

Public creator readers return only the deliberate published snapshot, never the
private draft, legal identity, email, billing, journal or follower records. Missing,
withdrawn or unavailable accounts return a uniform unavailable result. Owner data
export includes the private draft; account deletion clears it. Commercial links
and entitlement gates remain separate and unchanged. Public links and canonical
creator-page sharing are deliberate visitor actions, not automatic publication.

Opening the published creator page from its private editor carries only the fixed
`from=creator-profile-editor` marker. Only its exact first value makes Back return
to `/home/personal/more/links`, including reload or unresolved access. Other entries
retain their existing history/fallback. Never copy this editor marker into shared
URLs or accept an arbitrary return address. Long public names must wrap inside the
real identity card at narrow widths; do not truncate the saved name to hide overflow.

Forum directory and shared-discussion readers wait for authentication and entitlement
readiness before checking capability denial or mounting record readers. An initial
access-check failure is recoverable with Retry, not proof of denied access. Changing
account/session or workspace clears the previously mounted reader. Settled capability,
record-visibility and publication checks remain authoritative; no share action grants
access, creates an account, posts a comment or publishes private content.

X share intents bound only their prefilled summary to the ordinary 280-character
weighted limit, counting the complete versioned preview link with the official
`twitter-text` parser, including the separator and trailing space observed in the
hosted X intent composer. Preserve a fitting title and price before shortening the
description, and truncate at grapheme/whole-URL boundaries (whole whitespace
chunks on engines without grapheme segmentation). Hashtags count as text; moving
them into another intent parameter does not create extra space. Keep the source,
Copy Post, email/SMS, and other provider handoffs unchanged. Opening an eligible
composer is not publication or proof of a retained external preview.

Discussion-detail post and comment reads recover independently. Do not read comments
or mount comment/share actions before the exact requested post is readable. A failed
comment read must not hide a readable post or claim an empty discussion. Retry is
read-only and single-flight; it must not resubmit a confirmed comment. Preserve an
unsent draft during same-discussion recovery, but clear prior records, drafts and
actions on discussion or linked-grow changes. Discard late superseded reads and
reject mismatched post identities. Existing server visibility and moderation rules
remain authoritative.

The first public-copy workflow is a grow timeline. The owner opens the private visual
timeline, chooses the visible date range/events and owned photos, reviews the exact title,
description and public preview, then explicitly publishes. Cancel publishes nothing.
Commercial publication uses the authorized Commercial workspace; Personal publication uses
the individual owner. Facility-internal records are not eligible for this public-copy path.

The private Visual Flow and Detailed List consolidate photo-added events onto their
matching selected journal entry by source identity. Display its notes and photos once;
do not merge distinct journals because they share a title or date. Retain standalone
photo events when their parent journal is absent from the selection. This presentation
rule never deletes or rewrites stored journal/photo activity and does not republish or
alter an existing frozen public snapshot.

The server accepts only bounded plain-text event title, summary and timestamp fields. It
does not accept arbitrary HTML, event payloads, telemetry values, task internals, identifiers,
exact locations, private notes, AI receipts, provider credentials or evidence permissions.
Selected photos must be owned media referenced by a selected server-known event. Existing
protected evidence must belong to the same actor, workspace and grow. For an older journal
image uploaded through GrowPath's ordinary image screen, preview only verifies the active
upload record and makes no evidence or publication write. Publish re-verifies that record,
then idempotently materializes a non-AI, grow-scoped evidence record before creating a safe
public derivative through the existing protected-media pipeline. The public copy never
exposes a protected upload URL or expiring signed URL.

Publishing freezes a versioned snapshot behind a random, unguessable viewer token. Later
private edits never silently change it. Only a published snapshot is publicly readable.
Withdrawal is an explicit owner action that immediately removes public access while keeping
the private grow and an audit-safe withdrawn record. Republishing creates a new token so an
old revoked link never comes back to life. The owner can reload the current publication
state and open, copy or use the device share sheet for the canonical viewer URL.

Withdrawal or an administrator hide also removes public photo derivatives that are no
longer referenced by another visible Nature publication or visible published timeline.
The withdrawn/hidden owner response exposes no photo URLs. An administrator restore must
rebuild each derivative from its still-owned protected source before making the timeline
visible; if any selected source can no longer produce a safe derivative, restoration fails
closed. This prevents a known derivative URL from surviving publication withdrawal while
preserving a derivative that another authorized publication still needs.

The public viewer is read-only, understandable without the editor, and labels the content
as an owner-selected snapshot rather than a compliance report, scientific proof or live
operational state. It renders only the frozen sanitized fields and safe public photo copies.
It exposes no editor actions, source IDs, owner email, workspace secrets or private deep
links. Every public viewer provides the unified report action and opens the exact timeline
target in the Admin queue. Cannabis-specific copies follow the shared cannabis-interest
gate: signed-out and ineligible viewers receive the same unavailable response as a missing,
withdrawn or moderated copy.

Owning a cannabis-specific timeline does not override the public viewer's content
controls. A legacy owner whose age information is missing may complete the
one-time self-attestation in Profile, then separately opt into cannabis visibility
if eligible. This must not alter or republish the private grow or frozen snapshot.
Do not label self-attestation as verified identity, expose birth dates, or replace
known age/provider records to make a shared link readable.

Viewer-friendly downloads follow the same disclosure boundary even when the file remains
private. They render short human-readable event summaries, not embedded model JSON, provider
payloads, internal evidence fingerprints, receipts or record identifiers. When a saved note
contains a machine payload, the export keeps any readable owner-authored prefix and directs
the owner back to the private GrowPath record for the detailed evidence. Long prose is
bounded so one event cannot make the exported timeline unusable; the private source record
remains authoritative and unchanged.

Web timeline downloads embed locally prepared JPEG pixels instead of relative,
protected or signed source URLs. Reuse the existing media resolver and pixel-only
image preparation; do not upload, publish or change the originals. Read each
distinct photo once, authenticate only the configured API's upload-media paths,
and reject redirects. Other supported HTTPS/local image reads omit credentials
and referrers. Reject unreadable/non-raster media, bound each input to 20 MiB and
the serialized photo total to 64 MiB, and time out each photo after 20 seconds.
If any selected photo cannot be prepared, report failure and save no partial file.
Path-only photo summaries become readable photo labels; ordinary notes and the
existing JSON/private-detail handoff remain. Native text sharing stays text-only.

## Bundled synthetic marketing demo

The public `/demo` route is a read-only, bundled fixture, not a public-copy access
exception. It accepts no record IDs, tokens or user-supplied data and makes no grow
API calls. Keep its synthetic disclosure visible before the shared timeline viewer.
Invented readings and dates demonstrate record organization only; they are not
recommendations, real measurements, diagnoses, customer proof or outcome evidence.
AI-generated illustrative media must be identified as such. Demo links are rebuilt
only from the allowlisted story names `free`, `pro`, `seller`, `creator`, and
`facility`: Free uses `/demo`; other stories use `/demo?story=<name>`. Invalid or
array values select Free. Never copy the current location's query, arbitrary
parameters, record IDs, tokens, tracking values, or a signed-in user's URL. Story
selection, reload and browser Back/Forward preserve only that public story choice.
Canonical indexing remains `/demo`. Provide a vertical
reading alternative and readable static HTML for users without JavaScript.
Marketing screenshots must be captured from the rendered app, labeled with the
synthetic-data context, and never represented as real customer records.
Account-type exploration uses bundled Free, Pro, Commercial and Facility highlights
and reviewed synthetic screenshots, not impersonated accounts or private record reads.
Show current plan limits and distinguish intake forms from produced results. Explain
Free's one tracked plant separately from available care tools for other household plants;
never imply unlimited tracking or AI. Keep screenshot controls visibly non-interactive,
offer full-size images and a static reading alternative, and share only the rebuilt
allowlisted demo-story URL. Seller and creator stories are two Commercial jobs,
not additional subscription plans. A screenshot sequence shows only its recorded
state: distinguish export preparation from a downloaded file, published offers
from payment/delivery readiness, author previews from learner entitlement, and
recorded task completion from verified physical work. Cropped synthetic screenshots
must retain the conditions material to the claim and omit private identifiers and
test ratings/counters that could be mistaken for real customer proof.
Real testimonials remain a separate dynamic, approved/consented public feed, never
synthetic proof or statically baked quotes.

Public storefronts retain device sharing and provide a separately named Copy Store Link
control. Copy only the rebuilt public store route, excluding checkout, product-return and
filter parameters. Confirm success only after the clipboard write succeeds; otherwise
show the selectable public link without automatically invoking another share destination.
Keep copy feedback scoped to the current store and ignore late completions after navigation.
Neither action publishes a record, creates a purchase nor grants access.

Published Commercial product links provide a stable crawler-safe preview document with
the exact product title, bounded description, price, canonical product URL and a public
social-image derivative. The preview document must not automatically redirect with
JavaScript or meta refresh: social platforms may revalidate through that redirect and
replace the product card with generic application metadata. A normal owner-visible link
opens the canonical GrowPathAI product page. The crawler document's `og:url` and HTML
canonical link must both identify the stable preview document itself; the product-page URL
belongs only in the owner-visible link. This prevents a platform from following canonical
metadata into the generic application shell during background revalidation. Acceptance
requires checking the resulting published social post after background revalidation, not
merely seeing a temporary image inside a post composer.
