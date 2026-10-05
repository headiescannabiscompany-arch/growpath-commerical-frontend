# W09 synthetic-story asset provenance — October 5, 2026

## Original local checkpoint — historical; see deployment addendum below

The five-story marketing integration and these 14 assets are prepared as a local
release candidate, not staging- or production-released. The separate signed-in repairs
were staged at frontend `0a57a7db5560a9d75e3871e2b7cddf3ee5f516c8` and backend
`be9f2e5f5dc627e91b58cb3713a09c442f039c57`; those repair passes do not certify
the new public story integration. W07/W08 remain CLOSED / LIVE. No public Updates
entry or production change is made by this receipt.

The lead agent confirmed visual review PASS for all 14 final crops. This receipt
independently records current file existence, source/output dimensions and SHA-256
hashes. Final local integration checks: **215/215 tests across eleven
focused/privacy/metadata suites and 26/26 static tests PASS**. TypeScript
`--noEmit`, touched-source ESLint and `git diff --check` PASS. Repository ESLint
configuration ignores test files; no test-file lint pass is claimed.
`node scripts/guard-contamination.cjs` also PASS.
Production-mode local export PASS with bundle
`index-c42ebb20621f576e5a1b2100864426f6.js`; no deployment was performed.

The final browser confirmed that exact local bundle, keyboard Enter activation of
steps/stories, 375px root width with five 328px journal entries and no overlay,
and 1024px root width. Viewport was reset. Earlier checks covered all five stories,
14 loaded images, seven audience CTAs, back/forward, extra-query sanitization,
invalid-story fallback and canonical metadata. Share options were opened only;
clipboard or social posting is not verified. Final visually reviewed captures:
`outputs/W09_Final_Mobile_Journal_2026-10-05.jpg` and
`outputs/W09_Final_Desktop_Demo_2026-10-05.jpg` in the private workspace.

Localhost public-feedback API was inaccessible and showed the truthful unavailable
state; a staging read check remains pending. This is not evidence of a production
outage. Local gates PASS; staging acceptance remains pending and W09 remains
OPEN / NOT LIVE. The already accepted repair/fixture checks remain closed.

## October 5 chronological deployment addendum

The original local-only status above is retained as history, not current status.
Frontend `4af3b272c09a8c6cf105db7af82fa9e160b2c36d` passed staging acceptance
at deployment `dep-db1u5nek1f9s738c4or0`, LIVE **17:50:02.75549Z**. Its served
staging bundle was `index-7822104538c0a12fb8e5145c23551f9a.js?v=3134ce7943f7`.
All five stories/14 images, seven audience CTAs, direct/reload/back/forward,
keyboard controls, bounded query handling and narrow/desktop containment passed.
Public feedback returned HTTP 200 with `{"testimonials":[]}` and no Authorization
header. Normal existing-session account/presence requests were observed separately;
do not claim zero authenticated requests or exhaustive network coverage.

Production feature deployments are LIVE: frontend exact `4af3b272`,
`dep-db1ulk3bc2fs73ehs290`, **18:24:13Z**; isolated backend
`5b998726033d7154d20b22ecc24622abdee8773b`, `dep-db1uka6i0phs73cjg4hg`,
**18:22:08Z**. The backend candidate is based directly on production `71111f2`
and contains only the text-only response initializer repair and regression tests;
the broader `be9f2e5` staging branch was not promoted. Its three explicit offline
mocked suites passed 148/148 tests with zero observed network attempts.

Production marker activation on exact backend `5b998726`,
`dep-db1usj7lot8c73d7tm6g`, is LIVE **18:39:18.15734Z**. The actual `/ready`
GET was observed after that activation was LIVE and returned `ready`, `dbReady`
and `paymentInfrastructure.ready` true, `stale: false`, with all five payment
checks true. Its `checkedAt` value **18:38:58.031Z** is the earlier underlying
cached check timestamp, not the time of the post-activation response observation.

The lead agent reported production browser PASS for all five stories, step
navigation, direct/reload, keyboard activation, five journal list entries, five
visual points and a share fallback containing the correct story link. Screenshot:
private workspace `outputs/W09_Production_Demo_2026-10-05.jpg`. No clipboard,
social-post or externally tested native-share claim is added. Independent HTTP
verification at **18:40 UTC** passed seven audience CTA destinations, server-rendered
markup and the served bundle. All 14 production-origin images matched the exact
`4af3b272` source hashes and sizes. Canonical-host image-byte differences were
explained by Cloudflare Polish transformations; no byte-identical CDN-image claim
is made. The source/crop/output hashes below remain the reviewed local provenance
record, now matched to the production-origin assets.

