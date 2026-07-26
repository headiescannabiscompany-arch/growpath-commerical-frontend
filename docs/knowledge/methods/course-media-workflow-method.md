# Course Media Workflow

Course video is a lesson resource, not proof that GrowPath owns, hosts, continuously monitors, or can measure viewing at a third-party provider. The authoring contract is shared by Personal, Commercial, and Facility educators.

Course authoring uses one page-level heading, ordered level-two builder steps, one route-level Back action, and named pricing or access radio groups with an exposed checked state. Do not make keyboard or assistive-technology users choose between duplicate Back controls, navigate a flat list of page-level headings, or infer the selected course price or access mode from color alone. User-facing course cards and access choices use readable labels rather than raw stored values.

## Source selection and normalization

Authors choose one source type: GrowPath upload, YouTube, Rumble, Vimeo, or Other video URL. Detect YouTube, Vimeo, and Rumble from recognized video-page URLs even when the author initially chooses Other. Preserve the submitted URL for traceability and store a separate canonical URL, provider video ID, Vimeo unlisted privacy hash when present, provider label, thumbnail when deterministically available, embed capability, external-link fallback, privacy mode, and last availability-check time.

The initial Course Builder and later Add/Edit Lesson screens use the same provider-aware media contract. Authors may attach and review lesson media while outlining a new draft or defer it until lesson editing; no initial-builder shortcut may bypass URL normalization, rights, availability, accessibility, learner-summary, embed, or fallback fields.

Authors may also attach an existing video from the Personal, Commercial, or Facility workspace library by storing its `videoAssetId` with the normalized lesson media snapshot. Detaching the video from a lesson must not delete the reusable library asset. Removing a library video must be blocked while any course lesson still references it so an author cannot silently break a published or draft course.

Accept HTTP(S) video-page URLs, legacy first-party `/uploads/` paths, and protected first-party `/api/videos/uploads/` asset paths. Reject iframe, script, object, embed, video, HTML, `javascript:` and `data:` input. Never store or execute author-supplied embed markup. A provider not covered by a reviewed embed contract remains link-only.

## Author review and publishing

A draft may retain incomplete media so an author can return to it. Publishing or approval is blocked when a lesson with video lacks any of:

- creator ownership or permission confirmation;
- an author-recorded availability status and check time;
- captions or transcript status;
- a learner-visible text summary; or
- an external-link fallback.

The author must open the source before recording availability. Record available, link-only, restricted, or unavailable plus an optional note for login, age, region, domain, privacy, removal, or embedding limits. This is a timestamped author check, not continuous GrowPath monitoring. A successful GrowPath upload may record first-party availability and check time automatically, but it does not waive rights or accessibility review.

Draft courses, lessons, media metadata, summaries, documents, and authoring fields are owner-only records. Public catalogs and direct course-detail routes may return them only after publication; an authenticated author or platform administrator may preview the author's own draft. That learner preview must render learner-facing course and lesson content, provider playback/fallback, and accessibility status without exposing authoring controls. Anonymous and unrelated authenticated requests must receive the same not-found response so a guessed or shared draft ID cannot disclose unpublished content.

The signed-out course catalog is discovery-only. It may request published public catalogs and show sign-in or registration actions, but it must not request an owned-course collection or expose Course Builder, create, invite, analytics, publish, unpublish, enrollment, purchase, or learner-progress controls before authentication.

## Paid access and payment support

A paid course catalog may expose discovery fields such as title, description, cover, price, and lesson titles. It must not expose lesson text, video or audio URLs, provider metadata, documents, images, assessment questions or answers, protected playback URLs, or completion controls before access is confirmed. An author or platform administrator may preview the author's course. A learner receives protected content only while an active enrollment exists.

Creating a Stripe checkout session records a pending purchase; it does not enroll the learner. Only a signature-verified paid Stripe webhook may activate paid enrollment, add the learner to course counts, and record creator earnings. Webhook retries must be idempotent and must not increment enrollment, revenue, or earnings more than once. Direct enrollment and lesson-completion endpoints must never manufacture paid access.

A learner may request GrowPath refund review or report a payment issue only after a paid purchase exists. A GrowPath payment-issue report is support intake; it is not a bank, card-network, or Stripe dispute and the interface must say so. Do not show refund or payment-issue forms to an unpaid learner or course owner.

Stripe refund and dispute webhooks remain the source of truth for external payment state. A full refund revokes enrollment, removes the learner from course counts, adjusts revenue, and removes the refunded creator earning from payout eligibility. An open or unresolved Stripe dispute revokes access and holds the earning. A won dispute may restore access and release the hold. Replayed checkout webhooks must not erase a refund, dispute, or hold state.

Buyer-facing payment status shows enrollment, payment, refund, and GrowPath support state. It must not expose creator settlement internals. Creator payout queries include only available, unpaid earnings; held and refunded earnings are not payout eligible.

## Playback and fallback

Use first-party playback for GrowPath uploads. Protected library videos retain only their stable asset path and video ID in the lesson; the learner obtains a short-lived playback URL only after the API verifies course and workspace access. Never save an object-store credential or expiring signed playback URL in the course. Use a normalized YouTube or Vimeo player only when the author recorded the source as available and explicitly allowed embedding. Preserve Vimeo unlisted privacy hashes in both canonical and player URLs. Keep Rumble and unknown providers link-only until a stable reviewed provider contract exists.

Before loading a third-party player, explain that the learner will connect to the provider and that provider cookies or viewing collection may apply. Require an explicit click to load. Always keep the provider link, text summary, captions/transcript status, lesson text, documents, audio, images, tasks, notes, and discussion usable when playback is unavailable.

GrowPath lesson progress changes only through the explicit lesson-completion action. Do not infer provider watch time, completion, or engagement from opening a link or loading an embed, and do not merge provider analytics into GrowPath progress unless a separately verified provider integration defines that contract.

## Evidence policy

- `youtube-player-documentation` is Tier B provider documentation for YouTube player behavior and data-sharing constraints. It is not proof that an individual video is available, embeddable, licensed, captioned, or suitable.
- `vimeo-video-privacy-documentation` is Tier B provider documentation for Vimeo privacy, domain, and unlisted-hash behavior. It is not proof of an individual video's current settings or rights.
- Author rights confirmation and the timestamped availability check are owner evidence. They do not override provider terms or legal requirements.
