# Packet 1 — Soil Builder, Dry Amendment Mix Builder, Nutrient Release Chemistry

## Product Intent

Build soil and amendment tools as timed nutrient-delivery systems, not static NPK widgets.

The user’s working model:

```txt
A target like 3-1-1 is not just 3-1-1.
It can be 1-1-1 long/background nutrition plus 2 fast/medium nitrogen.
The app must show label ratio, elemental math, ingredient role, release timing, uncertainty, and stage fit.
```

## Required Shared System

- `ProductIngredient`: label N-P2O5-K2O, elemental nutrients, nutrient forms, release class, release mechanism, pH effect, EC impact, source confidence.
- `Recipe`: soil mix, dry amendment, nutrient solution, topdress, batch production.
- `ToolRun`: every calculation saves inputs, outputs, warnings, formulas, confidence, linked recipe/log/tasks/timeline.
- `NutrientReleaseChemistry`: immediate, fast, medium, slow, very slow, unknown.

## Conversion Rules

```txt
Label N = elemental nitrogen
Label P = P2O5
Label K = K2O
elementalP = P2O5 * 0.44
elementalK = K2O * 0.83
```

Always show both:

- guaranteed analysis: `N-P2O5-K2O`
- elemental estimate: `N-P-K`

## Soil Builder

Flow:

```txt
select grow -> choose purpose -> total volume -> base/compost/aeration -> amendments/minerals -> release timeline -> warnings -> save recipe -> tasks/log/timeline
```

Required warnings:

- compost/castings are variable unless lab/label data exists
- hot mix risk for seedlings
- slow release too late for current stage
- lime/oyster shell are long-term buffering inputs, not fast calcium rescue
- gypsum is calcium/sulfur support, not pH down
- high K can crowd Ca/Mg
- high P can affect micronutrients

## Dry Amendment Mix Builder

Flow:

```txt
target ratio -> batch size -> ingredient guaranteed analysis -> achieved ratio -> elemental breakdown -> release timeline -> warnings -> save recipe -> use in soil builder/topdress
```

The output must explain whether nutrients are front-loaded or background/slow.

Example output:

```txt
This blend reaches the target label direction, but nitrogen availability is front-loaded compared with P/K. Fast nitrogen is expected earlier; background amendments release over weeks/months. Compost biology and existing soil fertility make exact availability uncertain.
```

## Required Integrations

- Topdress Planner uses saved dry amendment recipes.
- Product/Ingredient Library provides source confidence.
- Compatibility Checker runs automatically.
- AI review can review the recipe as a timed nutrient system.
- Save recipe, assign to grow, create tasks, save log, timeline event.

## Acceptance

Complete when users can create ingredients, build soil recipes, build dry amendment mixes, view label and elemental math, view release timing, see uncertainty, save/reload, create tasks/logs/timeline events, and use AI review without fake certainty.
