# Packet 8 — Soil & Nutrient Batch Planner and Inventory Rules

## Correct Name

Do not call this module “Living Soil Labs” inside GrowPathAI.

Use:

```txt
Soil & Nutrient Batch Planner
```

Living Soil Labs is the user’s business/company concept. Soil & Nutrient Batch Planner is the GrowPathAI app module.

## Product Intent

Purpose-built mix planner that scales soil, dry amendment, and nutrient recipes into usable batches while checking:

- purpose/stage
- guaranteed analysis
- elemental estimate
- release timing
- compatibility
- source confidence
- cost
- tasks
- grow/facility context

## Personal vs Commercial Rule

```txt
Product / Ingredient Library = personal + commercial + facility
Genetics Inventory = personal + commercial + facility
Generic supply inventory = commercial + facility only
```

Personal free/pro users should not see generic inventory.

Personal users can scale batches for one grow and save tasks/log/timeline. Commercial/facility users can connect inventory, stock levels, costs, pull sheets, packaging, and production records.

## Required Record

`SoilNutrientBatch` with purpose, crop/stage/medium/grow style, source recipes, volume/weight, plant count, ingredients, label/elemental totals, release timeline, warnings, cost estimate, packaging/labor, mixing instructions, pull sheet, status, linked tasks/log/timeline.

## Purposes

- seedling-safe soil
- veg soil
- flower soil
- living soil base
- no-till re-amend
- topdress blend
- dry amendment blend
- calcium/magnesium/nitrogen/bloom support
- recovery mix
- pH-buffering mix
- production batch
- custom

## Required Warnings

- too hot for seedlings
- slow release too late
- compost/castings estimated
- low source confidence
- high K vs Ca/Mg
- high P vs micronutrients
- lime/oyster shell are slow buffering, not fast calcium rescue
- gypsum is not pH down
- high EC/salt risk
- missing cost data
- inventory shortage for commercial/facility

## Task Generation

Personal:

- pull ingredients
- mix batch
- moisten/rest/cook
- apply/topdress
- water in
- check plant response
- retest pH/EC

Commercial/facility:

- pull ingredients
- mix production batch
- bag/label/QC
- update inventory
- clean work area
- stage batch

## Acceptance

Complete when users can create purpose-built batches, scale recipes, see guaranteed/elemental estimates, release timelines, warnings, costs, tasks, logs, timeline events, AI review, inventory integration for commercial/facility only, save/reload, ownership enforcement, and mobile UI.
