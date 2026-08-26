# P-08 Harvest Readiness canonical completion record

Updated: 2026-08-26

This is the single current implementation and acceptance record for canonical matrix row
`P-08`. It is evidence, not a second product queue. The product status remains owned by
`CANONICAL_PRODUCT_ACCEPTANCE_MATRIX_2026-08-21.md`; the durable domain rules remain owned by
`docs/knowledge/methods/harvest-dry-cure-method.md`; backend operation and key-rotation details
remain owned by `docs/backend/harvest-deep-operations.md` in the backend repository.

## Anti-rewrite boundary

The Standard photo workflow, upload transport, protected evidence storage, systematic zoom
views, visible-sample ranges, Saved Runs, correction, calculator, optional Grow, downstream
grow-log/task actions and Facility entry are retained product behavior. The max-80 work extends
that architecture. Do not replace it with another 12-frame path, another trichome-only tool, a
second upload system, or a separate public-sharing subsystem.

Platform Videos and Lives are separate `S-02` through `S-05` products. A private Harvest source
video is evidence for P-08 and must not reopen or duplicate those media products.

Reopen only the reproduced failing acceptance slice. A route load, source inspection, green
test, merge or deployment is not live acceptance.

## Current state

| Layer                        | State                                                             | Evidence / exact remaining gate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Retained Standard workflow   | live slices retained                                              | Four-to-twelve-image ordinary-phone review, one-credit provider use, Saved Run replay, correction, visible-sample ranges, source-bound zoom views, optional Grow, grow-log/task write-back and Facility entry already have production evidence in the detailed remainder ledger.                                                                                                                                                                                                                                       |
| Max-80 frontend              | merged, deployed and live-accepted through retained-frame restore | PR `#784` merged as `1d6ef91f138769d698fdeeaf47b5ce087571af87`. Oversize preflight PR `#785` deployed as `98e84c939ec0053b7e97eeee57ea753cdeb6dfda`; standalone restore PR `#786` deployed as `4a3084354359ae24cc63ce600830fd195ed77d35`. Production proved both boundaries without another upload or extraction.                                                                                                                                                                                                      |
| Durable backend              | merged and live                                                   | PR `#232` merged; Facility source lineage follow-up PR `#233` is live as `e2de8912117dd35adee15e59043f1ce9c06784fe`. `/ready` returned the required database and Harvest worker readiness before the production extraction attempt.                                                                                                                                                                                                                                                                                    |
| Production configuration     | configured                                                        | The dedicated Harvest receipt configuration is present; no secret value is recorded here.                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Deployment                   | exact corrective frontend releases are merged and live            | PR `#827` (`9904c952f4b8b353e99d348637eb712c2fea7173`) restored aggregate compatibility and deployed as `dep-da7g2s0u01pc73c2ipu0`; PR `#828` (`2e6a40f7516e8c0afb72394e4790038d438389bd`) preserved standalone crop context through save and deployed as `dep-da7gambncjis73alg300`; PR `#829` (`276086091e5db2e4fa8348c00a54afcb7f834127`) restored exact Facility Saved Runs and deployed as `dep-da7gf17avr4c73ai7h9g`. The existing durable backend remained appropriate and production readiness stayed healthy. |
| Live P-08 acceptance         | **closed**                                                        | One owner-authorized 80-image, seven-batch, seven-credit Deep Review completed all 80 images and produced a receipt-validated signed aggregate. Production then proved truthful limited-evidence reporting, exact zoom inspection, sanitized private-draft creation, calculator save, Saved Runs persistence and exact Facility retry restoration without a rerun or another charge. Optional public/Facebook publication and destructive cleanup were not requested and are not P-08 closure gates.                   |
| Ownership/lifecycle contract | **closed for release**                                            | The one fenced ownership, authorization, privacy, legal-hold, deletion, exact-replay and publication contract has focused automated coverage. Production proved the non-destructive owner path and public-feed absence. The owner retained the result, evidence and private draft for review, so live destructive deletion was intentionally not performed; the guarded deletion/discard controls remain covered and available when explicitly confirmed.                                                              |

### 2026-08-26 final successful Deep Review and live closure

- A later, separately owner-authorized Facility Deep Review superseded only the open acceptance
  status of the terminal refunded attempt below. It does not erase or reinterpret that historical
  failure/refund evidence.
- The successful operation selected and analyzed all 80 retained stills in seven signed batches,
  charged the quoted seven credits once, and validated its aggregate receipt and evidence digests.
  No second provider dispatch or credit charge was used for save, reload or retry acceptance.
- The result failed safely when the phone video did not resolve enough intact calyx gland heads:
  it reported insufficient evidence, glare/focus/context limitations and next-capture guidance
  instead of inventing clear/cloudy/amber percentages. Structural and senescence categories were
  present and remained unresolved rather than being mislabeled as death, oxidation or chemistry.
