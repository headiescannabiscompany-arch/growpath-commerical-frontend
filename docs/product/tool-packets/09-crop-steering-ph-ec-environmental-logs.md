# GrowPathAI Codex Packet 9 - Crop Steering Projects, pH/EC Range Check, and Environmental Steering Logs

## Purpose

Build Crop Steering as a real GrowPathAI module, not a tips page, VPD-only screen, or toy dryback calculator.

Crop steering means:

```txt
Controlled environmental, irrigation, light, and root-zone pressure
-> documented by stage and intent
-> compared against plant response
-> saved to grow/pheno history
-> used for future recommendations
```

The core GrowPathAI rule:

```txt
If the plant recovers and improves, it may be steering.
If the plant stalls, wilts too long, herms, or loses quality, it was too much stress.
```

## Connected Systems

Crop Steering must connect to:

```txt
Grow Logs
Plant Records
Pheno Hunting
Stress Testing
pH / EC Range Check
VPD Tool
Dew Point Guard
Watering Tasks
Nutrient Recipes
Harvest Readiness
Run-To-Run Comparison
```

## Steering Modes

### Vegetative Steering

Used for growth, recovery, rooting, branching, clone health, seedling stability, mother plant maintenance, and veg push.

Pattern:

```txt
less aggressive drybacks
stable moisture
comfortable VPD
gentler light increases
balanced feed
fast recovery
```

### Generative Steering

Used for flower push, controlled stretch, bud set, bud stacking, reproductive pressure, and resin/aroma observation.

Pattern:

```txt
controlled drybacks
intentional irrigation windows
stage-aware light pressure
careful EC management
root-zone monitoring
```

Warning:

```txt
Generative pressure is not automatically better.
If recovery is poor, it becomes stress damage, not steering.
```

### Recovery Steering

Used after transplant shock, overwatering, underwatering, high light stress, nutrient burn, pH drift, defoliation, training, heat, or cold.

Pattern:

```txt
gentler light
stable moisture
lower pressure
comfortable VPD
less aggressive EC
more observation
```

### Ripening / Finish Steering

Used late flower to finish clean, preserve smell/flavor, avoid mold, avoid late overfeeding, and track harvest readiness.

Pattern:

```txt
cautious drybacks
dew point/mold checks
avoid humidity spikes
avoid high EC late
watch aroma/fade/trichomes
```

## Stage Rules

Clone/seedling favors stability, gentle light, higher humidity, stable moisture, low EC, and low stress. Avoid hard drybacks, high light, high EC, and aggressive VPD.

Veg favors root/branch/vigor building with mild drybacks, balanced watering, moderate light increases, healthy VPD, and feeding response notes.

Pre-flip/transition watches stretch preparation, root-zone problems, overwatering, and too much nitrogen.

Early flower manages stretch without stunting and tracks stretch percentage, node spacing, support needs, and stress sensitivity.

Mid flower is a key steering window for bud stacking, resin, aroma, dryback steering, DLI/PPFD, EC response, VPD, and bud rot checks.

Late flower prioritizes finish quality, aroma preservation, mold prevention, dew point checks, cautious drybacks, harvest readiness, and avoiding late heavy feeding.

## Required Techniques

Track:

```txt
Dryback steering
Irrigation timing steering
Light / DLI steering
VPD / humidity steering
EC / feed-strength steering
pH / root-zone steering
Vegetative steering
Generative steering
Recovery steering
Ripening steering
Stress-testing overlap for pheno selection
```

## pH / EC Range Check

This is a root-zone interpretation tool, not exact pH Up/Down dosing.

Inputs:

```js
{
  (growId,
    plantId,
    cropType,
    medium,
    stage,
    inputPH,
    runoffPH,
    inputEC,
    runoffEC,
    ecUnit,
    targetPHRange,
    targetECRange,
    waterSource,
    alkalinity,
    calcium,
    magnesium,
    sodium,
    chloride,
    recentFeedRecipeId,
    recentTopdressId,
    notes);
}
```

Outputs:

```js
{
  (phStatus,
    runoffPHStatus,
    ecStatus,
    runoffECStatus,
    driftDirection,
    possibleRisks,
    recommendations,
    warnings,
    retestTaskSuggestion,
    logSummary);
}
```

Required warnings:

```txt
High runoff EC can mean salt buildup, overfeeding, dryback concentration, low runoff in coco/salt systems, or imbalance.
Low runoff EC can mean plant uptake exceeds supply, weak feed, low fertility, poor retention, or measurement issue.
pH drift upward can involve alkalinity, carbonate buffering, lime-heavy media, water source, or uptake patterns.
pH drift downward can involve acidic media, buildup, root-zone activity, fertilizer effects, or organic breakdown.
RO water has low buffering; Ca/Mg and alkalinity context matter.
City/well water may contain minerals that change pH/EC interpretation.
Do not recommend exact pH Up/Down dosing without product concentration and water volume.
```

## Required Durable Record Types

The shared module-record system should support:

```txt
crop_steering_project
crop_steering_entry
ph_ec_check
```

## Crop Steering Output

Every entry should produce:

```js
{
  (steeringIntent,
    plantResponse,
    pressureLevel,
    recoveryStatus,
    warnings,
    recommendations,
    phenoImpact,
    tasksToCreate,
    logSummary);
}
```

## Task Templates

```txt
Check plant recovery
Recheck dryback
Check runoff EC
Check runoff pH
Inspect new growth
Reduce steering pressure
Increase steering pressure carefully
Return to recovery steering
Check VPD
Check light stress
Photograph same plant tomorrow
```

## Timeline Events

```txt
crop_steering_project_created
crop_steering_entry_logged
high_pressure_steering_event
poor_recovery_logged
positive_recovery_logged
ph_ec_check_logged
runoff_ec_warning
runoff_ph_warning
steering_task_created
```

## Pheno Tags

```txt
dryback_tolerant
dryback_sensitive
high_light_tolerant
light_sensitive
ec_tolerant
ec_sensitive
ph_sensitive
recovery_strong
recovery_poor
generative_steering_candidate
vegetative_recovery_candidate
```

## Acceptance Criteria

Complete when:

```txt
User can create crop steering project.
User can log steering entry.
User can track dryback, irrigation, light, VPD, EC, pH, and response.
User can run pH / EC Range Check.
Tool gives pressure level and plant response.
Tool creates warnings and recommendations.
Tool can create follow-up tasks.
Tool saves to grow log.
Timeline event is created.
Pheno/genetics tags update when linked.
All records save and reload.
Ownership is enforced.
Mobile UI works.
```
