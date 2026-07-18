# Community and Forum Authority — 2026-07-18

This decision record supersedes older contradictory Forum/Community access and retention rules.

## Access

- Free accounts may browse and search the public forum.
- Free accounts may use safety and personal-control actions such as report, hide, mute, and block.
- Free accounts cannot create forum posts or comments.
- Paid Personal, Commercial, and Facility accounts may participate subject to anti-spam controls and identity permissions.
- Trial accounts receive the participation rights of their paid plan while the trial is active.
- The restriction is enforced by the API; hiding a composer is not sufficient enforcement.

## Raw-content retention

- Raw forum posts, embedded comments, and attached media references are retained for 730 days by default.
- `FORUM_RETENTION_DAYS` may shorten or extend that bounded window, but cannot be configured below 30 days.
- A meaningful new comment renews the parent discussion's retention window.
- MongoDB's TTL index on `ForumPost.purgeAfter` permanently removes expired raw discussions.
- Moderation evidence, security records, billing records, and legal holds are separate restricted records with their own retention requirements.
- Feed expiration remains a separate product policy; Feed is not the Forum archive.

## AI knowledge extraction

- Public forum material may be reviewed for useful horticultural knowledge before raw content expires.
- Extracted knowledge must be stored as a separate curated record, not by extending raw forum retention indefinitely.
- The curated record should contain the useful claim, context, confidence, and reliable sources when available.
- Do not copy usernames, contact details, private linked-grow data, moderation evidence, or unnecessary conversation text.
- Deleted, private, blocked, or legally restricted content is not eligible for automatic knowledge extraction.
- Forum popularity is not scientific authority. Human review and source quality determine whether information enters GrowPathAI knowledge.
- Product and privacy copy must disclose this use before an automated extraction pipeline is enabled.

## Personalization boundary

Grow Interests determine which eligible discussions are prioritized, with explicit exclusions and blocked accounts enforced. Users retain All Topics and Discover so personalization never prevents deliberate exploration.
