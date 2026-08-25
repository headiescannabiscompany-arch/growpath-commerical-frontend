# Cary and Maydale Nature recovery record

This file is the canonical execution record for the owner-directed recovery of the Cary,
North Carolina and Maydale, Maryland Plant ID trips. It narrows N-04; it does not replace
the Plant ID, Field Study, Nature publication, privacy, or deduplication contracts.

## Owner decisions

- On 2026-08-25 the owner confirmed that the Cary observations were collected in person as
  one same-day Cary trip. Recover the trip as a group, but publish one reviewed Nature
  observation per distinct plant/evidence set so every identity, uncertainty statement and
  photo set remains inspectable.
- The Cary trip includes the water-lily photos and every other distinct Plant ID evidence set
  retained from that trip; a short representative subset is not acceptable.
- Maryland contains several separate park visits, including a different water-lily/lily-pad
  observation on another day. Do not merge Maryland visits with Cary or collapse separate
  visits merely because the plants have a similar common name or appearance.
- Use the newest nonduplicate Tool Run for each retained evidence set. Older runs are
  provenance only and must not create duplicate pins.
- The separately photographed house crape myrtle and every potted-house record, including
  Dipladenia/Mandevilla, remain private. Trip membership never overrides that exclusion.
- Exact source coordinates remain private. Public records use a reviewed approximate park
  point and the existing explicit Nature consent/publish flow.
- Pins remain published after acceptance unless the owner later requests withdrawal.
- Completion requires an explicit disposition for every retained Plant ID evidence set in a
  confirmed trip: public, private, older duplicate, failed/unrecoverable upload, or unresolved
  pending review. No run or photo set may be silently omitted.

## Cary recovery inventory

The Saved Runs index contains exactly nine Plant ID Tool Runs dated 2026-08-02. Those nine
runs reconcile to the following six distinct evidence groups; three rows have one older
duplicate each. No additional 2026-08-02 Plant ID Tool Run appears in the owner's retained
Saved Runs history. Media that was never successfully submitted is outside this nine-run
ledger and must not be represented as retained evidence.

| Evidence group | Newest retained Tool Run | Older duplicate | Evidence | Publication rule |
| --- | --- | --- | ---: | --- |
| Crape myrtle candidate A | `6a6fa0f5510a22fe5a5e31c1` | `6a6fa0a2510a22fe5a5e31a8` | 3 photos | Review restored photos and retain only if this is the Cary set. |
| Crape myrtle candidate B | `6a6fa267510a22fe5a5e32cd` | `6a6fa24c510a22fe5a5e32b5` | 5 photos | One crape group is the explicit house exclusion; restored-photo review must determine which group before either is published. |
| Water-lily candidate | `6a6faab1510a22fe5a5e343b` | `6a6faa9d510a22fe5a5e3424` | 4 photos | Public copy must say `Unverified water-lily candidate (Nymphaea spp.)`; never relabel it as lotus. |
| Brazilian-verbena candidate | `6a6fab3a510a22fe5a5e346d` | none known | 1 photo | Preserve candidate uncertainty; do not imply external verification. |
| Magnolia candidate | `6a6fad99510a22fe5a5e352d` | none known | 1 photo | Preserve candidate uncertainty; do not imply external verification. |
| Potted Dipladenia/Mandevilla | `6a6facd0510a22fe5a5e34d4` | none known | 3 photos | Explicitly private; never include in Cary or Nature. |

The owner statement is positive trip-association evidence for the in-person Cary session. It
does not decide which of the two crape evidence groups is the separate house record; that
single mapping stays open until the restored photos are visibly reviewed.

## Maryland multi-visit recovery inventory

Maryland is a visit ledger, not one undifferentiated Maydale collection. The owner has made
several trips and has directly confirmed that a different kind of lily pad was photographed
on a separate Maryland day. Preserve one dated Nature observation per distinct retained
visit/evidence set, even when two visits resolve to the same family, genus or common name.
The exact Maryland water-lily run-to-visit mapping remains unresolved until the later Saved
Runs and their restored media are visibly reviewed.

