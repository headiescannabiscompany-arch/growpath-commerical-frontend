# GrowPathAI Knowledge Base

This directory is the durable source for how GrowPathAI evaluates evidence and performs domain workflows. Chat history is not a product specification.

Before changing a tool, read the relevant method plus `source-reliability-registry.md` and `ai-decision-policy.md`. Cannabis-facing work must also read `cannabis-visibility-policy.md`.

## Routing

| Work area                | Required method                                                                |
| ------------------------ | ------------------------------------------------------------------------------ |
| Diagnosis / IPM          | `methods/plant-diagnosis-etgu-method.md`                                       |
| Pheno / selection        | `methods/pheno-hunting-method.md`, `methods/stress-testing-method.md`          |
| Crop steering            | `methods/crop-steering-method.md`                                              |
| Soil / nutrients / water | `methods/soil-and-nutrient-method.md`                                          |
| Clone / TC               | `methods/clone-rooting-method.md`, `methods/tissue-culture-method.md`          |
| Harvest / post-harvest   | `methods/harvest-dry-cure-method.md`                                           |
| Commercial / facility    | `methods/commercial-workflow-method.md`, `methods/facility-workflow-method.md` |
| Sensor/controller import | `methods/integration-workflow-method.md`                                      |

The runtime counterparts live in `src/knowledge`. Method IDs and source IDs are stable API values. Add named sites to the registry only after recording trusted uses, exclusions, cross-check requirements, and review date.
