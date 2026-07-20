# Diagnosis and IPM QA Pack

Date: 2026-07-20

Status: Catalog, evidence contract, and rights gate implemented. Case media and expected-outcome review remain pending.

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
- No case may invent a pesticide product, rate, interval, compatibility, or legal-use claim. Product guidance requires current label, crop/site, jurisdiction, worker/harvest interval, and beneficial-organism review.
- The pack is for QA of inference behavior, never model training.

Every image in a reviewed case needs source and media URLs, creator, license, attribution, retrieval and rights-review dates, intended-use approval, and handling mode. A copied fixture also requires a scoped local path and SHA-256 hash.

## What remains

- collect at least 504 rights-reviewed images for the 252 multi-image case records;
- document plant, cultivar when known, stage, distribution, progression, medium/root-zone, environment, and measured values;
- have a qualified reviewer approve diagnostic signs, alternatives, confirmation method, urgency, quarantine, scouting, and response expectations;
- run the reviewed envelope through both diagnostic paths and persist disagreements and linked records;
- execute the strict validator only after every case and image passes rights and evidence review.

## Verification

```txt
npm.cmd run verify:diagnosis-ipm-qa-catalog:planning
npm.cmd run verify:diagnosis-ipm-qa-catalog
```

Planning mode validates allocations, ETGU order, evidence/write-back behavior, and rights rules. Strict mode must fail while the catalog contains zero reviewed case records.
