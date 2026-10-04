# W05 Genuine Feedback Collection and Reviewed Testimonials

Status: approved implementation contract; not implemented or released by this document.

The owner approved a workflow for collecting actual user feedback, a chosen public
name, an optional photo, explicit publication consent, Admin review, and withdrawal.
People must be able to submit genuine private feedback without consenting to
publicity. Nothing is published automatically. Approval to build this workflow is
not permission to publish any person's quote or photo.

This phase has a finite scope. It does not add ratings, rewards, incentives, bulk
campaigns, imported testimonials, AI-written quotes, or automatic approval.
Synthetic demonstrations belong to W06, not the testimonial collection.

## Ownership and submission rules

- The authenticated individual owns the submission, regardless of their selected
  Personal, Commercial, or Facility workspace. A person's feedback is not an
  endorsement by their employer or Facility.
- Allow one current submission per person and at most one optional photo.
- A chosen public name is explicit user input, never an automatic email or profile
  name fallback. It becomes public only with valid publication consent and Admin
  publication.
- Publicity consent is optional and unchecked by default. Submitting without it
  saves private feedback and must remain a usable, clearly labeled path.
- Before submission, show the exact feedback, chosen name, and selected photo in a
  private preview. The server validates and canonicalizes these fields before the
  person consents to that version.
- Submitted content is immutable in W05. To change it, the person withdraws the
  current submission and creates another with fresh consent. Admin cannot rewrite
  a person's words or substitute a name or photo under the original consent.
- No payment, paid plan, AI request, model-training permission, or public profile
  is required to submit or withdraw feedback.

## Minimum record

Add a separate `TestimonialSubmission` model. Do not use private support messages,
AI calibration/training feedback, safety reports, or Vault cases as publication
authority.

| Field | Required behavior |
| --- | --- |
| `ownerUserId` | Required and derived from authentication; never trusted from the request body. |
| `clientSubmissionId` | Stable request UUID, unique with the owner. Retries return the same result; reuse with different content conflicts. |
| `isCurrent` | Partial unique index on `ownerUserId` where true. Withdrawal releases this slot. |
| `publicName` | User-chosen plain text, 2–80 characters; no email/name fallback. |
| `feedbackText` | Original canonical plain text, 10–1,500 characters, matching the private preview. |
| `photoEvidenceAssetId` | Nullable; one owned Personal photo, not an arbitrary URL or Facility asset. |
| `photoSourceVersion` | Server-verified source identity/generation binding the consent to that exact photo. |
| `contentDigest` | Server-generated digest of the exact name, feedback, and photo binding. |
| `consent` | Explicit `granted` boolean, server-known version, original statement text, server acceptance time, and authenticated accepting user. False means private feedback only. |
| `status` | `private`, `pending_review`, `published`, `rejected`, `hidden`, or `withdrawn`. |
| `revision` | Monotonic lifecycle version used in conditional writes. |
| `review` | Admin identity, timestamp, bounded reason, and reviewed content digest. |
| `publishedAt`, `withdrawnAt`, `withdrawnBy` | Server-generated lifecycle fields. |
| `synthetic` | Immutable, server-controlled test provenance. The client cannot clear it by supplying false. |
| `createdAt`, `updatedAt` | Server timestamps. |

Private, pending, rejected, hidden, and published submissions retain the current
slot until withdrawn. This prevents multiple simultaneous active submissions while
keeping the replacement process explicit.

Preserve the original consent and exact submitted version in the private record.
Append lifecycle receipts to the existing `PlatformAuditLog`: record ID, action,
revision, and digest. Do not duplicate private quotes, email addresses, or media
credentials in ordinary audit metadata. Account erasure follows the established
privacy lifecycle rather than retaining all private content indefinitely.

## Consent language and public boundary

Use a versioned statement with this scope:

> I allow GrowPathAI to publish the exact feedback, public name and optional photo
> shown in this preview on its website after Admin review. I can withdraw this
> permission from this page. This permission does not include AI training or use
> in separate advertising campaigns.

Also explain that withdrawal removes GrowPathAI's public copy but cannot recall
screenshots or copies somebody already made.

Accept only a literal consent boolean and the current server-known consent
version. Save the statement accepted at submission; later copy changes must not
silently replace historical consent. A private submission cannot be promoted by
Admin merely because it contains favorable feedback.

## State machine