- The owner reviewed exact signed zooms and selected eight useful inspection views. Production
  created a sanitized owner-private Feed draft, restored it after reload, and kept it absent from
  public Feed reads. Source video, originals, GPS/EXIF, private notes, storage/provider/receipt
  identifiers and unrelated account data were not published.
- PR `#828` repaired standalone cannabis/hemp context propagation into calculator save. The exact
  production result then saved with HTTP 201 and appeared in Saved Runs as a completed standalone
  Facility Harvest run with 80 inspected images and seven charged credits.
- PR `#829` repaired Facility/Commercial exact retry hydration. After explicit standalone crop
  confirmation, production restored the same 80 photos, one private source video, signed result,
  durable operation and private draft without local mappings, a new analysis or another charge.
- Exact pre-merge clean-worktree verification passed 60 focused assertions for PR `#828` and 61
  for PR `#829`, plus repository-wide strict lint and full TypeScript checks. GitHub-hosted jobs
  remained queued without starting, so this record does not mislabel them as green.
- The owner kept the source/result/private draft for review. Live permanent deletion was therefore
  not invoked. Confirmed deletion remains a later owner action, not incomplete implementation.
  Publication and Facebook sharing remain separate explicit owner actions outside P-08.

### 2026-08-26 resumption and anti-rewrite evidence

- Current frontend main `b4e3e93592a00c4c6abd459b1d02fd95779c4557` passed Frontend CI run
  `32930936382`. Current backend main `6387095f44ee31e34f0f620262f0bd04e072da24`
  passed Backend CI run `32925389112`.
- Bounded-memory backend merge `0bf6647` passed its GitHub check run
  `32830042724`. Retained private-review frontend merge `c6c89f3f` passed Release preflight and
  lint/audit in runs `32821252544` and `32821252543`.
- A focused current-main frontend run passed all 88 assertions across the eight Harvest API,
  screen, durable-operation, persistence, private-sharing, visible-sample and deletion suites.
  `validate:harvest-history-contract` also passed; corruption markers and diff corruption were
  absent from `src`, `tests`, `scripts` and `docs`.
- Production `GET https://api.growpathai.com/ready` returned HTTP 200 with database and required
  Harvest worker ready. The worker was idle, not stale, and reported no active operation or last
  error at `2026-08-26T05:12:59.316Z`.
- The authorized Facility owner restored the retained zero-of-seven operation and invoked only
  its same-operation recovery control. The server refused the guarded retry because the operation
  was no longer an untouched, uncharged failure. No replacement operation, upload, extraction,
  quote, provider resend or credit charge occurred.
- Frontend PR `#824`, live as `d526543f570954de8a9581f37cd7debc9f65eb0e`, exposed the
  backend's existing recent-failure ledger to Platform Admin while keeping reconciliation controls
  limited to failures with credits still reserved. Production then showed the retained operation
  as failed with zero of seven batches completed, seven credits refunded, and an audited
  reconciled-refund disposition. The Admin held-credit queue remained empty.
- This closes the retained operation's recovery/credit question. It is terminal and must not be
  retried. The signed-result/share/delete acceptance cells require a separately authorized new
  paid operation; no such replacement is currently authorized.

### 2026-08-24 live extraction and restoration evidence

- Account/workspace: authorized Triple Bag Genetics Facility owner; standalone Harvest review
  with no Grow selected. Production identifiers remain in the private operational ledger, not
  this public repository.
- Oversize guard: `IMG_2072.MOV` (240 seconds, 1,612.3 MB) was rejected before upload with the
  explicit 512 MB protected-extraction recovery message on frontend
  `98e84c939ec0053b7e97eeee57ea753cdeb6dfda`.
- Accepted private source: one owner-authorized 270-second, 269.2 MB video; AI use remained
  disabled for the source video. Its protected asset identifier remains private.
- Durable selection: 270 of 600 candidates sampled; 270 quality-usable; 0 rejected; 0
  near-duplicates removed; 270 distinct candidates; 80 retained frames; 40 timeline buckets;
  19.5 MB of the 80.0 MB retained-frame budget.
- Reload defect: the server data survived, but the old client cleared evidence whenever no Grow
  was selected. PR `#786` added workspace-scoped standalone restoration and exact newest-source
  frame matching so unrelated historical standalone frame sets cannot mix.
- Live restoration: frontend `4a3084354359ae24cc63ce600830fd195ed77d35`, Render deploy
  `dep-da684g7lk1mc73e3mve0`, restored `80 selected frames · 1/1 video`, the exact technical
  manifest, Deep selection, private export controls and no-credit quote control after a clean
  route load. No re-upload, re-extraction, provider dispatch or credit charge occurred.