The retained Plant ID index has later candidate runs on August 6, 7, 8, 9, 20 and 21 in
addition to the known August 5 records. These later records must be inspected before the
Maryland inventory can be called exhaustive. In particular, review Tool Runs
`6a7477e957546952dd386175`, `6a74d24698d95212b8cb27ea`,
`6a753c25bb3088ccf73d0874`, `6a77a9d5cc28a401f528793c`,
`6a77f3323d9a72fc520d9d60`, `6a77f67895931a1ea2ab10d9`,
`6a87424c29a2753aa3dcbfaf`, `6a87424f29a2753aa3dcbfcc`,
`6a87493629a2753aa3dcc0fc` and `6a88b3a43d7226fb7aaa06c3` against their
retained photos, dates and public/private context. A date alone does not prove Maryland trip
membership.

### Known August 5 Maydale evidence

The imported iPhone folder `C:\Users\jcind\Pictures\8.24.26` establishes the following
August 5 evidence without requiring a new trip to the park:

- `IMG_2741.PNG` records a separate white-flowered plant attempt with two visible photos that
  failed to upload and a 14-second video still uploading at capture time. No durable Saved Run
  or original media has yet been proven for this set. Do not publish the screenshot as plant
  evidence or claim that the failed files were retained.
- `IMG_2742.PNG` records three successfully uploaded photos for the mustard/Brassicaceae
  evidence set. `IMG_2743.PNG` records a medium-confidence `Brassicaceae` / `Brassica spp.`
  result that explicitly needs confirmation.
- The newest duplicate for the first retained three-photo mustard set is
  `6a73ad591101a5b13bdbb490` (older duplicate `6a73ad461101a5b13bdbb486`).
- The later three-photo conflict resolves to newest run `6a87493629a2753aa3dcc0fc`
  (older `6a73bea643562803aa5cd094`) and must remain unresolved unless the restored photos support
  a defensible family-level label.
- The two-photo group resolves to newest run `6a73dec4fef33219f04e6461`
  (older `6a73dea1fef33219f04e644e`) and requires restored-photo matching before it is associated
  with Maydale.
- Use the reviewed public location for Maydale Conservation Park / Nature Classroom, not a
  saved device point or nearby private address.

## Retained implementation and exact remaining gates

- Retained Saved Runs could recover durable evidence IDs but the browser preview preferred a
  stale iPhone `file://` URI over the durable server URL. Commit `e05821b9` and PR `#811`
  reverse that precedence while preserving fresh in-session previews. The focused
  `MediaEvidencePicker` suite passes 36/36 tests and touched-source lint/diff checks pass.
- After PR `#811` is merged and deployed, visibly review every retained Cary and Maydale
  evidence set, including every later Maryland candidate run. Record the exact trip,
  public/private/duplicate/unrecoverable/unresolved decision for each set; do not infer it
  from date, proximity or a duplicate title.
- Publish only the positively matched non-sensitive park observations with their complete
  retained photo sets, observation date, uncertainty-safe description and approximate public
  point. The final publish action requires the owner's action-time confirmation.
- Verify Saved Run reload, Nature card, every photo, date, description, approximate map pin,
  search/filter behavior, mobile access, and absence of exact coordinates or private records.
- Update P-05, P-06, N-01, N-03 and N-04 with the production release/commit and accepted
  observation IDs. Keep the pins live; do not perform the old publish-then-withdraw cleanup
  script unless the owner asks to remove them.

## No-rebuild boundary

Do not rebuild Plant ID, Saved Runs, Field Studies, the globe, projection, publication,
withdrawal, deduplication or privacy policy to complete this recovery. Fix and accept only the
retained-photo preview defect, then execute the bounded review/publication workflow above.