```text
Submit without consent -> private
Submit with consent    -> pending_review

pending_review -> published   Admin; exact digest/revision; consent still valid
pending_review -> rejected    Admin; reason
published      -> hidden      Admin; reason

Any non-withdrawn state -> withdrawn   Owner or account lifecycle
```

W05 has no edit, restore, automatic approval, or republish endpoint. The owner can
withdraw a rejected or hidden submission and create a replacement.

Publishing uses an atomic conditional transition with its audit receipt. Missing
or revoked consent, stale revision/digest, changed photo source, account
quarantine/deletion, or withdrawn status prevents publication. Admin submits the
reviewed ID and version/digest, not replacement content.

Withdrawal revokes public eligibility before optional binary cleanup. A cleanup
failure must not leave a quote or known photo URL publicly accessible. Retrying
withdrawal is idempotent, and a concurrent Admin publish cannot revive it.

## Route contract

| Route | Behavior |
| --- | --- |
| `GET /api/testimonials/policy` | Current field bounds and versioned consent statement. |
| `POST /api/testimonials/preview` | Authenticated, read-only canonical preview and digest; validate photo ownership without publication. |
| `GET /api/testimonials/mine` | Current submission plus bounded withdrawal history. |
| `POST /api/testimonials` | Authenticated submission with stable request key, preview digest, and explicit consent choice. |
| `POST /api/testimonials/:id/withdraw` | Owner-only, idempotent withdrawal; no paid entitlement. |
| `GET /api/admin/testimonials` | Bounded, paginated Admin review queue. |
| `POST /api/admin/testimonials/:id/publish` | Publish only the expected revision/digest; reject quote/name/photo replacement fields. |
| `POST /api/admin/testimonials/:id/reject` | Admin rejection with a reason. |
| `POST /api/admin/testimonials/:id/hide` | Admin hide with a reason. |
| `GET /api/public/testimonials` | Bounded list of eligible, reviewed public records. |
| `GET /api/public/testimonials/:publicId/photo` | Check publication and source eligibility on every request. |

Use existing `requireAuth`, `adminOnly`, write-account checks where applicable,
API/upload rate limiters, and the shared frontend `apiRequest` client. Do not let a
generic write-account guard prevent a safety/privacy withdrawal; account removal
must independently revoke publication.

Public records expose only:

```ts
{
  publicId: string;
  publicName: string;
  quote: string;
  photo: null | { url: string; alt: string };
  publishedAt: string;
}
```

Never expose account IDs, emails, original private media URLs, object-storage keys,
consent records, review notes, or request metadata. Public text and photo reads
require published status, valid unrevoked consent, matching content/photo binding,
an active owner, and non-synthetic provenance. Read failures return unavailable,
not stale or unreviewed content.

Initially use `Cache-Control: no-store` for the public list and photo responses.
Do not bake submissions into `publicMarketing.json` or static exported HTML:
withdrawn content must not wait for redeployment or CDN expiry to disappear.

## Optional photo handling

The optional photo is part of W05, not deferred work. Reuse existing protected
image preparation/upload primitives with AI use disabled. Do not collect EXIF/GPS
for this workflow. Register only the minimal owned image evidence, with purpose
`other`, and accept one selected photo.

Validate the exact owned evidence and backing upload generation during preview,
submission, publication, and delivery. Use the existing reference-lease pattern to
prevent concurrent source deletion from racing a submission or publication.

Reuse Sharp's rotate, resize, and re-encode pattern for the display image. Do not
reuse an unrestricted static-public derivative URL. Keep the derivative private
and deliver it through the publication-checked testimonial photo route. Do not
redirect to a separately usable signed original URL.

Canceling or replacing an unsubmitted selected photo may clean up only that owned,
unreferenced upload. Withdrawal and account deletion must retain protection for
any legitimately shared source still referenced elsewhere.

## Implementation map

Paths below are relative to the named frontend or backend repository.

New backend files:

- `models/TestimonialSubmission.js`
- `services/testimonialSubmissions.js`
- `services/testimonialMedia.js`
- `routes/testimonials.js`
- `routes/adminTestimonials.js`
- `routes/publicTestimonials.js`
- An explicit testimonial index preparation/readiness script under `scripts/`.

Existing backend integration points:

- `app.js`: route mounts and existing API/upload rate limiters.
- `routes/privacy.js` and `services/privacyWorkflow.js`: owner export, withdrawal
  before account deletion, and cleanup.
- `services/accountPublicContentQuarantine.js`: revoke public eligibility on
  quarantine; restoration must not revive revoked consent.
