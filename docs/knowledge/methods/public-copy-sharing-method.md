# Reviewed Public Copies

GrowPath shares an already-public record by its canonical URL. Private grows, timelines,
journals, AI results and operational records do not become public when Share is pressed.
They require a reviewed public copy whose data, media and lifecycle are separate from the
private source.

The first public-copy workflow is a grow timeline. The owner opens the private visual
timeline, chooses the visible date range/events and owned photos, reviews the exact title,
description and public preview, then explicitly publishes. Cancel publishes nothing.
Commercial publication uses the authorized Commercial workspace; Personal publication uses
the individual owner. Facility-internal records are not eligible for this public-copy path.

The server accepts only bounded plain-text event title, summary and timestamp fields. It
does not accept arbitrary HTML, event payloads, telemetry values, task internals, identifiers,
exact locations, private notes, AI receipts, provider credentials or evidence permissions.
Selected photos must be uploaded evidence owned by the same actor and linked to the same
grow. Publication creates safe public derivatives through the existing protected-media
pipeline; it never exposes a protected upload URL or expiring signed URL.

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