- Read-only visual sampling of the first, middle and final retained groups showed real sequence
  progression from whole-canopy context through distinct bud sites to closer trichome-covered
  flowers rather than 80 identical frames. The rendered thumbnails do not establish that every
  required top/middle/lower macro resolves individual intact gland heads; that sufficiency must
  remain an explicit review/result finding. Temporary export selections were returned to zero.
- At that checkpoint, full-resolution macro-role sufficiency, quote/accept, paid durable result,
  bounded private frame/result share, deletion/cleanup and the remaining failure/role evidence
  were open. The later sections supersede that checkpoint: quote/accept and durable start are now
  proven, while same-operation recovery and its result remain open. Do not rebuild the accepted
  upload, extraction, restoration, quote or start slices.

### 2026-08-24 standalone crop-context and exact-quote evidence

- The restored Facility standalone review initially reproduced
  `CANNABIS_CONTEXT_REQUIRED` when requesting a free exact quote even though no Grow is required.
- Backend PR `#234` merged as `d9d5e68d4d283d0645265bf7bab24e304b08d9e3` and deployed as
  `dep-da68tm8ae00c73e3418g`. Frontend PR `#788` merged as
  `4651b597b0a0bb819ba7748afb005c88a3ebc28d` and deployed as
  `dep-da68us7avr4c73fmv5v0` after backend production succeeded.
- The standalone screen now requires an explicit cannabis/hemp flower confirmation. It enables
  only this crop-specific review; it does not create/attach a Grow, change global visibility,
  publish evidence, or bypass workspace, role, evidence, or Facility-credit authorization.
- A clean production load restored the same 80 frames and one source video. Before confirmation,
  the quote button was disabled. After confirmation, the server returned: 80 selected stills,
  80 unique originals, 0 exact duplicates, 7 signed batches and an exact 7-credit quote.
- Quote preparation sent no media to OpenAI and used no credit. The 7-credit acceptance switch
  remains off and Analyze was not pressed. Paid provider/result acceptance therefore remains
  open and requires explicit owner authorization at that financial/privacy boundary.

### 2026-08-24 accepted-operation initial pre-dispatch checkpoint

- The owner subsequently accepted the exact 80-image, seven-batch, seven-credit quote once.
  Production created one durable Facility operation. Its private identifiers remain in the
  operational database and Admin ledger, not this public repository.
- An authenticated operation response captured after the visible UI remained at `0 of 7`
  reported `status=processing`, `version=37`, `selectedEvidenceCount=80`,
  `analyzedEvidenceCount=80`, `duplicateEvidenceCount=0`, `batchCount=7` and
  `completedBatches=0`.
- Every durable batch remained `not_started`; no batch input digest, result digest or provider
  response ID existed. The operation had `creditState=not_reserved`, `result=null` and
  `error=null`. This is authoritative proof that the accepted evidence had not been sent to the
  provider and no credit had been reserved or charged at that captured checkpoint. The later
  audited refund supersedes this as the terminal credit/dispatch state and proves ambiguous
  provider work was not resent.
- Version `37` with no settled batch is consistent with repeated lease acquisition while the
  old worker stalled in pre-reservation evidence preparation. The old worker also swallowed its
  run-loop rejection, leaving the UI truthfully incomplete but without a terminal explanation.
- Recovery rule: keep this operation and its exact accepted package. Bound the complete
  mutation-free pre-reservation phase, preserve full 80-image authorization and signed-manifest
  validation, load bytes only for the current at-most-12-image batch, and hard-bound the entire
  provider response lifecycle. A pre-reservation timeout must settle retryably with no charge;
  once provider dispatch starts, an ambiguous timeout must never be resent automatically.
- Do not create a second operation while this record is processing. After the corrected worker
  is live, allow it to recover this same expired lease once or settle the operation to an exact
  retryable pre-dispatch failure before any new submission.

## Frozen user outcomes

1. The product is **Harvest Readiness**, not a trichome estimator. It combines sampled visible
   trichomes with pistils, calyx/bud development, timing, aroma, broader maturity and the user's
   desired effect, and explains both reasons the window may be open and reasons to wait.
2. A Grow remains optional in Personal, Commercial and Facility. Workspace authorization,
   cannabis/hemp eligibility and credit ownership are enforced before evidence loads or credits
   reserve. Facility never falls back to a member's Personal credits. Grow-dependent write-backs
   remain unavailable until an authorized Grow is selected.
3. Ordinary phone evidence is valid when it actually resolves the required evidence. Microscopy
   is not required, but image count never substitutes for sharp top/middle/lower macro roles and
   one wider context view.
4. The result describes the intact heads visible in inspected sampled calyx regions, never a
   literal whole-plant percentage, potency measurement or guaranteed harvest date.

## Canonical ownership and lifecycle contract

The initiating actor is provenance, not necessarily the enduring owner. Every read, replay,
share, deletion, export and account-erasure path must resolve the current workspace and then use
the same rules below. A route parameter, retained actor ID or knowledge of a record ID is never
authority.

