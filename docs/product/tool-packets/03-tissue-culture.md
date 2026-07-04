# Packet 3 — Tissue Culture

## Product Intent

Build a practical tissue culture workflow for genetics preservation, propagation tracking, SOPs, batches, media recipes, vessels, transfers, diagnosis, acclimation, storage, reminders, and metrics.

Do not overbuild into full lab automation. Do not make it a notes page.

## Diagnosis Philosophy

```txt
Read the whole system.
Do not blame one jar.
Find the pressure point.
```

TC pressure points:

- sterility
- explant cleaning
- media balance
- pH
- sugar/agar strength
- hormones
- temperature/light
- handling technique
- contamination timing/pattern
- oxidation/browning
- rooting
- acclimation
- storage

## Required Records

- `TissueCultureProject`
- `TissueCultureSOP`
- `ExplantBatch`
- `TCMediaRecipe`
- `TCVessel`
- `TCTransferRecord`
- `TCDiagnosisRecord`
- `AcclimationRecord`
- `TCStorageRecord`
- success/cost metrics

## Workflow

```txt
genetics -> SOP -> batch -> media -> vessel -> transfer -> diagnosis -> rooting -> acclimation -> storage -> metrics -> timeline
```

## Diagnosis Modes

- contamination: fuzzy mold, slime, cloudy media, yeast
- browning/oxidation
- no growth/stalling
- callus instead of shoots
- vitrification
- rooting failure
- acclimation failure

Each result needs confidence, evidence, counter-evidence, next checks, task suggestions, and a disclaimer.

## Reminders

Generate tasks for early contamination check, browning check, shoot growth, subculture, rooting check, acclimation venting, dome removal, storage check, refresh due.

## Cannabis Preset

Provide customizable cannabis node/shoot-tip presets, but warn that response varies by cultivar, explant condition, sterilization timing, media balance, and hormone level.

## Acceptance

Complete when TC projects can link to genetics, SOPs, batches, media, vessels, transfers, diagnoses, rooting, acclimation, storage, reminders, metrics, logs, tasks, timeline events, save/reload, ownership, and mobile UI.
