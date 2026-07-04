# Packet 7 — Run-To-Run Comparison and AI Grow History Analytics

## Product Intent

Run-To-Run Comparison teaches GrowPathAI from saved grow history.

Not a generic chatbot.

Flow:

```txt
select grows -> collect structured data -> compare equivalent stages -> summarize differences -> AI explains likely drivers -> user creates tasks -> report saves
```

## Data Sources

- grows/plants
- logs/photos/tasks
- ToolRuns
- AI diagnoses
- pH/EC
- watering/drybacks
- nutrient/soil/topdress recipes
- environment/telemetry
- harvest/dry/cure
- pheno scores
- smoke reviews/lab results when available

## Comparison Focus

- environment
- watering/dryback
- nutrients/soil/topdress/pH/EC
- diagnosis/issues
- tasks
- harvest/yield
- dry/cure
- aroma/flavor/final product
- pheno/genetics

## Rules

- do not overclaim causation
- call out missing data
- compare equivalent stages
- warn when cultivars/phenos differ
- use cautious language: may have contributed, likely associated, strongest difference

## Required Record

`RunComparisonReport` with grow IDs, focus, structured summary, AI summary, key differences, likely drivers, improvements, regressions, recommendations, tasks, confidence, limitations.

## Example Insight

```txt
Run 2 had better yield but weaker aroma. Higher DLI and steadier VPD may have improved yield, while faster dry/cure may have reduced aroma. Repeat Run 2 mid-flower environment, but use Run 1 dry/cure approach.
```

## Acceptance

Complete when users can compare two or more grows, preview/save reports, see missing data, get cautious AI summaries, create tasks, save to log/timeline, enforce ownership, and use mobile UI.