| Record                                                   | Personal / Commercial                                     | Facility                                                                            | Required current authority                                                                                                                                                       |
| -------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source video, retained frames and exact inspection views | Account-owned private evidence                            | Facility-owned private evidence; creator remains audit provenance only              | Evidence read follows the current workspace/capability. Future provider-AI permission is separate from authenticated exact local reconstruction of a still-retained signed view. |
| Deep operation, batch ledger and signed result           | Account-owned and actor-scoped                            | Facility-owned and workspace-scoped; creator deletion or removal does not delete it | Current authorized Facility members may restore only what their capability allows. Analysis creation and every mutation recheck the current role.                                |
| Saved Harvest `ToolRun`                                  | Account-owned saved result                                | Facility-owned saved result; creator is audit provenance                            | Permanent deletion requires the current account owner or a current Facility `OWNER`/`MANAGER`, rechecked and fenced inside the commit transaction.                               |
| Owner-private Feed review draft                          | Account-owned private draft                               | Facility-owned private owner-review draft                                           | Create, restore and delete require the account owner or current Facility `OWNER`/`MANAGER`. The original actor is not continuing authority.                                      |
| Published Feed item / external share                     | Not created by this P-08 completion slice                 | Not created by this P-08 completion slice                                           | A later explicit reviewed publication transition is required. Facebook or another external destination receives only the reviewed public GrowPath URL after publication.         |
| Preservation hold / deletion receipt / tombstone         | Platform legal/audit control, never ordinary Feed content | Platform legal/audit control, never ordinary Feed content                           | Only the governed Admin/legal workflow may change it; protected user content is not disclosed merely because a hold exists.                                                      |

Facility operation lookup, exact replay and cleanup receipts are keyed by Facility workspace and
immutable request/result choices, not by the initiating actor. A current authorized owner or
manager can safely resume a `cleanup_pending` Facility deletion created by another former or
current owner, while an incompatible `deleteSourceVideo` choice conflicts instead of changing the
committed request. Personal and Commercial receipts remain account-scoped. In every workspace,
initiator identity is retained only as an audit fact and is deidentified when its account is
deleted where retention is otherwise lawful.

### Canonical state transitions

| From                                                | Explicit transition                                              | To                                            | Atomic and fail-closed requirements                                                                                                                                                                                                                                                                   |
| --------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exact quote                                         | Owner accepts the displayed count, batch plan and credits once   | Durable queued/preparing operation            | Idempotency binds workspace plus immutable evidence/request digests. Cancel creates no dispatch or charge.                                                                                                                                                                                            |
| Preparing                                           | Complete pre-reservation proof succeeds                          | Reserved / first batch eligible               | Reauthorize all evidence and current role; enforce one deadline; load bytes only for the bounded current batch. A proven pre-dispatch failure is retryable and uncharged.                                                                                                                             |
| Dispatched/unknown                                  | Worker resumes or process drains                                 | Reconciliation or deterministic completion    | Never resend ambiguous provider work and never expose a partial aggregate. Exact replay returns only a validated stored result with no new charge.                                                                                                                                                    |
| Succeeded operation                                 | User saves once                                                  | Saved `ToolRun`                               | Receipt, operation, workspace, optional Grow/plant and exact result must still match at commit.                                                                                                                                                                                                       |
| Succeeded operation or saved run                    | Owner selects one through eight signed zooms and previews        | Owner-private Feed draft                      | Regenerate exact crops from retained originals, verify every digest, sanitize copy and metadata, and commit idempotently. A changed ordered selection is a conflict/new explicit action, not silent replacement.                                                                                      |
| Owner-private Feed draft                            | Owner confirms deletion                                          | No draft                                      | Honor current authority, legal holds and operation fencing; deletion never deletes the signed result or refunds credits.                                                                                                                                                                              |
| Unsaved succeeded operation with no draft/reference | Owner separately confirms irreversible discard                   | Charged privacy tombstone                     | Current authority and legal holds are rechecked in the transaction. A dependent draft blocks this path and must be deleted first. Source video/frames remain unless separately deleted.                                                                                                               |
| Saved result, with or without a private draft       | Owner confirms permanent result deletion and source-video choice | Logical deletion receipt plus cleanup         | Atomically delete the dependent private draft and saved result, scrub/tombstone linked operation/provider/private result data, protect referenced evidence, honor the immutable source-video choice, then perform idempotent physical cleanup.                                                        |
| Personal/Commercial account                         | User confirms account deletion                                   | Account deletion pending/completed            | Under one serialized hold/deletion fence, remove account-owned Harvest `ToolRun`s, private drafts, operations and unreferenced evidence. Do not leave signed result packets orphaned after deleting their operations/assets.                                                                          |
| Facility actor account                              | User confirms account deletion                                   | Actor deidentified; Facility records retained | Preserve Facility-owned operations, results, drafts and evidence for the Facility; remove or anonymize actor references without transferring ownership to another person.                                                                                                                             |
| Any protected state                                 | Admin creates/enables a hold or adds protected evidence          | Preserved state                               | Serialize against deletion using the target-user lock and Harvest operation/source fences. Resolve and fence Harvest operation, draft, evidence asset/video, `ToolRun`, usage event and module-record references; an unsupported or unresolved Harvest source cannot be represented as safely fenced. |
| Active hold while account deletion is pending       | Admin performs release/close-only update                         | Hold released                                 | Permit only the release needed to break the deletion deadlock. Enabling the hold or adding evidence remains blocked while deletion is pending; the user must retry deletion afterward.                                                                                                                |

