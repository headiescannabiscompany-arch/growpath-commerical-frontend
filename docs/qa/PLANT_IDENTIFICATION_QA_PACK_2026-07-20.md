# Plant Identification QA Pack

Date: 2026-07-20

Status: Catalog, rights gate, candidate collector, review queue, and promotion gate
implemented. Seven tomato records have passed image-level morphology, identity,
life-stage, Tier-A taxonomy, exact-license, rights, expected-result, and intended-use
review. Seven pepper records and six cucumber records have also passed the same
gates. Four cultivated-form lettuce records also passed; four flowering or
wild-relative lettuce candidates were rejected because the images could not reliably
separate cultivated lettuce from other Lactuca species. The governed catalog is now
24/320. Three basil records with strong cultivated foliage or combined leaf-and-flower
evidence also passed; five flower-only, single-leaf, or unresolved close-relative
candidates were rejected. Four cultivated-context garden-strawberry records also passed;
four wild-context Fragaria candidates were rejected because they could not establish the
garden-strawberry hybrid rather than a wild relative. The governed catalog is now
31/320. Five corn records with mature reproductive evidence or repeated field-scale
crop context also passed; three isolated vegetative grass candidates were rejected.
Three common-bean records with seedling or combined foliage-and-flower evidence also
passed; five red-flowered Phaseolus lookalikes or unresolved distant-bed candidates
were rejected. Two rose records with matching compound foliage plus flower or bud
evidence also passed; four wrong-taxon or no-target candidates were rejected. The
governed catalog is now 41/320. Three Pothos records with repeated
golden-variegated climbing foliage also passed; three ambiguous mixed, isolated-leaf,
or unvariegated candidates were rejected. The governed catalog is now 44/320. Two
cucumber candidates were rejected because cotyledon-only or flower-only evidence could
not support dependable species ground truth. Four mature Monstera records with repeated
split-and-fenestrated leaves or combined leaf-and-inflorescence evidence also passed;
two distant candidates were rejected. The governed catalog is now 48/320. The catalog
also now includes four genus-level Peace Lily records with combined foliage and
spathe/spadix evidence; foliage-only and isolated-spadix candidates were rejected. The
catalog also includes three family-level Orchidaceae records with visible bilateral
orchid floral structure; three orchid-like _Duparquetia orchidacea_ candidates were
rejected because that accepted species belongs to Fabaceae despite its name and flower
appearance. The governed catalog is now 55/320 and remains planning until all governed slots are filled;
no candidate is automatically promoted. Two genus-level Marigold records with composite
heads and divided foliage also passed; three _Erynnis tages_ butterfly results and one
_Tithonia rotundifolia_ lookalike were rejected despite appearing in the Tagetes query.
The governed catalog is now 57/320.

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

iNaturalist is useful for taxon metadata leads, lookalikes, and candidate field observations because its API exposes observation and photo-license information. It is not a blanket permission source: iNaturalist does not own user media, photo rights vary independently from observation metadata, and noncommercial/all-rights-reserved media cannot be copied into this commercial-product QA fixture. GrowPathAI will use this pack only for inference QA, never training, and only after image-level license and intended-use review.

The candidate collector is intentionally narrower than the final catalog. It requests a
research-grade wild stream and, for cannabis/hemp, food crops, ornamentals, and
lookalikes, a separate `captive=true` cultivated stream. Cultivated observations are
normally casual rather than Research Grade, so the streams are labeled and balanced
instead of allowing a research-only filter to silently replace crop and ornamental
coverage with wild or escaped examples. Both streams filter source photo codes to `cc0`
or `cc-by` and recheck the individual photo license. The collector stores external
references and attribution, downloads no media, retains no coordinates, and leaves
identity, life stage, exact license version, and intended use unapproved. Research Grade,
casual or captive status, community agreement, computer-vision involvement, captions,
and taxon names remain review leads rather than GrowPath ground truth.

USDA ARS Image Gallery assets may be considered only after the individual asset is
confirmed public domain and not an exception to the gallery policy. Wikimedia Commons
files may be considered only after the individual file page is confirmed as CC0 1.0 or
CC BY 4.0 and its attribution requirements are retained. Collection membership, file
names, categories, and captions do not prove identity or life stage.

PlantVillage remains a diagnosis-pack candidate rather than the primary crop-identification source. Its controlled-background leaf images can test some crop/disease labels, but they do not represent whole-plant or field performance, and repository “open access” wording is not treated as a substitute for an explicit governing media license.

