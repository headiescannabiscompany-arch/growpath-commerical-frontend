# P-08 Harvest Readiness canonical completion record

Updated: 2026-08-24

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

| Layer | State | Evidence / exact remaining gate |
| --- | --- | --- |
| Retained Standard workflow | live slices retained | Four-to-twelve-image ordinary-phone review, one-credit provider use, Saved Run replay, correction, visible-sample ranges, source-bound zoom views, optional Grow, grow-log/task write-back and Facility entry already have production evidence in the detailed remainder ledger. |
| Max-80 frontend | merged, deployed and live-accepted through retained-frame restore | PR `#784` merged as `1d6ef91f138769d698fdeeaf47b5ce087571af87`. Oversize preflight PR `#785` deployed as `98e84c939ec0053b7e97eeee57ea753cdeb6dfda`; standalone restore PR `#786` deployed as `4a3084354359ae24cc63ce600830fd195ed77d35`. Production proved both boundaries without another upload or extraction. |
| Durable backend | merged and live | PR `#232` merged; Facility source lineage follow-up PR `#233` is live as `e2de8912117dd35adee15e59043f1ce9c06784fe`. `/ready` returned the required database and Harvest worker readiness before the production extraction attempt. |
| Production configuration | configured | The dedicated Harvest receipt configuration is present; no secret value is recorded here. |
| Deployment | current slice live | Backend `e2de8912117dd35adee15e59043f1ce9c06784fe`; frontend `4a3084354359ae24cc63ce600830fd195ed77d35`, Render deploy `dep-da684g7lk1mc73e3mve0`. PR `#786` full CI run `32756909152` passed. |
| Live P-08 acceptance | bounded extraction and standalone reload passed; quote/provider/share/delete remain open | Production rejected owner-authorized 1,612.3 MB `IMG_2072.MOV` locally at the 512 MiB extraction boundary with no upload. It then uploaded 269.2 MB `OOFC0208.MOV`, retained 80 of 270 usable candidates across 40 timeline buckets, and restored that exact source/frame set after a clean standalone Facility reload. No AI analysis or credit was used. |

### 2026-08-24 live extraction and restoration evidence

- Account/workspace: authorized Triple Bag Genetics Facility owner; Facility
  `6a563bec2fb9f669d2319fa5`; standalone Harvest review with no Grow selected.
- Oversize guard: `IMG_2072.MOV` (240 seconds, 1,612.3 MB) was rejected before upload with the
  explicit 512 MB protected-extraction recovery message on frontend
  `98e84c939ec0053b7e97eeee57ea753cdeb6dfda`.
- Accepted private source: `OOFC0208.MOV` (270 seconds, 269.2 MB), EvidenceAsset
  `db95985f486244cbb1a2cacc`; AI use remained disabled for the source video.
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
- Still open: visual frame-quality review, exact quote/cancel/accept and paid durable result,
  bounded private frame/result share, deletion/cleanup and the remaining failure/role evidence
  named below. Do not rebuild the accepted upload, extraction or restoration slices.

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
- Saved-result permanent deletion rechecks ownership/role, publication/calibration/legal holds
  and every retained reference, removes the saved result and unreferenced derived evidence, and
  offers a separate source-video keep/delete decision.
- A succeeded but unsaved Deep result has a separate irreversible confirmed discard. It
  tombstones result/provider metadata, keeps the private source video and retained frames, and
  does not refund already charged credits. Saved or preserved results must use the guarded Saved
  Runs lifecycle.

## Calibration and marketing boundary

The workflow may ship as bounded decision support after the live acceptance below. It must not
claim validated whole-plant percentages, potency, chemistry or scientific counter accuracy.
The rights-cleared ordinary-phone corpus, independent head-label adjudication and qualified
review remain a separate calibration/marketing-claim gate. That research must compare against
the retained baseline and record disagreements; it must not reopen or tune the production
architecture toward one owner's estimate. A naturally occurring provider failure may add live
ledger evidence later; automated pre/post-dispatch failure gates remain required for release and
must not be replaced by manufacturing a production outage.

## Required deployment order