### Privacy, public-surface and availability invariants

- A private Harvest Feed draft is absent from public/feed-directory reads, analytics, likes,
  saves, campaigns, reports, ordinary moderation snapshots and discovery. Existing legacy public
  Feed rows whose status predates the draft field remain usable; only an explicit draft is private.
- Account export returns a deliberate user-facing Harvest result serializer. It may include the
  readable observations, limitations and guidance, but excludes provider response IDs, storage
  paths, operation/usage/evidence identifiers, hashes, signed-receipt internals and immutable
  security snapshots. A former Facility actor receives only their activity/audit metadata, not a
  copy of Facility-owned Harvest content.
- Withdrawing an evidence asset's future `aiUsable` approval prevents new provider use. It does
  not orphan an already signed retained result: authenticated exact local crop reconstruction may
  continue until the underlying result/evidence is lawfully deleted or held.
- Exact crop regeneration is a bounded read: enforce pixel, byte and time ceilings, actor/workspace
  rate limits, bounded concurrent derivations and coalescing of identical in-flight work. A client
  disconnect aborts or ignores its read; a timeout must not leave detached state-changing work.
- Mutating transactions are awaited to a known commit/abort outcome. A request deadline may set an
  abort signal, but it must never race a detached transaction and report failure while that same
  write later commits invisibly.

### Focused acceptance matrix before deployment

The implementation packet is not complete until focused automated evidence covers every cell:

1. Personal, Commercial and Facility create/restore isolation, including cross-Facility denial.
2. Facility creator removal/deletion and OWNER/MANAGER handoff for operation replay, private-draft
   restore/delete, Saved Run deletion and `cleanup_pending` replay.
3. Commit-time demotion/removal races for draft create/delete, operation discard and saved-result
   deletion; each must fail without a partial write.
4. Exact selection idempotency, changed-selection conflict, stale client-response suppression,
   digest mismatch, legacy descriptor fallback and withdrawn-future-AI permission.
5. Draft exclusion from public Feed, analytics, like/save, campaign and report/moderation paths,
   while a legacy public post with no status remains functional.
6. Direct discard with and without a dependent draft; saved-result deletion cascading the draft;
   immutable keep/delete-source-video receipt replay across Facility owners.
7. Personal/Commercial account erasure of ToolRun/draft/operation/evidence, Facility preservation
   with actor deidentification, and sanitized account export for both ownership models.
8. Hold creation and active-hold evidence append racing every deletion source type, plus the
   deletion-pending release-only recovery path. The protected data must remain intact on refusal.
9. Bounded deadlines, rate/concurrency limits, identical-request coalescing and no detached
   transaction after timeout or client abort.
10. A final exact-SHA live pass creates only the owner-private Feed draft, reloads it, verifies
    sanitized exact zooms, deletes the draft if requested and stops for owner review. Publication
    and Facebook remain outside this acceptance run.

### 2026-08-24 focused local reconciliation evidence

This closes the backend-focused construction cells without claiming deployment or live
acceptance:

- Feed draft route/service coverage passes 18/18 across Personal, Commercial and Facility
  ownership; current `OWNER`/`MANAGER` handoff; creator removal/deidentification; cross-owner and
  cross-Facility denial; strict DELETE; commit-time role loss; exact replay/conflict; signed hash
  and legacy reconstruction; and future-`aiUsable` withdrawal. A dependent draft also blocks
  direct unsaved-result discard before any mutation.
- The deep-save, operation/model and reciprocal module-link packet passes 62/62 together.
  Targeted follow-ups prove Facility role loss during unsaved discard and saved-result deletion
  before any operation, billing, receipt, evidence, feedback or module mutation.
- The final permanent-deletion suite passes 19/19, including transactional demotion and
  sequential Saved Run deletion that retains a globally consented exact frame set. The
  legal-hold and operation-privacy unit packet passes 16/16, including direct standalone
  evidence/video/usage resolution, orphan-module fencing and exact fence-count refusal.
