# Packet 2 — Pheno Hunting, Stress Testing, Genetics Notes

## Product Intent

Turn scattered grow notes into structured genetic selection.

Stress testing belongs inside Pheno Hunting. Genetics Notes is the backbone that stores what GrowPathAI learns over time.

## How We Pheno Hunt

Track:

- germination speed and seedling vigor
- morphology, branching, stem strength, node spacing
- early sex expression, especially closer to veg week 4 vs week 6
- stem rub intensity and aroma vocabulary
- vigor and recovery
- feeding response, pH/EC response, Ca/Mg/K sensitivity
- stress resistance and stability/intersex response
- stretch, flower structure, resin, aroma, flavor, effect, yield
- clone performance and mother potential
- final keeper/reject/retest/breeding decision

## Required Records

- `PhenoHuntProject`
- `GeneticsIdentity`
- `PhenoPlant`
- stage scorecards: germination, veg morphology, sex expression, stem rub, flower structure, resin, aroma/flavor, effect, yield, clone performance
- `StressTestProject`
- `StressTestObservation`
- `PhenoStressScore`
- `KeeperDecision`
- `GeneticsInventoryItem`

## Stress Testing

Purpose:

```txt
Find plants that do not falter under stress, keep vigor/morphology, recover fast, stay stable, and preserve quality.
```

Stress types:

- dryback
- overwatering
- high/low light
- heat/cold
- high/low humidity
- high EC/feed stress
- pH drift
- low nutrients
- training/defoliation/transplant recovery
- herm/intersex watch

Selection outputs:

- dryback tolerant/sensitive
- high EC tolerant/sensitive
- Ca/Mg sensitive
- light tolerant/sensitive
- crop steering candidate
- commercial stability concern
- keeper/reject/retest impact

## Genetics Notes

Not generic inventory.

Tracks:

- seed, seedling, rooted clone, mother, keeper cut, pollen, TC material, dry flower sample
- feeds heavy/light
- stretches hard
- roots slow/fast
- shows sex early
- mold prone
- gets calcium symptoms in high RH
- dryback tolerant/sensitive
- high-light tolerant
- aroma/flavor/final product notes

## UI

Preferred flow:

```txt
Grow Detail -> Pheno Hunt -> Plant Card -> Score / Stress Test / Stem Rub / Photo / Clone Test / Final Decision
```

Comparison matrix columns include sex week, vigor, morphology, stem rub, stretch, resin, aroma, flavor, yield, stress recovery, clone score, stability, keeper score, decision.

## Acceptance

Complete when users can create a hunt, add plants, track genetics, record stage scorecards, run stress tests, compare plants, make keeper decisions, create genetics items, save/reload all records, enforce ownership, and use AI summaries only after structured data is saved.
