# Genuine feedback and optional testimonials

First documented: October 4, 2026. Implementation phase W05. A code or test receipt
does not establish a hosted release date; record staging and production verification
separately in the release receipt.

## Purpose and evidence

Collect a person's own experience with GrowPathAI. Private product feedback does not
require publicity permission. A testimonial is an attributed personal report, not
independent scientific evidence, an endorsement from a Facility, or a verified outcome
claim. Do not invent quotes, customer counts, yield gains, ratings, names, or photos.
Synthetic QA submissions must remain identifiable internally and excluded from the
ordinary public testimonial feed, including when an Admin approves them in a test.

## Workflow

1. Verify the signed-in person's identity and account readiness. Workspace switching
   never changes ownership; reset private state on account/session changes.
2. Enter bounded plain-language feedback and a chosen public name. An optional image
   must be a protected Personal evidence asset belonging to that same person.
   Testimonial uploads opt in to pixel-only re-encoding before the private upload,
   removing EXIF/GPS without changing original-preservation rules for other workflows.
3. Show the exact canonical text/name/photo preview. Explain the limited website
   publication permission, withdrawal, and the inability to recall outside screenshots.
   Publicity consent starts unchecked and is separate from submitting private feedback.
   A definite server 409 rejecting an unavailable/changed photo or changed preview
   clears that preview and its permission choice, but keeps the draft text and photo
   removal control. Require a new preview and permission choice before resubmission.
   Network uncertainty, busy-photo conflicts and unknown errors retain the exact
   original request key and consent choice; never silently create another request.
4. Save one current immutable submission, with idempotent retries, its content/photo
   version, original consent statement/version/time and server-derived QA provenance.
5. An authorized platform Admin reads the exact preview and can reject, hide or approve
   that version. The Admin cannot edit the person's words, name or photo. Publication
   also requires an explicit general-audience review: crop-neutral, appropriate photo,
   no private operational details. Do not place cannabis-specific content on the generic
   marketing site or infer that an automated check established suitability.
6. Public reads return only approved, consented, non-synthetic content belonging to an
   active account. Photo reads recheck the same authorization/version boundary and strip
   metadata; never return protected source URLs. Empty or failed reads cannot leave stale
   public proof. Do not bake real testimonials into static HTML or service-worker caches.
7. Owners may withdraw regardless of publicity status, including during pending account
   deletion. Withdrawal is terminal, wins races with publication, and prevents quote/photo
   access. Changing content requires a new submission and new permission. Hiding is not
   permission to republish; no restore shortcut exists.

## Account and media lifecycle

Own-account export includes the person's feedback and original consent using an
allowlist without storage locators or private Admin notes. The existing encrypted
removal archive receives that bounded export before deletion. Quarantine withdraws
testimonials in the same account transaction; account restoration does not restore
publicity. Final deletion withdraws before media release, then erases active testimonial
records. Keep any media references needed by other records. Direct and generic storage
deletion must recheck retained testimonial references while holding the media lease.

## Exclusions and verification

No AI generation, AI-training use, incentive, bulk invitation email, separate advertising
permission, star-rating system, automatic moderation decision, or paid-service dependency.
This product permission workflow is not a claim of legal compliance certification.

Required evidence: owner/Admin authorization, account-switch stale responses, exact
consent and photo binding, retry/idempotency, transaction rollback, publish/withdraw race,
source-delete race, synthetic exclusion, public DTOs/no-store headers, export/deletion/
quarantine, and hosted synthetic acceptance. Create indexes only through the explicit
readiness/preparation script; do not use runtime automatic schema creation in hosted apps.