- Exact account-erasure acceptance passes 6/6 on a replica set, including forced rollback,
  shared evidence across a failed media-cleanup retry, evidence-specific holds, complete
  Facility ToolRun/module/draft/usage/operation fencing and actor deidentification, and an
  orphan Facility-module hold with no partial mutation. Related privacy/shared-frame regressions
  pass 10/10.
- Bounded inspection-view availability passes 9/9, including enqueue-to-finish deadlines,
  coalesced subscriber tracking, queued last-subscriber removal and a decoder that ignores abort
  but keeps its physical concurrency slot until it settles. The Evidence route passed 23/23
  before the final source-revision key correction and its exact changed route case passed
  afterward.
- Operation-model, failed/reserved reconciliation, feedback/consent serialization and
  inspection-availability coverage passes 32/32. The contained Admin reconciliation transition
  charge-or-refunds the existing reservation exactly once, records one audit receipt, respects
  account/Facility/legal-hold fences, keeps the operation failed and never redispatches ambiguous
  provider work. Owner consent revocation is idempotent; post-discard feedback creation fails
  closed.
- Commercial public-versus-draft/workflow regressions pass 45/45. Changed backend JavaScript
  passes syntax, formatting, scoped lint and diff checks.
- The pre-follow-up frontend packet passed 100 focused assertions and TypeScript. CI regressions
  now also cover strict deletion receipts, confirmation/preservation, rejected `ABORTED`
  requests, latest-opened-zoom wins, private-draft reset guards and exact saved-operation recovery
  after local mapping loss. The complete changed frontend passes TypeScript, production-source
  ESLint, Prettier, corruption and export-sanity checks; repository policy reserves execution of
  the added frontend Jest cases for the exact-lock networked CI run below.

The production export is deliberately still open. The first local export used a borrowed stale
dependency tree (`expo 54.0.36`) while the committed lockfile requires `54.0.37` and failed in an
Expo Router asset. An isolated `npm ci` then reached the sandboxed registry boundary while
fetching `undici-6.28.0`; repository policy forbids treating further install retries here as
evidence. CI or another networked exact-lock environment must run install, the complete focused
frontend suite and production export once. This is an explicit environment/build gate, not a
claim that the application bundle passed or that product code caused the asset failure.

## Media acquisition and bounded frame selection

- Direct upload accepts at most 12 photos. Four provider-ready images remain the minimum.
- One private source video may be shorter than ten minutes; 9:59 is the enforced maximum.
- Protected frame extraction has a separate 512 MiB source ceiling even though the general
  video library accepts files up to 5 GB. When reliable local size is available, the picker
  must reject an oversized file before upload and explain the exact 512 MB recovery boundary.
  If local size is unavailable, the server remains authoritative and must fail before analysis
  dispatch or credit reservation.
- The server samples roughly one low-resolution technical candidate per second, capped at 600
  temporary candidates. Six hundred is a candidate ceiling for a ten-minute video, not frames
  per second and not a retention or provider target.
- Candidate scoring is technical only: decode success, obvious blur, gross exposure/glare,
  timeline coverage and near-duplication. It makes no biological claim from discarded pixels.
- Rejected candidates are deleted immediately and the temporary workspace is deleted when
  selection ends. Only a compact digest-bound technical manifest remains.
- At most 80 quality-, diversity-, timeline- and byte-bounded JPEG frames are retained. Direct
  photos plus retained frames may never exceed 80. Eighty is a ceiling, never a target.
- Plant ID and other generic vision tools remain at their own 12-image boundary; P-08 does not
  widen them.
- Source video, rejected candidates, GPS/EXIF and unrelated account data never go to the vision
  provider. Only explicitly accepted, server-attested stills may be provider input.
- Adjacent sequence pairs may distinguish persistent diffuse cloudiness from moving glare. One
  frame is the counting anchor and the comparison frame never adds an independent head tally.

## Color and structural morphology are separate

The intact-head color tally has five bounded buckets: clear, cloudy, confirmed amber,
amber-or-warm-light and cloudy-or-glare. Ambiguous colored heads must not be hidden in the white
glare bucket or inflated into confirmed amber. Pistils, sugar-leaf edges, colored plant tissue,
bright pixels, blur, compression artifacts and duplicate crop appearances are excluded.

The structural-development pass separately records:

- small/developing heads;
- intact/turgid heads;
- visibly swollen heads;
- wrinkled heads;
- collapsed heads;
- ruptured heads;
- resin exudation or leakage;
- fused or clustered heads;
- detached or missing heads; and
- bare stalks.

The set-level observation is `developing`, `intact_swollen`, `mixed`,
`advanced_senescence`, `not_visible` or `uncertain`. Advanced senescence requires repeated,
resolved morphology rather than one blurred structure, clipped highlight, hair or compression
artifact. The application must not call a gland head biologically dead, oxidized, chemically
changed or less/more potent from color or one image. Structural morphology supports readiness;
it never replaces the color tally, representative coverage, pistils, swelling, timing or aroma.