- `services/accountDeletionContentCleanup.js`: final erasure/tombstone handling.
- `services/removedAccountArchiveBundle.js`: explicit new-model coverage and
  disposition, consistent with the existing privacy/archive policy.
- `services/protectedMediaReferenceService.js` and
  `services/protectedMediaReferences.js`: retained testimonial evidence references
  and explicit model bindings.
- `services/uploadAssetReleaseService.js` and
  `services/localUploadReleaseService.js`: verify reference-guard coverage before
  releasing sources used by submissions.
- `models/PlatformAuditLog.js`: reuse its append-only contract; no broadening of
  audit permissions or mutation behavior.

New frontend files:

- `src/api/testimonials.ts`
- `src/app/feedback.tsx`
- `src/components/admin/TestimonialReviewPanel.tsx`
- `src/components/marketing/PublicTestimonials.tsx`

Mount narrow entry points in existing Profile, Admin, and public marketing
surfaces. Preserve the existing layout, theme, navigation, and Back behavior.
Private and Admin lists need loading/error/retry states distinct from an empty
queue, synchronous duplicate-action locks, and account/session isolation for
late requests. Failed reads must never enable stale publication actions.

When implementation changes behavior, update the relevant knowledge method and
app-readable policy counterpart required by `AGENTS.md`. This plan alone does not
change runtime behavior.

## Test and database policy

- Use injected/mocked models for unit/service tests and real application routes
  for authorization tests.
- Use `tests/helpers/dbTestUtils.js` with `connect({ replicaSet: true })` for
  transaction, race, and unique-index evidence. Create only the tested indexes
  explicitly, use isolated cleanup, and disconnect afterward.
- Preserve `automaticSchemaManagementEnabled()` behavior. Do not automatically
  create production/staging indexes on application startup. Check readiness and
  prepare the exact indexes through the reviewed deployment process.
- Use generated test images and synthetic records; no real people's feedback,
  private photos, mailbox access, production URI, or payments are needed for
  automated verification.
- Reuse existing privacy, quarantine, protected-media, and archive-coverage tests
  to prove the new model is included rather than silently omitted.

## Finite acceptance checklist

- [ ] Immutable record, versioned consent, one-current-submission index, and retry
  idempotency are implemented and tested.
- [ ] Genuine private feedback can be submitted with publicity consent unchecked.
- [ ] The exact name, quote, and optional photo are previewed before consent.
- [ ] Owner status/history and idempotent withdrawal work without a paid plan.
- [ ] Admin can review, publish the exact consented version, reject, or hide;
  there is no content-editing or automatic-publication shortcut.
- [ ] Withdrawal wins publish/withdraw races and blocks subsequent text and known
  photo URL reads even if physical cleanup fails.
- [ ] Photo ownership, source-generation changes, concurrent deletion, bounded
  uploads, metadata removal, and cleanup are covered.
- [ ] Public responses redact all private fields and exclude synthetic records.
- [ ] Account export, deletion, quarantine, media reference, and model-coverage
  tests pass; restoration never restores revoked consent.
- [ ] Tests cover absent/false/invalid consent, stale digest/revision, duplicate
  submission, non-owner/non-Admin requests, stale session/UI responses, and
  failed reads/retries.
- [ ] Staging acceptance passes; the exact reviewed revision is deployed and
  production availability is verified without publishing a person's feedback.
- [ ] The master to-do and public Updates distinguish workflow completion from
  the separate milestone of obtaining genuine, consented feedback.

The workflow is complete only when these acceptance items pass. The absence of
submitted testimonials is not an implementation failure and must not be filled
with fabricated quotes or counts. A separate human Admin action is still required
for every genuine submission selected for publication.

Planning allowance: approximately 16–24 focused development hours, including tests
and deployment verification. This is an estimate, not a completion claim, and
excludes time waiting for people to submit real feedback.

## W06 Synthetic demonstrations are separate

W06 may create clearly labeled synthetic product demonstrations as a separate
workstream. They are not customer testimonials, user outcome evidence, verified
grower counts, ratings, or proof of adoption.

W05 synthetic submissions remain visibly labeled in owner/Admin screens and are
always excluded from ordinary public testimonial responses and photo delivery.
W05 adds no public demo mode. Any later explicitly approved public demonstration
must use a separate labeled surface and must not clear synthetic provenance or
present test content as a real person's experience.