One grouped Website & plans release note, including the bounded Personal
comparison-scope/calendar-date and text-only AI repairs, is now prepared locally
after the production feature gate passed. Its publication is not yet verified.
Focused local verification of this note: `UpdatesPage.test.tsx` and
`releaseAge.test.ts`, **45/45 tests PASS across two suites** (4.082s).
The broader website group remains partial; genuine proof and unpublished ad
drafts remain separate. W09's private implementation TODO is not closed until
the grouped note is verified live. No source assets, fixture records or prior
closed acceptance checks were changed by this addendum.

## Source and transformation

Sources below are relative to the private workspace `outputs/` directory.
Destinations are relative to this repository's `public/images/` directory.
The reproducible crop specification is the private workspace file
`outputs/Prepare_W09_Reviewed_Screenshots.ps1`.

Script SHA-256: `ebf97c0fc175cf1415225d253a09b48db862baf08b764fd46d321f330c296fa0`.

The script takes the indicated top-left-origin pixel rectangle, clones it at
the same pixel dimensions, and encodes a 24-bit RGB JPEG at quality 90. This is a
rectangular crop and JPEG re-encoding, not byte-identical copying of the source
file. No generative replacement, compositing, fabricated UI, changed text,
record values or controls is performed. Original source screenshots are retained
outside the public image directory. The crop script was inspected, not rerun by
this documentation update.

| Public asset | Original screenshot | Source px | Crop x,y,w,h | Output px |
| --- | --- | --- | --- | --- |
| `synthetic-story-free-start.jpg` | `W09_Free_First_Record_2026-10-05.jpg` | 946x1244 | 24,105,883,1048 | 883x1048 |
| `synthetic-story-free-care.jpg` | `W09_Free_Changed_Record_2026-10-05.jpg` | 946x1244 | 24,105,883,816 | 883x816 |
| `synthetic-story-free-review.jpg` | `W09_Free_Review_Record_2026-10-05.jpg` | 946x1244 | 24,105,883,816 | 883x816 |
| `synthetic-story-history-answer.jpg` | `W09_History_Response_Staging_2026-10-05.jpg` | 946x1244 | 0,0,928,535 | 928x535 |
| `synthetic-story-comparison-result.jpg` | `W09_Comparison_Result_Staging_2026-10-05.jpg` | 946x1244 | 20,574,891,145 | 891x145 |
| `synthetic-story-export-package.jpg` | `W09_Export_Package_Staging_2026-10-05.jpg` | 946x1244 | 20,420,906,583 | 906x583 |
| `synthetic-story-facility-task.jpg` | `Facility_Viewer_Shared_Task_2026-10-05.png` | 2560x1249 | 16,106,1100,433 | 1100x433 |
| `synthetic-story-facility-history.jpg` | `Facility_Viewer_Task_Audit_2026-10-05.png` | 2560x1249 | 16,70,1100,350 | 1100x350 |
| `synthetic-story-seller-draft.jpg` | `W09_Seller_Owner_Staging_2026-10-05.jpg` | 946x1244 | 16,605,914,199 | 914x199 |
| `synthetic-story-seller-published.jpg` | `W09_Seller_Owner_Staging_2026-10-05.jpg` | 946x1244 | 16,289,914,199 | 914x199 |
| `synthetic-story-seller-view.jpg` | `W09_Seller_Buyer_Staging_2026-10-05.jpg` | 946x1244 | 0,0,946,345 | 946x345 |
| `synthetic-story-course-owner.jpg` | `W09_Course_Owner_Staging_2026-10-05.jpg` | 946x1244 | 32,70,866,957 | 866x957 |
| `synthetic-story-course-lesson.jpg` | `W09_Course_Owner_Lesson_Staging_2026-10-05.jpg` | 946x1244 | 32,490,866,387 | 866x387 |
| `synthetic-story-course-visitor.jpg` | `qa-media/course-staging-anonymous-preview-20260927.png` | 2560x1249 | 32,539,1400,246 | 1400x246 |