## Standard, Deep Review and durable credit behavior

- Four through twelve unique provider-ready images use Standard Review for one AI credit.
- Thirteen through eighty use an explicitly quoted Deep Review for
  `ceil(unique image count / 12)` credits, two through seven credits.
- The exact image count and credit cost are visible and require acceptance before dispatch.
  Personal/free users with enough credits may use Deep Review; there is no second paid-plan gate.
- Deep Review deterministically packs at most 12 originals per provider batch, keeps approved
  adjacent pairs together, preserves global-to-local evidence identity and performs no second AI
  synthesis call.
- The asynchronous operation supports quote, accept/start, poll, navigation/reload restore,
  exact replay and one final deterministic all-or-nothing aggregate. No partial result is shown.
- A succeeded operation remains durably addressable after the first rendered response so its
  signed result, exact zooms and owner-private Feed draft restore after reload without another
  provider dispatch or charge.
- A failure durably proven to precede every provider dispatch refunds the complete reservation
  once. Once any provider dispatch begins or an earlier batch completes, the server never
  redispatches the unknown/charged work, publishes no partial result, and retains the accepted
  reservation for support reconciliation if a safe final result cannot commit. This supersedes
  the older inaccurate promise of an automatic refund after every failed group.
- A successful exact replay returns the stored normalized result without another provider call
  or credit charge.

## Receipts, privacy, sharing and retention

- The final signed receipt binds actor/workspace, optional Grow/plant, ordered selected and
  analyzed evidence, source-video provenance, selection and batch-plan digests, every batch
  input/result digest and provider response ID, model/detail/prompt/policy versions, result
  digest and charged credits. The database is the runtime source of truth for the durable
  operation and receipt state; the canonical product matrix remains the source of product
  status and execution order.
- Receipt signing requires a dedicated random `HARVEST_ANALYSIS_RECEIPT_SECRET` of at least 32
  characters and public `HARVEST_ANALYSIS_RECEIPT_KEY_ID`. This is not a new OpenAI key and must
  not reuse JWT, AI-safety or gift secrets. The optional `PREVIOUS_*` pair is only for deliberate
  rotation and must be configured as a complete, distinct pair.
- Retained frames are private and unselected for export by default. The authorized owner may
  explicitly select exact attested frames and create repeatable packages of at most 12 frames
  and 24 MiB. Packages contain normalized stills plus safe order/timestamp/pair labels only.
- Private packages omit source video, rejected/unselected frames, GPS/EXIF, record/upload IDs,
  storage URLs, provider identifiers and receipt secrets. They create no public link, feed item
  or implicit publication.
- A separate explicit action may share only a receipt-revalidated, sanitized readable result.
  Structural observations may appear in that summary, but private media and technical IDs do
  not. Failed, deleted, incomplete or unattested results remain unshareable.
- Saved-result permanent deletion rechecks current account/Facility role,
  publication/calibration/legal holds and every retained reference; atomically removes a dependent
  private Feed draft and the saved result; scrubs the linked operation; removes only unreferenced
  derived evidence; and binds the source-video keep/delete choice to its idempotent cleanup receipt.
- A succeeded but unsaved Deep result has a separate irreversible confirmed discard. It
  tombstones result/provider metadata, keeps the private source video and retained frames, and
  does not refund already charged credits. A dependent private Feed draft must be deleted first;
  saved or preserved results use the guarded Saved Runs lifecycle.

## Calibration and marketing boundary

The workflow may ship as bounded decision support after the live acceptance below. It must not
claim validated whole-plant percentages, potency, chemistry or scientific counter accuracy.
The rights-cleared ordinary-phone corpus, independent head-label adjudication and qualified
review remain a separate calibration/marketing-claim gate. That research must compare against
the retained baseline and record disagreements; it must not reopen or tune the production
architecture toward one owner's estimate. A naturally occurring provider failure may add live
ledger evidence later; automated pre/post-dispatch failure gates remain required for release and
must not be replaced by manufacturing a production outage.

## Required corrective deployment order

### 2026-08-25 owner-directed pause and operation reconciliation

Deep video acceptance is deliberately paused until every other pre-hat functional matrix row
is closed. Preserve this packet and return to its remaining live script afterward; do not
remove the feature, rewrite accepted architecture or treat the pause as completion.

