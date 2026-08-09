# Diagnosis and IPM QA Pack

Date: 2026-07-20

Status: Catalog, evidence contract, and rights gate implemented. As of 2026-08-09,
66 of 252 reviewed case records and 132 of at least 504 rights-reviewed images are
present. Remaining case media and expected-outcome review are active.

Machine-readable catalog: `tests/fixtures/diagnosis-ipm-qa-catalog.json`

## Target distribution

| Group                                    | Case definitions | Records |
| ---------------------------------------- | ---------------: | ------: |
| Diseases                                 |               10 |      60 |
| Pests and beneficial/harmless lookalikes |               13 |      84 |
| Abiotic and nutrient/root-zone mimics    |               18 |     108 |
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

- collect the remaining rights-reviewed images for 252 multi-image case records
  (132 of at least 504 are present as of 2026-08-09);
- document plant, cultivar when known, stage, distribution, progression, medium/root-zone, environment, and measured values;
- have a qualified reviewer approve diagnostic signs, alternatives, confirmation method, urgency, quarantine, scouting, and response expectations;
- run the reviewed envelope through both diagnostic paths and persist disagreements and linked records;
- execute the strict validator only after every case and image passes rights and evidence review.

## Verification

```txt
npm.cmd run verify:diagnosis-ipm-qa-catalog:planning
npm.cmd run verify:diagnosis-ipm-qa-catalog
```

Planning mode validates allocations, ETGU order, evidence/write-back behavior, and
rights rules. Strict mode must continue to fail until all 252 reviewed case records
and their required image sets are present; partial reviewed coverage is not completion.