All actual output dimensions match the declared crop width and height.

## Exact scene claims and limitations

- **Free:** the three scenes are the same bundled synthetic five-entry journal.
  Dates, care notes and amounts are invented examples, not recommendations or
  observed outcomes. The basil illustration is AI-generated and must stay
  disclosed; the captured interface itself is actual rendered UI. Preserve
  Free's one-grow/one-plant boundary. See `W06_SYNTHETIC_DEMO.md`.
- **History answer:** one actual staging response used the two saved synthetic
  Basil A logs, with correct October 1/5 dates and recorded values, provider
  label **GrowPath context + OpenAI**, and no Basil B, treatment or causal claim.
  This is not general AI-accuracy proof. The capture used an eligible higher-plan
  account; it is not evidence that the feature is exclusive to Pro.
- **Comparison:** two synthetic grows supplied three log records but zero
  comparable structured metrics. Retain insufficient-evidence/low-confidence
  wording and no winner or causal conclusion. A saved report, journal source
  reopen and source-linked task were accepted separately. Both grows and the
  exact follow-up task are now archived; do not recreate or rerun them.
- **Export:** this is the existing archived Basil B export-package UI: 2 logs,
  0 tasks, 0 plants and 1 tool run. It is not a completed downloaded-file example.
  The in-app browser reported preparation, then canceled
  `grow-visual-grow-timeline.html` at **0 / 2,047 bytes** after the capture wait
  timed out. Existing P-10 HTML-download acceptance remains closed; no current
  output-file acceptance, native PDF or offline original-photo archive is claimed.
  The accepted crop is `synthetic-story-export-package.jpg`, which excludes the
  raw grow-context identifier.
- **Seller:** the draft card is a separate synthetic offer, not a before-state of
  the published card. The published card and customer-facing view refer to the
  exact retained September 12 protected offer. Current detail and purchase-status
  GETs returned 200 with `protected_asset`, `deliveryReady:false`,
  `accessStatus:owner`, `canDownload:false`, `paymentStatus:not_required`.
  The owner followed **View public offer**; this is not an independent buyer
  transaction. Say **Protected delivery is not ready**; the missing-asset/bytes
  cause remains unproven. Historical successful delivery/refund acceptance stays
  separate. Crop out synthetic rating/download/revenue counters; no sales,
  earnings, reviews or customer endorsement are demonstrated.
- **Creator:** current owner overview and saved text-lesson preview are the same
  retained synthetic course as the September 27 anonymous visitor outline.
  Owner preview does not establish ordinary learner entitlement. Paid content
  remains locked to the anonymous visitor. No course edits, publication changes,
  enrollment, payment or completion occurred. Preserve A04-01/02/03 boundaries;
  the native/shared course is not a Commercial collection course or proof of
  ordinary protected-document/Forum handoff. See the private
  `Course_Lesson_Authoring_Guards_2026-10-02.md`,
  `Course_Media_Playback_2026-10-02.md` and
  `Course_Discovery_Signin_Release_Checkpoint_2026-09-27.md` receipts.
- **Facility:** task and history are the same previously accepted synthetic
  completed task in a Viewer session. They show a saved record and correlated
  history, not verified physical work, newly performed completion or permission
  changes. The history origin is `legacy_unverified`, not a cryptographically
  verified modern audit chain. See
  `R08_FACILITY_ROLE_RECEIPT_RECONCILIATION_2026-10-05.md`.
  An existing separate Facility dashboard image keeps its prior receipt; it is
  not one of the 14 new crops in this manifest.

## Exclusions and publication checks

- `outputs/W09_Export_Package_Public_Crop_2026-10-05.jpg` is an invalid earlier
  capture and must not be used. It is not a source in the script or this manifest.
- `outputs/W09_Comparison_Ownership_Error_2026-10-05.jpg` was visually blank and
  is not visual evidence; the original network 404 remains diagnostic history.
- A screenshot filename containing Buyer does not prove a buyer session. The
  current seller-view capture was opened by its owner.
- These crops retain conditions material to the described state. Keep visible
  synthetic/crop labels in story captions, no private identifiers or test
  ratings/counters as customer proof, and no invented same-record continuity.