The first retained production operation selected/analyzed 80 images, completed three of seven
provider batches and then failed when the Render service exceeded its 512 MiB
memory limit. No aggregate result was used and the operation was not resent. Backend merge
`0bf6647874bfbd6b8376af268f313777d42394bc` bounded diagnostic/provider memory and deployed
healthy. The privacy-bounded Admin reconciliation queue then shipped in backend merge
`d3fec55c2191e65a30a835dba510cae0964825f8` and frontend merge
`940c7bb69d50f353074a90c2eedbf7a7f6c760e8`. Signed-in production displayed the exact
operation, 3/7 progress and seven reserved credits; the owner-authorized audited refund removed
it from the held queue. This closes that failed operation and its credit disposition only.
It does not prove a paid Deep result and must not trigger another attempt before this packet
resumes in canonical order.

The original backend-first max-80 deployment, FFmpeg proof, signed Deep result, exact save/reopen
and private-review acceptance are complete and retained above. Do not repeat them. P-08 now moves
only through ordinary frozen-candidate regression or a reproduced defect. Public publication,
Facebook sharing and owner-confirmed permanent deletion remain actions the owner may deliberately
take later; they do not reopen this product row.

## Exact live acceptance script

- [x] Record exact backend/frontend main SHAs, Render deploy IDs, URL, date/time, account,
      selected workspace/role, credit balance, source run/video/evidence IDs and initial saved
      state. Private object identifiers remain in the operational ledger, not this repository.
- [x] Open the ordinary Harvest Readiness entry in Personal and confirm Commercial/Facility
      workspace routing and role/credit isolation without exposing another workspace's record.
- [x] Restore or attach the private source video; prove decode, candidate sampling, technical
      selected/rejected counts, timestamps, retained byte total, at-most-80 ceiling and temporary
      candidate cleanup. No source/rejected/GPS data is sent to the provider.
- [x] Confirm the exact Standard/Deep classification, image count, batch count and credit quote.
      The first quote was left unaccepted with no dispatch/charge; the exact 80-image, seven-batch,
      seven-credit quote was then accepted once as the retained Facility operation.
- [x] Start and restore the durable operation, exercise its same-operation recovery guard once,
      and reconcile its credit state. Production proved the guard refused a terminal operation;
      Platform Admin proved all seven credits were already refunded after ambiguous provider work,
      with no resend and no held credits.
- [x] Verify one signed all-or-nothing result: selected/analyzed counts, per-image evidence,
      clear/cloudy/amber ambiguity, structural-development observation/signals and bases,
      broader harvest/wait evidence, limitations and next collection step.
- [x] Confirm fused/collapsed/ruptured/bare-stalk or other structural labels appear only when
      resolved; no UI or share text calls a head dead, oxidized or chemically measured.
- [x] Save and reload the result. Verify exact retained evidence, zoom views, receipt-backed
      summary and optional Grow state persist without another charge.
- [x] Explicitly select a bounded subset of retained frames, save/export it, then invoke native
      share review without completing an unrelated public post. Verify package limits and that
      omitted private identifiers/media do not appear.
- [x] Invoke sanitized result share review separately and verify structural/context evidence is
      readable while private media, provider IDs, storage URLs and receipt secrets are absent.
- [x] Select one through eight useful signed inspection zooms and create the idempotent
      owner-only GrowPath Feed review draft. Reload its preview; verify the server regenerated
      and hash-checked each crop, drafts remain absent from public Feed reads, zooms remain
      labeled supplemental rather than independent samples, and the source video, retained
      originals, GPS/EXIF, private notes, storage/provider/receipt/internal IDs and unrelated
      data are absent. Do not publish or send to Facebook during this draft gate.
- [x] While one zoom load/export and one private-draft creation are delayed, change the signed
      review/workspace scope. Verify each request is aborted or ignored, no stale preview/export
      appears, and Feed eligibility requires the operation ID stored with that exact analysis.
- [x] Inspect both descriptor generations: a new versioned zoom must request its exact derivation
      version, source bounds, width, and height, while a historical unversioned zoom must remain on
      the bounded compatibility path. Both must fail closed when the regenerated digest differs.
- [x] Retain exact automated evidence for both confirmed deletion lifecycles: permanent saved-result
      deletion and unsaved succeeded-result discard. Live deletion was not invoked because the
      owner retained this result and private draft for review. The controls verify source-video
      keep/delete behavior, reference/hold refusal, tombstone/absence after reload and no refund
      promise for completed provider work.
- [x] Exercise or retain automated evidence for cancel, pre-dispatch refund, post-dispatch
      reconciliation, stale/duplicate operation key, permission denial and failed extractor.
- [x] Preserve the owner-selected source video, saved result and private draft; clean up no retained
      owner data without confirmation. Record the charged final credit state and advance every
      remaining non-P-08 gate to the canonical final-crawl cursor.

## Completion rule

P-08 passed the production script on the exact deployed releases recorded above. This document,
the detailed remainder ledger and the matrix close the bounded Harvest Readiness product workflow
without claiming separate calibration research is complete. Reopen only for a reproduced product
defect or ordinary frozen-candidate regression—not to repeat this acceptance run.