Owner-supplied or commissioned media is preferred for cannabis/hemp stages, harvested flower, Living Soil Labs products, and deliberately bad/failure cases because rights and expected outcomes can be recorded directly.

## Per-record contract

This 320-record pack is a governed evaluation set, not a closed-world species
database and not a claim to cover global plant diversity. A plant absent from the pack
must not be forced into the nearest catalog label. GrowPathAI should narrow from visible
morphology to the strongest supported rank, verify names and synonymy against current
authoritative external sources when available, and return family, genus, species,
subspecies/variety, hybrid, or unresolved identity only as the evidence supports. New
rights-reviewed cases improve regression coverage over time without replacing live
taxonomic verification or qualified botanical review.

Each of the 320 media records must provide:

- accepted common and scientific name, category, stage, acceptable alternatives,
  distinguishing features, expected confidence range, and expected behavior. Results
  must present supported common, nursery, or regional aliases as names for the same
  taxon while keeping true lookalikes separate; a suggestive epithet or common-name
  overlap never overrides the accepted taxonomy;
- source and media URLs, creator, image-level license, attribution, retrieval date, rights-review date, and explicit intended-use approval;
- handling mode (`external_reference` or `copied_fixture`); copied fixtures also require an immutable hash and local fixture path;
- a crop-level result only for clear cannabis/hemp morphology, never cultivar/strain inference;
- explicit pixel-analysis disclosure plus useful retake guidance for blur, partial leaves, mixed plants, dead leaves, artificial plants, or no-plant scenes.

## Verification

```txt
npm.cmd run verify:plant-id-qa-catalog:planning
npm.cmd run verify:plant-id-qa-catalog
```

Planning mode validates the 320-case allocation and rights contract while reviewed
records accumulate. Strict mode must fail until all 320 reviewed records exist and
satisfy the license/attribution rules.

Candidate collection is dry-run by default:

```txt
npm.cmd run collect:plant-id-qa-candidates
npm.cmd run collect:plant-id-qa-candidates:execute
npm.cmd run collect:plant-id-qa-candidates:resume
npm.cmd run prepare:plant-id-qa-review
npm.cmd run prepare:plant-id-qa-review:execute
npm.cmd run promote:plant-id-qa-reviews
npm.cmd run promote:plant-id-qa-reviews:execute -- --expected-catalog-sha256=<sha> --expected-candidate-sha256=<sha> --expected-review-sha256=<sha>
```

Execution writes only `tmp/spec/plant-identification-qa-candidates.json`. It never edits
the governed catalog. An existing candidate manifest requires explicit `--resume` or
`--replace`, and collection failures are preserved instead of being presented as a
complete pack. Resume also refuses a candidate manifest created from a different catalog
hash and checkpoints successful query pages even when they produce no eligible photo, so
an empty page cannot trap repeated resumes. Permission-pending or lead-only sources may remain documented without
making strict validation impossible; however, no media record may use a source unless
that source is explicitly approved for QA references and the record passes every
per-image gate. The master seed-system validator now references this catalog and
collector directly. Unused candidate or permission-pending sources remain documented
leads rather than false release blockers; a seed-ready Plant ID master pack must match a
seed-ready 300-500-record governed catalog.

The review-queue preparer is also dry-run by default. It verifies that the candidate
manifest is bound to the current catalog hash, selects each available case up to its
governed quota, balances research-wild and cultivated evidence where applicable, and
writes lookalike queues with balanced source-taxon coverage when the candidate pool can
support it. It writes only `tmp/spec/plant-identification-qa-review.json` after explicit
execution. It does not copy media or promote catalog records. Every queued item begins
pending and is non-promotable until a named reviewer records image-visible morphology,
identity and life-stage decisions, a Tier A taxonomy or morphology cross-check, the
exact image license and license URL, rights-review date, expected confidence/behavior,
and intended commercial QA-use approval. Missing failure cases remain explicit
owned-or-commissioned media blockers rather than placeholders.

The reviewed-record promoter is a separate fail-closed gate. Its default run reports
input hashes and eligible/blocking counts without writing. Explicit execution requires
the exact current catalog, candidate-manifest, and review-manifest SHA-256 values. It
re-derives every candidate from the bound candidate manifest, re-derives every target
from the governed case definition, rejects changed definitions, duplicate media,
over-quota cases, incomplete review decisions, or mismatched licenses, and writes the
catalog atomically. Catalog status remains `planning` until all 320 case quotas are
filled; only an exact complete reviewed catalog becomes `seed_ready`. Because the
definition snapshot excludes only catalog status and reviewed media records, approved
records can accumulate safely without weakening the original candidate/review binding.
