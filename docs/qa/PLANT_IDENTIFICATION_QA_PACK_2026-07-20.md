# Plant Identification QA Pack

Date: 2026-07-20

Status: Catalog and rights gate implemented. Media collection and review remain pending.

Machine-readable catalog: `tests/fixtures/plant-identification-qa-catalog.json`

## Target distribution

| Group                               | Records |
| ----------------------------------- | ------: |
| Cannabis/hemp stages and morphology |      70 |
| Food crops                          |      64 |
| Ornamentals                         |      48 |
| Weeds                               |      54 |
| Lookalike comparisons               |      48 |
| Failure/no-plant cases              |      36 |
| **Total**                           | **320** |

The target intentionally fits inside the broader 300-500 range while reserving enough repeated cases to test stage, angle, lighting, whole-plant, leaf, flower, harvested material, ambiguity, and rejection behavior.

## Source decision

iNaturalist is useful for taxon metadata leads, lookalikes, and candidate field observations because its API exposes observation and photo-license information. It is not a blanket permission source. The terms prohibit commercial AI training, photo rights vary independently from observation metadata, and noncommercial/all-rights-reserved media cannot be copied into this commercial-product QA fixture. GrowPathAI will use this pack only for inference QA, never training, and only after image-level license and intended-use review.

PlantVillage remains a diagnosis-pack candidate rather than the primary crop-identification source. Its controlled-background leaf images can test some crop/disease labels, but they do not represent whole-plant or field performance, and repository “open access” wording is not treated as a substitute for an explicit governing media license.

Owner-supplied or commissioned media is preferred for cannabis/hemp stages, harvested flower, Living Soil Labs products, and deliberately bad/failure cases because rights and expected outcomes can be recorded directly.

## Per-record contract

Each of the 320 media records must provide:

- accepted and scientific name, category, stage, acceptable alternatives, distinguishing features, expected confidence range, and expected behavior;
- source and media URLs, creator, image-level license, attribution, retrieval date, rights-review date, and explicit intended-use approval;
- handling mode (`external_reference` or `copied_fixture`); copied fixtures also require an immutable hash and local fixture path;
- a crop-level result only for clear cannabis/hemp morphology, never cultivar/strain inference;
- explicit pixel-analysis disclosure plus useful retake guidance for blur, partial leaves, mixed plants, dead leaves, artificial plants, or no-plant scenes.

## Verification

```txt
npm.cmd run verify:plant-id-qa-catalog:planning
npm.cmd run verify:plant-id-qa-catalog
```

Planning mode validates the 320-case allocation and rights contract while media is still empty. Strict mode must fail until all 320 reviewed records exist and satisfy the license/attribution rules.