- Final crop review does not replace testing rendered mobile/desktop legibility,
  keyboard controls, reload/back/share routes, static parity or release gates.
  No ad spend, new tracking, public-copy publication or new transaction is
  authorized by this provenance receipt.

## SHA-256 manifest

Source hash identifies the retained original; asset hash identifies the exact
cropped JPEG reviewed for this checkpoint. A later asset or crop change requires
updated dimensions/hashes and a new visual check.

| Public asset | Original source SHA-256 | Final asset SHA-256 |
| --- | --- | --- |
| `synthetic-story-free-start.jpg` | `5698f0e1735fbb7fd9c1fe7c9395a619a8e7bedce90a9ec314836afb8b104b28` | `8ec8c8f9762b03cd98aa2d5cbaab28adfe592576e55357b3c01597af0d75e405` |
| `synthetic-story-free-care.jpg` | `2e4cf7d8980198a6470fa4f5c04a1d169b23e218c799026be63d036c025be676` | `f69e0c708cb4c1623d80ca2f8f3c295b831a5cf1419bfa50100bbe6ab63514df` |
| `synthetic-story-free-review.jpg` | `9e88a5e9dfb3585ad42faed241fc7b08a15f8d301483d564ffa6e86af3bd50b8` | `03db0099f55a3e8aefaae7b0ccde24065e0da17d1ef22078cb2f0d3fac9d565c` |
| `synthetic-story-history-answer.jpg` | `9b66bb1f567935d3bbd808652cffe1c053322451b51b909bedabf473b42f4248` | `10c15a63245cdd428328b9d5b29eb1a595e60ae59482d51192041ed44478b25f` |
| `synthetic-story-comparison-result.jpg` | `24bf72b5b1b6543730a72b06d897867d3e954d8b3f93bc1d75f0fd7ff9422952` | `30680d2b7f28d83161b80c4697bfedace669bb749cfd8733489d0b99b4429339` |
| `synthetic-story-export-package.jpg` | `a316bb00b6a4bd708a0efc857a2fcfaee92506c7db439d51fbf46b7e9ac982e0` | `8e2930918035bbc46f9f3b578173438b18d0b70e195499f80a6c7130f5a08272` |
| `synthetic-story-facility-task.jpg` | `5961a27206d30ac787cc60e413e94bb20e7ea50ab61a92ffe032e096b2492a6b` | `96bdde4d2f09b8625c94580ea54102a6130a91f78c5d644f93ee03509843f9b1` |
| `synthetic-story-facility-history.jpg` | `359556f710c6757b4bd0947863d848af446abcdf4d062150d2653f5ec372001d` | `0809f8dd51fdd527fae5eeeae0efd0ea2a089c314e49d6238910948371a9c562` |
| `synthetic-story-seller-draft.jpg` | `06c0ed7268f7870434c22443f60d5530e39b09cc75c1a0656805c81d0430d0e5` | `47f83977e0d2d0d895f402b72fd530add45aa7e8604144fd66a473d6bf9f5a80` |
| `synthetic-story-seller-published.jpg` | `06c0ed7268f7870434c22443f60d5530e39b09cc75c1a0656805c81d0430d0e5` | `1bc94a8f232dee0f4299a749c068b451a5c65dfc67ef81610f8ce5f98f5cbd22` |
| `synthetic-story-seller-view.jpg` | `c29363eb5cc56c47922e1fda778f00fb0e9434ddb84fec4434359ca6f1d63fcf` | `6673a758c37d03b721ebf7576c6509038d33eed5b83a024b51648f54314c85bd` |
| `synthetic-story-course-owner.jpg` | `3ee6b55a9e445ca72cc816e1c5fbc29709c59c5cb46face7bd369adb08da83e0` | `5fa707da386fd80a57e79a71261e59beda6ebdbf8ae6bb3d48afaf7e257a0bc6` |
| `synthetic-story-course-lesson.jpg` | `e38e40e80fbacaa1f83b5872399e5ccc775e612142bd2f380bb416439b23c1bc` | `35e12a43bd6287a014419b6f2f87b9f0096834cc8f9c38b5ba8b7a3e463ab10d` |
| `synthetic-story-course-visitor.jpg` | `cd86175a1c9707b7c5134f84178faa673731cbf20d31e17c62e7adfb38228b5d` | `23545226ad567fc65eee46328fa1e0670774663d6887b9b5a18c6890928d2bbf` |
