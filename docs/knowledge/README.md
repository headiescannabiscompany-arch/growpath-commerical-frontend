# GrowPathAI Knowledge Base

This directory is the durable source for how GrowPathAI evaluates evidence and performs domain workflows. Chat history is not a product specification.

Before changing a tool, read the relevant method plus `source-reliability-registry.md` and `ai-decision-policy.md`. Cannabis-facing work must also read `cannabis-visibility-policy.md`.

## Routing

| Work area                      | Required method                                                                         |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| Diagnosis / IPM                | `methods/plant-diagnosis-etgu-method.md`                                                |
| Pheno / selection              | `methods/pheno-hunting-method.md`, `methods/stress-testing-method.md`                   |
| Crop steering                  | `methods/crop-steering-method.md`                                                       |
| Soil / nutrients / water       | `methods/soil-and-nutrient-method.md`                                                   |
| Clone / TC                     | `methods/clone-rooting-method.md`, `methods/tissue-culture-method.md`                   |
| Harvest / post-harvest         | `methods/harvest-dry-cure-method.md`                                                    |
| Run comparison / history       | `methods/run-comparison-method.md`                                                      |
| Commercial / facility          | `methods/commercial-workflow-method.md`, `methods/facility-workflow-method.md`          |
| Course media                   | `methods/course-media-workflow-method.md`                                               |
| Video sharing                  | `methods/video-sharing-workflow-method.md`, `methods/course-media-workflow-method.md`   |
| Live video / premieres         | `methods/live-streaming-workflow-method.md`, `methods/video-sharing-workflow-method.md` |
| Sensor/controller import       | `methods/integration-workflow-method.md`                                                |
| Business inventory (B-02)      | `methods/business-inventory-method.md`                                                  |
| Small Business Desk (B-03)     | `methods/business-desk-method.md`                                                       |
| Horticulture operations (B-04) | `methods/horticulture-operations-method.md`, plus Plant Diagnosis and B-02 when linked  |
| Public copies / sharing        | `methods/public-copy-sharing-method.md`, plus the source workflow method                |

The runtime counterparts live in `src/knowledge`. Method IDs and source IDs are stable API values. Add named sites to the registry only after recording trusted uses, exclusions, cross-check requirements, and review date.

For business work, B-02 is the sole inventory ledger and is upstream of B-03. Read the
B-02 method before changing any Business Desk inventory reference, receiving evidence, or
stock projection; B-03 may reference authorized B-02 records but never defines another
inventory writer.

## Shared date-entry rule

User-facing calendar dates use the shared date picker: people select year, month, and day instead of typing a storage format. Date-and-time workflows add explicit hour and minute selection. Store stable ISO date or local date-time values, but display readable dates. Date of birth cannot be in the future and must offer direct year selection; ordinary users must never be forced through month-by-month navigation to reach an older year.

## Platform knowledge governance

The platform Admin knowledge registry is an audited editorial ledger, not a runtime override system. Approving a governed revision records the owner's review intent; it does not alter `src/knowledge`, a method document, or live AI behavior. A runtime change still requires the relevant method document, app-readable registry, tests, reviewed code release, deployment, and live verification.

A governed source draft requires a stable ID, title, domain or preferred author/channel, reliability tier, approved uses, explicit exclusions, cross-check requirements, next review date, and change note. Do not infer or fabricate owner-supplied sources. A substantive change creates the next immutable numbered revision. Retired revisions remain in the ledger.

Outcome-based method proposals may be generated only from at least three non-synthetic module records with meaningful saved outcomes. The aggregate may summarize agreement and user-decision counts, but it must:

- exclude synthetic QA seed records;
- state that records may not be independent and do not establish causation or scientific validity;
- require human editorial review; and
- leave the runtime method unchanged until a separate reviewed code release.
