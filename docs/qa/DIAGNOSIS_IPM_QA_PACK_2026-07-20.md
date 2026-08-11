# Diagnosis and IPM QA Pack

Date: 2026-07-20

Status: Seed-ready catalog, evidence contract, and rights gate implemented. As of
2026-08-11, all 252 reviewed case records and 504 rights-reviewed images are
present and pass strict validation. Runtime execution and independent accuracy
review remain separate acceptance work.

Machine-readable catalog: `tests/fixtures/diagnosis-ipm-qa-catalog.json`

## Target distribution

| Group                                    | Case definitions | Records |
| ---------------------------------------- | ---------------: | ------: |
| Diseases                                 |               13 |      60 |
| Pests and beneficial/harmless lookalikes |               13 |      84 |
| Abiotic and nutrient/root-zone mimics    |               15 |     108 |
| **Total**                                |           **41** | **252** |

Each record represents one reviewed diagnostic situation and must contain at least two reviewed images. The repeated cases are meant to vary plant, stage, location, progression, medium, environment, measurements, and ambiguity instead of replaying one idealized symptom photo.

## Diagnostic contract

The pack locks the GrowPath ETGU sequence:

1. pattern;
2. medium and root zone;
3. environment;
4. actual measured values;
5. cautious cause ranking.

The final ranking may include disease, pest, deficiency, excess, lockout, antagonism, organic-release timing, another abiotic cause, or insufficient evidence. A photo label alone cannot skip the earlier evidence steps.

IPM Scout must send the same reviewed evidence envelope to the GrowPath primary diagnostic system and the GPT second opinion. If a second-opinion path cannot inspect the pixels, it must say so. Both answers, supporting and counter-evidence, alternatives, and disagreements must be saved. When context exists, write-backs link the Plant, Grow, Log, ToolRun, Task, and Facility rather than creating an isolated result.

The runtime comparison fingerprints that structured envelope, stores the
provider-reported agreement separately from a deterministic field comparison, and
persists candidate, confidence, and severity differences plus the combined requested
follow-ups. A completed or failed provider request is not itself billing evidence: the
saved result reports the exact charge or refund only when a credit-ledger receipt is
present. The master QA seed manifest points to this catalog and mirrors its seed-ready
252-record/504-image counts.

## Source and treatment boundaries

- GrowPath/owner or commissioned media is preferred because conditions, outcomes, and rights can be recorded together.
- PlantVillage is a candidate only. Repository availability or an “open access” description is not proof that every image is licensed for GrowPathAI commercial inference QA.
- Extension and government sources may support diagnostic signs, confirmation methods, and IPM principles, but page authority does not automatically grant permission to copy page media.
- Facebook grower posts and groups may supply candidate question language, case-recruitment leads, and poor-photo negative controls only. Do not automate collection without Meta authorization. Private-group access also requires the relevant group access and creator permission before retaining content. Remove usernames, faces, comments, locations, and unrelated personal data.
- A highly useful social case becomes a gold evaluation case only after image-level rights review, a separately confirmed outcome, and Tier A diagnostic cross-checking. Likes, captions, comments, and consensus are never the expected label. A poor but rights-reviewed case may test rejection and exact retake guidance. Neither category is training data.
- No case may invent a pesticide product, rate, interval, compatibility, or legal-use claim. Product guidance requires current label, crop/site, jurisdiction, worker/harvest interval, and beneficial-organism review.
- The pack is for QA of inference behavior, never model training.

Every image in a reviewed case needs source and media URLs, creator, license, attribution, retrieval and rights-review dates, intended-use approval, and handling mode. A copied fixture also requires a scoped local path and SHA-256 hash.

Diagnosis, IPM Scout, and Harvest Readiness accept up to 12 photos. This ceiling allows a zoomed-out overview, pattern/distribution, affected and unaffected tissue, leaf tops and undersides, macro signs, root-zone or trap evidence, and additional top/middle/lower bud sites. Obvious tiny or invalid files are rejected before upload. Blur, glare, colored light, bad focus, digital zoom, missing views, and irrelevant subjects are review-time findings that must return the reason and exact replacement view.

## Manual social reconnaissance — 2026-07-25

Three relevant Facebook grow groups were sampled manually through the visible signed-in interface. No automated collection was used. No names, post URLs, comments, screenshots, group media, or other personal identifiers were retained, and no creator permission was obtained. Consequently, this review added zero gold-case records and zero negative-control media records.

Only anonymized interaction patterns were retained:

- a symptom could be visible only as a small region inside an otherwise sharp wide frame, requiring the user to identify the target and add a close view;
- one IPM frame could contain multiple organisms or incidental subjects, so the reviewer must describe visible subjects separately and cannot assume the largest one is the target;
- a high photo count could still omit every required macro or evidence role; 12 wide views do not establish harvest macro coverage;
- an image could be globally clear but diagnostically limited because it did not isolate the relevant symptom.

These observations informed interface guidance and QA assertions only. They are not diagnoses, expected labels, retained cases, or training data. Any future post or image must still receive creator permission, de-identification, outcome confirmation, image-level rights review, and Tier A cross-checking before it can become an evaluation record.

## What remains

- have a qualified independent reviewer audit diagnostic signs, alternatives,
  confirmation method, urgency, quarantine, scouting, and response expectations;
- run every reviewed envelope through both diagnostic paths and persist evidence,
  counter-evidence, disagreements, confidence, requested follow-ups, billing, and
  linked records;
- retain the source and image-level rights gates for every future catalog change.

## Staging evaluation runner

The catalog now has a dry-run-by-default, resumable execution runner:

```txt
npm.cmd run evaluate:diagnosis-ipm
npm.cmd run evaluate:diagnosis-ipm:execute
npm.cmd run evaluate:diagnosis-ipm:resume
```

The dry run performs no network requests or writes. Execution refuses production
hosts, requires an explicit `test` or `staging` environment, a
`growpath-qa-diagnosis-ipm-*` namespace, an exact 40-character deployed Git SHA,
an authentication token supplied outside source control, and the exact confirmation
`RUN_GROWPATH_DIAGNOSIS_IPM_STAGING`. It checkpoints after every record so an
interrupted run can resume without intentionally replaying already persisted cases.

External media URLs remain governed references. The runner sends their rights
metadata but explicitly records zero pixel analysis unless a separate verified
image-analysis receipt exists; a caption or URL is never converted into a claim that
the model inspected pixels. Each response must persist both answers and the same
evidence-envelope digest. The resulting evidence stays incomplete unless all 252
provider reviews, credit-ledger receipts, and Plant/Grow/Log/ToolRun/Task/Facility
links are actually present. The runner exposes those gaps instead of treating a 201
response as full acceptance.

The evidence summary separately counts whether the GrowPath and GPT broad cause
classes fall inside each case's governed expected ranking. A mismatch remains visible
for qualified review; it does not rewrite the expected result or silently disappear
inside a combined score.

## Verification

```txt
npm.cmd run verify:diagnosis-ipm-qa-catalog:planning
npm.cmd run verify:diagnosis-ipm-qa-catalog
npm.cmd run evaluate:diagnosis-ipm
```

Planning mode validates allocations, ETGU order, evidence/write-back behavior, and
rights rules while a catalog is incomplete. Strict mode now passes only because all
252 reviewed case records and their 504-image rights-reviewed sets are present and
every source actually used by those records is approved. Optional unused future
source pools may remain pending, but cannot enter a reviewed record until approved.