1. In production service `growpath-api` (`srv-d8tdngn7f7vs73c5qamg`), save the dedicated receipt
   secret and `HARVEST_ANALYSIS_RECEIPT_KEY_ID=harvest-2026-08-v1`. Leave both `PREVIOUS_*`
   values absent unless an actual prior Harvest key is being rotated.
2. Merge backend PR `#232`, wait for its exact main SHA to be Live, and record the Render deploy
   ID. Do not merge the frontend first.
3. Require `GET https://api.growpathai.com/ready` to return 200 with `ready: true`, `dbReady:
   true`, and `harvestVisionOperationWorker.ready: true`. `/health` proves liveness only.
4. Verify authenticated quote/start/status endpoints without exposing secrets or cross-workspace
   records.
5. Prove production FFmpeg/ffprobe by successfully decoding and preselecting one authorized
   older private Harvest video. `/ready` does not prove FFmpeg exists. An unavailable extractor
   must fail before analysis credit and provide a truthful recovery action.
6. Merge frontend PR `#784`, wait for the exact production bundle on `growpath-frontend`
   (`srv-d8ulmu3eo5us73e2otmg`), and never deploy the obsolete duplicate service.
7. Run the signed-in live acceptance script below, record evidence, then rerun the affected P-08
   route row and the frozen R-03 crawl.

## Exact live acceptance script

- [ ] Record exact backend/frontend main SHAs, Render deploy IDs, URL, date/time, account,
      selected workspace/role, credit balance, source run/video/evidence IDs and initial saved
      state. Use only the owner's previously authorized private video.
- [ ] Open the ordinary Harvest Readiness entry in Personal and confirm Commercial/Facility
      workspace routing and role/credit isolation without exposing another workspace's record.
- [x] Restore or attach the private source video; prove decode, candidate sampling, technical
      selected/rejected counts, timestamps, retained byte total, at-most-80 ceiling and temporary
      candidate cleanup. No source/rejected/GPS data is sent to the provider.
- [ ] Confirm the exact Standard/Deep classification, image count, batch count and credit quote.
      Cancel once and prove no dispatch/charge, then accept once.
- [ ] Start the durable operation; observe queued/processing progress, navigate away/reload,
      restore the same operation, and finish without duplicate provider dispatch or charge.
- [ ] Verify one signed all-or-nothing result: selected/analyzed counts, per-image evidence,
      clear/cloudy/amber ambiguity, structural-development observation/signals and bases,
      broader harvest/wait evidence, limitations and next collection step.
- [ ] Confirm fused/collapsed/ruptured/bare-stalk or other structural labels appear only when
      resolved; no UI or share text calls a head dead, oxidized or chemically measured.
- [ ] Save and reload the result. Verify exact retained evidence, zoom views, receipt-backed
      summary and optional Grow state persist without another charge.
- [ ] Explicitly select a bounded subset of retained frames, save/export it, then invoke native
      share review without completing an unrelated public post. Verify package limits and that
      omitted private identifiers/media do not appear.
- [ ] Invoke sanitized result share review separately and verify structural/context evidence is
      readable while private media, provider IDs, storage URLs and receipt secrets are absent.
- [ ] Exercise both confirmed deletion lifecycles: permanently delete a saved test result and
      discard an unsaved succeeded Deep result. At least one must run live; retain exact deployed-
      SHA automated evidence for the other if creating a second charged live review is not
      proportionate. Verify source-video keep/delete behavior, reference/hold refusal,
      tombstone/absence after reload, and that deletion/discard never promises a refund for
      completed provider work.
- [ ] Exercise or retain automated evidence for cancel, pre-dispatch refund, post-dispatch
      reconciliation, stale/duplicate operation key, permission denial and failed extractor.
- [ ] Clean up only the expressly created test result/evidence, preserve any owner-selected source
      video, and record final credits/data state plus every remaining non-P-08 gate.

## Completion rule

P-08 is not complete until the production script passes on exact deployed SHAs and this document,
the detailed remainder ledger and matrix are updated with the evidence. When it passes, close the
bounded Harvest Readiness product workflow without claiming the separate calibration research is
complete. Do not reopen the implementation for an unperformed check; perform the named check.
