# Course Media Workflow

Course video is a lesson resource, not proof that GrowPath owns, hosts, continuously monitors, or can measure viewing at a third-party provider. The authoring contract is shared by Personal, Commercial, and Facility educators.

## Source selection and normalization

Authors choose one source type: GrowPath upload, YouTube, Rumble, Vimeo, or Other video URL. Detect YouTube, Vimeo, and Rumble from recognized video-page URLs even when the author initially chooses Other. Preserve the submitted URL for traceability and store a separate canonical URL, provider video ID, Vimeo unlisted privacy hash when present, provider label, thumbnail when deterministically available, embed capability, external-link fallback, privacy mode, and last availability-check time.

Accept HTTP(S) video-page URLs and first-party `/uploads/` paths. Reject iframe, script, object, embed, video, HTML, `javascript:` and `data:` input. Never store or execute author-supplied embed markup. A provider not covered by a reviewed embed contract remains link-only.

## Author review and publishing

A draft may retain incomplete media so an author can return to it. Publishing or approval is blocked when a lesson with video lacks any of:

- creator ownership or permission confirmation;
- an author-recorded availability status and check time;
- captions or transcript status;
- a learner-visible text summary; or
- an external-link fallback.

The author must open the source before recording availability. Record available, link-only, restricted, or unavailable plus an optional note for login, age, region, domain, privacy, removal, or embedding limits. This is a timestamped author check, not continuous GrowPath monitoring. A successful GrowPath upload may record first-party availability and check time automatically, but it does not waive rights or accessibility review.

## Playback and fallback

Use first-party playback for GrowPath uploads. Use a normalized YouTube or Vimeo player only when the author recorded the source as available and explicitly allowed embedding. Preserve Vimeo unlisted privacy hashes in both canonical and player URLs. Keep Rumble and unknown providers link-only until a stable reviewed provider contract exists.

Before loading a third-party player, explain that the learner will connect to the provider and that provider cookies or viewing collection may apply. Require an explicit click to load. Always keep the provider link, text summary, captions/transcript status, lesson text, documents, audio, images, tasks, notes, and discussion usable when playback is unavailable.

GrowPath lesson progress changes only through the explicit lesson-completion action. Do not infer provider watch time, completion, or engagement from opening a link or loading an embed, and do not merge provider analytics into GrowPath progress unless a separately verified provider integration defines that contract.

## Evidence policy

- `youtube-player-documentation` is Tier B provider documentation for YouTube player behavior and data-sharing constraints. It is not proof that an individual video is available, embeddable, licensed, captioned, or suitable.
- `vimeo-video-privacy-documentation` is Tier B provider documentation for Vimeo privacy, domain, and unlisted-hash behavior. It is not proof of an individual video's current settings or rights.
- Author rights confirmation and the timestamped availability check are owner evidence. They do not override provider terms or legal requirements.
